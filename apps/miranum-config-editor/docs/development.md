# Development

<p>
   <img src="https://www.plantuml.com/plantuml/proxy?cache=no&src=https://github.com/Miragon/miranum-ide/blob/feat/plugin_for_config_files/apps/miranum-config-editor/docs/architecture.puml?raw=true" alt="Component Diagram" /><br />
   <em>The application's software architecture</em>
</p>

## Build With

* Typescript
* Vue 2
* Vuetify

## Quickstart

The *Mirnaum Config Editor* Plugin contains the following apps:
* [miranum-config-editor](../README.md) - The backend application
* [miranum-config-editor-webview](../../miranum-config-editor-webview) - The frontend application

1. Build the plugin
    ```shell
    # Install dependencies
    npm install

    # Build the backend and frontend in watch mode
    npx nx run miranum-config-editor:observe-all
    ```

2. Start the Plugin in VS Code
   1. Start VS Code
   2. Switch to the `Run and Debug` view on the left panel
   3. Select `Run miranum-config-editor` from the dropdown at the top
   4. A new VS Code window will open with the plugin running
   5. In this new window, open the folder [miranum-ide/resources/config-editor-example](../../../resources/config-editor-example)
   6. Open the settings (Code > Preferences > Settings) and search for `miranum-ide`
   7. In the text-field, enter the full path to the JSON Schema and UI-Schema (e.g. `/Users/my-user/miranum-ide/resources/config-editor-example/some/path`)
   8. Close the settings and open the file [configs/miranum-platform.process.config.json](../../../resources/config-editor-example/configs/miranum-platform.process.config.json)
