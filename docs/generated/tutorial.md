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

## New Commands with [TypeDoc](https://typedoc.org/):

Make a new documentation-comment, in which you describe the method.

Add an example under the tag *@example*

And add all available Options under the tag *@options*

Both lists should be in markdown typical bash boxes
