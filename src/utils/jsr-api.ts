import { fetchRetry } from './fetch-retry.js'

export async function jsrGetScopeInfo(params: {
    scope: string
    registry: string
}) {
    const { scope, registry } = params
    const res = await fetchRetry(`${registry}/api/scopes/${scope}`)

    if (res.status === 404) return null
    if (res.status !== 200) {
        throw new Error(`Failed to get scope info: ${res.statusText}`)
    }

    return await res.json()
}

export async function jsrCreateScope(params: {
    name: string
    registry: string
    token: string
    quiet?: boolean
}) {
    const { name, registry: registry_, token, quiet } = params
    const registry = registry_.replace(/\/$/, '')

    const create = await fetchRetry(`${registry}/api/scopes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': `token=${token}`,
        },
        body: JSON.stringify({ scope: name }),
    })

    if (create.status !== 200) {
        throw new Error(`Failed to create scope: ${create.statusText} ${await create.text()}`)
    }

    if (!quiet) {
        // eslint-disable-next-line no-console
        console.log('Created scope @%s', name)
    }
}

export async function jsrMaybeCreatePackage(params: {
    name: string
    registry: string
    token: string
    quiet?: boolean
}) {
    const { name, registry: registry_, token, quiet } = params
    const registry = registry_.replace(/\/$/, '')

    const [scopeWithAt, packageName] = name.split('/')
    if (!packageName || !scopeWithAt || !scopeWithAt.startsWith('@')) {
        throw new Error('Invalid package name')
    }
    const scope = scopeWithAt.slice(1)

    // check if the package even exists
    const packageMeta = await fetchRetry(`${registry}/api/scopes/${scope}/packages/${packageName}`)
    if (packageMeta.status === 200) return // package already exists
    if (packageMeta.status !== 404) {
        throw new Error(`Failed to check package: ${packageMeta.statusText} ${await packageMeta.text()}`)
    }

    if (!quiet) {
        // eslint-disable-next-line no-console
        console.log('%s does not exist, creating..', name)
    }

    const create = await fetchRetry(`${registry}/api/scopes/${scope}/packages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': `token=${token}`,
        },
        body: JSON.stringify({ package: packageName }),
    })

    if (create.status !== 200) {
        const text = await create.text()

        if (create.status === 403) {
            // maybe the scope doesn't exist?
            const json = JSON.parse(text)
            if (json.code === 'actorNotScopeMember') {
                const info = await jsrGetScopeInfo({ scope, registry })

                if (info === null) {
                    await jsrCreateScope({ name: scope, registry, token, quiet })
                    return await jsrMaybeCreatePackage({
                        ...params,
                        quiet: true,
                    })
                }
            }
        }

        throw new Error(`Failed to create package: ${create.statusText} ${text}`)
    }
}
