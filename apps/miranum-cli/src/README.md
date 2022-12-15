# Miranum-cli

**Features**

- Generates process artifacts and automation projects
- Defines a standard structure for automation projects
- Deploys artifacts to your digiwf instance

- [documentation](https://github.com/FlowSquad/miranum-ide/tree/main/docs)

## Getting started

```
npm install @miragon/miranum-cli
```

## Usage

```bash
  __  __ _                               _____                               _____ _____  ______
 |  \/  (_)                             |  __ \                             |_   _|  __ \|  ____|
 | \  / |_ _ __ __ _  __ _  ___  _ __   | |__) | __ ___   ___ ___  ___ ___    | | | |  | | |__
 | |\/| | | '__/ _` |/ _` |/ _ \| '_ \  |  ___/ '__/ _ \ / __/ _ \/ __/ __|   | | | |  | |  __|
 | |  | | | | | (_| | (_| | (_) | | | | | |   | | | (_) | (_|  __/\__ \__ \  _| |_| |__| | |____
 |_|  |_|_|_|  \__,_|\__, |\___/|_| |_| |_|   |_|  \___/ \___\___||___/___/ |_____|_____/|______|
                      __/ |
                     |___/


Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  deploy-file [options]    deploys an artifact to the target environment
  deploy-all [options]     deploys all artifacts to the target environment
  generate-file [options]  generates a process process artifact
  generate [options]       generates a project foundation
  help [command]           display help for command
```

**Deployment**

```bash
# deploy project to target env dev
npx @miragon/miranum-cli deploy -d . -t dev

# deploy project example-project to env prod
npx @miragon/miranum-cli deploy -d path/to/example-project -t dev
```

**Deploy single file**

```bash
# deploy project to target env dev
npx @miragon/miranum-cli deploy-file -f resources/my-process-automation-project/my-process.bpmn -t dev --type bpmn
```

**Generate new project**

```bash
npx @miragon/miranum-cli generate --name my-awesome-project --path .
```
