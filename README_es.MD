# cfn-lint [![CircleCI](https://img.shields.io/circleci/project/github/martysweet/cfn-lint.svg)](https://circleci.com/gh/martysweet/cfn-lint) [![npm version](https://badge.fury.io/js/cfn-lint.svg)](https://www.npmjs.com/package/cfn-lint) [![npm](https://img.shields.io/npm/dm/cfn-lint.svg)](https://www.npmjs.com/package/cfn-lint)

[//]: # (Translation Section: A more friendly CloudFormation JSON and YAML Validator)
#### Un validador para CloudFormation JSON and YAML más amigable.
`cfn-lint` es una herramienta utilizada para mejorar tu ciclo de desarrollo en CloudFormation. Si estás aquí, probablemente estés 
harto de esperar 10 minutos o más antes de que CloudFormation te dé un error debido a un error gramatical. Esta herramienta tiene como objetivo eliminar esa pérdida de tiempo. 
La herramienta toma el modelo de CloudFormation, y resuelve todas las funciones intrínsecas definidas antes de verificar las _Propiedades_ de los _Recursos_ definidos.
La herramienta puede usarse sobre la línea de comando usando `cfn-lint`, o puede usarse como un módulo dentro de otra aplicación de JavaScript.

#* _Nota: actualmente, esta herramienta distingue entre mayúsculas y minúsculas en relación con los tipos AWS CloudFormation, por ejemplo aws::lambda::function != AWS::Lambda::Function._*

[//]: # (Translation Section: Installation)
## Instalación

Se puede instalar con `npm`:

```
$ npm instalar -g cfn-lint
```

Si lo consigues `/usr/bin/env: 'node': No such file or directory (El archivo o directorio no existe)` Asegúrate de que tu sistema tenga NodeJs instalado. En los sistemas Debian, es posible que deba enlazar el node a nodejs debido a problemas de espacio con los nombres (`ln -s /usr/bin/nodejs /usr/bin/node`).

[//]: # (Translation Section: How to use?)
## ¿Cómo se usa?
`cfn-lint validate my_template.yaml`

`cfn-lint validate my_template.json`

`cfn-lint validate my_template.yaml --parameters key="my value",key2=value2,key3=3`

`cfn-lint validate my_template.yaml --parameters key="my value",key2=value2 --no-guess-parameters`

`cfn-lint validate my_template.yaml --pseudo AWS::StackName="My-Stack"`

`cfn-lint validate my_template.yaml --parameters key="my value" --pseudo AWS::Region=ap-northeast-1,AWS::AccountId=000000000000`

`cfn-lint docs AWS::Lambda::Function` 

`cfn-lint docs AWS::Lambda::Function.Code`

`cfn-lint docs AWS::Lambda::Function.Code.S3Bucket`

**Nota: El orden de `--parameters` y `--pseudo` actualmente importa. Esto debería abordarse en una nueva versión.**

[//]: # (Translation Section: Example Output)
### Ejemplo de salida
```
0 infos
0 warn
2 crit
Resource: Resources > MyInstance > Properties
Message: Required property ImageId missing for type AWS::EC2::Instance
Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-instance.html

Resource: Resources > MyInstance > Properties
Message: Required property Value missing for type Tag
Documentation: http://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation-guide&searchQuery=Tag&x=0&y=0&this_doc_product=AWS+CloudFormation&this_doc_guide=User+Guide&doc_locale=en_us#facet_doc_product=AWS%20CloudFormation&facet_doc_guide=User%20Guide

Template invalid!
```
[//]: # (Translation Section: Flags)
### Flags
`--parameters <param values>`: Proporcione una lista de Comas separadas llave=valor <tt>key=value</tt> por pares de parámetros para utilizar al validar su plantilla. Si un parámetro no se especifica aquí, `cfn-lint` adivinará un valor falso basado en el tipo de parámetro y valores permitidos. e.g.
  - `--parameters InstanceType=t2.micro,Memory=512`

`--pseudo <psuedo param values>`: Proporcione una lista de comas separadas llave=valor <tt>key=value</tt> por pares de CloudFormation pseudo-parámetros para utilizar al validar su plantilla. p.ej.
  - `--pseudo AWS::Region=ap-southeast-2`

`--guess-parameters`:Adivina los parámetros si no tienen ningún valor predeterminado en la plantilla. Los parámetros serán adivinados/estimados en base a sus `AllowedValues` o` Type`. Este es el comportamiento estándar; solo está incluido como una opción de claridad.

`--no-guess-parameters`:Desactive la adivinación de parámetros si no tienen un valor predeterminado. Si no los proporciona en la CLI en esta situación, se generará un error crítico en lugar de estimar el valor del parámetro.

`--only-guess-parameters <param names>`: Solo adivine los parámetros proporcionados, y deshabilitar la adivinación de todos los demás sin valores predeterminados. Se generará un error crítico para los parámetros faltantes, como se indicó anteriormente. p.ej.
 - `--only-guess-parameters InstanceType,Memory`

[//]: # (Translation Section:What can cfn-lint do?)
### ¿Qué puede hacer cfn-lint?
* <tt>Read JSON + YAML (Including YAML short form)</tt> Lea JSON + YAML (Incluyendo YAML en su formato más pequeño)
* <tt>Detect invalid property names</tt> Detecta nombres de propiedad inválido
* <tt>Detect invalid Ref</tt> Detecta Ref inválido
* <tt>Detect invalid mappings</tt> Detecta mapeos inválidas
* <tt>Detect invalid format</tt> Detecta formato inválido
* <tt>Missing or invalid AWSTemplateFormatVersion</tt> Faltante o inválido Versión de formato de plantilla AWS
* <tt>Fn::FindInMap</tt> Encontrar en mapa
* <tt>Fn::GetAtt</tt> Obtener Att
* <tt>Fn::GetAZs</tt> Obtener AZs
* <tt>Fn::Join</tt> Unirse
* <tt>Fn::Base64</tt>
* <tt>Fn::Sub</tt>
* <tt>Fn::If</tt> sí
* <tt>Fn::Equals</tt> Iguales
* <tt>Fn::Not</tt> No
* <tt>Fn::Or</tt> O
* <tt>Fn::And</tt> Y
* <tt>Fn::ImportValue</tt> Importar valor
* <tt>Fn::Select</tt> Seleccionar
* <tt>Condition support</tt> Condición de soporte
* <tt>Ref</tt>
* Vaya a la documentación desde la línea de comandos (consulte los ejemplos anteriores)
* Detectando tipos de propiedad inválidos
* Detectar las propiedades requeridas faltantes

[//]: # (Translation Section:Feature backlog)
### Función de Reserva
* Errores de análisis detallados al leer JSON no válido
* <tt>Fn::ImportValue</tt> - para admitir la inyección CLI (Como lo hace Params actualmente)
* <tt>Fn::Split</tt> (División)
* Prueba de cobertura para condiciones y comprobación de propiedad
* La verificación de Refactor Property está más clara
* Verificación de dependencia circular
* Sugerir DependsOn cuando se utilizan las referencias a los recursos
* Indicador de validación extendida (llama API AWS CloudFormation)
* Ver indicador de archivo para revalidar en el archivo <tt>save</tt> (guardar)
* Descargue los últimos recursos durante la compilación

[//]: # (Translation Section:Features that would be nice, but aren't currently possible)
### Características que serían agradables, pero actualmente no son posibles
* Detectar propiedades requeridas condicionales (La información no existe en la Especificación de recursos de AWS)

### API
`cfn-lint` también se puede usar como una biblioteca de <tt>Node</tt>:
```ts
const cfnLint = require('cfn-lint')
```

Los siguientes métodos se consideran públicos:

```ts
cfnLint.validateFile(fileName: string, options?: ValidationOptions): ValidationResult
```
Valida un archivo y devuelve un <tt>ValidationResult</tt> con los resultados.


```ts
cfnLint.validateJsonObject(object: any, options?: ValidationOptions): ValidationResult
```
Valida un objeto y devuelve un ValidationResult con los resultados. El objeto
es lo que puede obtener de `JSON.parse`ing una plantilla de Cloudformation.


```ts
interface ValidationOptions {
  parameters?: {
    Param1: Param1value,
    // ...
  }
  pseudoParameters?: {
    'AWS::Region': 'ap-southeast-2',
    // ...
  },
  guessParameters?: string[] | undefined // default undefined
}
```
`parameters` pasar a los parámetros de la plantilla antes de la validación, y `pseudoParameters` se usan para anular AWS' pseudo-parámetros, como `AWS::Region`, `AWS::AccountId`, etc.

Sí `guessParameters` se establece en una lista de nombres de parámetros, se generará un error crítico si no se especifica ningún parámetro sin valor predeterminado en las opciones `parameters` o `guessParameters`. Se puede usar una lista vacía para exigir que todos los parámetros se especifiquen en `parameters`. Dejando como `undefined` conserva el comportamiento suelto predeterminado, donde los parámetros son adivinados según sea necesario sin causar un error.

```ts
interface ErrorRecord {
  message: string,
  resource: string,
  documentation: string
}
interface ValidationResult {
  templateValid: boolean,
  errors: {
    crit: ErrorRecord[],
    warn: ErrorRecord[],
    info: ErrorRecord[]
  },
  outputs: {
      [outputName: string]: string;
  };
  exports: {
      [outputName: string]: string;
  };
}
```
Representa el resultado de una validación.

[//]: # (Translation Section:Deploying your template)
## Implementando su plantilla

CloudFormation tiende a involucrar un poco de prueba y error. Para permitir un desarrollo rápido, 
el siguiente metodo puede ser utilizado para evitar los molestos escenarios donde se debe 'ROLLBACK' (Recargar) y se elimina toda la pila.

Implemente una plantilla con el siguiente contenido, asígnele el nombre al que desea que se llame su pila final.
```yaml
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
```

Después de cada cambio en su plantilla, simplemente actualice la pila que acaba de crear. Si la pila no se pudo implementar
por alguna razón, puede realizar una operación <tt>'Update Stack'</tt> (Actualizar pila), sin necesidad de eliminar y recrear
la pila desde cero. También puede usar este método para mantener los parámetros poblados durante la fase de desarrollo. 
Este método funcionará utilizando la consola de AWS <tt>AWS console</tt> o las herramientas CLI <tt>CLI tools</tt>.

[//]: # (Translation Section:FAQ)
## Preguntas más frecuentes

### No se presentaron errores en mi plantilla, pero aún así falló al implementar! ¿Esta herramienta es inútil?!
Esperemos que `cfn-lint` haya detectado algunos errores antes de implementar su plantilla, sin embargo, detectar todos los errores antes del despliegue
es extremadamente complicado. Ayuda a la comunidad explicando cómo 
lograste obtener un error de CloudFormation del cual el validador no detectó, the following information
ayudará a agregar un <tt>check</tt> a la utilidad:

* El Recurso/Declaración que causó el error
* El error arrojado desde CloudFormation
* El Recurso/Declaración de trabajo que resuelve el error

Puedes agregar un problema en el [Github Issue Page](https://github.com/martysweet/cfn-lint/issues). ¡Gracias por ayudar!

[//]: # (Translation Section:Doesn't the AWS API provide this functionality?)
### ¿La API de AWS no proporciona esta funcionalidad?
Parcialmente. La AWS API `cloudformation validate-template` solo verifica la validez de la plantilla, esto incluye 
los parámetros esperados para las funciones intrínsecas, tipos de recursos y estructura general de la plantilla JSON o YAML que se le ha dado. La
API de AWS no detecta nombres de propiedades de recursos incorrectos o tipos de propiedades de recursos incorrectos (p.ej. cadena, <tt>bool</tt>, lista) las cuales
normalmente solo se detectan cuando CloudFormation intenta implementar los recursos con las configuraciones incorrectas.

[//]: # (Translation Section:How does cfn-lint know what is valid?)
### ¿Cómo sabe cfn-lint qué es válido?
AWS proporciona un archivo de especificación de CloudFormation para cada región.cfn-lint utilice el archivo US East (N. Virginia) CloudFormationResourceSpecification.json 
disponible en la página [AWS CloudFormation Resource Specification](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-resource-specification.html).
Actualmente, las actualizaciones de este archivo JSON son manuales y se preparan para cada versión mayor, menor o corrección de errores según sea necesario.

[//]: # (Translation Section:Got any other questions?)
### ¿Tienes alguna otra pregunta?
¡Haz una pregunta en la [Github Issue Page](https://github.com/martysweet/cfn-lint/issues)!

[//]: # (Translation Section:Development)
## Desarrollo

[//]: # (Translation Section:Language)
### Lenguaje

Este proyecto está escrito en [TypeScript](http://www.typescriptlang.org/docs/home.html), un super conjunto de JavaScript que permite la comprobación de tipos en tiempo de compilación.
El proyecto actualmente apunta a soportar el <tt>Node</tt> 4 y superior.

[//]: # (Translation Section:Unit Tests)
### Pruebas de Unidades

Las pruebas se pueden ejecutar usando `npm test`. Debería haber un caso de prueba para cada error de plantilla, 
por ejemplo, un parámetro inválido para `Fn :: Join` o una referencia incorrecta para` Ref`. 
Las pruebas dependen de `Mocha` y` chai`.

[//]: # (Translation Section:IDE Setup)
### Configuración IDE

Si usa un editor de JetBrains, se puede configurar la siguiente configuración de ejecución para el conjunto de pruebas de `Mocha`:

Opciones <tt>Node</tt>: Ninguna
Opciones adicionales de `Mocha`: Ninguna
Directorio de prueba: <working dir>/lib/test

[//]: # (Translation Section:Local testing of CLI)
### Pruebas locales de CLI

Variables ambientales
* CORRECIONES: configurado para recibir mensajes de corrección en tiempo de ejecución

```
$ npm link
$ cfn-lint <some command>
```

[//]: # (Translation Section:Resource Attribute Mocking)
### Atributo del recurso obviado
Para simular las funciones intrínsecas de detectar errores antes de la implementación,
los atributos para Propiedades y Recursos son obviados. Esto se puede ver dentro del
`assignResourcesOutputs ()` y `assignParameterOutputs ()` de [validator.es6](src/validator.es6).
Un recurso siempre tendrá una referencia de `mock-ref-RESOURCENAME` y se le asignarán otros atributos
 que se pueden usar con la función `Fn :: GetAtt`. Esto permite verificar
si los atributos existen para un recurso específico antes de desplegar la plantilla de forma real.

[//]: # (Translation Section:Intrinsic Functions)
### Funciones intrínsecas

Cada función intrínseca tiene una firma de `doIntrinsicXYZ (ref, key)` y es llamada por
 la función `resolveIntrinsicFunction (ref, key)`. La función `doIntrinsic..` debe devolver 
el valor resuelto de la función. Por ejemplo, para Fn :: Sub, una entrada de `"Mi $ {MiInstancia}"`
 devolvería una cadena similar a `"Mi i-0a0a0a0a0a`.

[//]: # (Translation Section:Contributions)
## Contribuciones

Consulte la [Guía para colaboradores](CONTRIBUTING.md) para obtener más información sobre cómo comenzar.

[//]: # (Translation Section:Translations)
## Traducciones
Este documento está disponible en:

- [English](https://github.com/martysweet/cfn-lint/blob/master/README.md)
- [Español](https://github.com/martysweet/cfn-lint/blob/master/README_es.md)
