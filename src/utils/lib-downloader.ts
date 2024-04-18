import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, join, sep } from 'node:path'
import { type ImportSpecifier, getModuleCacheDirectory } from './external-libs.js'
import { backResolveNpmEntrypoint } from './npm.js'
import { backResolveJsrEntrypoint } from './jsr.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workerPath = import.meta.env?.PROD
    ? join(__dirname, 'worker.js')
    : fileURLToPath(new URL('./lib-downloader-worker.ts', import.meta.url))
// @ts-expect-error bun global
const executable = import.meta.env?.PROD || typeof Bun !== 'undefined' ? process.execPath : 'tsx'

function execSync(...args: any[]): any {
    const result = execFileSync(executable, [
        workerPath,
        JSON.stringify(args),
    ], {
        stdio: 'pipe',
        encoding: 'utf8',
    })
    const json = JSON.parse(result)
    if (json.error) {
        const err = new Error(json.error.message)
        err.stack = json.error.stack
        throw err
    }
    // console.log('inner script time: %dms', json.time)
    return json.result.map((r: unknown) => {
        if (typeof r === 'object' && r !== null && 'error' in r) {
            console.warn(r.error)
            return undefined
        }
        return r
    })
}

export function preDownloadLibs(imports: Record<string, ImportSpecifier>): string[] {
    return execSync(imports)
}

const caches = new Map<string, Map<string, string>>()
const hashCache = new WeakMap<object, string>()
export function resolveLibEntrypoints(imports: Record<string, ImportSpecifier>, requests: string[]): string[] {
    let hash = hashCache.get(imports)
    if (!hash) {
        hash = JSON.stringify(imports)
        hashCache.set(imports, hash)
    }
    let cache = caches.get(hash)
    if (!cache) {
        cache = new Map()
        caches.set(hash, cache)
    }

    const ret: string[] = []
    const cacheMisses: Record<number, string> = {}

    for (let i = 0; i < requests.length; i++) {
        const request = requests[i]

        if (cache.has(request)) {
            ret.push(cache.get(request)!)
        } else {
            cacheMisses[i] = request
            ret.push('')
        }
    }

    if (!Object.keys(cacheMisses).length) {
        return ret
    }

    const nonCachedEntries = Object.entries(cacheMisses)
    const results = execSync(imports, nonCachedEntries.map(([_, request]) => request))
    for (let i = 0; i < nonCachedEntries.length; i++) {
        const [index, request] = nonCachedEntries[i]
        const result = results[i]
        if (result) {
            cache.set(request, result)
            ret[Number(index)] = result
        }
    }

    return ret
}

export function backwardsResolveLibEntrypoint(path: string): string {
    const cacheDir = getModuleCacheDirectory()
    if (!path.startsWith(cacheDir)) {
        throw new Error(`Invalid path: ${path}`)
    }

    const [registry, _domain, specifier] = path.slice(cacheDir.length + 1).split(sep)

    let request
    switch (registry) {
        case 'npm':
            request = backResolveNpmEntrypoint(path)
            break
        case 'jsr':
            request = backResolveJsrEntrypoint(path)
            break
        default:
            throw new Error(`Unknown registry: ${registry}`)
    }

    if (request.startsWith('.')) request = request.slice(1)

    return `${registry}:${specifier.replace('+', '/')}${request}`
}
