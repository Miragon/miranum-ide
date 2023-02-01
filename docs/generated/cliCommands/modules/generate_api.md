[generate](../README.md) / [Modules](../modules.md) / generate/api

# Module: generate/api

## Table of contents

### Functions

- [generateFile](generate_api.md#generatefile)
- [generateProject](generate_api.md#generateproject)

## Functions

### generateFile

▸ **generateFile**(): `Command`

This command generates a file for a supported type.
Supportet types can be found and edited in the miranum.json.
By default, we support the types: bpmn, dmn, form, config, element-templatet

**`Example`**

``` bash
generate-file -t bpmn -n testForm.form -p path/toBe
```

**`Options`**

``` bash
# required
-t or --type         <type>      :   "specify the file type that is to be generated"
-n or --name         <name>      :   "specify the name"
-p or --path         <filepath>  :   "specify the targeted path"
```

#### Returns

`Command`

___

### generateProject

▸ **generateProject**(): `Command`

this command generates a bpmn project with all necessary form-/config-files and element-templates.
The bpmn project is based on the structure [miranum](https://github.com/FlowSquad/miranum-ide/tree/main/resources/templates/project-template) suggests.
The user has the possibility to select a certain destination directory with -p.

**`Example`**

``` bash
generate-project -n MyProject -p path/of/Destination
```

**`Options`**

``` bash
# required
-n or --name         <name>      :   "specify the project name"

# optional
-p or --path         <filepath>  :   "specify the targeted path"
```

#### Returns

`Command`
