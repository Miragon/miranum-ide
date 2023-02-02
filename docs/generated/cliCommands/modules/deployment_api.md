[generate](../README.md) / [Modules](../modules.md) / deployment/api

# Module: deployment/api

## Table of contents

### Functions

- [deployAllFiles](deployment_api.md#deployallfiles)
- [deployFile](deployment_api.md#deployfile)

## Functions

### deployAllFiles

▸ **deployAllFiles**(): `Command`

This command deploys all artifact to the target environment.
Therefore, it uses the same deploy method as the deployFileCommand.

**`Example`**

``` bash
deploy-all -d path/to/directory -t local
```

**`Options`**

``` bash
# required
-d or --directory    <directory> :   "specify the directory of the source files"
-t or --target       <target>    :   "specify the target environment"
```

#### Returns

`Command`

___

### deployFile

▸ **deployFile**(): `Command`

This command deploys an artifact to the target environment.
An artefact consists out of a type (string), a project (string), and a file
The file in itself consist out of a name, an extension, some content, a size, and a path

**`Example`**

``` bash
deploy-file -f file/path.type -t local --type bpmn
```

**`Options`**

``` bash
# required
-f or --file         <file>      :   "specify the file in your project"
-t or --target       <target>    :   "specify the target environment"
--type               <type>      :   "specify the file type"
```

#### Returns

`Command`
