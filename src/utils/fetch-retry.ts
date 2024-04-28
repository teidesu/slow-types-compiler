export async function fetchRetry(input: string | URL | globalThis.Request, init?: RequestInit, retryParams?: {
    /** @default 1000 */
    timeout?: number
    /** @default 5 */
    retries?: number
}): Promise<Response> {
    const {
        timeout = 1000,
        retries = 5,
    } = retryParams ?? {}
    let retry = 0

    while (true) {
        try {
            return await fetch(input, init)
        } catch (err) {
            if (retry++ >= retries) throw err

            await new Promise(resolve => setTimeout(resolve, timeout))
        }
    }
}
