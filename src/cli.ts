#!/usr/bin/env node
/* eslint-disable no-console */
import process from 'node:process'
import * as fs from 'node:fs'
import * as path from 'node:path'

import arg from 'arg'

import { processEntrypoint } from './slow-types.js'
import { parseJsrJson } from './utils/jsr-json.js'
import { preDownloadLibs } from './utils/lib-downloader.js'
import { createProject, processPackage } from './project.js'

const args = arg({
    '--entry': String,
    '--dry-run': Boolean,
})

const action = args._[0]
switch (action) {
    case 'fix': {
        if (!args['--entry']) {
            console.error('Usage: slow-types fix --entry <path>')
            console.error('  --entry: path to deno.json or jsr.json file')
            process.exit(1)
        }

        const project = createProject()

        processPackage(project, args['--entry'])

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
    default: {
        console.error('Unknown action:', action)
        console.error('Usage: slow-types <action>')
        console.error('  fix: fix "slow types" in-place in a project')
        process.exit(1)
    }
}
