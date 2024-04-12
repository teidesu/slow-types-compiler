export interface Foo {
    a: number
    b: string
    c: [number, string]
}

export interface Bar {
    a: number
    b: string
    c: [number, string]
}

export function getBar(): Bar {
    return {
        a: 1,
        b: 'a',
        c: [1, 'a'],
    }
}
