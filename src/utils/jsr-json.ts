import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ts } from 'ts-morph'
import type { ImportSpecifier } from './external-libs.js'
import { parseImportSpecifier } from './external-libs.js'

export interface JsrJson {
    name: string
    version: string
    exports: string | Record<string, string>
    imports?: Record<string, ImportSpecifier>
}

export function parseJsrJson(json: string): JsrJson {
    // abuse ts compiler to parse jsonc
    const res = ts.parseConfigFileTextToJson('jsr.json', json)

    if (res.error) {
        throw new Error(res.error.messageText.toString())
    }

    const obj = res.config

    if (typeof obj !== 'object' || obj === null) {
        throw new Error('Expected object')
    }

    if (typeof obj.name !== 'string') {
        throw new TypeError('Expected "name" to be a string')
    }

    if (typeof obj.version !== 'string') {
        throw new TypeError('Expected "version" to be a string')
    }

    if (typeof obj.exports !== 'string' && (typeof obj.exports !== 'object' || obj.exports === null)) {
        throw new TypeError('Expected "exports" to be a string or an object')
    }

    if (typeof obj.exports !== 'string') {
        for (const key in obj.exports) {
            if (typeof key !== 'string') {
                throw new TypeError('exports: Expected key to be a string')
            }

            if (typeof obj.exports[key] !== 'string') {
                throw new TypeError('exports: Expected value to be a string')
            }
        }
    }

    if (obj.imports !== undefined) {
        if (typeof obj.imports !== 'object' || obj.imports === null) {
            throw new TypeError('Expected "imports" to be an object')
        }

        for (const key in obj.imports) {
            if (typeof key !== 'string') {
                throw new TypeError('imports: Expected key to be a string')
            }

            if (typeof obj.imports[key] !== 'string') {
                throw new TypeError('imports: Expected value to be a string')
            }

            obj.imports[key] = parseImportSpecifier(obj.imports[key])
        }
    }

    return obj
}

const _findClosestJsrJsonCache = new Map<string, string | null>()
export function findClosestJsrJson(path: string): string | null {
    while (true) {
        if (_findClosestJsrJsonCache.has(path)) {
            return _findClosestJsrJsonCache.get(path)!
        }
        for (const file of ['jsr.json', 'deno.json', 'jsr.jsonc', 'deno.jsonc']) {
            if (existsSync(join(path, file))) {
                _findClosestJsrJsonCache.set(path, join(path, file))
                return join(path, file)
            }
        }

        if (existsSync(join(path, 'package.json'))) {
            _findClosestJsrJsonCache.set(path, null)
            return null
        }

        const parent = join(path, '..')
        if (parent === path) {
            return null
        }

        path = parent
    }
}
