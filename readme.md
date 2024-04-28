# slow-types-compiler

poc compiler for jsr [slow types](https://jsr.io/docs/about-slow-types)

this package is intended to be a placeholder and a proof of concept while deno team comes up with a
blazing fast🚀🦀™ solution for that

**disclaimer**: this pile of garbage is not actively maintained, meaning that prs will probably be merged but no issues will be addressed by me
because i just don't care enough. it will probably not work out of the box for you, too. feel free to fork and adapt it to your needs

## usage

via cli:
```
pnpx @teidesu/slow-types-compiler fix --entry /path/to/jsr.json
```

via js:
```ts
import * as stc from '@teidesu/slow-types-compiler'

const project = stc.createProject() // ts-morph project
stc.processPackage(project, '/path/to/deno.json') // or jsr.json
project.saveSync()
```

## populate

this package provides a `populate` command that can be used to populate a local
jsr instance with packages from [jsr.io](https://jsr.io)

via cli
```
$ pnpx @teidesu/slow-types-compiler populate
Usage: slow-types-compiler populate <options> <pkg1> [pkg2] ...
  --downstream: URL of the downstream registry (required)
  --unstable-create-via-api: create packages via API
  --token: API token
  --publish-args: Additional arguments to pass to `deno publish`
  --quiet, -q: Suppress output
  <pkg1> [pkg2] ...: packages to populate (with version, e.g. `@std/fs@0.105.0`)
```

via js
```ts
import { populateFromUpstream } from '@teidesu/slow-types-compiler'

populateFromUpstream({ ... })
```

## limitations

- jsr/npm libraries resolution is not fully supported (e.g. `@types/*`)
- merged namespaces are not supported
