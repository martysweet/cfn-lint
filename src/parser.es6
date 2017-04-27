import yaml from 'js-yaml';
import { CLOUDFORMATION_SCHEMA} from 'cloudformation-js-yaml-schema';
import fs from 'fs';


exports.openFile = function openFile(path){

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

function openYaml(path){

    // Try and load the Yaml
    let yamlParse = yaml.safeLoad(fs.readFileSync(path, 'utf8'), {
        filename: path,
        schema: CLOUDFORMATION_SCHEMA,
        onWarning: (warning) => {
            console.error(warning);
        }
    });

    lastPlaceInTemplate = yamlParse;
    cleanupYaml(yamlParse);

    if(typeof yamlParse == 'object'){
        return yamlParse
    }

    // Yaml Parsing error
    throw new Error("YAML could not be parsed.");

}

function openJson(path){

    return JSON.parse(fs.readFileSync(path, 'utf8'));

}

let lastPlaceInTemplate = null;
let lastKeyInTemplate = null;
function cleanupYaml(ref){

        // Step into next attribute
        for(let i=0; i < Object.keys(ref).length; i++){
            let key = Object.keys(ref)[i];

            // Resolve the function
            if(ref[key].hasOwnProperty('class') && ref[key].hasOwnProperty('data')){

                // We have a Yaml generated object

                // Define the name of the intrinsic function
                let outputKeyName = "Ref";
                if(ref[key]["class"] != "Ref"){
                    outputKeyName = "Fn::" + ref[key]["class"];
                }

                // Convert the object to expected object type
                let outputData = null;
                let data = ref[key]['data'];
                // Specify the data of the key outputKeyName: {}
                if(typeof data == 'string'){
                    // Split . into array if Fn::GetAtt
                    if(outputKeyName == "Fn::GetAtt"){
                        outputData = data.split('.');
                    }else {
                        outputData = data;
                    }
                }else{
                    // If Data is a yaml resolution object, check it doesn't need resolving
                    lastPlaceInTemplate = ref[key];
                    lastKeyInTemplate = 'data';
                    cleanupYaml(data);
                    // Set the resolved object
                    outputData = data;
                }

                ref[key] = {};
                ref[key][outputKeyName] = outputData;

            }else if(key != 'Attributes' && typeof ref[key] == "object"){
                lastPlaceInTemplate = ref;
                lastKeyInTemplate = key;
                cleanupYaml(ref[key]);
            }


        }
}