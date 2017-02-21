import yaml from 'js-yaml';
import { CLOUDFORMATION_SCHEMA, localTags, build as buildCfTags } from 'cloudformation-js-yaml-schema';
import fs from 'fs';


function openFile(path){

}

function loadYamlSchema(){

}

function openYaml(path){

    // Try and load the Yaml
    try {
        yaml.safeLoadAll(fs.readFileSync(path, 'utf8'), () => ({}), {
            filename: path.basename(path),
            schema: CLOUDFORMATION_SCHEMA,
            onWarning: (warning) => {
                console.error(warning);
                //messages.push(processMessage('Warning', warning));
                //messages.push(processMessage('Warning', warning));
            },
        });
    } catch (error) {
        console.error(error);
        //messages.push(processMessage('Error', error));
    }


}

function openJson(path){

}