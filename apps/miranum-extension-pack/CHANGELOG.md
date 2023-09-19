# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.4] - 2023-09-19

### Changed

* **\[Miranum Modeler\]** Update dependencies to bpmn-io (#394)

### Fixed

* **\[Miranum Modeler\]** Alignment of elements leads to an [endless loop](https://github.com/bpmn-io/align-to-origin/issues/2) (#394)
 
## [0.5.3] - 2023-08-01

### Added

* **\[Miranum Modeler\]** Support for Camunda 8 properties (#302)
* **\[Miranum Modeler\]** Support for create/append patter for Camunda 8 and Camunda 7 (#322)
 
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

* **\[Miranum Console\]** Use a single webview when the user triggers the available commands (#125)


[unreleased]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.4...HEAD
[0.5.4]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.3...release/v0.5.4
[0.5.3]: https://github.com/Miragon/miranum-ide/compare/release/v0.4.3...release/v0.5.3
[0.4.3]: https://github.com/Miragon/miranum-ide/compare/release/v0.4.2...0.4.3
