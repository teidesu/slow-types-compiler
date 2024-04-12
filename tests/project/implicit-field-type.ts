/* eslint-disable unused-imports/no-unused-vars */
import { getBar } from './some-types.ts'

export class Person {
    name
    age
    bar
    internal
    constructor(name: string, age: number) {
        this.name = name
        this.age = age
        this.bar = getBar()
        this.internal = new PersonInternal(name)
    }
}

class PersonInternal {
    name
    constructor(name: string) {
        this.name = name
    }
}

class PersonInternalUnused {
    name
    constructor(name: string) {
        this.name = name
    }
}
