import yaml = require('js-yaml');
import fs = require('fs');
import buildYamlSchema from './yamlSchema';

const yamlSchema = buildYamlSchema();

export function openFile(path: string){

    // Check the file path is valid
    if (!fs.existsSync(path)) {
        throw Error(`Could not find file ${path}. Check the input path.`);
    }

    return openString(fs.readFileSync(path, 'utf8'), path);

};


export function openString(contents: string, filename: string){

    // Try JSON loading
    try {
        return openJson(contents);
    }catch (e){

    }

    // Try YAML loading
    try {
        return openYaml(contents, filename);
    }catch (e){
        throw Error(`Could not determine file type. Check your template is not malformed. ${e.message}`);
    }

}

function openYaml(contents: string, path: string){

    // Try and load the Yaml
    let yamlParse = yaml.safeLoad(contents, {
        filename: path,
        schema: yamlSchema,
        onWarning: (warning) => {
            console.error(warning);
        }
    });

    if(typeof yamlParse == 'object'){
        return yamlParse
    }

    // Yaml Parsing error
    throw new Error("YAML could not be parsed.");

}

function openJson(contents: string){

    return JSON.parse(contents);

}
