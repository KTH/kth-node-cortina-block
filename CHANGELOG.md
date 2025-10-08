# Changelog

All notable changes for major version updates will be documented here.

## 7.2.0

Adds a memory cache for blocks.

### Changed

- Now uses kth-node-redis@4 and redis@5

## 7.1.0

Adds a memory cache for blocks.

### Added

- In memory cache

### Removed

- **Breaking:** Exported function "cortina".

## 7.0.0

Cleaning upp Kth Style < 9.
A lot of changes, but should not have a big effect on apps that are already up to date.
See [Readme](./README.md#changes-after-style-10) for more details.

### Removed

- **Breaking:** Blocks that should no longer be used.
- **Breaking:** Config related to removed blocks.

### Changed

- **Breaking:** Names of some config parameters, if upgrading directly from v5 or `@kth/kth-node-web-common`.

### Added

- Some config parameters that existed in v5 but never was included in v6.

## 6.2.0

Accepts a parameter `useStyle10` that serves blocks tailored to the new version of KTH-Style.  
If the parameter is false or missing, blocks tailored for KTH-Style 9 will be fetched.

## 6.0.0

- Rewrite in Typescript.
- This package is no longer used in cojunction with @kth/kth-node-web-common. The cortinaMiddleware function is taking care of the work previously done by cortinaCommon in @kth/kth-node-web-common/web/cortina.js.
- Redundant config that was previously unsed has been removed.

## 5.0.0

The name of the package is changed to @kth/cortina-block

## 4.0.0

The name of the package is changed to @kth/kth-node-cortina-block

The package is no longer dependent of deprecated packages.
