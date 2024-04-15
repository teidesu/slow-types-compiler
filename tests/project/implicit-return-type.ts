/* eslint-disable unused-imports/no-unused-vars */
import type { Foo } from './some-types.ts'
import { getBar } from './some-types.ts'

export function implicitReturnType() {
    return 1
}

export function implicitReturnVoid() {
    location.reload()
}

export function implicitReturnTypeObject() {
    return { a: 1 }
}

export function implicitReturnTypeArray() {
    return [1]
}

export function implicitReturnTypeConst() {
    return [1, 'a'] as const
}

export function implicitReturnTypeTuple() {
    return [1, 'a'] as [number, string]
}

export function implicitReturnTypeImported() {
    const f: Foo = {
        a: 1,
        b: 'a',
        c: [1, 'a'],
    }
    return f
}

export function implicitReturnTypeImported2() {
    return getBar()
}

function keepsNonExported() {
    return 1
}

export function keepsExplicitReturnType(): 1 | 2 | 3 {
    return 1
}

export function keepsNested(): number {
    function nested() {
        return 1
    }

    return 1
}

export class Class {
    method() {
        return 1
    }

    get getter() {
        return 1
    }
}

export function internalFn() {
    return 42
}

export type IntenalFnRet = ReturnType<typeof internalFn>
