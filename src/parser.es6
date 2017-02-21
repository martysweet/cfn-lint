import yaml from 'js-yaml';
import { CLOUDFORMATION_SCHEMA, localTags, build as buildCfTags } from 'cloudformation-js-yaml-schema';
import fs from 'fs';


exports.openFile = function openFile(path){
    return openYaml(path);
};

function loadYamlSchema(){

}

function openYaml(path){

    // Try and load the Yaml
    try {
        console.log(path);
        let yamlParse = yaml.safeLoad(fs.readFileSync(path, 'utf8'), {
            filename: path,
            schema: CLOUDFORMATION_SCHEMA,
            onWarning: (warning) => {
                console.error(warning);
                //messages.push(processMessage('Warning', warning));
                //messages.push(processMessage('Warning', warning));
            }
        });

        lastPlaceInTemplate = yamlParse;
        cleanupYaml(yamlParse);
        return yamlParse;

    } catch (error) {
        console.error(error);
        //messages.push(processMessage('Error', error));
    }

    return null;
}

function openJson(path){

}

let lastPlaceInTemplate = null;
let lastKeyInTemplate = null;
function cleanupYaml(ref){

        // Step into next attribute
        for(let i=0; i < Object.keys(ref).length; i++){
            let key = Object.keys(ref)[i];

            // Resolve the function
            if(ref[key].hasOwnProperty('class') && ref[key].hasOwnProperty('data')){

                // If Data is a yaml resolution object, check it doesn't need resolving
                if(typeof ref[key]['data'] != 'string' && ref[key]['data'].hasOwnProperty('data')) {
                    lastPlaceInTemplate = ref[key];
                    lastKeyInTemplate = 'data';
                    cleanupYaml(ref[key]['data']);
                }

                // We have a Yaml generated object

                // Define the name of the intrinsic function
                let outputKeyName = "Ref";
                if(ref[key]["class"] != "Ref"){
                    outputKeyName = "Fn::" + ref[key]["class"];
                }

                console.log("Yaml Generated Property" + outputKeyName);

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