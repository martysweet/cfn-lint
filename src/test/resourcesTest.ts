import chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
import resourceSpec = require('../resourcesSpec');
import {
    PrimitiveAttribute,
    ListAttribute
} from "../awsData"

describe('resourceSpec', () =>{

    describe('getType', () => {

        it('should return a resource type', () => {
            let result = resourceSpec.getType("AWS::Lambda::Function");
            expect(result).to.not.equal(null);
        });

        it('should return a property type', () => {
            let result = resourceSpec.getType("AWS::Lambda::Function.Code");
            expect(result).to.not.equal(null);
        });

        it('should throw for invalid type', () => {
            expect(
                () => resourceSpec.getType("AWS::Lambda::InvalidFunction")
            ).to.throw(resourceSpec.NoSuchResourceType);
        });

    });

    describe('isValidProperty', () => {

        it('should return True for AWS::Lambda::Function > Code', () => {
            let result = resourceSpec.isValidProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(true);
        });

        it('should return False for AWS::Lambda::Function > MyCode', () => {
            let result = resourceSpec.isValidProperty("AWS::Lambda::Function", "MyCode");
            expect(result).to.equal(false);
        });

        it('should throw for AWS::Lambda::InvalidFunction > Code', () => {
            expect(
                () => resourceSpec.isValidProperty("AWS::Lambda::InvalidFunction", "Code")
            ).to.throw(resourceSpec.NoSuchResourceType);
        });

    });

    describe('isRequiredProperty', () => {

        it('should return True for AWS::IAM::User.Policy > PolicyName', () => {
            let result = resourceSpec.isRequiredProperty("AWS::IAM::User.Policy", "PolicyName");
            expect(result).to.equal(true);
        });

        it('should return True for AWS::Lambda::Function > Code', () => {
            let result = resourceSpec.isRequiredProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(true);
        });

        it('should return False for AWS::Lambda::Function > Description', () => {
            let result = resourceSpec.isRequiredProperty("AWS::Lambda::Function", "Description");
            expect(result).to.equal(false);
        });

        it('should throw for AWS::Lambda::InvalidFunction > Description', () => {
            expect(
                () => resourceSpec.isRequiredProperty("AWS::Lambda::InvalidFunction", "Description")
            ).to.throw(resourceSpec.NoSuchResourceType);
        });

    });

    describe('isSinglePrimitivePropertyType', () => {

        it('should return True for AWS::Lambda::Function > Description', () => {
            let result = resourceSpec.isPrimitiveProperty("AWS::Lambda::Function", "Description");
            expect(result).to.equal(true);
        });

        it('should return False for AWS::Lambda::Function > Code', () => {
            let result = resourceSpec.isPrimitiveProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(false);
        });

        it('should return False for AWS::Lambda::InvalidFunction > Code', () => {
            expect(
                () => resourceSpec.isPrimitiveProperty("AWS::Lambda::InvalidFunction", "Code")
            ).to.throw(resourceSpec.NoSuchResourceType);
        });

    });

    describe('isArnProperty', () => {

        it('should return True for KmsKeyArn', () => {
            let result = resourceSpec.isArnProperty("KmsKeyArn");
            expect(result).to.equal(true);
        });

        // TODO: Check for ARNs
        it('should return True for TopicArn', () => {
            let result = resourceSpec.isArnProperty("TopicArn");
            expect(result).to.equal(true);
        });

        it('should return False for Code', () => {
            let result = resourceSpec.isArnProperty("Code");
            expect(result).to.equal(false);
        });

    });

    describe('getRefOverride', () => {

        it('should return "arn" for AWS::ECS::Service', () => {
            let result = resourceSpec.getRefOverride("AWS::ECS::Service");
            expect(result).to.equal("arn");
        });

        it('should return null for AWS::Lambda::Function', () => {
            let result = resourceSpec.getRefOverride("AWS::Lambda::Function");
            expect(result).to.equal(null);
        });

    });

    describe('getResourceTypeAttribute', () => {

        it('should return "String" for AWS::ECS::Service attribute Name', () => {
            let result = resourceSpec.getResourceTypeAttribute("AWS::ECS::Service","Name");
            let res = result as PrimitiveAttribute;
            expect(res.PrimitiveType).to.equal("String");
        });

        it('should return "List of String" for AWS::Route53::HostedZone attribute NameServers', () => {
            let result = resourceSpec.getResourceTypeAttribute("AWS::Route53::HostedZone","NameServers");
            let res = result as ListAttribute;
            expect(res.Type).to.equal("List");
            expect(res.PrimitiveItemType).to.equal("String");
        });

        it('should throw NoSuchResourceTypeAttribute for any attrbute on a type with no attributes', () => {
            expect(
                () => resourceSpec.getResourceTypeAttribute("AWS::CloudFormation::WaitConditionHandle", "Anything")
            ).to.throw(resourceSpec.NoSuchResourceTypeAttribute);
        });

        it('should throw NoSuchResourceTypeAttribute for an attrbute that does not exist on a type', () => {
            expect(
                () => resourceSpec.getResourceTypeAttribute("AWS::ECS::Service", "AttributeThatDoesNotExist")
            ).to.throw(resourceSpec.NoSuchResourceTypeAttribute);
        });

    });

    describe('type utilities', () => {

      describe('isParameterizedTypeFormat', () => {

          it('should recognize a non-parameterized Resource-type', () => {
              let input = 'AWS::S3::Bucket';
              let result = resourceSpec.isParameterizedTypeFormat(input);
              expect(result).to.equal(false);
          });

          it('should recognize a non-parameterized Property-type', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.isParameterizedTypeFormat(input);
              expect(result).to.equal(false);
          });

          it('should recognize a parameterized Resource-type', () => {
              let input = 'AWS::S3::Bucket<String>';
              let result = resourceSpec.isParameterizedTypeFormat(input);
              expect(result).to.equal(true);
          });

          it('should recognize a parameterized Property-type', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts<String>';
              let result = resourceSpec.isParameterizedTypeFormat(input);
              expect(result).to.equal(true);
          });

          it('should recognize a parameterized Resource-type, with nested parameterization', () => {
              let input = 'AWS::S3::Bucket<AWS::CodeBuild::Project.Artifacts<String>>';
              let result = resourceSpec.isParameterizedTypeFormat(input);
              expect(result).to.equal(true);
          });

          it('should recognize a parameterized Property-type, with nested parameterization', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts<AWS::S3::Bucket<String>>';
              let result = resourceSpec.isParameterizedTypeFormat(input);
              expect(result).to.equal(true);
          });

      });

      describe('getParameterizedTypeArgument', () => {

          it('should throw an error if the provided Resource-type is not parameterized', () => {
              let input = 'AWS::S3::Bucket';
              let result = () => { resourceSpec.getParameterizedTypeArgument(input); };
              expect(result).to.throw('Invalid parameterized type: AWS::S3::Bucket');
          });

          it('should throw an error if the provided Property-type is not parameterized', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts';
              let result = () => { resourceSpec.getParameterizedTypeArgument(input); };
              expect(result).to.throw('Invalid parameterized type: AWS::CodeBuild::Project.Artifacts');
          });

          it('should return the argument of a parameterized Resource-type', () => {
              let input = 'AWS::S3::Bucket<somethingBeautiful>';
              let result = resourceSpec.getParameterizedTypeArgument(input);
              expect(result).to.equal('somethingBeautiful');
          });

          it('should return the argument of a parameterized Property-type', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts<somethingBeautiful>';
              let result = resourceSpec.getParameterizedTypeArgument(input);
              expect(result).to.equal('somethingBeautiful');
          });

          it('should return the argument of a parameterized Resource-type, with nested parameterization', () => {
              let input = 'AWS::S3::Bucket<AWS::CodeBuild::Project.Artifacts<String>>';
              let result = resourceSpec.getParameterizedTypeArgument(input);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts<String>');
          });

          it('should return the argument of a parameterized Property-type, with nested parameterization', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts<AWS::S3::Bucket<String>>';
              let result = resourceSpec.getParameterizedTypeArgument(input);
              expect(result).to.equal('AWS::S3::Bucket<String>');
          });

      });

      describe('getParameterizedTypeName', () => {

          it('should throw an error if the provided Resource-type is not parameterized', () => {
              let input = 'AWS::S3::Bucket';
              let result = () => { resourceSpec.getParameterizedTypeName(input); };
              expect(result).to.throw('Invalid parameterized type: AWS::S3::Bucket');
          });

          it('should throw an error if the provided Property-type is not parameterized', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts';
              let result = () => { resourceSpec.getParameterizedTypeName(input); };
              expect(result).to.throw('Invalid parameterized type: AWS::CodeBuild::Project.Artifacts');
          });

          it('should return the name of a parameterized Resource-type', () => {
              let input = 'AWS::S3::Bucket<somethingBeautiful>';
              let result = resourceSpec.getParameterizedTypeName(input);
              expect(result).to.equal('AWS::S3::Bucket');
          });

          it('should return the name of a parameterized Property-type', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts<somethingBeautiful>';
              let result = resourceSpec.getParameterizedTypeName(input);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts');
          });

          it('should return the name of a parameterized Resource-type, with nested parameterization', () => {
              let input = 'AWS::S3::Bucket<AWS::CodeBuild::Project.Artifacts<String>>';
              let result = resourceSpec.getParameterizedTypeName(input);
              expect(result).to.equal('AWS::S3::Bucket');
          });

          it('should return the name of a parameterized Property-type, with nested parameterization', () => {
              let input = 'AWS::CodeBuild::Project.Artifacts<AWS::S3::Bucket<String>>';
              let result = resourceSpec.getParameterizedTypeName(input);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts');
          });

      });

      describe('parameterizeTypeFormat', () => {

          it('should parameterize a Resource-type that is not already parameterized', () => {
              let inputType = 'AWS::S3::Bucket';
              let inputParameter = 'somethingBeautiful';
              let inputAllowSubParameterization = false;
              let result = resourceSpec.parameterizeTypeFormat(inputType, inputParameter, inputAllowSubParameterization);
              expect(result).to.equal('AWS::S3::Bucket<somethingBeautiful>');
          });

          it('should parameterize a Property-type that is not already parameterized', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let inputParameter = 'somethingBeautiful';
              let inputAllowSubParameterization = false;
              let result = resourceSpec.parameterizeTypeFormat(inputType, inputParameter, inputAllowSubParameterization);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts<somethingBeautiful>');
          });

          it('should throw an error if the provided Resource-type is already parameterized and sub-parameterization is disallowed', () => {
              let inputType = 'AWS::S3::Bucket<String>';
              let inputParameter = 'somethingBeautiful';
              let inputAllowSubParameterization = false;
              let result = () => { resourceSpec.parameterizeTypeFormat(inputType, inputParameter, inputAllowSubParameterization); };
              expect(result).to.throw('Type is already parameterized: AWS::S3::Bucket<String>');
          });

          it('should throw an error if the provided Property-type is already parameterized and sub-parameterization is disallowed', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String>';
              let inputParameter = 'somethingBeautiful';
              let inputAllowSubParameterization = false;
              let result = () => { resourceSpec.parameterizeTypeFormat(inputType, inputParameter, inputAllowSubParameterization); };
              expect(result).to.throw('Type is already parameterized: AWS::CodeBuild::Project.Artifacts<String>');
          });

          it('should parameterize a Resource-type that is already parameterized when sub-parameterization is allowed', () => {
              let inputType = 'AWS::S3::Bucket<String>';
              let inputParameter = 'somethingBeautiful';
              let inputAllowSubParameterization = true;
              let result = resourceSpec.parameterizeTypeFormat(inputType, inputParameter, inputAllowSubParameterization);
              expect(result).to.equal('AWS::S3::Bucket<String<somethingBeautiful>>');
          });

          it('should parameterize a Property-type that is already parameterized when sub-parameterization is allowed', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String>';
              let inputParameter = 'somethingBeautiful';
              let inputAllowSubParameterization = true;
              let result = resourceSpec.parameterizeTypeFormat(inputType, inputParameter, inputAllowSubParameterization);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts<String<somethingBeautiful>>');
          });

      });

      describe('stripTypeParameters', () => {

          it('should be nullipotent on a Resource-type that is not already parameterized', () => {
              let inputType = 'AWS::S3::Bucket';
              let result = resourceSpec.stripTypeParameters(inputType);
              expect(result).to.equal('AWS::S3::Bucket');
          });

          it('should be nullipotent on a Property-type that is not already parameterized', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.stripTypeParameters(inputType);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts');
          });

          it('should strip parameterization of a Resource-type that is parameterized', () => {
              let inputType = 'AWS::S3::Bucket<String>';
              let result = resourceSpec.stripTypeParameters(inputType);
              expect(result).to.equal('AWS::S3::Bucket');
          });

          it('should strip parameterization of a Property-type that is parameterized', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String>';
              let result = resourceSpec.stripTypeParameters(inputType);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts');
          });

          it('should strip parameterization of a Resource-type that is sub-parameterized', () => {
              let inputType = 'AWS::S3::Bucket<String<somethingBeautiful>>';
              let result = resourceSpec.stripTypeParameters(inputType);
              expect(result).to.equal('AWS::S3::Bucket');
          });

          it('should strip parameterization of a Property-type that is sub-parameterized', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String<somethingBeautiful>>';
              let result = resourceSpec.stripTypeParameters(inputType);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts');
          });

      });

      describe('getPropertyTypeBaseName', () => {

          it('should throw an error on a non Property-type', () => {
              let inputType = 'AWS::S3::Bucket';
              let result = () => { resourceSpec.getPropertyTypeBaseName(inputType) };
              expect(result).to.throw('Invalid property type name: AWS::S3::Bucket');
          });

          it('should return the base type of a Property-type', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.getPropertyTypeBaseName(inputType);
              expect(result).to.equal('AWS::CodeBuild::Project');
          });

          it('should return the base type of a Property-type that has a parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String>';
              let result = resourceSpec.getPropertyTypeBaseName(inputType);
              expect(result).to.equal('AWS::CodeBuild::Project');
          });

          it('should return the base type of a Property-type that has a parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String>.Artifacts';
              let result = resourceSpec.getPropertyTypeBaseName(inputType);
              expect(result).to.equal('AWS::CodeBuild::Project<String>');
          });

          it('should return the base type of a Property-type that has a sub-parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String<somethingBeautiful>>';
              let result = resourceSpec.getPropertyTypeBaseName(inputType);
              expect(result).to.equal('AWS::CodeBuild::Project');
          });

          it('should return the base type of a Property-type that has a sub-parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String<somethingBeautiful>>.Artifacts';
              let result = resourceSpec.getPropertyTypeBaseName(inputType);
              expect(result).to.equal('AWS::CodeBuild::Project<String<somethingBeautiful>>');
          });

      });

      describe('getPropertyTypePropertyName', () => {

          it('should throw an error on a non Property-type', () => {
              let inputType = 'AWS::S3::Bucket';
              let result = () => { resourceSpec.getPropertyTypePropertyName(inputType) };
              expect(result).to.throw('Invalid property type name: AWS::S3::Bucket');
          });

          it('should return the property name of a Property-type', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.getPropertyTypePropertyName(inputType);
              expect(result).to.equal('Artifacts');
          });

          it('should return the property name of a Property-type that has a parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String>';
              let result = resourceSpec.getPropertyTypePropertyName(inputType);
              expect(result).to.equal('Artifacts<String>');
          });

          it('should return the property name of a Property-type that has a parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String>.Artifacts';
              let result = resourceSpec.getPropertyTypePropertyName(inputType);
              expect(result).to.equal('Artifacts');
          });

          it('should return the property name of a Property-type that has a sub-parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String<somethingBeautiful>>';
              let result = resourceSpec.getPropertyTypePropertyName(inputType);
              expect(result).to.equal('Artifacts<String<somethingBeautiful>>');
          });

          it('should return the property name of a Property-type that has a sub-parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String<somethingBeautiful>>.Artifacts';
              let result = resourceSpec.getPropertyTypePropertyName(inputType);
              expect(result).to.equal('Artifacts');
          });

      });

      describe('isTypeFormat', () => {

          it('should return false for an invalid type', () => {
              let inputType = 'somethingCool';
              let result = resourceSpec.isTypeFormat(inputType);
              expect(result).to.equal(false);
          });

          it('should return true for a valid Resource-type', () => {
              let inputType = 'AWS::CodeBuild::Project';
              let result = resourceSpec.isTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.isTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type that has a parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String>';
              let result = resourceSpec.isTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type that has a parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String>.Artifacts';
              let result = resourceSpec.isTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type that has a sub-parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String<somethingBeautiful>>';
              let result = resourceSpec.isTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type that has a sub-parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String<somethingBeautiful>>.Artifacts';
              let result = resourceSpec.isTypeFormat(inputType);
              expect(result).to.equal(true);
          });

      });

      describe('isPropertyTypeFormat', () => {

          it('should return false for an invalid type', () => {
              let inputType = 'somethingCool';
              let result = resourceSpec.isPropertyTypeFormat(inputType);
              expect(result).to.equal(false);
          });

          it('should return false for a valid Resource-type', () => {
              let inputType = 'AWS::CodeBuild::Project';
              let result = resourceSpec.isPropertyTypeFormat(inputType);
              expect(result).to.equal(false);
          });

          it('should return true for a valid Property-type', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.isPropertyTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type that has a parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String>';
              let result = resourceSpec.isPropertyTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type that has a parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String>.Artifacts';
              let result = resourceSpec.isPropertyTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type that has a sub-parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String<somethingBeautiful>>';
              let result = resourceSpec.isPropertyTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid Property-type that has a sub-parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String<somethingBeautiful>>.Artifacts';
              let result = resourceSpec.isPropertyTypeFormat(inputType);
              expect(result).to.equal(true);
          });

      });

      describe('isResourceTypeFormat', () => {

          it('should return false for an invalid type', () => {
              let inputType = 'somethingCool';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(false);
          });

          it('should return false for a valid Property-type', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(false);
          });

          it('should return true for a valid Resource-type', () => {
              let inputType = 'AWS::CodeBuild::Project';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid parameterized Resource-type', () => {
              let inputType = 'AWS::CodeBuild::Project<String>';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return true for a valid sub-parameterized Resource-type', () => {
              let inputType = 'AWS::CodeBuild::Project<String<somethingAwesome>>';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(true);
          });

          it('should return false for a valid Property-type that has a parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String>';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(false);
          });

          it('should return false for a valid Property-type that has a parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String>.Artifacts';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(false);
          });

          it('should return false for a valid Property-type that has a sub-parameterized property name', () => {
              let inputType = 'AWS::CodeBuild::Project.Artifacts<String<somethingBeautiful>>';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(false);
          });

          it('should return false for a valid Property-type that has a sub-parameterized base name', () => {
              let inputType = 'AWS::CodeBuild::Project<String<somethingBeautiful>>.Artifacts';
              let result = resourceSpec.isResourceTypeFormat(inputType);
              expect(result).to.equal(false);
          });

      });

      describe('rebaseTypeFormat', () => {

          it('should return the primitive value type, given a Resource-type and an primitive value type', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'String';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('String');
          });

          it('should return the aggregate type, given a Resource-type and an aggregate type', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'Map';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('Map');
          });

          it('should be able to form a parameterized aggregate type with a valid Property-type as argument, given a Resource-type and a parameterized aggregate type with a property name as argument', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'Map<somethingCool>';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('Map<AWS::S3::Bucket.somethingCool>');
          });

          it('should be able to form a parameterized aggregate type with a valid Property-type as argument, given a Resource-type and a parameterized aggregate type with a Property-type as argument', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'Map<AWS::CodeBuild::Project.Artifacts>';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('Map<AWS::S3::Bucket.Artifacts>');
          });

          it('should be able to form a sub-parameterized aggregate type, given a Resource-type and a sub-parameterized aggregate type with a property name as argument', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'Map<List<somethingCool>>';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('Map<List<AWS::S3::Bucket.somethingCool>>');
          });

          it('should be able to form a sub-parameterized aggregate type, given a Resource-type and a sub-parameterized aggregate type with a Property-type as argument', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'Map<List<AWS::CodeBuild::Project.Artifacts>>';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('Map<List<AWS::S3::Bucket.Artifacts>>');
          });

          it('should be able to form a valid Property-type, given a Resource-type and a property name', () => {
              let inputBaseType = 'AWS::CodeBuild::Project';
              let inputType = 'Artifacts';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('AWS::CodeBuild::Project.Artifacts');
          });

          it('should be able to form a valid Property-type, given a Resource-type and a Property-type', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('AWS::S3::Bucket.Artifacts');
          });

          it('should be able to form a valid Property-type, given a parameterized Resource-type and a Property-type', () => {
              let inputBaseType = 'AWS::S3::Bucket<somethingAwesome>';
              let inputType = 'AWS::CodeBuild::Project.Artifacts';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('AWS::S3::Bucket<somethingAwesome>.Artifacts');
          });

          it('should be able to form a valid Property-type, given a Resource-type and a Property-type that has a parameterized base name', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'AWS::CodeBuild::Project<somethingCool>.Artifacts';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('AWS::S3::Bucket.Artifacts');
          });

          it('should be able to form a valid Property-type, given a Resource-type and a Property-type that has a parameterized argument', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'AWS::CodeBuild::Project.Artifacts<somethingBeautiful>';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('AWS::S3::Bucket.Artifacts<AWS::S3::Bucket.somethingBeautiful>');
          });

          it('should be able to form a valid Property-type, given a Resource-type and a Property-type that has a sub-parameterized argument', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'AWS::CodeBuild::Project.Artifacts<somethingBeautiful<somethingCool>>';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('AWS::S3::Bucket.Artifacts<AWS::S3::Bucket.somethingBeautiful<AWS::S3::Bucket.somethingCool>>');
          });

          it('should be able to form a sub-parameterized aggregate type, given a Resource-type and a sub-parameterized aggregate type with an argument of Property-type that has a sub-parameterized argument', () => {
              let inputBaseType = 'AWS::S3::Bucket';
              let inputType = 'Map<List<AWS::CodeBuild::Project.Artifacts<somethingBeautiful<somethingCool>>>>';
              let result = resourceSpec.rebaseTypeFormat(inputBaseType, inputType);
              expect(result).to.equal('Map<List<AWS::S3::Bucket.Artifacts<AWS::S3::Bucket.somethingBeautiful<AWS::S3::Bucket.somethingCool>>>>');
          });

      });

    });

});
