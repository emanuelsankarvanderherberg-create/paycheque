# Third-party code

`imgly-bg-1.4.5.mjs` is `@imgly/background-removal` 1.4.5 (https://github.com/imgly/background-removal-js), bundled with its dependencies using esbuild so the app does not depend on a CDN to load it. It is licensed under the GNU Affero General Public License v3.0 (see `LICENSE-imgly-background-removal.md`; third-party notices are in the package on npm as `ThirdPartyLicenses.json`). The model files it uses are downloaded at run time from IMG.LY's CDN and are not stored in this repository.
