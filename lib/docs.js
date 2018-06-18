"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var awsData_1 = require("./awsData");
var opn = require("opn");
function getDoc(search, browse) {
    if (browse === void 0) { browse = true; }
    var formattedSearch = search;
    // TODO: Make the searching case insensitive
    var docs = exports.getUrls(search);
    if (browse) {
        try {
            for (var docs_1 = __values(docs), docs_1_1 = docs_1.next(); !docs_1_1.done; docs_1_1 = docs_1.next()) {
                var u = docs_1_1.value;
                opn(u);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (docs_1_1 && !docs_1_1.done && (_a = docs_1.return)) _a.call(docs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    var j = docs.join(", ");
    return "Opening " + j + " in your browser...";
    var e_1, _a;
}
exports.getDoc = getDoc;
;
function getUrls(search) {
    if (search === void 0) { search = ''; }
    if (search == null)
        search = '';
    var docs = searchExtraDocs(search);
    if (docs.length == 0) {
        docs = searchInResources(search);
    }
    if (docs.length == 0) {
        var urlencoded = encodeURI(search);
        docs = ["http://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation-guide&searchQuery=" + urlencoded + "&x=0&y=0&this_doc_product=AWS+CloudFormation&this_doc_guide=User+Guide&doc_locale=en_us#facet_doc_product=AWS%20CloudFormation&facet_doc_guide=User%20Guide"];
    }
    return docs;
}
exports.getUrls = getUrls;
;
function searchInResources(search) {
    var dotCount = (search.match(/\./g) || []).length;
    if (dotCount == 0) {
        // Resource Type
        var resourceType = awsData_1.awsResources['ResourceTypes'][search];
        if (resourceType) {
            return [resourceType.Documentation];
        }
    }
    else if (dotCount == 1) {
        var urls = new Array();
        var propertyType = awsData_1.awsResources['PropertyTypes'][search];
        // Check PropertyTypes
        if (propertyType) {
            urls.push(propertyType.Documentation);
        }
        // Split and check Resource, then a property of that resource
        var _a = __read(search.split('.'), 2), resourceName = _a[0], propertyName = _a[1];
        var resourceType = awsData_1.awsResources['ResourceTypes'][resourceName];
        if (resourceType) {
            var property = resourceType.Properties[propertyName];
            if (property) {
                urls.push(property.Documentation);
            }
        }
        if (urls.length > 0) {
            return urls;
        }
    }
    else if (dotCount == 2) {
        // Split and find a property of a PropertyType
        var split = search.split('.');
        var propertyTypeName = split[0] + '.' + split[1];
        var propertyType = awsData_1.awsResources['PropertyTypes'][propertyTypeName];
        if (propertyType) {
            var property = propertyType.Properties[split[2]];
            if (property) {
                return [property.Documentation];
            }
        }
    }
    return [];
}
function searchExtraDocs(search) {
    if (awsData_1.awsExtraDocs.hasOwnProperty(search)) {
        return [awsData_1.awsExtraDocs[search]];
    }
    else {
        return [];
    }
}
//# sourceMappingURL=docs.js.map