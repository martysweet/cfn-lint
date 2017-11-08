
declare interface ResourceType {
  type: 'RESOURCE',
  resourceType: string
}

declare interface NamedProperty {
  type: 'PROPERTY',
  resourceType: string,
  parentType: string // perhaps property type or resource type
  propertyName: string
}

declare interface PropertyType {
  type: 'PROPERTY_TYPE',
  propertyType: string,
  resourceType: string
}

declare interface PrimitiveType {
  type: 'PRIMITIVE_TYPE',
  resourceType: string,
  primitiveType: string
}

declare type ObjectType = ResourceType | NamedProperty | PropertyType | PrimitiveType;

declare interface VerificationFunction {
  (o: any): Boolean,
  failureMessage: string
}