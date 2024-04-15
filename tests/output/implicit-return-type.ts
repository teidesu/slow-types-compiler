/* eslint-disable unused-imports/no-unused-vars */
import type { Foo } from './some-types.ts'
import { getBar } from './some-types.ts'

export function implicitReturnType(): number {
    return 1
}

export function implicitReturnVoid(): void {
    location.reload()
}

export function implicitReturnTypeObject(): { a: number; } {
    return { a: 1 }
}

export function implicitReturnTypeArray(): number[] {
    return [1]
}

export function implicitReturnTypeConst(): readonly [1, "a"] {
    return [1, 'a'] as const
}

export function implicitReturnTypeTuple(): [number, string] {
    return [1, 'a'] as [number, string]
}

export function implicitReturnTypeImported(): Foo {
    const f: Foo = {
        a: 1,
        b: 'a',
        c: [1, 'a'],
    }
    return f
}

export function implicitReturnTypeImported2(): import("./some-types.ts").Bar {
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
    method(): number {
        return 1
    }

    get getter(): number {
        return 1
    }
}

export function internalFn(): number {
    return 42
}

export type IntenalFnRet = ReturnType<typeof internalFn>
