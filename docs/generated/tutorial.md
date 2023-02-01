# How to generate cli docs:

Start by running the doc-command
``` bash
npm run doc
```

Then copy all files from docs/generated/cliCommands/modules into miranum-docs repo
and change everything above and including **## Functions** with the following:
```
---
sidebar_position: xy
---

# Titel
```
Finally, remove the **Returns** blocks under each function.

## Prepare a new Command for [TypeDoc](https://typedoc.org/):

1. Make a new documentation-comment, in which you describe the method.
2. Add an example under the tag *@example* (within markdown ```bash```)
3. Add all available Options under the tag *@options* (within markdown ```bash```)
