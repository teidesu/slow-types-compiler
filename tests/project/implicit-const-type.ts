/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable one-var, antfu/top-level-function */
import Long from 'long'
import Long2 from 'npm:long@5.2.3'
import type { Foo } from './some-types.ts'
import { getBar } from './some-types.ts'

export const implicitObjectReturned = getBar()
export const implicitObjectIife = (() => ({
    a: 1,
    b: 'asd',
}))()
export const implicitFunction = () => {
    return 42
}
export const longZero = Long.ZERO
export const longZeroInline = Long2.ZERO

export const reexport = implicitFunction
export const mixed1 = implicitFunction, mixed2 = implicitFunction
export const shouldKeepType: Foo | null = { a: 1, b: 'asd', c: [1, 'a'] }

// destructuring
export const { foo, bar } = { foo: 5, bar: 'world' }
// these should not mix up
export const
    { foo: foo1, bar: bar1 } = { foo: 5, bar: 'world 1' },
    { foo: foo2, bar: bar2 } = { foo: 5, bar: 'world 2' },
    shouldKeep = true

const shouldKeepInternal = true
