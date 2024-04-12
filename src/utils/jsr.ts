import process from 'node:process'
import { dirname, join } from 'node:path'
import * as fsp from 'node:fs/promises'
import * as fs from 'node:fs'

import semver from 'semver'
import { asyncPoolCallback } from 'eager-async-pool'
import { type ImportSpecifier, getModuleCacheDirectory } from './external-libs.js'
import { webStreamToNode } from './stream-utils.js'
import { type JsrJson, parseJsrJson } from './jsr-json.js'
import { fileExists } from './fs.js'

const REGISTRY = process.env.JSR_URL || 'https://jsr.io'

export async function downloadJsrPackage(specifier: ImportSpecifier): Promise<string> {
    if (specifier.registry !== 'jsr') {
        throw new Error('Invalid registry')
    }

    const targetDir = `${specifier.packageName.replace(/\//g, '+')}@${specifier.version}`
    const registryHost = new URL(REGISTRY).host
    const cacheDir = join(getModuleCacheDirectory(), 'jsr', registryHost, targetDir)

    // check if package is already downloaded
    if (await fileExists(cacheDir)) {
        return cacheDir
    }

    // download meta.json
    const metaUrl = `${REGISTRY}/${specifier.packageName}/meta.json`
    const metaRes = await fetch(metaUrl)

    if (metaRes.status !== 200) {
        throw new Error(`Failed to fetch meta.json for ${specifier.packageName}@${specifier.version}: ${metaRes.statusText}`)
    }

    const meta = await metaRes.json() as { versions: Record<string, unknown> }
    const availableVersions = Object.keys(meta.versions)

    // find matching version
    const version = semver.maxSatisfying(availableVersions, specifier.version)
    if (!version) {
        throw new Error(`No matching version for ${specifier.packageName}@${specifier.version}`)
    }

    // jsr doesn't have tarballs, so we have to download the whole package file by file
    await fsp.mkdir(cacheDir, { recursive: true })
    const versionMeta = await fetch(`${REGISTRY}/${specifier.packageName}/${version}_meta.json`).then(res => res.json()) as { manifest: Record<string, unknown> }

    const fetchFile = async (file: string) => {
        file = file.replace(/^\//, '')
        const fileUrl = `${REGISTRY}/${specifier.packageName}/${version}/${file}`
        const filePath = join(cacheDir, file)
        await fsp.mkdir(join(filePath, '..'), { recursive: true })

        const res = await fetch(fileUrl)
        const stream = fs.createWriteStream(filePath)
        const pipe = webStreamToNode(res.body!).pipe(stream)

        await new Promise((resolve, reject) => {
            pipe.on('finish', resolve)
            pipe.on('error', reject)
        })
    }

    await asyncPoolCallback(fetchFile, Object.keys(versionMeta.manifest), () => {}, { limit: 16 })

    return cacheDir
}

const _jsrJsonCache = new Map<string, JsrJson>()
export async function determineJsrEntrypoint(pkgPath: string, request: string) {
    if (!_jsrJsonCache.has(pkgPath)) {
        // todo: can jsr packages contain package.json?

        let found = false

        for (const path of ['deno.json', 'jsr.json', 'deno.jsonc', 'jsr.jsonc']) {
            if (await fileExists(join(pkgPath, path))) {
                const json = parseJsrJson(await fsp.readFile(join(pkgPath, path), 'utf8'))
                _jsrJsonCache.set(pkgPath, json)
                found = true
                break
            }
        }

        if (!found) {
            throw new Error(`No jsr.json or deno.json found in ${pkgPath}`)
        }
    }
    const jsr = _jsrJsonCache.get(pkgPath)!

    async function resolveMaybeDts(jsFile: string) {
        const jsPath = join(pkgPath, jsFile)
        if (!jsPath.endsWith('.js')) return jsPath

        // .d.ts in deno are referenced via /// directive
        const content = await fsp.readFile(jsPath, 'utf8')
        const match = content.match(/\/\/\/\s*<reference\s+types="(.+?)"\s*\/>/)
        if (match) {
            const dtsPath = join(dirname(jsPath), match[1])
            if (await fileExists(dtsPath)) {
                return dtsPath
            } else {
                throw new Error(`Referenced .d.ts file not found: ${dtsPath}`)
            }
        }

        return jsPath
    }

    if (request === '') request = '.'
    else request = `./${request}`

    if (typeof jsr.exports === 'string') {
        if (request !== '.') {
            throw new Error(`Invalid request ${request} for single export`)
        }

        return resolveMaybeDts(jsr.exports)
    }

    if (!(request in jsr.exports)) {
        throw new Error(`Export not found: ${request}`)
    }

    return resolveMaybeDts(jsr.exports[request])
}
