import { join } from 'node:path'
import process from 'node:process'

let _cacheDir: string | undefined
export function getModuleCacheDirectory(): string {
    if (process.env.STC_CACHE_DIR) return process.env.STC_CACHE_DIR
    if (_cacheDir) return _cacheDir

    switch (process.platform) {
        case 'win32': {
            return _cacheDir = join(process.env.LOCALAPPDATA || process.env.APPDATA || 'C:', 'stc-cache')
        }
        case 'darwin': {
            return _cacheDir = join(process.env.HOME || '/tmp', 'Library', 'Caches', 'stc')
        }
        default: {
            return _cacheDir = join(process.env.XDG_CACHE_HOME || process.env.HOME || '/tmp', '.cache', 'stc')
        }
    }
}

export interface ImportSpecifier {
    registry: 'npm' | 'jsr'
    packageName: string
    version: string
}

export function parseImportSpecifier(importSpecifier: string): ImportSpecifier {
    let [registry, specifier] = importSpecifier.split(':')
    if (registry !== 'npm' && registry !== 'jsr') {
        throw new Error(`Invalid import specifier: ${importSpecifier}`)
    }

    if (registry === 'jsr' && specifier[0] === '/') {
        specifier = specifier.slice(1)
    }

    if (specifier.startsWith('@')) {
        const [pkg, version] = specifier.slice(1).split('@')
        return { registry, packageName: `@${pkg}`, version }
    }

    const [pkg, version] = specifier.split('@')
    return { registry, packageName: pkg, version }
}

export function splitImportRequest(request: string): [string, string] {
    // what the fuck, deno?
    if (request.startsWith('jsr:/')) request = `jsr:${request.slice(5)}`

    const parts = request.split('/')
    if (parts[0].match(/^(npm:|jsr:)?@/)) {
        // scoped package
        return [parts.slice(0, 2).join('/'), parts.slice(2).join('/')]
    }

    // normal package
    return [parts[0], parts.slice(1).join('/')]
}
