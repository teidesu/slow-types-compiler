#!/usr/bin/env node
/* eslint-disable no-console */
import process from 'node:process'

import { isAbsolute, join } from 'node:path'
import arg from 'arg'

import { createProject, processPackage } from './project.js'
import { populateFromUpstream } from './populate.js'

const action = arg({}, { permissive: true })._[0]
switch (action) {
    case 'fix': {
        const args = arg({
            '--entry': String,
            '--dry-run': Boolean,
        })

        if (!args['--entry']) {
            console.error('Usage: slow-types-compiler fix --entry <path>')
            console.error('  --entry: path to deno.json or jsr.json file')
            process.exit(1)
        }

        const project = createProject()

        let entry = args['--entry']
        if (!isAbsolute(entry)) {
            entry = join(process.cwd(), entry)
        }

        processPackage(project, entry)

        if (args['--dry-run']) {
            const unsavedSourceFiles = project.getSourceFiles().filter(s => !s.isSaved())
            if (unsavedSourceFiles.length) {
                console.log('Changes to be written:')
                for (const sourceFile of unsavedSourceFiles) {
                    console.log('---------- %s ----------', sourceFile.getFilePath())
                    console.log(sourceFile.getFullText())
                }
            } else {
                console.log('No changes were made')
            }
        } else {
            project.saveSync()
        }
        break
    }
    case 'populate': {
        const args = arg({
            '--upstream': String,
            '--downstream': String,
            '--unstable-create-via-api': Boolean,
            '--token': String,
            '--quiet': Boolean,
            '--publish-args': String,
            '-q': '--quiet',
        } as const, { argv: process.argv.slice(3) })

        const packages = args._

        if (!args['--downstream'] || !packages.length) {
            console.log('Usage: slow-types-compiler populate <options> <pkg1> [pkg2] ...')
            console.log('  --downstream: URL of the downstream registry (required)')
            console.log('  --unstable-create-via-api: create packages via API')
            console.log('  --token: API token')
            console.log('  --publish-args: Additional arguments to pass to `deno publish`')
            console.log('  --quiet, -q: Suppress output')
            console.log('  <pkg1> [pkg2] ...: packages to populate (with version, e.g. `@std/fs@0.105.0`)')
            process.exit(1)
        }

        populateFromUpstream({
            upstream: args['--upstream'],
            downstream: args['--downstream'],
            packages,
            unstable_createViaApi: args['--unstable-create-via-api'],
            token: args['--token'],
            quiet: args['--quiet'],
        }).catch((err) => {
            console.error(err)
            process.exit(1)
        })
        break
    }
    default: {
        console.error('Unknown action:', action)
        console.error('Usage: slow-types <action>')
        console.error('  fix: fix "slow types" in-place in a project')
        process.exit(1)
    }
}
