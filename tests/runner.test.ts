import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createProject, parseJsrJson, processPackage } from '../src/index.js'

describe('example project', { timeout: 120000 }, () => {
    const projectDir = fileURLToPath(new URL('./project', import.meta.url))
    const outputDir = fileURLToPath(new URL('./output', import.meta.url))

    const project = createProject()
    processPackage(project, `${projectDir}/jsr.json`)

    const sourceFiles = project.getSourceFiles()
        .filter(sourceFile => sourceFile.getFilePath().startsWith(projectDir))
        .map(sourceFile => sourceFile.getFilePath().slice(projectDir.length + 1))
        .filter(file => fs.existsSync(`${outputDir}/${file}`))

    // todo it doesnt catch all files for some reason
    it.each(Object.values(sourceFiles))('%s', (file) => {
        const sourceFile = project.getSourceFileOrThrow(`${projectDir}/${file}`)
        const expectedResult = fs.readFileSync(`${outputDir}/${file}`, 'utf-8')
        expect(sourceFile.getFullText()).toEqual(expectedResult)
    })
})
