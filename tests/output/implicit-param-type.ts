/* eslint-disable unused-imports/no-unused-vars */
import { getBar } from './some-types.ts'

const randomString = Math.random().toString(36)

export function byFunction(bar: import("./some-types.ts").Bar = getBar()): void {}
export function byField(bar: string = randomString): void {}

export class Person {
    name: string
    constructor(name: string = randomString) {
        this.name = name
    }

    byFunction(bar: import("./some-types.ts").Bar = getBar()): void {}
    byField(bar: string = this.name): void {}

    static staticMethod(bar: import("./some-types.ts").Bar = getBar()): void {}
}
