export function determinePublishOrder(dependencies: Record<string, string[]>): string[] {
    const result: string[] = []

    const visited = new Set<string>()
    const visiting = new Set<string>()

    function visit(name: string) {
        if (visited.has(name)) {
            return
        }

        if (visiting.has(name)) {
            throw new Error('Circular dependency detected')
        }

        visiting.add(name)

        for (const dep of dependencies[name] || []) {
            visit(dep)
        }

        visiting.delete(name)
        visited.add(name)
        result.push(name)
    }

    for (const name in dependencies) {
        visit(name)
    }

    return result
}
