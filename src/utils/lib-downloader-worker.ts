/* eslint-disable no-console */
import process from 'node:process'
import { type ImportSpecifier, parseImportSpecifier, splitImportRequest } from './external-libs.js'
import { determineNpmEntrypoint, downloadNpmPackage } from './npm.js'
import { determineJsrEntrypoint, downloadJsrPackage } from './jsr.js'

async function main(imports: Record<string, ImportSpecifier>, requests?: string[]) {
    if (!requests) {
        // download all imports
        return Promise.all(Object.values(imports).map((spec) => {
            switch (spec.registry) {
                case 'npm': {
                    return downloadNpmPackage(spec)
                }
                case 'jsr': {
                    return downloadJsrPackage(spec)
                }
                default: {
                    throw new Error(`Unknown registry: ${spec.registry}`)
                }
            }
        }))
    }

    return Promise.all(requests.map(async (request) => {
        const [pkg, path] = splitImportRequest(request)
        let spec: ImportSpecifier
        if (request.startsWith('npm:') || request.startsWith('jsr:')) {
            spec = parseImportSpecifier(pkg)
        } else {
            spec = imports[pkg]
        }
        if (!spec) {
            return { error: `cannot resolve package: ${pkg}` }
        }

        switch (spec.registry) {
            case 'npm': {
                const pkgDir = await downloadNpmPackage(spec)
                return determineNpmEntrypoint(pkgDir, path)
            }
            case 'jsr': {
                const pkgDir = await downloadJsrPackage(spec)
                return determineJsrEntrypoint(pkgDir, path)
            }
        }
    }))
}

// const { sharedBuffer, workerPort } = workerData
// const sharedArray = new Int32Array(sharedBuffer)

// workerPort.on('message', (msg) => {
//     console.log(msg)
// })

const args = JSON.parse(process.argv[2]) as Parameters<typeof main>
const start = Date.now()
main(...args).then((result) => {
    const end = Date.now()
    console.log(JSON.stringify({ result, time: end - start }))
}).catch((error) => {
    console.log(JSON.stringify({
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
    }))
})
