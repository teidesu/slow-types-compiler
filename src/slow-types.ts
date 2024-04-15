import type { ClassDeclaration, ModifierableNode, Node, ParameteredNode, ReturnTypedNode, SourceFile, TypedNode, VariableDeclaration, WriterFunction } from 'ts-morph'
import { ts } from 'ts-morph'
import { getModuleCacheDirectory } from './utils/external-libs.js'
import { backwardsResolveLibEntrypoint } from './utils/lib-downloader.js'

function maybeFixImportedType(file: SourceFile, code: string) {
    // todo: is there a better way to do this?
    // ts-morph (and probably ts compiler host actually) returns import()-ed files as absolute paths
    // we want them to be relative to the file they're imported in + add .ts extension for deno
    if (!code.includes('import(')) return code // fast path

    const project = file.getProject()
    const tmpFile = project.createSourceFile('tmp.ts', `const a: ${code}`, { overwrite: true })
    const expr = tmpFile.getStatements()[0]
        .asKindOrThrow(ts.SyntaxKind.VariableStatement)
        .getDeclarations()[0]
        .getTypeNodeOrThrow()

    let changed = false

    const fixNode = (node: Node) => {
        function fixStringLiteral(node: Node) {
            if (!node.isKind(ts.SyntaxKind.StringLiteral)) {
                return
            }

            let text = node.getLiteralText()
            let textChanged = false

            if (text.startsWith(getModuleCacheDirectory())) {
                text = backwardsResolveLibEntrypoint(text)
                textChanged = true
            } else {
                if (text[0] !== '.') {
                // relative path
                    text = file.getRelativePathAsModuleSpecifierTo(text)
                    textChanged = true
                }

                if (!text.match(/\.[a-z0-9]+$/)) {
                    text += '.ts'
                    textChanged = true
                }
            }

            if (textChanged) {
                node.replaceWithText(JSON.stringify(text))
                changed = true
            }
        }

        switch (true) {
            case node.isKind(ts.SyntaxKind.ImportType): {
                const arg = node.getArgument()
                if (!arg.isKind(ts.SyntaxKind.LiteralType)) break
                fixStringLiteral(arg.getLiteral())
                break
            }
            case node.isKind(ts.SyntaxKind.CallExpression): {
                if (!node.getExpression().isKind(ts.SyntaxKind.ImportKeyword)) break

                const arg = node.getArguments()[0]
                fixStringLiteral(arg)
                break
            }
        }
    }

    fixNode(expr)
    if (!changed) expr.forEachDescendant(fixNode)

    if (changed) {
        const newCode = expr.print()
        project.removeSourceFile(tmpFile)
        return newCode
    }

    project.removeSourceFile(tmpFile)
    return code
}

const TMP_PREFIX = '__$STC_TMP_'

const tmpVarMap = new WeakMap<SourceFile, number>()
function getTmpVarName(file: SourceFile) {
    const uid = tmpVarMap.get(file) ?? 0
    tmpVarMap.set(file, uid + 1)
    return `${TMP_PREFIX}${uid}`
}

const processedMap = new WeakSet<any>()
function isNodeProcessed(node: any) {
    return processedMap.has(node)
}
function markNodeProcessed(node: any) {
    processedMap.add(node)
}

function fixReturnTypes(file: SourceFile, node: ReturnTypedNode) {
    if (node.getReturnTypeNode()) return
    node.setReturnType(maybeFixImportedType(file, node.getReturnType().getText(node as any)))
}

function fixParamsTypes(file: SourceFile, node: ParameteredNode) {
    node.getParameters().forEach((param) => {
        if (param.getTypeNode()) return
        param.setType(maybeFixImportedType(file, param.getType().getText(param)))
    })
}

function isPublicField(field: ModifierableNode) {
    return !(field.hasModifier(ts.SyntaxKind.PrivateKeyword) || field.hasModifier(ts.SyntaxKind.ProtectedKeyword))
}

function isTypeQueryOfPrivateField(cls: ClassDeclaration, typeNode: Node) {
    if (!typeNode.isKind(ts.SyntaxKind.TypeQuery)) return false
    const exprName = typeNode.getExprName()
    if (!exprName.isKind(ts.SyntaxKind.QualifiedName)) return false

    const left1 = exprName.getLeft()
    const right1 = exprName.getRight()

    if (!left1.isKind(ts.SyntaxKind.QualifiedName)) return false
    const left2 = left1.getLeft()
    const right2 = left1.getRight()

    if (!left2.isKind(ts.SyntaxKind.Identifier)) return false
    if (!right1.isKind(ts.SyntaxKind.Identifier)) return false

    // left2, right2, right1 are all identifiers at this point

    if (right2.getText() !== 'prototype') return false
    if (left2.getSymbol() !== cls.getSymbol()) return false

    const field = cls.getInstanceProperties().find(p => p.getName() === right1.getText())
    return field && !isPublicField(field)
}

function processClass(cls: ClassDeclaration) {
    if (isNodeProcessed(cls)) return
    markNodeProcessed(cls)
    const file = cls.getSourceFile()

    const extendsClause = cls.getExtends()
    if (extendsClause) {
        // make sure it's not an expression
        const child = extendsClause.getChildren()[0]
        if (!child.isKind(ts.SyntaxKind.Identifier)) {
            const extendsType = maybeFixImportedType(file, child.getType().getText(child))

            // example from jsr docs is not really possible to fix entirely automatically,
            // since there's no easy way to infer that `getSuperClass()` returns ISuperClass ctor
            // without too much heuristics, and even then it would only work in simple cases.
            // (example in question:)
            // function getSuperClass() {
            //     return class SuperClass implements ISuperClass {}
            // }
            // however, if we put an explicit type on the function
            // (e.g. new () => ISuperClass), we can fix it.
            //
            // todo: maybe add a warning for this case?
            // todo: is there a better way to detect this case?
            const isUnknown = extendsType.startsWith('typeof ')
            if (!isUnknown) {
                const tmpVar = getTmpVarName(file)
                const extendsExpr = `const ${tmpVar}: ${extendsType} = ${extendsClause.getText()}`
                file.insertStatements(cls.getChildIndex(), extendsExpr)
                extendsClause.replaceWithText(tmpVar)
            }
        }
    }

    const fixTypedNode = (node: Node & TypedNode & ModifierableNode) => {
        const typeNode = node.getTypeNode()
        if (!typeNode) {
            // fix implicit type
            node.setType(maybeFixImportedType(file, node.getType().getText(node)))
        }

        if (isPublicField(node)) {
            const typeNode = node.getTypeNodeOrThrow()
            // fix "Types must not reference private fields of the class"
            // (who even does that?? wtf)
            if (isTypeQueryOfPrivateField(cls, typeNode)) {
                typeNode.replaceWithText(maybeFixImportedType(file, node.getType().getText(node)))
                return
            }

            typeNode.forEachDescendant((node) => {
                if (isTypeQueryOfPrivateField(cls, node)) {
                    node.replaceWithText(maybeFixImportedType(file, node.getType().getText(node)))
                    return
                }

                if (node.isKind(ts.SyntaxKind.Identifier)) {
                    const defs = node.getDefinitions()
                    if (defs.length !== 1) return

                    const def = defs[0]
                    const defNode = def.getNode().getParent()

                    if (defNode?.isKind(ts.SyntaxKind.ClassDeclaration)) {
                        // this class is a part of public API, process it
                        processClass(defNode)
                    }
                }
            })
        }
    }

    // fix field types
    cls.getProperties().forEach(fixTypedNode)

    // fix param types
    cls.getConstructors().forEach((ctor) => {
        fixParamsTypes(file, ctor)

        ctor.getParameters().forEach(fixTypedNode)
    })
    cls.getMethods().forEach((method) => {
        fixParamsTypes(file, method)
        fixReturnTypes(file, method)
    })
    cls.getGetAccessors().forEach((accessor) => {
        fixReturnTypes(file, accessor)
    })
}

function processDestructuring(decls: Set<VariableDeclaration>) {
    const toInsert = new Map<SourceFile, [number, WriterFunction, number][]>()

    for (const decl of decls) {
        const file = decl.getSourceFile()
        const perFile = toInsert.get(file) ?? []
        if (!toInsert.has(file)) toInsert.set(file, perFile)

        // first collect data
        const props: { source: string, target: string, type: string }[] = []

        const pattern = decl.getChildAtIndexIfKindOrThrow(0, ts.SyntaxKind.ObjectBindingPattern)
        for (const element of pattern.getElements()) {
            const prop = element.getPropertyNameNode()
            const source = prop ? prop.getText() : element.getName()
            const target = element.getName()
            const type = maybeFixImportedType(file, element.getType().getText(element))

            props.push({ source, target, type })
        }

        // find the statement
        const stmt = decl
            .getParentIfKindOrThrow(ts.SyntaxKind.VariableDeclarationList)
            .getParentIfKindOrThrow(ts.SyntaxKind.VariableStatement)

        const objId = getTmpVarName(file)

        const writer: WriterFunction = (ctx) => {
            ctx.writeLine(`const ${objId} = ${decl.getInitializerOrThrow().getText()}`)
            for (const p of props) {
                ctx.writeLine(`export const ${p.target}: ${p.type} = ${objId}.${p.source}`)
            }
        }

        // push in per-file to insert, will process later
        perFile.push([stmt.getChildIndex(), writer, props.length + 1])
    }

    for (const [file, stmts] of toInsert) {
        let offset = 0
        for (const [idx, code, stmtCount] of stmts) {
            file.insertStatements(idx + offset, code)
            offset += stmtCount
        }
    }

    for (const decl of decls) {
        decl.remove()
    }
}

function processDefaultExports(file: SourceFile) {
    const exportAssignments = file.getExportAssignments()
    if (!exportAssignments.length) return
    const defaultExport = exportAssignments.find(e => !e.isExportEquals())
    if (!defaultExport) return

    const expr = defaultExport.getExpression()
    if (!expr) return

    // i don't exactly know which heuristics deno uses to determine if a default export is "complex",
    // and i don't want to dig into rust code to find out, so let's just transform all of them for now.
    // default exports suck anyway.
    const tmpVar = getTmpVarName(file)
    defaultExport.replaceWithText((writer) => {
        writer.writeLine(`const ${tmpVar}: ${expr.getType().getText(expr)} = ${expr.getText()}`)
        writer.write(`export default ${tmpVar}`)
    })
}

export function processEntrypoint(file: SourceFile) {
    const destructuringToFix = new Set<VariableDeclaration>()

    for (const declarations of file.getExportedDeclarations().values()) {
        if (declarations.length !== 1) {
            // merged namespaces are not supported
            continue
        }

        const decl = declarations[0]

        if (decl.getSourceFile().isFromExternalLibrary()) continue // skip external files

        switch (true) {
            case decl.isKind(ts.SyntaxKind.VariableDeclaration): {
                if (decl.getTypeNode()) continue // already has type, skip

                decl.setType(maybeFixImportedType(decl.getSourceFile(), decl.getType().getText(decl)))
                break
            }
            case decl.isKind(ts.SyntaxKind.FunctionDeclaration): {
                fixParamsTypes(file, decl)
                fixReturnTypes(file, decl)
                break
            }
            case decl.isKind(ts.SyntaxKind.ClassDeclaration): {
                processClass(decl)
                break
            }
            case decl.isKind(ts.SyntaxKind.BindingElement): {
                const parent = decl.getParentIfKindOrThrow(ts.SyntaxKind.ObjectBindingPattern)
                const varDecl = parent.getParentIfKindOrThrow(ts.SyntaxKind.VariableDeclaration)
                destructuringToFix.add(varDecl)
                break
            }
            case decl.isKind(ts.SyntaxKind.SourceFile): {
                // the below pattern:
                // import * as foo from '...'
                // export { foo }
                processEntrypoint(decl)
                break
            }
        }
    }

    processDestructuring(destructuringToFix)
    processDefaultExports(file)
}
