# slow-types-compiler

poc compiler for jsr [slow types](https://jsr.io/docs/about-slow-types)

this package is intended to be a placeholder and a proof of concept while deno team comes up with a
blazing fast🚀🦀™ solution for that

> currently not published anywhere, as it's still very much wip

## usage

via cli:
```
slow-types-compiler fix --entry /path/to/jsr.json
```

via js:
```ts
import { processEntrypoint } from '@teidesu/slow-types-compiler'
import { Project } from 'ts-morph'

const project = new Project({ /* ... */ })
processEntrypoint(project.getSourceFileOrThrow('/path/to/entry.ts'))
```

## limitations

- jsr/npm libraries resolution is not fully supported (e.g. `@types/*`)
- merged namespaces are not supported
