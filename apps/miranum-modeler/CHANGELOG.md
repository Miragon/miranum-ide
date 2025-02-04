# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

* Dark Theme for bpmn modeler (experimental) (#772)

## [0.6.0] - 2024-10-08

### Fixed

* Fix the styling of the scrollbar (#645)

### Changed

* Update dependencies (#645)

## [0.5.13] - 2024-06-28

### Added

* Add commands to copy or save diagram as SVG (#645)
* Sort element templates by name (#645)
* Change width of `element-templates-chooser` (#645)

## [0.5.12] - 2024-06-20

### Fixed

* Add copy + paste functionality (#616)
* Fix toggle text editor bug (#616)

## [0.5.11] - 2024-05-09

### Added

* Ask for the execution platform when a new diagram is created (#589)

### Fixed

* Flatten the element templates if given in an array (#589)
* Minor bug fixes (#589)

## [0.5.9] - 2024-04-16

### Fixed

* Detect the correct execution platform (#563)

## [0.5.8] - 2024-03-28

### Fixed

* Enable keyboard shortcuts for the modeler (#467)

### Changed

* Apply a hexagonal architecture to the modeler (#521)

## [0.5.7] - 2024-01-10

### Fixed

* Reading forms and element templates from subfolders (#483)

## [0.5.6] - 2023-11-08

### Changed

* Rename to Miranum: Camunda Modeler
* Update dependencies and migrate to Nx Version 17 (#418)

## [0.5.5]

### Added

* Configuration to enable the alignment of the diagram at the origin (#395)

## [0.5.4] - 2023-20-19

### Changed

* Update dependencies to bpmn-io (#394)

### Fixed

* Alignment of elements leads to
  an [endless loop](https://github.com/bpmn-io/align-to-origin/issues/2) (#394)

## [0.5.3] - 2023-08-01

### Added

* Support for Camunda 8 properties (#302)
* Support create/append pattern for Camunda 8 and Camunda 7 (#322)

### Fixed

* Unable to load element templates when given in an array
* Recursive reading of miranum.json

## [0.4.3] - 2023-07-03

### Added

* The modeler now supports DMN 1.3 (#219)

### Changed

* Update dependencies and migrate to Nx Version 16 (#246)

### Fixed

* Unresolved breakpoints when debugging (#227)

[unreleased]: https://github.com/Miragon/miranum-ide/compare/release/v0.6.0-vscode...HEAD

[0.6.0]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.13...release/v0.6.0-vscode

[0.5.13]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.12...release/v0.5.13-vscode

[0.5.12]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.11...release/v0.5.12-vscode

[0.5.11]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.9...release/v0.5.11-vscode

[0.5.9]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.8...release/v0.5.9-vscode

[0.5.8]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.7...release/v0.5.8-vscode

[0.5.7]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.6...release/v0.5.7-vscode

[0.5.6]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.5...release/v0.5.6

[0.5.5]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.4...release/v0.5.5

[0.5.4]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.3...release/v0.5.4

[0.5.3]: https://github.com/Miragon/miranum-ide/compare/release/v0.4.3...release/v0.5.3

[0.4.3]: https://github.com/Miragon/miranum-ide/compare/release/v0.4.2...release/v0.4.3
