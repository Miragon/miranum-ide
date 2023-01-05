## <span style="color:#335DE5"> Commands: </span>


### <span style="color:lime"> *deployFile* </span>
    This command deploys an artifact to the target environment.
    An artefact consists out of a type (string), a project (string), and a file
        The file in itself consist out of a name, an extension, some content, a size, and a path
    
    A command can look as the following: 
        "deploy-file -f file/path.type -t local --type bpms"

### <span style="color:lime"> *deployAllFiles* </span>
    This command deploys all artifact to the target environment.
    Therefore, it uses a deploy method, similar to the deployFileCommand.

    A command can look as the following:
        "deploy-all -d path/to/directory -t local -p projectName"

### <span style="color:lime"> *generate-file* </span>
    This command generates a file of a supported type.
    Supportet types are: bpmn, dmn, form, config, element-templatet

    A command can look as the following: 
        "generate-file -t bpmn -n testForm.form -p path/toBe"
    Additionally the user has the option to define his own templates that are to be used, and fill them with the data he wants.
                                                          (--template)                                         (--data)

```bash
[help]    
    mandatory fields:
    -t or --type <type>       :   "specify the file type that is to be generated"
    -n or --name <name>       :   "specify the file name"
    -p or --path <filepath>   :   "specify the targeted path"

    optional:
    --template <filepath>     :   "specify a custom template that is to be used"
    --data <JSON string>      :   "specify the data that is to be used for your template"
```

### <span style="color:lime"> *generate-project* </span>
    this command generates a bpmn project with all neccesarry form-/config-files and element-templates.
    The bpmn project is based on the structure in resources/templates/basicProjectTemplate.
    The user has the possibility to select a certain destination directory, and can - should he wish to do so - force (f-flag) the system to overwrite any already existing files

    A command can look as the following:
        "generate-project -n MyProject -p path/of/Destination -f"

```bash
[help]    
    mandatory fields:
    -n or --name <name>         :   "specify the project name"

    optional:
    -p or --path <filepath>     :   "specify the targeted path"
    -f or --force               :   "force overwriting the project"
```
