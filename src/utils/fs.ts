import * as fsp from 'node:fs/promises'

export async function fileExists(path: string) {
    try {
        await fsp.access(path)
        return true
    } catch {
        return false
    }
}
