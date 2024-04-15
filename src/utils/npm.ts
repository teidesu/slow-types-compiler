import process from 'node:process'
import { join } from 'node:path'
import * as fsp from 'node:fs/promises'
import * as fs from 'node:fs'

import semver from 'semver'
import { type ImportSpecifier, getModuleCacheDirectory } from './external-libs.js'
import { untarStream } from './stream-utils.js'
import { fileExists } from './fs.js'

const DEFAULT_REGISTRY = process.env.npm_config_registry || 'https://registry.npmjs.org'

function determineRegistryUrl(pkg: string): string {
    // check for scoped env var
    if (pkg.startsWith('@')) {
        const envVar = process.env[`npm_config_registry_${pkg.slice(1).split('/')[0]}`]
        if (envVar) {
            return envVar
        }
    }

    return DEFAULT_REGISTRY
}

export async function downloadNpmPackage(specifier: ImportSpecifier): Promise<string> {
    if (specifier.registry !== 'npm') {
        throw new Error('Invalid registry')
    }

    const targetDir = `${specifier.packageName.replace(/\//g, '+')}@${specifier.version}`
    const registry = determineRegistryUrl(specifier.packageName)
    const registryHost = new URL(registry).host
    const cacheDir = join(getModuleCacheDirectory(), 'npm', registryHost, targetDir)

    async function getBaseDir() {
        const dirs = await fsp.readdir(cacheDir)
        if (dirs.length !== 1) {
            throw new Error(`Unexpected directory structure in ${cacheDir}`)
        }

        return join(cacheDir, dirs[0])
    }

    // check if package is already downloaded
    if (await fileExists(cacheDir)) {
        return getBaseDir()
    }

    // download manifest
    const manifestUrl = `${registry}/${specifier.packageName.replace(/\//g, '%2f')}`
    const manifest = await fetch(manifestUrl).then(res => res.json()) as { versions: Record<string, { dist: { tarball: string } }> }
    const availableVersions = Object.keys(manifest.versions)

    // find matching version
    const version = semver.maxSatisfying(availableVersions, specifier.version)
    if (!version) {
        throw new Error(`No matching version for ${specifier.packageName}@${specifier.version}`)
    }

    // download and extract tarball
    await fsp.mkdir(cacheDir, { recursive: true })

    const tarballUrl = manifest.versions[version].dist.tarball
    const res = await fetch(tarballUrl)
    if (!res.ok || !res.body) {
        throw new Error(`Failed to download ${tarballUrl}`)
    }

    await untarStream(res.body, cacheDir)

    return getBaseDir()
}

const _packageJsonCache = new Map<string, unknown>()
export async function determineNpmEntrypoint(pkgPath: string, request: string) {
    if (!_packageJsonCache.has(pkgPath)) {
        _packageJsonCache.set(pkgPath, JSON.parse(await fsp.readFile(join(pkgPath, 'package.json'), 'utf8')))
    }
    const pkgJson = _packageJsonCache.get(pkgPath)!
    if (typeof pkgJson !== 'object' || pkgJson === null) {
        throw new Error('Invalid package.json')
    }

    if (request === '') request = '.'
    else request = `./${request}`

    async function resolveMaybeDts(jsFile: string) {
        // is there a .d.ts file nearby?
        const jsPath = join(pkgPath, jsFile)
        if (!jsPath.endsWith('.js')) return jsPath

        const dtsPath = jsPath.replace(/\.js$/, '.d.ts')
        if (await fileExists(dtsPath)) {
            return dtsPath
        }

        return jsPath
    }

    function resolveExportsValue(value: unknown): string | undefined {
        if (typeof value === 'string') {
            return value
        }
        if (typeof value === 'object' && value !== null) {
            if ('types' in value) {
                const resolved = resolveExportsValue(value.types)
                if (resolved) return resolved
            } else if ('import' in value) {
                const resolved = resolveExportsValue(value.import)
                if (resolved) return resolved
            } else if ('require' in value) {
                const resolved = resolveExportsValue(value.require)
                if (resolved) return resolved
            } else if ('default' in value) {
                const resolved = resolveExportsValue(value.default)
                if (resolved) return resolved
            }
        }
    }

    // "exports" overrides default path-based resolution
    if ('exports' in pkgJson) {
        if (typeof pkgJson.exports === 'string') {
            return resolveMaybeDts(pkgJson.exports)
        }

        if (!pkgJson.exports || typeof pkgJson.exports !== 'object') {
            throw new Error('Invalid exports field in package.json')
        }

        for (const [key, value] of Object.entries(pkgJson.exports)) {
            if (key === request || (key.endsWith('*') && request.startsWith(key.slice(0, -1)))) {
                const val = resolveExportsValue(value)
                if (!val) continue
                return resolveMaybeDts(val)
            }
        }

        throw new Error(`No matching export for ${request}`)
    }

    // default export
    if (request === '.') {
        if ('types' in pkgJson && typeof pkgJson.types === 'string') {
            return resolveMaybeDts(pkgJson.types)
        }
        if ('main' in pkgJson && typeof pkgJson.main === 'string') {
            return resolveMaybeDts(pkgJson.main)
        }
    }

    // fallback to path-based resolution
    // request can either be a folder (in which case we should look for index.js) or a file
    // or a js file directly
    const files = [request, `${request}.js`, `${request}/index.js`]
    for (const file of files) {
        const resolved = await resolveMaybeDts(file)
        if (await fileExists(join(pkgPath, resolved))) {
            return resolved
        }
    }

    throw new Error(`Could not resolve ${request} in ${pkgPath}`)
}

export function backResolveNpmEntrypoint(path: string): string {
    if (!path.match(/\.[a-z]+$/)) {
        // try some extensions
        for (const ext of ['.d.ts', '.js', '.cjs', '.mjs', '.ts']) {
            try {
                return backResolveNpmEntrypoint(path + ext)
            } catch {}
        }

        throw new Error(`Cannot back-resolve ${path}`)
    }

    let pkgPath = path
    while (true) {
        pkgPath = join(pkgPath, '..')
        if (fs.existsSync(join(pkgPath, 'package.json'))) {
            break
        }
        if (pkgPath === '/') {
            throw new Error('No package.json found')
        }
    }
    const request = `./${path.slice(pkgPath.length + 1)}`

    if (!_packageJsonCache.has(pkgPath)) {
        _packageJsonCache.set(pkgPath, JSON.parse(fs.readFileSync(join(pkgPath, 'package.json'), 'utf8')))
    }

    const pkgJson = _packageJsonCache.get(pkgPath)!
    if (typeof pkgJson !== 'object' || pkgJson === null) {
        throw new Error('Invalid package.json')
    }

    const pathWithoutDts = path.endsWith('.d.ts') ? path.slice(0, -5) : '' // so it can never match

    if ('exports' in pkgJson) {
        if (typeof pkgJson.exports === 'string') {
            if (request === '') return pkgJson.exports
            throw new Error(`Cannot back-resolve ${request} for ${pkgPath}`)
        }

        if (!pkgJson.exports || typeof pkgJson.exports !== 'object') {
            throw new Error('Invalid exports field in package.json')
        }

        for (const [key, value] of Object.entries(pkgJson.exports)) {
            if (typeof value === 'string') {
                if (value === request) return key
                if (key.endsWith('*') && request.startsWith(value.slice(0, -1))) {
                    return key.slice(0, -1) + request.slice(value.length)
                }
            }

            for (const v of Object.values(value)) {
                if (typeof v === 'string' && v === request) {
                    return key
                }
                if (typeof v === 'object' && v !== null) {
                    if ('types' in v && v.types === request) {
                        return key
                    }
                    if ('import' in v && v.import === pathWithoutDts) {
                        return key
                    }
                }
            }
        }
    }

    throw new Error(`Cannot back-resolve ${request} for ${pkgPath}`)
}
