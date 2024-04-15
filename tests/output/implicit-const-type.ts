/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable one-var, antfu/top-level-function */
import Long from 'long'
import Long2 from 'npm:long@5.2.3'
import type { Foo } from './some-types.ts'
import { getBar } from './some-types.ts'

export const implicitObjectReturned: import("./some-types.ts").Bar = getBar()
export const implicitObjectIife: { a: number; b: string; } = (() => ({
    a: 1,
    b: 'asd',
}))()
export const implicitFunction: () => number = () => {
    return 42
}
export const longZero: Long = Long.ZERO
export const longZeroInline: Long = Long2.ZERO

export const reexport: () => number = implicitFunction
export const mixed1: () => number = implicitFunction, mixed2: () => number = implicitFunction
export const shouldKeepType: Foo | null = { a: 1, b: 'asd', c: [1, 'a'] }

const inner: 123 = 123
export type InnerTypeRef = typeof inner

// destructuring
const __$STC_TMP_0 = { foo: 5, bar: 'world' }
export const foo: number = __$STC_TMP_0.foo
export const bar: string = __$STC_TMP_0.bar
// these should not mix up
const __$STC_TMP_1 = { foo: 5, bar: 'world 1' }
export const foo1: number = __$STC_TMP_1.foo
export const bar1: string = __$STC_TMP_1.bar
const __$STC_TMP_2 = { foo: 5, bar: 'world 2' }
export const foo2: number = __$STC_TMP_2.foo
export const bar2: string = __$STC_TMP_2.bar


export const
    shouldKeep: true = true

const shouldKeepInternal = true
