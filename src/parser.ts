import yaml = require('js-yaml');
import fs = require('fs');
import buildYamlSchema from './yamlSchema';

const yamlSchema = buildYamlSchema();

export function openFile(path: string){

    // Check the file path is valid
    if (!fs.existsSync(path)) {
        throw Error(`Could not find file ${path}. Check the input path.`);
    }

    // Try JSON loading
    try {
        return openJson(path);
    }catch (e){

    }

    // Try YAML loading
    try {
        return openYaml(path);
    }catch (e){
        throw Error(`Could not determine file type. Check your template is not malformed. ${e.message}`);
    }

};

function openYaml(path: string){

    // Try and load the Yaml
    let yamlParse = yaml.safeLoad(fs.readFileSync(path, 'utf8'), {
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

function openJson(path: string){

    return JSON.parse(fs.readFileSync(path, 'utf8'));

}
