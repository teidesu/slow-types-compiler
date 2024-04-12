/* eslint-disable unused-imports/no-unused-vars */
import { getBar } from './some-types.ts'

const randomString = Math.random().toString(36)

export function byFunction(bar = getBar()) {}
export function byField(bar = randomString) {}

export class Person {
    name: string
    constructor(name = randomString) {
        this.name = name
    }

    byFunction(bar = getBar()) {}
    byField(bar = this.name) {}

    static staticMethod(bar = getBar()) {}
}
