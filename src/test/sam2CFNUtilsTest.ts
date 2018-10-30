import chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;

import * as sam2CFNUtils from '../sam2CFNUtils';

describe('sam2CFNUtils', () => {

    describe('toAWSPrimitiveTypes', () => {

        it('should be able to convert a JSON "number" type to the corresponding CFN types: "Integer", "Long" and "Double"', () => {
            const input = 'number';
            const result = sam2CFNUtils.toAWSPrimitiveTypes(input);
            expect(result).to.deep.equal(['Integer', 'Long', 'Double']);
        });

        it('should be able to convert a JSON "string" type to the corresponding CFN types: "String" and "Timestamp"', () => {
            const input = 'string';
            const result = sam2CFNUtils.toAWSPrimitiveTypes(input);
            expect(result).to.deep.equal(['String', 'Timestamp']);
        });

        it('should be able to convert a JSON "boolean" type to the corresponding CFN type: "Boolean"', () => {
            const input = 'boolean';
            const result = sam2CFNUtils.toAWSPrimitiveTypes(input);
            expect(result).to.deep.equal(['Boolean']);
        });

        it('should throw an exception if provided a non-corresponding type', () => {
            const input = 'unknown';
            const result = () => {sam2CFNUtils.toAWSPrimitiveTypes(input)};
            expect(result).to.throw('Type "unknown" is incompatible with any AWS primitive types!');
        });

    });

    describe('buildResourceProperty', () => {

        it('should be able to construct a property specification that has a static primitive type and is not required', () => {
            const inputTypes = ['String'];
            const inputIsRequired = false;
            const result = sam2CFNUtils.buildResourceProperty(inputTypes, inputIsRequired);
            expect(result).to.deep.equal({
              PrimitiveType: 'String',
              Documentation: '',
              Required: false,
              UpdateType: 'Mutable'
            });
        });

        it('should be able to construct a property specification that has a static primitive type and is required', () => {
            const inputTypes = ['String'];
            const inputIsRequired = true;
            const result = sam2CFNUtils.buildResourceProperty(inputTypes, inputIsRequired);
            expect(result).to.deep.equal({
              PrimitiveType: 'String',
              Documentation: '',
              Required: true,
              UpdateType: 'Mutable'
            });
        });

        it('should be able to construct a property specification that has a variable type and is not required', () => {
            const inputTypes = ['String', 'Integer'];
            const inputIsRequired = false;
            const result = sam2CFNUtils.buildResourceProperty(inputTypes, inputIsRequired);
            expect(result).to.deep.equal({
              Type: [
                'String',
                'Integer'
              ],
              Documentation: '',
              Required: false,
              UpdateType: 'Mutable'
            });
        });

        it('should be able to construct a property specification that has a variable type and is required', () => {
            const inputTypes = ['String', 'Integer'];
            const inputIsRequired = true;
            const result = sam2CFNUtils.buildResourceProperty(inputTypes, inputIsRequired);
            expect(result).to.deep.equal({
              Type: [
                'String',
                'Integer'
              ],
              Documentation: '',
              Required: true,
              UpdateType: 'Mutable'
            });
        });

    });

    describe('resolveTypeProperties', () => {

        it('should be able to resolve type properties from a definition that contains the JSON schema "allOf" operator', () => {
          const inputTypeDef = {
            "allOf": [
              {
                "properties": {
                  "somethingPrimitive": {
                    "type": "boolean"
                  }
                }
              }
            ]
          };
          const result = sam2CFNUtils.resolveTypeProperties(inputTypeDef);
          expect(result).to.deep.equal({
            "somethingPrimitive": {
              "type": "boolean"
            }
          });
        });

        it('should be able to resolve type properties from a definition that contains the JSON schema "anyOf" operator', () => {
          const inputTypeDef = {
            "anyOf": [
              {
                "properties": {
                  "somethingPrimitive": {
                    "type": "boolean"
                  }
                }
              }
            ]
          };
          const result = sam2CFNUtils.resolveTypeProperties(inputTypeDef);
          expect(result).to.deep.equal({
            "somethingPrimitive": {
              "type": "boolean"
            }
          });
        });

        it('should be able to resolve type properties from a definition that contains the JSON schema "oneOf" operator', () => {
          const inputTypeDef = {
            "oneOf": [
              {
                "properties": {
                  "somethingPrimitive": {
                    "type": "boolean"
                  }
                }
              }
            ]
          };
          const result = sam2CFNUtils.resolveTypeProperties(inputTypeDef);
          expect(result).to.deep.equal({
            "somethingPrimitive": {
              "type": "boolean"
            }
          });
        });

        it('should be able to resolve type properties from a definition that contains a JSON schema with nested operators', () => {
          const inputTypeDef = {
            "allOf": [
              {
                "anyOf": [
                  {
                    "properties": {
                      "somethingTooPrimitive": {
                        "type": "number"
                      }
                    }
                  }
                ]
              },
              {
                "properties": {
                  "somethingPrimitive": {
                    "type": "boolean"
                  }
                }
              }
            ]
          };
          const result = sam2CFNUtils.resolveTypeProperties(inputTypeDef);
          expect(result).to.deep.equal({
            "somethingPrimitive": {
              "type": "boolean"
            },
            "somethingTooPrimitive": {
              "type": "number"
            }
          });
        });

    });

    describe('processDefinition', () => {

      describe('given a SAM schema definition with properties that employ primitive types', () => {

        it('should be able to process a SAM schema definition containing a resource type that] has a required primitive property and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Api';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingPrimitive": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "somethingPrimitive"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Api': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingPrimitive': {
                        PrimitiveType: 'Boolean',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required primitive property and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Api';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingPrimitive": {
                      "type": "boolean"
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Api': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingPrimitive': {
                        PrimitiveType: 'Boolean',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required primitive property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Api.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingPrimitive": {
                  "type": "boolean"
                }
              },
              "required": [
                "somethingPrimitive"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Api.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingPrimitive': {
                        PrimitiveType: 'Boolean',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required primitive property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Api.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingPrimitive": {
                  "type": "boolean"
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Api.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingPrimitive': {
                        PrimitiveType: 'Boolean',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a required property with variable primitive type and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Api';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingPrimitive": {
                      "anyOf": [
                        { "type": "boolean" },
                        { "type": "string" }
                      ]
                    }
                  },
                  "required": [
                    "somethingPrimitive"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Api': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingPrimitive': {
                        Type: [
                          '#somethingPrimitive<Boolean>',
                          '#somethingPrimitive<String>',
                          '#somethingPrimitive<Timestamp>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required property with variable primitive type and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Api';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingPrimitive": {
                      "anyOf": [
                        { "type": "boolean" },
                        { "type": "string" }
                      ]
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Api': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingPrimitive': {
                        Type: [
                          '#somethingPrimitive<Boolean>',
                          '#somethingPrimitive<String>',
                          '#somethingPrimitive<Timestamp>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required property with variable primitive type', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Api.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingPrimitive": {
                  "anyOf": [
                    { "type": "boolean" },
                    { "type": "string" }
                  ]
                }
              },
              "required": [
                "somethingPrimitive"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Api.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingPrimitive': {
                        Type: [
                          'S3Location#somethingPrimitive<Boolean>',
                          'S3Location#somethingPrimitive<String>',
                          'S3Location#somethingPrimitive<Timestamp>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required property with variable primitive type', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Api.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingPrimitive": {
                  "anyOf": [
                    { "type": "boolean" },
                    { "type": "string" }
                  ]
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Api.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingPrimitive': {
                        Type: [
                          'S3Location#somethingPrimitive<Boolean>',
                          'S3Location#somethingPrimitive<String>',
                          'S3Location#somethingPrimitive<Timestamp>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

      });

      describe('given a SAM schema definition with properties that employ structured types', () => {

        it('should be able to process a SAM schema definition containing a resource type that has a required structure property and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingStructured": {
                      "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue"
                    }
                  },
                  "required": [
                    "somethingStructured"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingStructured': {
                        Type: 'DeadLetterQueue',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required structure property and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingStructured": {
                      "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue"
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingStructured': {
                        Type: 'DeadLetterQueue',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required structure property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingStructured": {
                  "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue"
                }
              },
              "required": [
                "somethingStructured"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingStructured': {
                        Type: 'DeadLetterQueue',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required structure property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingStructured": {
                  "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue"
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingStructured': {
                        Type: 'DeadLetterQueue',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a required property with variable structure type and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingStructured": {
                      "anyOf": [
                        { "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue" },
                        { "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue2" }
                      ]
                    }
                  },
                  "required": [
                    "somethingStructured"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingStructured': {
                        Type: [
                          '#somethingStructured<DeadLetterQueue>',
                          '#somethingStructured<DeadLetterQueue2>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required property with variable structure type and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingStructured": {
                      "anyOf": [
                        { "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue" },
                        { "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue2" }
                      ]
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingStructured': {
                        Type: [
                          '#somethingStructured<DeadLetterQueue>',
                          '#somethingStructured<DeadLetterQueue2>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required property with variable structure type', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingStructured": {
                  "anyOf": [
                    { "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue" },
                    { "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue2" }
                  ]
                }
              },
              "required": [
                "somethingStructured"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingStructured': {
                        Type: [
                          'S3Location#somethingStructured<DeadLetterQueue>',
                          'S3Location#somethingStructured<DeadLetterQueue2>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required property with variable structure type', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingStructured": {
                  "anyOf": [
                    { "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue" },
                    { "$ref": "#/definitions/AWS::Serverless::Function.DeadLetterQueue2" }
                  ]
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingStructured': {
                        Type: [
                          'S3Location#somethingStructured<DeadLetterQueue>',
                          'S3Location#somethingStructured<DeadLetterQueue2>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

      });

      describe('given a SAM schema definition with properties that employ list-type aggregation', () => {

        it('should be able to process a SAM schema definition containing a resource type that has a required list-type property and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingListed": {
                      "items": {
                        "type": "boolean"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "somethingListed"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingListed': {
                        PrimitiveItemType: 'Boolean',
                        Type: 'List',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required list-type property and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingListed": {
                      "items": {
                        "type": "boolean"
                      },
                      "type": "array"
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingListed': {
                        PrimitiveItemType: 'Boolean',
                        Type: 'List',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required list-type property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingListed": {
                  "items": {
                    "type": "boolean"
                  },
                  "type": "array"
                }
              },
              "required": [
                "somethingListed"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingListed': {
                        PrimitiveItemType: 'Boolean',
                        Type: 'List',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required list-type property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingListed": {
                  "items": {
                    "type": "boolean"
                  },
                  "type": "array"
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingListed': {
                        PrimitiveItemType: 'Boolean',
                        Type: 'List',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a required property with variable list-type and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingListed": {
                      "anyOf": [
                        {
                          "items": {
                            "type": "boolean"
                          },
                          "type": "array"
                        },
                        {
                          "items": {
                            "type": "string"
                          },
                          "type": "array"
                        }
                      ]
                    }
                  },
                  "required": [
                    "somethingListed"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingListed': {
                        Type: [
                          '#somethingListed<List<Boolean>>',
                          '#somethingListed<List<String>>',
                          '#somethingListed<List<Timestamp>>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required property with variable list-type and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingListed": {
                      "anyOf": [
                        {
                          "items": {
                            "type": "boolean"
                          },
                          "type": "array"
                        },
                        {
                          "items": {
                            "type": "string"
                          },
                          "type": "array"
                        }
                      ]
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingListed': {
                        Type: [
                          '#somethingListed<List<Boolean>>',
                          '#somethingListed<List<String>>',
                          '#somethingListed<List<Timestamp>>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required property with variable list-type', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingListed": {
                  "anyOf": [
                    {
                      "items": {
                        "type": "boolean"
                      },
                      "type": "array"
                    },
                    {
                      "items": {
                        "type": "string"
                      },
                      "type": "array"
                    }
                  ]
                }
              },
              "required": [
                "somethingListed"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingListed': {
                        Type: [
                          'S3Location#somethingListed<List<Boolean>>',
                          'S3Location#somethingListed<List<String>>',
                          'S3Location#somethingListed<List<Timestamp>>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required property with variable list-type', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingListed": {
                  "anyOf": [
                    {
                      "items": {
                        "type": "boolean"
                      },
                      "type": "array"
                    },
                    {
                      "items": {
                        "type": "string"
                      },
                      "type": "array"
                    }
                  ]
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingListed': {
                        Type: [
                          'S3Location#somethingListed<List<Boolean>>',
                          'S3Location#somethingListed<List<String>>',
                          'S3Location#somethingListed<List<Timestamp>>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

      });

      describe('given a SAM schema definition with properties that employ map-type aggregation', () => {

        it('should be able to process a SAM schema definition containing a resource type that has a required map-type property and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingMapped": {
                      "additionalProperties": false,
                      "patternProperties": {
                        "^[a-zA-Z0-9]+$": {
                          "type": "boolean"
                        }
                      },
                      "type": "object"
                    }
                  },
                  "required": [
                    "somethingMapped"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingMapped': {
                        PrimitiveItemType: 'Boolean',
                        Type: 'Map',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required map-type property and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingMapped": {
                      "additionalProperties": false,
                      "patternProperties": {
                        "^[a-zA-Z0-9]+$": {
                          "type": "boolean"
                        }
                      },
                      "type": "object"
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingMapped': {
                        PrimitiveItemType: 'Boolean',
                        Type: 'Map',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required map-type property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingMapped": {
                  "additionalProperties": false,
                  "patternProperties": {
                    "^[a-zA-Z0-9]+$": {
                      "type": "boolean"
                    }
                  },
                  "type": "object"
                }
              },
              "required": [
                "somethingMapped"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingMapped': {
                        PrimitiveItemType: 'Boolean',
                        Type: 'Map',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required map-type property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingMapped": {
                  "additionalProperties": false,
                  "patternProperties": {
                    "^[a-zA-Z0-9]+$": {
                      "type": "boolean"
                    }
                  },
                  "type": "object"
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingMapped': {
                        PrimitiveItemType: 'Boolean',
                        Type: 'Map',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a required property with variable map-type and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingMapped": {
                      "anyOf": [
                        {
                          "additionalProperties": false,
                          "patternProperties": {
                            "^[a-zA-Z0-9]+$": {
                              "type": "boolean"
                            }
                          },
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "patternProperties": {
                            "^[a-zA-Z0-9]+$": {
                              "type": "string"
                            }
                          },
                          "type": "object"
                        }
                      ]
                    }
                  },
                  "required": [
                    "somethingMapped"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingMapped': {
                        Type: [
                          '#somethingMapped<Map<Boolean>>',
                          '#somethingMapped<Map<String>>',
                          '#somethingMapped<Map<Timestamp>>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required property with variable map-type and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingMapped": {
                      "anyOf": [
                        {
                          "additionalProperties": false,
                          "patternProperties": {
                            "^[a-zA-Z0-9]+$": {
                              "type": "boolean"
                            }
                          },
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "patternProperties": {
                            "^[a-zA-Z0-9]+$": {
                              "type": "string"
                            }
                          },
                          "type": "object"
                        }
                      ]
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingMapped': {
                        Type: [
                          '#somethingMapped<Map<Boolean>>',
                          '#somethingMapped<Map<String>>',
                          '#somethingMapped<Map<Timestamp>>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required property with variable map-type', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingMapped": {
                  "anyOf": [
                    {
                      "additionalProperties": false,
                      "patternProperties": {
                        "^[a-zA-Z0-9]+$": {
                          "type": "boolean"
                        }
                      },
                      "type": "object"
                    },
                    {
                      "additionalProperties": false,
                      "patternProperties": {
                        "^[a-zA-Z0-9]+$": {
                          "type": "string"
                        }
                      },
                      "type": "object"
                    }
                  ]
                }
              },
              "required": [
                "somethingMapped"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingMapped': {
                        Type: [
                          'S3Location#somethingMapped<Map<Boolean>>',
                          'S3Location#somethingMapped<Map<String>>',
                          'S3Location#somethingMapped<Map<Timestamp>>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required property with variable map-type', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingMapped": {
                  "anyOf": [
                    {
                      "additionalProperties": false,
                      "patternProperties": {
                        "^[a-zA-Z0-9]+$": {
                          "type": "boolean"
                        }
                      },
                      "type": "object"
                    },
                    {
                      "additionalProperties": false,
                      "patternProperties": {
                        "^[a-zA-Z0-9]+$": {
                          "type": "string"
                        }
                      },
                      "type": "object"
                    }
                  ]
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingMapped': {
                        Type: [
                          'S3Location#somethingMapped<Map<Boolean>>',
                          'S3Location#somethingMapped<Map<String>>',
                          'S3Location#somethingMapped<Map<Timestamp>>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

      });


      describe('miscelaneous', () => {

        it('should be able to process a SAM schema definition containing a resource type that has a required list-type property which, may contain values of various types, and no additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": false,
                  "properties": {
                    "somethingListed": {
                      "items": {
                        "anyOf":[
                          { "type": "string" },
                          { "type": "object" },
                          { "$ref": "#/definitions/AWS::Serverless::Function.VpcConfig" }
                        ]
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "somethingListed"
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'somethingListed': {
                        Type: [
                          '#somethingListed<List<String>>',
                          '#somethingListed<List<Timestamp>>',
                          '#somethingListed<List<Json>>',
                          '#somethingListed<List<VpcConfig>>',
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required list-type property which, may contain values of various types', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingListed": {
                  "items": {
                    "anyOf":[
                      { "type": "string" },
                      { "type": "object" }
                    ]
                  },
                  "type": "array"
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingListed': {
                        Type: [
                          'S3Location#somethingListed<List<String>>',
                          'S3Location#somethingListed<List<Timestamp>>',
                          'S3Location#somethingListed<List<Json>>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a not required map-type property which, may contain values of various types, and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingMapped": {
                      "additionalProperties": false,
                      "patternProperties": {
                        "^[a-zA-Z0-9]+$": {
                          "anyOf":[
                            { "type": "string" },
                            { "type": "object" },
                            { "$ref": "#/definitions/AWS::Serverless::Function.VpcConfig" }
                          ]
                        }
                      },
                      "type": "object"
                    }
                  },
                  "required": [],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingMapped': {
                        Type: [
                          '#somethingMapped<Map<String>>',
                          '#somethingMapped<Map<Timestamp>>',
                          '#somethingMapped<Map<Json>>',
                          '#somethingMapped<Map<VpcConfig>>',
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a required map-type property which, may contain values of various types', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingMapped": {
                  "additionalProperties": false,
                  "patternProperties": {
                    "^[a-zA-Z0-9]+$": {
                      "anyOf":[
                        { "type": "string" },
                        { "type": "object" }
                      ]
                    }
                  },
                  "type": "object"
                }
              },
              "required": [
                "somethingMapped"
              ],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingMapped': {
                        Type: [
                          'S3Location#somethingMapped<Map<String>>',
                          'S3Location#somethingMapped<Map<Timestamp>>',
                          'S3Location#somethingMapped<Map<Json>>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });

        it('should be able to process a SAM schema definition containing a resource type that has a required Json-type property and additional properties allowed', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function';
            const inputTypeDef = {
              "properties": {
                "Properties": {
                  "additionalProperties": true,
                  "properties": {
                    "somethingMapped": {
                      "type": "object"
                    }
                  },
                  "required": [
                    'somethingMapped'
                  ],
                  "type": "object"
                }
              }
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {},
                ResourceTypes: {
                  'AWS::Serverless::Function': {
                    Documentation: '',
                    AdditionalProperties: true,
                    Properties: {
                      'somethingMapped': {
                        PrimitiveType: 'Json',
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
            });
        });

        it('should be able to process a SAM schema definition containing a property type that has a not required Json-type property', () => {
            let result: any = {
                PropertyTypes: {},
                ResourceTypes: {}
            };

            const inputType = 'AWS::Serverless::Function.S3Location';
            const inputTypeDef = {
              "properties": {
                "somethingMapped": {
                  "type": "object"
                }
              },
              "required": [],
              "type": "object"
            };
            sam2CFNUtils.processDefinition(inputType, inputTypeDef, result);

            expect(result).to.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Function.S3Location': {
                    Documentation: '',
                    Properties: {
                      'somethingMapped': {
                        PrimitiveType: 'Json',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {}
            });
        });


      });

    });

    describe('samResourcesSpecification', () => {

      describe('given a basic SAM JSON specification', () => {

          it('should be able to convert it to CFN format', () => {
              const inputSamSchema = {
                definitions: {
                  "AWS::Serverless::Api": {
                    "additionalProperties": false,
                    "properties": {
                      "DeletionPolicy": {
                        "enum": [
                          "Delete",
                          "Retain",
                          "Snapshot"
                        ],
                        "type": "string"
                      },
                      "DependsOn": {
                        "anyOf": [
                          {
                            "pattern": "^[a-zA-Z0-9]+$",
                            "type": "string"
                          },
                          {
                            "items": {
                              "pattern": "^[a-zA-Z0-9]+$",
                              "type": "string"
                            },
                            "type": "array"
                          }
                        ]
                      },
                      "Metadata": {
                        "type": "object"
                      },
                      "Properties": {
                        "additionalProperties": false,
                        "properties": {
                          "CacheClusterEnabled": {
                            "type": "boolean"
                          },
                          "CacheClusterSize": {
                            "type": "string"
                          },
                          "DefinitionBody": {
                            "type": "object"
                          },
                          "DefinitionUri": {
                            "anyOf": [
                              {
                                "type": [
                                  "string"
                                ]
                              },
                              {
                                "$ref": "#/definitions/AWS::Serverless::Api.S3Location"
                              }
                            ]
                          },
                          "Name": {
                            "type": "string"
                          },
                          "StageName": {
                            "anyOf": [
                              { "type": "string" },
                              { "type": "object" }
                            ]
                          },
                          "Variables": {
                            "additionalProperties": false,
                            "patternProperties": {
                              "^[a-zA-Z0-9]+$": {
                                "anyOf": [
                                  { "type": "string" },
                                  { "type": "object" }
                                ]
                              }
                            },
                            "type": "object"
                          }
                        },
                        "required": [
                          "StageName"
                        ],
                        "type": "object"
                      },
                      "Type": {
                        "enum": [
                          "AWS::Serverless::Api"
                        ],
                        "type": "string"
                      }
                    },
                    "required": [
                      "Type",
                      "Properties"
                    ],
                    "type": "object"
                  },
                  "AWS::Serverless::Api.S3Location": {
                    "additionalProperties": false,
                    "properties": {
                      "Bucket": {
                        "type": "string"
                      },
                      "Key": {
                        "type": "string"
                      },
                      "Version": {
                        "type": "number"
                      }
                    },
                    "required": [
                      "Bucket",
                      "Key"
                    ],
                    "type": "object"
                  }
                }
              };

              const inputCustomSpecification = {};

              const result = sam2CFNUtils.samResourcesSpecification(inputSamSchema, inputCustomSpecification);

              expect(result).to.be.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Api.S3Location': {
                    Documentation: '',
                    Properties: {
                      'Bucket': {
                        Type: [
                          'S3Location#Bucket<String>',
                          'S3Location#Bucket<Timestamp>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      },
                      'Key': {
                        Type: [
                          'S3Location#Key<String>',
                          'S3Location#Key<Timestamp>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      },
                      'Version': {
                        Type: [
                          'S3Location#Version<Integer>',
                          'S3Location#Version<Long>',
                          'S3Location#Version<Double>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {
                  'AWS::Serverless::Api': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'CacheClusterEnabled': {
                        PrimitiveType: 'Boolean',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'CacheClusterSize': {
                        Type: [
                          '#CacheClusterSize<String>',
                          '#CacheClusterSize<Timestamp>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'DefinitionBody': {
                        PrimitiveType: 'Json',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'DefinitionUri': {
                        Type: [
                          '#DefinitionUri<String>',
                          '#DefinitionUri<Timestamp>',
                          '#DefinitionUri<S3Location>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'Name': {
                        Type: [
                          '#Name<String>',
                          '#Name<Timestamp>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'StageName': {
                        Type: [
                          '#StageName<String>',
                          '#StageName<Timestamp>',
                          '#StageName<Json>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      },
                      'Variables': {
                        Type: [
                          '#Variables<Map<String>>',
                          '#Variables<Map<Timestamp>>',
                          '#Variables<Map<Json>>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
              });
          });

          it('should be able to convert it to CFN format, taking into account custom overrides', () => {
            const inputSamSchema = {
              definitions: {
                "AWS::Serverless::Api": {
                  "additionalProperties": false,
                  "properties": {
                    "DeletionPolicy": {
                      "enum": [
                        "Delete",
                        "Retain",
                        "Snapshot"
                      ],
                      "type": "string"
                    },
                    "DependsOn": {
                      "anyOf": [
                        {
                          "pattern": "^[a-zA-Z0-9]+$",
                          "type": "string"
                        },
                        {
                          "items": {
                            "pattern": "^[a-zA-Z0-9]+$",
                            "type": "string"
                          },
                          "type": "array"
                        }
                      ]
                    },
                    "Metadata": {
                      "type": "object"
                    },
                    "Properties": {
                      "additionalProperties": false,
                      "properties": {
                        "CacheClusterEnabled": {
                          "type": "boolean"
                        },
                        "CacheClusterSize": {
                          "type": "string"
                        },
                        "DefinitionBody": {
                          "type": "object"
                        },
                        "DefinitionUri": {
                          "anyOf": [
                            {
                              "type": [
                                "string"
                              ]
                            },
                            {
                              "$ref": "#/definitions/AWS::Serverless::Api.S3Location"
                            }
                          ]
                        },
                        "Name": {
                          "type": "string"
                        },
                        "StageName": {
                          "anyOf": [
                            { "type": "string" },
                            { "type": "object" }
                          ]
                        },
                        "Variables": {
                          "additionalProperties": false,
                          "patternProperties": {
                            "^[a-zA-Z0-9]+$": {
                              "anyOf": [
                                { "type": "string" },
                                { "type": "object" }
                              ]
                            }
                          },
                          "type": "object"
                        }
                      },
                      "required": [
                        "StageName"
                      ],
                      "type": "object"
                    },
                    "Type": {
                      "enum": [
                        "AWS::Serverless::Api"
                      ],
                      "type": "string"
                    }
                  },
                  "required": [
                    "Type",
                    "Properties"
                  ],
                  "type": "object"
                },
                "AWS::Serverless::Api.S3Location": {
                  "additionalProperties": false,
                  "properties": {
                    "Bucket": {
                      "type": "string"
                    },
                    "Key": {
                      "type": "string"
                    },
                    "Version": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "Bucket",
                    "Key"
                  ],
                  "type": "object"
                }
              }
            };

            const inputCustomSpecification = {
              PropertyTypes: {
                'AWS::Serverless::Api.S3Location': {
                  Documentation: 'somethingBeautiful',
                  Properties: {
                    'Bucket': {
                      Type: undefined,
                      PrimitiveType: 'String',
                      Documentation: 'somethingCool',
                      Required: true,
                      UpdateType: 'Mutable'
                    },
                    'Key': {
                      Type: undefined,
                      PrimitiveType: 'String',
                      Documentation: 'somethingAwesome',
                      Required: true,
                      UpdateType: 'Mutable'
                    },
                    'Version': {
                      Required: true
                    }
                  }
                }
              },
              ResourceTypes: {
                'AWS::Serverless::Api': {
                  Documentation: 'SomethingPretty',
                  AdditionalProperties: true,
                  Properties: {
                    'CacheClusterEnabled': {
                      PrimitiveType: 'Boolean',
                      Documentation: 'SomethingNasty',
                      Required: false,
                      UpdateType: 'Mutable'
                    },
                    'SomethingNew': {
                      PrimitiveType: 'String',
                      Documentation: 'SomethingMissing',
                      Required: false,
                      UpdateType: 'Mutable'
                    }
                  }
                }
              }
            };

            const result = sam2CFNUtils.samResourcesSpecification(inputSamSchema, inputCustomSpecification);

            expect(result).to.be.deep.equal({
              PropertyTypes: {
                'AWS::Serverless::Api.S3Location': {
                  Documentation: 'somethingBeautiful',
                  Properties: {
                    'Bucket': {
                      Type: undefined,
                      PrimitiveType: 'String',
                      Documentation: 'somethingCool',
                      Required: true,
                      UpdateType: 'Mutable'
                    },
                    'Key': {
                      Type: undefined,
                      PrimitiveType: 'String',
                      Documentation: 'somethingAwesome',
                      Required: true,
                      UpdateType: 'Mutable'
                    },
                    'Version': {
                      Type: [
                        'S3Location#Version<Integer>',
                        'S3Location#Version<Long>',
                        'S3Location#Version<Double>'
                      ],
                      Documentation: '',
                      Required: true,
                      UpdateType: 'Mutable'
                    }
                  }
                }
              },
              ResourceTypes: {
                'AWS::Serverless::Api': {
                  Documentation: 'SomethingPretty',
                  AdditionalProperties: true,
                  Properties: {
                    'CacheClusterEnabled': {
                      PrimitiveType: 'Boolean',
                      Documentation: 'SomethingNasty',
                      Required: false,
                      UpdateType: 'Mutable'
                    },
                    'SomethingNew': {
                      PrimitiveType: 'String',
                      Documentation: 'SomethingMissing',
                      Required: false,
                      UpdateType: 'Mutable'
                    },
                    'CacheClusterSize': {
                      Type: [
                        '#CacheClusterSize<String>',
                        '#CacheClusterSize<Timestamp>'
                      ],
                      Documentation: '',
                      Required: false,
                      UpdateType: 'Mutable'
                    },
                    'DefinitionBody': {
                      PrimitiveType: 'Json',
                      Documentation: '',
                      Required: false,
                      UpdateType: 'Mutable'
                    },
                    'DefinitionUri': {
                      Type: [
                        '#DefinitionUri<String>',
                        '#DefinitionUri<Timestamp>',
                        '#DefinitionUri<S3Location>'
                      ],
                      Documentation: '',
                      Required: false,
                      UpdateType: 'Mutable'
                    },
                    'Name': {
                      Type: [
                        '#Name<String>',
                        '#Name<Timestamp>'
                      ],
                      Documentation: '',
                      Required: false,
                      UpdateType: 'Mutable'
                    },
                    'StageName': {
                      Type: [
                        '#StageName<String>',
                        '#StageName<Timestamp>',
                        '#StageName<Json>'
                      ],
                      Documentation: '',
                      Required: true,
                      UpdateType: 'Mutable'
                    },
                    'Variables': {
                      Type: [
                        '#Variables<Map<String>>',
                        '#Variables<Map<Timestamp>>',
                        '#Variables<Map<Json>>'
                      ],
                      Documentation: '',
                      Required: false,
                      UpdateType: 'Mutable'
                    }
                  }
                }
              }
            });
          });

          it('should be able to convert it to CFN format, filtering out invalid resource or property types', () => {
              const inputSamSchema = {
                definitions: {
                  "AWS::Serverless::Api": {
                    "additionalProperties": false,
                    "properties": {
                      "DeletionPolicy": {
                        "enum": [
                          "Delete",
                          "Retain",
                          "Snapshot"
                        ],
                        "type": "string"
                      },
                      "DependsOn": {
                        "anyOf": [
                          {
                            "pattern": "^[a-zA-Z0-9]+$",
                            "type": "string"
                          },
                          {
                            "items": {
                              "pattern": "^[a-zA-Z0-9]+$",
                              "type": "string"
                            },
                            "type": "array"
                          }
                        ]
                      },
                      "Metadata": {
                        "type": "object"
                      },
                      "Properties": {
                        "additionalProperties": false,
                        "properties": {
                          "CacheClusterEnabled": {
                            "type": "boolean"
                          },
                          "CacheClusterSize": {
                            "type": "string"
                          },
                          "DefinitionBody": {
                            "type": "object"
                          },
                          "DefinitionUri": {
                            "anyOf": [
                              {
                                "type": [
                                  "string"
                                ]
                              },
                              {
                                "$ref": "#/definitions/AWS::Serverless::Api.S3Location"
                              }
                            ]
                          },
                          "Name": {
                            "type": "string"
                          },
                          "StageName": {
                            "anyOf": [
                              { "type": "string" },
                              { "type": "object" }
                            ]
                          },
                          "Variables": {
                            "additionalProperties": false,
                            "patternProperties": {
                              "^[a-zA-Z0-9]+$": {
                                "anyOf": [
                                  { "type": "string" },
                                  { "type": "object" }
                                ]
                              }
                            },
                            "type": "object"
                          }
                        },
                        "required": [
                          "StageName"
                        ],
                        "type": "object"
                      },
                      "Type": {
                        "enum": [
                          "AWS::Serverless::Api"
                        ],
                        "type": "string"
                      }
                    },
                    "required": [
                      "Type",
                      "Properties"
                    ],
                    "type": "object"
                  },
                  "somethingInvalid": {
                    "additionalProperties": false,
                    "properties": {
                      "DeletionPolicy": {
                        "enum": [
                          "Delete",
                          "Retain",
                          "Snapshot"
                        ],
                        "type": "string"
                      },
                      "DependsOn": {
                        "anyOf": [
                          {
                            "pattern": "^[a-zA-Z0-9]+$",
                            "type": "string"
                          },
                          {
                            "items": {
                              "pattern": "^[a-zA-Z0-9]+$",
                              "type": "string"
                            },
                            "type": "array"
                          }
                        ]
                      },
                      "Metadata": {
                        "type": "object"
                      },
                      "Properties": {
                        "additionalProperties": false,
                        "properties": {
                          "CacheClusterEnabled": {
                            "type": "boolean"
                          },
                          "CacheClusterSize": {
                            "type": "string"
                          },
                          "DefinitionBody": {
                            "type": "object"
                          },
                          "DefinitionUri": {
                            "anyOf": [
                              {
                                "type": [
                                  "string"
                                ]
                              },
                              {
                                "$ref": "#/definitions/AWS::Serverless::Api.S3Location"
                              }
                            ]
                          },
                          "Name": {
                            "type": "string"
                          },
                          "StageName": {
                            "anyOf": [
                              { "type": "string" },
                              { "type": "object" }
                            ]
                          },
                          "Variables": {
                            "additionalProperties": false,
                            "patternProperties": {
                              "^[a-zA-Z0-9]+$": {
                                "anyOf": [
                                  { "type": "string" },
                                  { "type": "object" }
                                ]
                              }
                            },
                            "type": "object"
                          }
                        },
                        "required": [
                          "StageName"
                        ],
                        "type": "object"
                      },
                      "Type": {
                        "enum": [
                          "AWS::Serverless::Api"
                        ],
                        "type": "string"
                      }
                    },
                    "required": [
                      "Type",
                      "Properties"
                    ],
                    "type": "object"
                  },
                  "AWS::Serverless::Api.S3Location": {
                    "additionalProperties": false,
                    "properties": {
                      "Bucket": {
                        "type": "string"
                      },
                      "Key": {
                        "type": "string"
                      },
                      "Version": {
                        "type": "number"
                      }
                    },
                    "required": [
                      "Bucket",
                      "Key"
                    ],
                    "type": "object"
                  },
                  "somethingInvalid.S3Location": {
                    "additionalProperties": false,
                    "properties": {
                      "Bucket": {
                        "type": "string"
                      },
                      "Key": {
                        "type": "string"
                      },
                      "Version": {
                        "type": "number"
                      }
                    },
                    "required": [
                      "Bucket",
                      "Key"
                    ],
                    "type": "object"
                  }
                }
              };

              const inputCustomSpecification = {};

              const result = sam2CFNUtils.samResourcesSpecification(inputSamSchema, inputCustomSpecification);

              expect(result).to.be.deep.equal({
                PropertyTypes: {
                  'AWS::Serverless::Api.S3Location': {
                    Documentation: '',
                    Properties: {
                      'Bucket': {
                        Type: [
                          'S3Location#Bucket<String>',
                          'S3Location#Bucket<Timestamp>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      },
                      'Key': {
                        Type: [
                          'S3Location#Key<String>',
                          'S3Location#Key<Timestamp>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      },
                      'Version': {
                        Type: [
                          'S3Location#Version<Integer>',
                          'S3Location#Version<Long>',
                          'S3Location#Version<Double>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                },
                ResourceTypes: {
                  'AWS::Serverless::Api': {
                    Documentation: '',
                    AdditionalProperties: false,
                    Properties: {
                      'CacheClusterEnabled': {
                        PrimitiveType: 'Boolean',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'CacheClusterSize': {
                        Type: [
                          '#CacheClusterSize<String>',
                          '#CacheClusterSize<Timestamp>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'DefinitionBody': {
                        PrimitiveType: 'Json',
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'DefinitionUri': {
                        Type: [
                          '#DefinitionUri<String>',
                          '#DefinitionUri<Timestamp>',
                          '#DefinitionUri<S3Location>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'Name': {
                        Type: [
                          '#Name<String>',
                          '#Name<Timestamp>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      },
                      'StageName': {
                        Type: [
                          '#StageName<String>',
                          '#StageName<Timestamp>',
                          '#StageName<Json>'
                        ],
                        Documentation: '',
                        Required: true,
                        UpdateType: 'Mutable'
                      },
                      'Variables': {
                        Type: [
                          '#Variables<Map<String>>',
                          '#Variables<Map<Timestamp>>',
                          '#Variables<Map<Json>>'
                        ],
                        Documentation: '',
                        Required: false,
                        UpdateType: 'Mutable'
                      }
                    }
                  }
                }
              });
          });

      });

    })

});
