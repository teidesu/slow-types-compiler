import { join } from 'node:path'
import process from 'node:process'

export function getModuleCacheDirectory(): string {
    if (process.env.STC_CACHE_DIR) return process.env.STC_CACHE_DIR

    switch (process.platform) {
        case 'win32': {
            return join(process.env.LOCALAPPDATA || process.env.APPDATA || 'C:', 'stc-cache')
        }
        case 'darwin': {
            return join(process.env.HOME || '/tmp', 'Library', 'Caches', 'stc')
        }
        default: {
            return join(process.env.XDG_CACHE_HOME || process.env.HOME || '/tmp', '.cache', 'stc')
        }
    }
}

export interface ImportSpecifier {
    registry: 'npm' | 'jsr'
    packageName: string
    version: string
}

export function parseImportSpecifier(importSpecifier: string): ImportSpecifier {
    const [registry, specifier] = importSpecifier.split(':')
    if (registry !== 'npm' && registry !== 'jsr') {
        throw new Error(`Invalid import specifier: ${importSpecifier}`)
    }

    if (specifier.startsWith('@')) {
        const [pkg, version] = specifier.slice(1).split('@')
        return { registry, packageName: `@${pkg}`, version }
    }

    const [pkg, version] = specifier.split('@')
    return { registry, packageName: pkg, version }
}

export function splitImportRequest(request: string): [string, string] {
    const parts = request.split('/')
    if (parts[0].match(/^(npm:|jsr:)?@/)) {
        // scoped package
        return [parts.slice(0, 2).join('/'), parts.slice(2).join('/')]
    }

    // normal package
    return [parts[0], parts.slice(1).join('/')]
}
