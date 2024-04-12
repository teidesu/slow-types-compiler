import { describe, expect, it } from 'vitest'
import { parseImportSpecifier } from './external-libs.js'

describe('parseImportSpecifier', () => {
    it('should parse npm: specifiers', () => {
        expect(parseImportSpecifier('npm:foo@^1.0.0')).toEqual({
            registry: 'npm',
            packageName: 'foo',
            version: '^1.0.0',
        })
    })

    it('should parse scoped npm: specifiers', () => {
        expect(parseImportSpecifier('npm:@foo/bar@1.0.0')).toEqual({
            registry: 'npm',
            packageName: '@foo/bar',
            version: '1.0.0',
        })
    })

    it('should parse jsr: specifiers', () => {
        expect(parseImportSpecifier('jsr:foo@1.0.0')).toEqual({
            registry: 'jsr',
            packageName: 'foo',
            version: '1.0.0',
        })
    })

    it('should parse scoped jsr: specifiers', () => {
        expect(parseImportSpecifier('jsr:@foo/bar@1.0.0')).toEqual({
            registry: 'jsr',
            packageName: '@foo/bar',
            version: '1.0.0',
        })
    })
})
