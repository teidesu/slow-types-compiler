import * as fs from 'node:fs'
import { dirname, join } from 'node:path'
import type { CompilerOptions, ResolutionHostFactory } from 'ts-morph'
import { ModuleKind, Project, ScriptTarget, ts } from 'ts-morph'
import type { JsrJson } from './utils/jsr-json.js'
import { findClosestJsrJson, parseJsrJson } from './utils/jsr-json.js'
import { preDownloadLibs, resolveLibEntrypoints } from './utils/lib-downloader.js'
import { processEntrypoint } from './slow-types.js'
import { parseImportSpecifier, splitImportRequest } from './utils/external-libs.js'

export const externalLibsResolutionHost: ResolutionHostFactory = (moduleResolutionHost, getCompilerOptions) => {
    return {
        resolveModuleNames: (moduleNames, containingFile) => {
            const compilerOptions = getCompilerOptions()
            const resolvedModules: (ts.ResolvedModule | undefined)[] = []

            const tryResolveLib: Record<number, string> = {}

            for (const moduleName of moduleNames.map(removeTsExtension)) {
                const result = ts.resolveModuleName(moduleName, containingFile, compilerOptions, moduleResolutionHost)
                if (result.resolvedModule) {
                    resolvedModules.push(result.resolvedModule)
                } else {
                    if (!moduleName.match(/^(node|bun|deno):/)) {
                        tryResolveLib[resolvedModules.length] = moduleName
                    }

                    resolvedModules.push(undefined)
                }
            }

            if (Object.keys(tryResolveLib).length) {
                // try to resolve external libraries
                const entries = Object.entries(tryResolveLib)
                const jsrJsonPath = findClosestJsrJson(containingFile)
                const jsrJson = jsrJsonPath ? parseJsrJson(fs.readFileSync(jsrJsonPath, 'utf-8')) : undefined

                if (jsrJson && jsrJson.imports) {
                    const resolved = resolveLibEntrypoints(jsrJson.imports, entries.map(([_, moduleName]) => moduleName))

                    for (let i = 0; i < entries.length; i++) {
                        const [index] = entries[i]
                        const resolvedModule = resolved[i]
                        if (resolvedModule) {
                            resolvedModules[Number(index)] = {
                                resolvedFileName: resolvedModule,
                                isExternalLibraryImport: true,
                            }
                        }
                    }
                }
            }

            return resolvedModules
        },
    }

    function removeTsExtension(moduleName: string) {
        if (moduleName.slice(-3).toLowerCase() === '.ts') {
            return moduleName.slice(0, -3)
        }
        return moduleName
    }
}

export const defaultCompilerOptions: CompilerOptions = {
    allowJs: true,
    esModuleInterop: true,
    experimentalDecorators: false,
    inlineSourceMap: true,
    isolatedModules: true,
    jsx: ts.JsxEmit.React,
    module: ModuleKind.ESNext,
    moduleDetection: ts.ModuleDetectionKind.Force,
    strict: true,
    target: ScriptTarget.ESNext,
    useDefineForClassFields: true,
}

export function createProject() {
    return new Project({
        compilerOptions: defaultCompilerOptions,
        resolutionHost: externalLibsResolutionHost,
    })
}

export function processPackage(project: Project, jsrJsonPath: string) {
    const packageDir = dirname(jsrJsonPath)
    const jsr = parseJsrJson(fs.readFileSync(jsrJsonPath, 'utf-8'))
    if (jsr.compilerOptions) {
        project.compilerOptions.set(jsr.compilerOptions)
    }

    // pre-download root jsr.json libraries
    if (jsr.imports) preDownloadLibs(jsr.imports)

    const entrypoints = typeof jsr.exports === 'string' ? [jsr.exports] : Object.values(jsr.exports)

    for (const it of entrypoints) {
        const filePath = join(packageDir, it)
        const file = project.addSourceFileAtPath(filePath)
        project.resolveSourceFileDependencies()
        processEntrypoint(file)
    }
}
