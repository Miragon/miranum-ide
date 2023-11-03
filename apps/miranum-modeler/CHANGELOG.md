# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.6]

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

* Alignment of elements leads to an [endless loop](https://github.com/bpmn-io/align-to-origin/issues/2) (#394)

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



[unreleased]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.6...HEAD
[0.5.6]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.5...release/v0.5.6
[0.5.5]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.4...release/v0.5.5
[0.5.4]: https://github.com/Miragon/miranum-ide/compare/release/v0.5.3...release/v0.5.4
[0.5.3]: https://github.com/Miragon/miranum-ide/compare/release/v0.4.3...release/v0.5.3
[0.4.3]: https://github.com/Miragon/miranum-ide/compare/release/v0.4.2...release/v0.4.3
