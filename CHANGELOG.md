# Changelog

All notable changes for major version updates will be documented here.

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
