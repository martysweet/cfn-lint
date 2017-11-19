import {awsResources, awsExtraDocs} from './awsData';
import opn = require('opn');


export function getDoc(search: string | null, browse: boolean = true){

    let formattedSearch = search;

    // TODO: Make the searching case insensitive

    let docs = exports.getUrls(search);

    if(browse){
        for(let u of docs) {
            opn(u);
        }
    }

    let j = docs.join(", ");
    return `Opening ${j} in your browser...`;

};

export function getUrls(search: string | null = ''){

    if(search == null) search = '';

    let docs = searchExtraDocs(search);

    if(docs.length == 0){
        docs = searchInResources(search);
    }

    if(docs.length == 0){
        let urlencoded = encodeURI(search);
        docs = [ `http://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation-guide&searchQuery=${urlencoded}&x=0&y=0&this_doc_product=AWS+CloudFormation&this_doc_guide=User+Guide&doc_locale=en_us#facet_doc_product=AWS%20CloudFormation&facet_doc_guide=User%20Guide` ];
    }


    return docs;
};

function searchInResources(search: string): string[] {
    let dotCount = (search.match(/\./g) || []).length;


    if(dotCount == 0){

        // Resource Type
        const resourceType = awsResources['ResourceTypes'][search];
        if (resourceType) {
            return [ resourceType.Documentation ];
        }

    }else if(dotCount == 1){

        let urls: string[] = new Array();

        const propertyType = awsResources['PropertyTypes'][search];
        // Check PropertyTypes
        if(propertyType){
            urls.push(propertyType.Documentation);
        }

        // Split and check Resource, then a property of that resource
        const [resourceName, propertyName] = search.split('.');

        const resourceType = awsResources['ResourceTypes'][resourceName];
        if(resourceType){
            const property = resourceType.Properties[propertyName];
            if (property) {
                urls.push(property.Documentation);
            }
        }

        if(urls.length > 0){
            return urls;
        }

    }else if(dotCount == 2){

        // Split and find a property of a PropertyType
        let split = search.split('.');
        let propertyTypeName = split[0] + '.' + split[1];

        const propertyType = awsResources['PropertyTypes'][propertyTypeName];
        if (propertyType) {
            const property = propertyType.Properties[split[2]];
            if (property) {
                return [ property.Documentation ]
            }
        }

    }

    return [];
}

function searchExtraDocs(search: string) {
    if(awsExtraDocs.hasOwnProperty(search)){
        return [ awsExtraDocs[search] ];
    }else{
        return [];
    }
}