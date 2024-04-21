import * as fsp from 'node:fs/promises'

export async function fileExists(path: string) {
    try {
        const stat = await fsp.stat(path)
        return stat.isFile()
    } catch {
        return false
    }
}

export async function directoryExists(path: string) {
    try {
        const stat = await fsp.stat(path)
        return stat.isDirectory()
    } catch {
        return false
    }
}
