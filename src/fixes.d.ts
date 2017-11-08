import yaml = require('js-yaml')

declare module 'js-yaml' {
    export interface LoadOptions {
        onWarning?: (warning: string) => void;
    }
}