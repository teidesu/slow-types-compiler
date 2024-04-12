import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'
import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import { join } from 'node:path'
import tarStream from 'tar-stream'
import gunzip from 'gunzip-maybe'

export function webStreamToNode(stream: ReadableStream<Uint8Array>): Readable {
    const reader = stream.getReader()
    let ended = false

    const readable = new Readable({
        async read() {
            try {
                const { done, value } = await reader.read()

                if (done) {
                    this.push(null)
                } else {
                    this.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength))
                }
            } catch (err) {
                this.destroy(err as Error)
            }
        },
        destroy(error, cb) {
            if (!ended) {
                void reader
                    .cancel(error)
                    .catch(() => {})
                    .then(() => {
                        cb(error)
                    })

                return
            }

            cb(error)
        },
    })

    reader.closed
        .then(() => {
            ended = true
        })
        .catch((err) => {
            readable.destroy(err as Error)
        })

    return readable
}

export async function untarStream(stream: ReadableStream<Uint8Array>, targetDir: string) {
    const tar = tarStream.extract()

    webStreamToNode(stream)
        .pipe(gunzip())
        .pipe(tar)

    for await (const entry of tar) {
        const filePath = join(targetDir, entry.header.name)

        if (entry.header.type === 'file') {
            await fsp.mkdir(join(filePath, '..'), { recursive: true })
            const pipe = entry.pipe(fs.createWriteStream(filePath))
            await new Promise((resolve, reject) => {
                pipe.on('finish', resolve)
                pipe.on('error', reject)
            })
        } else if (entry.header.type === 'directory') {
            await fsp.mkdir(filePath, { recursive: true })
        }
    }
}
