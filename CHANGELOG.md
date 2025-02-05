# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

* **\[Miranum Modeler\]** Dark Theme for bpmn modeler (experimental) (#772)

## [0.6.0] - 2024-10-08

### Fixed

* **\[Miranum Modeler\]** Fix the styling of the scrollbar (#695)

### Changed

* Migrate to yarn (#695)
* Update dependencies (#695)

## [0.5.13] - 2024-06-28

### Added

* **\[Miranum Modeler\]** Add commands to copy or save diagram as SVG (#645)
* **\[Miranum Modeler\]** Sort element templates by name (#645)
* **\[Miranum Modeler\]** Change width of `element-templates-chooser` (#645)

## [0.5.11] - 2024-05-09

### Added

* **\[Miranum Modeler\]** Ask for the execution platform when a new diagram is created (
  #589)

### Fixed

* **\[Miranum Modeler\]** Flatten the element templates if given in an array (#589)
* **\[Miranum Modeler\]** Minor bug fixes (#589)
* **\[Miranum Jsonforms\]** Minor bug fixes (#589)

## [0.5.10] - 2024-04-30

### Fixed

* **\[Miranum Jsonforms\]** Overlapping buttons in Horizontal Layout (#583)

## [0.5.9] - 2024-04-16

### Added

* **\[Miranum Jsonforms\]** Command to split the `.form.json` file into `.schema.json`
  and `.uischema.json` files (#564)

### Fixed

* **\[Miranum Modeler\]** Detects the correct execution platform (#563)

## [0.5.8] - 2024-03-28

### Fixed

* **\[Miranum Modeler\]** Enable keyboard shortcuts for the modeler (#467)

### Changed

* **\[Miranum Modeler\]** Apply a hexagonal architecture to the modeler (#521)
* **\[Miranum Forms\]** Deprecate the `DigiWf Formbuilder` and remove from the extension
  pack

## [0.5.7] - 2024-01-10

### Fixed

* **\[Miranum Modeler\]** Reading forms and element templates from subfolders (#483)

## [0.5.6] - 2023-11-08

### Added

* **\[Miranum Config Editor\]** Add new plugin for editing config files (#412)

### Changed

* **\[Miranum Modeler\]** Rename to Miranum: Camunda Modeler (#419)
* Update dependencies and migrate to Nx Version 17 (#418)

## [0.5.5]

### Added

* **\[Miranum Modeler\]** Configuration to enable the alignment of the diagram at the
  origin (#395)

### Changed

* Update dependencies

## [0.5.4] - 2023-09-19

### Changed

* **\[Miranum Modeler\]** Update dependencies to bpmn-io (#394)

### Fixed

* **\[Miranum Modeler\]** Alignment of elements leads to
  an [endless loop](https://github.com/bpmn-io/align-to-origin/issues/2) (#394)

## [0.5.3] - 2023-08-01

### Added

* **\[Miranum Modeler\]** Support for Camunda 8 properties (#302)
* **\[Miranum Modeler\]** Support for create/append patter for Camunda 8 and Camunda 7 (
  #322)

### Fixed

* **\[Miranum Modeler\]** Unable to load element templates when given in an array
* **\[Miranum Modeler\]** Recursive reading of miranum.json
* **\[Miranum Console\]** Remove icons from directories within tree view

## [0.4.3] - 2023-07-03

### Added

* **\[Miranum Modeler\]** Support for DMN 1.3 (#219)
* **\[Miranum Console\]** Manage your project inside a custom tree view (#275)
* **\[Miranum Console\]** Basic logger for errors (#275)

### Changed

* Update dependencies and migrate to Nx Version 16 (#246)

### Fixed

* **\[Miranum Console\]** Use a single webview when the user triggers the available
  commands (#125)

[unreleased]: https://github.com/Miragon/miranum-ide/compare/release/v0.6.0-vscode...HEAD

[0.6.0]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.13...release/v0.6.0-vscode

[0.5.13]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.11...release/v0.5.13-vscode

[0.5.11]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.10...release/v0.5.11-vscode

[0.5.10]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.9...release/v0.5.10-vscode

[0.5.9]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.8...release/v0.5.9-vscode

[0.5.8]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.7...release/v0.5.8-vscode

[0.5.7]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.6...release/v0.5.7-vscode

[0.5.6]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.5...release/v0.5.6

[0.5.5]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.4...release/v0.5.5

[0.5.4]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.3...release/v0.5.4

[0.5.3]: https://github.com/Miragon/miranum-ide/compare/release/v0.4.3...release/v0.5.3

[0.4.3]: https://github.com/Miragon/miranum-ide/compare/release/v0.4.2...0.4.3
