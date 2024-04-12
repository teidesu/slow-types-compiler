interface ISuperClass {}

function getSuperClass() {
    return class SuperClass implements ISuperClass {}
}

function getSuperClass2(): new () => ISuperClass {
    return class SuperClass implements ISuperClass {}
}

export class MyClassWillFail extends getSuperClass() {}
export class MyClassWillOk extends getSuperClass2() {}

export class KeepMyClass extends MyClassWillOk {}
