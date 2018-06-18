import yaml = require('js-yaml');
export declare function functionTag(functionName: string): string;
export default function buildYamlSchema(): yaml.Schema;
export declare type YamlKind = 'scalar' | 'mapping' | 'sequence';
export declare function buildYamlTypes(fnName: string): yaml.Type[];
export declare function buildYamlType(fnName: string, kind: YamlKind): yaml.Type;
