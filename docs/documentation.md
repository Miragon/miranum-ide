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

<hr>

## <span style="color:green"> existing commands: </span>


### <span style="color:lime"> *deployFileCommand* </span>
    This command deploys an artifact to the target environment.
    An artefact consists out of a type (string), a project (string), and a file
        The file in itself consist out of a name, an extension, some content, a size, and a path
    
    A command can look as the following: ???

### <span style="color:lime"> *deployAllFiles* </span>
    This command deploys all artifact to the target environment.
    Therefore, it uses a deploy method, similar to the deployFileCommand.

    A command can look as the following: ???

### <span style="color:lime"> *generate* </span>
    This command generates a file of a supported type.
    Supportet types are: bpmn, dmn, form, config, element-templatet

    A command can look as the following: <tbd>

### <span style="color:lime"> *generateProject* </span>
    This command generates a whole bpmn project.
    A bpmn project consists of a bpmn file, two config, and two form files.

    A command can look as the following: <tbd>

### <span style="color:lime"> *genericGenerate* </span>
    This command does the same as generateProject.
    The difference is that this command generates it based on an existing folder-template, which can be easely extended should you whish to.
