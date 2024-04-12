interface ISuperClass {}

function getSuperClass() {
    return class SuperClass implements ISuperClass {}
}

function getSuperClass2(): new () => ISuperClass {
    return class SuperClass implements ISuperClass {}
}

export class MyClassWillFail extends getSuperClass() {}
const __$STC_TMP_0: new () => ISuperClass = getSuperClass2()
export class MyClassWillOk extends __$STC_TMP_0 {}

export class KeepMyClass extends MyClassWillOk {}
