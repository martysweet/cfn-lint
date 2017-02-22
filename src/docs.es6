let awsResources = require('../data/aws_resources_specification.json');
let awsExtraDocs = require('../data/aws_extra_docs.json');
let opn = require('opn');


exports.getDoc = function getDoc(search, browse = true){

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

exports.getUrls = function getUrls(search = ''){

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

function searchInResources(search){
    let dotCount = (search.match(/\./g) || []).length;


    if(dotCount == 0){

        // Resource Type
        if(awsResources['ResourceTypes'].hasOwnProperty(search)){
            return [ awsResources['ResourceTypes'][search]['Documentation'] ];
        }

    }else if(dotCount == 1){

        let urls = new Array();

        // Check PropertyTypes
        if(awsResources['PropertyTypes'].hasOwnProperty(search)){
            urls.push(awsResources['PropertyTypes'][search]['Documentation']);
        }

        // Split and check Resource, then a property of that resource
        let split = search.split('.');
        if(awsResources['ResourceTypes'].hasOwnProperty(split[0])){
            if(awsResources['ResourceTypes'][split[0]]['Properties'].hasOwnProperty(split[1])){
                urls.push(awsResources['ResourceTypes'][split[0]]['Properties'][split[1]]['Documentation']);
            }
        }

        if(urls.length > 0){
            return urls;
        }

    }else if(dotCount == 2){

        // Split and find a property of a PropertyType
        let split = search.split('.');
        let propertyType = split[0] + '.' + split[1];

        if(awsResources['PropertyTypes'].hasOwnProperty(propertyType)){
            if(awsResources['PropertyTypes'][propertyType]['Properties'].hasOwnProperty(split[2])){
                return [ awsResources['PropertyTypes'][propertyType]['Properties'][split[2]]['Documentation'] ];
            }
        }

    }

    return [];
}

function searchExtraDocs(search){
    if(awsExtraDocs.hasOwnProperty(search)){
        return [ awsExtraDocs[search] ];
    }else{
        return [];
    }
}