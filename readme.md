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
import { processEntrypoint } from '@teidesu/slow-types-compiler'
import { Project } from 'ts-morph'

const project = new Project({ /* ... */ })
processEntrypoint(project.getSourceFileOrThrow('/path/to/entry.ts'))
```

## limitations

- jsr/npm libraries resolution is not fully supported (e.g. `@types/*`)
- merged namespaces are not supported
