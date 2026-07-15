import type { Codemod, Edit, SgNode } from 'codemod:ast-grep';
import type TSX from 'codemod:ast-grep/langs/tsx';

const PACKAGE_NAME = 'koa-x-router';
const ADAPTOR_PATHS = {
    JoiAdaptor: 'koa-x-router/joi',
    ZodAdaptor: 'koa-x-router/zod',
} as const;

type AdaptorName = keyof typeof ADAPTOR_PATHS;

function unquote(value: string): string {
    return value.slice(1, -1);
}

function quoteLike(value: string, source: string): string {
    const quote = source.at(0) ?? "'";
    return `${quote}${value}${quote}`;
}

function adaptorName(node: SgNode<TSX>): AdaptorName | null {
    const name = node.field('name')?.text() ?? node.field('key')?.text() ?? node.text();
    const normalized = name.replace(/^type\s+/, '').trim();

    if (normalized === 'JoiAdaptor' || normalized === 'ZodAdaptor') {
        return normalized;
    }

    return null;
}

function splitModuleStatement(
    node: SgNode<TSX>,
    specifierKind: 'import_specifier' | 'export_specifier',
): string | null {
    const source = node.field('source');
    if (!source || unquote(source.text()) !== PACKAGE_NAME) {
        return null;
    }

    const namedSpecifiers = node.find({
        rule: { kind: specifierKind === 'import_specifier' ? 'named_imports' : 'export_clause' },
    });
    if (!namedSpecifiers) {
        return null;
    }

    const specifiers = namedSpecifiers.findAll({ rule: { kind: specifierKind } });
    const grouped = new Map<AdaptorName, SgNode<TSX>[]>();
    const remaining: SgNode<TSX>[] = [];

    for (const specifier of specifiers) {
        const name = adaptorName(specifier);
        if (!name) {
            remaining.push(specifier);
            continue;
        }

        const group = grouped.get(name) ?? [];
        group.push(specifier);
        grouped.set(name, group);
    }

    if (grouped.size === 0) {
        return null;
    }

    const statement = node.text();
    const namedText = namedSpecifiers.text();
    const namedIndex = statement.indexOf(namedText);
    const sourceText = source.text();
    const hasSemicolon = statement.trimEnd().endsWith(';');
    const statementKeyword = specifierKind === 'import_specifier' ? 'import' : 'export';
    const declarationIsTypeOnly = new RegExp(`^${statementKeyword}\\s+type\\b`).test(statement.trimStart());
    const output: string[] = [];

    if (remaining.length > 0) {
        const replacement = `{ ${remaining.map((specifier) => specifier.text()).join(', ')} }`;
        output.push(`${statement.slice(0, namedIndex)}${replacement}${statement.slice(namedIndex + namedText.length)}`);
    } else {
        const beforeNamed = statement.slice(0, namedIndex);
        const afterNamed = statement.slice(namedIndex + namedText.length);
        const prefixWithoutComma = beforeNamed.replace(/,\s*$/, '').trimEnd();
        const barePrefix = prefixWithoutComma.replace(new RegExp(`^${statementKeyword}(?:\\s+type)?\\s*`), '');

        if (barePrefix.length > 0) {
            output.push(`${prefixWithoutComma}${afterNamed}`);
        }
    }

    for (const name of ['JoiAdaptor', 'ZodAdaptor'] as const) {
        const adaptorSpecifiers = grouped.get(name);
        if (!adaptorSpecifiers) {
            continue;
        }

        const typeKeyword = declarationIsTypeOnly ? ' type' : '';
        const semicolon = hasSemicolon ? ';' : '';
        output.push(
            `${statementKeyword}${typeKeyword} { ${adaptorSpecifiers.map((specifier) => specifier.text()).join(', ')} } from ${quoteLike(ADAPTOR_PATHS[name], sourceText)}${semicolon}`,
        );
    }

    return output.join('\n');
}

function objectPatternProperties(pattern: SgNode<TSX>): SgNode<TSX>[] {
    return pattern
        .children()
        .filter((child) =>
            ['shorthand_property_identifier_pattern', 'pair_pattern', 'assignment_pattern', 'rest_pattern'].includes(
                child.kind(),
            ),
        );
}

function requireSource(value: SgNode<TSX> | null): SgNode<TSX> | null {
    if (!value || value.kind() !== 'call_expression') {
        return null;
    }

    const fn = value.field('function');
    const source = value.field('arguments')?.find({ rule: { kind: 'string' } });
    return fn?.text() === 'require' && source && unquote(source.text()) === PACKAGE_NAME ? source : null;
}

function splitRequireDeclaration(node: SgNode<TSX>): string | null {
    const declarations = node.findAll({ rule: { kind: 'variable_declarator' } });
    if (declarations.length !== 1) {
        return null;
    }

    const declaration = declarations[0];
    if (!declaration) {
        return null;
    }

    const pattern = declaration.field('name');
    const source = requireSource(declaration.field('value'));
    if (!pattern || pattern.kind() !== 'object_pattern' || !source) {
        return null;
    }

    const grouped = new Map<AdaptorName, SgNode<TSX>[]>();
    const remaining: SgNode<TSX>[] = [];

    for (const property of objectPatternProperties(pattern)) {
        const name = adaptorName(property);
        if (!name) {
            remaining.push(property);
            continue;
        }

        const group = grouped.get(name) ?? [];
        group.push(property);
        grouped.set(name, group);
    }

    if (grouped.size === 0) {
        return null;
    }

    const statement = node.text();
    const keyword = statement.match(/^\s*(const|let|var)\b/)?.[1] ?? 'const';
    const semicolon = statement.trimEnd().endsWith(';') ? ';' : '';
    const output: string[] = [];

    if (remaining.length > 0) {
        output.push(
            `${keyword} { ${remaining.map((property) => property.text()).join(', ')} } = require(${source.text()})${semicolon}`,
        );
    }

    for (const name of ['JoiAdaptor', 'ZodAdaptor'] as const) {
        const properties = grouped.get(name);
        if (properties) {
            output.push(
                `${keyword} { ${properties.map((property) => property.text()).join(', ')} } = require(${quoteLike(ADAPTOR_PATHS[name], source.text())})${semicolon}`,
            );
        }
    }

    return output.join('\n');
}

function directRequireMemberEdit(node: SgNode<TSX>): Edit | null {
    const property = node.field('property');
    const object = node.field('object');
    if (!property || !object) {
        return null;
    }

    const name = property.text();
    if (name !== 'JoiAdaptor' && name !== 'ZodAdaptor') {
        return null;
    }

    const source = requireSource(object);
    if (!source) {
        return null;
    }

    return source.replace(quoteLike(ADAPTOR_PATHS[name], source.text()));
}

const codemod: Codemod<TSX> = async (root) => {
    const rootNode = root.root();
    const edits: Edit[] = [];

    for (const node of rootNode.findAll({ rule: { kind: 'import_statement' } })) {
        const replacement = splitModuleStatement(node, 'import_specifier');
        if (replacement) {
            edits.push(node.replace(replacement));
        }
    }

    for (const node of rootNode.findAll({ rule: { kind: 'export_statement' } })) {
        const replacement = splitModuleStatement(node, 'export_specifier');
        if (replacement) {
            edits.push(node.replace(replacement));
        }
    }

    for (const node of rootNode.findAll({
        rule: { any: [{ kind: 'lexical_declaration' }, { kind: 'variable_declaration' }] },
    })) {
        const replacement = splitRequireDeclaration(node);
        if (replacement) {
            edits.push(node.replace(replacement));
        }
    }

    for (const node of rootNode.findAll({ rule: { kind: 'member_expression' } })) {
        const edit = directRequireMemberEdit(node);
        if (edit) {
            edits.push(edit);
        }
    }

    return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default codemod;
