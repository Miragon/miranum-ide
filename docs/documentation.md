<br />
<div align="center">

# <span style="color:darkgreen"> <u> Documentation </u> </span>

  <a href="#">
    <img src="images/logo.png" alt="Logo" height="244">
  </a>

<h3 align="center" style="font-family: Academy Engraved LET; color:lightgreen">Process-IDE</h3>

</div>

<hr>

## <span style="color:green"> Intro: </span>

    We from Miragon wish to shape the future of process automatisation.
    Therefore, we created the Process-IDE, which enables process developers to easily develop cubernetes diagramms.
    Additionally, it gives additional support like project creation / generation, as well as ???.

## <span style="color:green"> Used Software: </span>
    Templateengine: [Squirrely](https://squirrelly.js.org/)

<hr>

## <span style="color:green"> existing commands: </span>


### <span style="color:lime"> *deployFileCommand* </span>
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

### <span style="color:lime"> *generate* </span>
    This command generates a file of a supported type.
    Supportet types are: bpmn, dmn, form, config, element-templatet

    A command can look as the following: 
        "generate -t bpmn -n testForm.form -p path/toBe"
    Additionally the user has the option to define his own templates that are to be used, and fill them with the data he wants.
                                                          (--template)                                         (--data)

### <span style="color:lime"> *generateProject* </span>
    This command generates a whole bpmn project.
    A bpmn project consists of a bpmn file, two config, and two form files.
    The user has the possibility to select a certain destination directory, and can - should he wish to do so - force the system to overwrite any already existing files

    A command can look as the following: 
        "generateProject -n MyProject -p path/of/Destination"

### <span style="color:lime"> *genericGenerate* </span>
    This command does the same as generateProject.
    The difference is that this command generates it based on an existing folder-template, which can be easely extended should you whish to.

    A command can look as the following:
        "genericGenerate -n MyProject -p path/of/Destination -f"

    The force-flag (f-flag) enables the user to force the program to overwrite any existing folder or file
