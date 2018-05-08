import yaml = require('js-yaml');

export function functionTag(functionName: string) {
    const splitFunctionName = functionName.split('::');
    return splitFunctionName[splitFunctionName.length-1];
}

export default function buildYamlSchema() {
    const intrinsicFunctions = require('../data/aws_intrinsic_functions.json');
    const yamlTypes = [];
    for (const fn in intrinsicFunctions) {
        yamlTypes.push(...buildYamlTypes(fn));
    }
    return yaml.Schema.create(yamlTypes);
}

export type YamlKind = 'scalar' | 'mapping' | 'sequence';
const kinds: YamlKind[] = ['scalar', 'mapping', 'sequence'];

export function buildYamlTypes(fnName: string) {
    return kinds.map((kind) => buildYamlType(fnName, kind));
}

export function buildYamlType(fnName: string, kind: YamlKind) {
    const tagName = functionTag(fnName);
    const tag = `!${tagName}`;

    const constructFn = (fnName === 'Fn::GetAtt')
        ? (data: any) => ({'Fn::GetAtt': Array.isArray(data) ? data : data.split('.')})
        : (data: any) => ({[fnName]: data});

    return new yaml.Type(tag, {
        kind,
        construct: constructFn
    });
}
