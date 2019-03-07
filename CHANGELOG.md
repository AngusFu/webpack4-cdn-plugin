# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.3.9](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.3.8...v1.3.9) (2019-03-07)

### Bug Fixes

- compitable with inline html chunk plugin ([18c33b5](https://github.com/AngusFu/webpack4-cdn-plugin/commit/18c33b5))

<a name="1.3.8"></a>

## [1.3.8](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.3.7...v1.3.8) (2019-01-09)

### Bug Fixes

- css asset path replacing error ([4c49092](https://github.com/AngusFu/webpack4-cdn-plugin/commit/4c49092))

<a name="1.3.7"></a>

## [1.3.7](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.3.5...v1.3.7) (2018-12-17)

### Bug Fixes

- check `options.mode` if NODE_ENV not set ([756aa1f](https://github.com/AngusFu/webpack4-cdn-plugin/commit/756aa1f))
- more safe entryFeatureMarker ([d8c4491](https://github.com/AngusFu/webpack4-cdn-plugin/commit/d8c4491))
- possible `#` or `?` in css url() ([5405d7c](https://github.com/AngusFu/webpack4-cdn-plugin/commit/5405d7c))

<a name="1.3.6"></a>

## [1.3.6](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v0.0.2...v1.3.6) (2018-12-13)

<a name="1.3.5"></a>

## [1.3.5](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.3.4...v1.3.5) (2018-12-13)

### Bug Fixes

- match and replace img src in html ([d162d00](https://github.com/AngusFu/webpack4-cdn-plugin/commit/d162d00))

<a name="1.3.4"></a>

## [1.3.4](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.3.3...v1.3.4) (2018-12-12)

### Bug Fixes

- error caused by possible asset source that is Buffer ([f83c2d6](https://github.com/AngusFu/webpack4-cdn-plugin/commit/f83c2d6))

<a name="1.3.3"></a>

## [1.3.3](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.3.2...v1.3.3) (2018-12-12)

### Bug Fixes

- absolute path in CSS ([deafaca](https://github.com/AngusFu/webpack4-cdn-plugin/commit/deafaca))

<a name="1.3.2"></a>

## [1.3.2](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.3.1...v1.3.2) (2018-12-12)

### Bug Fixes

- enhance html replacing with regexp ([06dfb10](https://github.com/AngusFu/webpack4-cdn-plugin/commit/06dfb10))
- enhance path replacing, fixed [#1](https://github.com/AngusFu/webpack4-cdn-plugin/issues/1) ([8b29e1a](https://github.com/AngusFu/webpack4-cdn-plugin/commit/8b29e1a))
- possible undefined publicPath ([ea697d8](https://github.com/AngusFu/webpack4-cdn-plugin/commit/ea697d8))

<a name="1.3.1"></a>

## [1.3.1](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.3.0...v1.3.1) (2018-12-11)

### Bug Fixes

- more robust global variable name ([a9db084](https://github.com/AngusFu/webpack4-cdn-plugin/commit/a9db084))
- more robust html replacing regexpr ([8e10bb6](https://github.com/AngusFu/webpack4-cdn-plugin/commit/8e10bb6))
- uploading function enhancement ([f434e91](https://github.com/AngusFu/webpack4-cdn-plugin/commit/f434e91))

<a name="1.3.0"></a>

# [1.3.0](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.2.4...v1.3.0) (2018-12-11)

### Bug Fixes

- improve manifest injection ([bd7d197](https://github.com/AngusFu/webpack4-cdn-plugin/commit/bd7d197))

### Features

- support for dll ([16abdd0](https://github.com/AngusFu/webpack4-cdn-plugin/commit/16abdd0))

<a name="1.2.4"></a>

## [1.2.4](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.2.3...v1.2.4) (2018-12-11)

### Bug Fixes

- possible syntax error ([96ac8df](https://github.com/AngusFu/webpack4-cdn-plugin/commit/96ac8df))

<a name="1.2.3"></a>

## [1.2.3](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.2.2...v1.2.3) (2018-12-11)

### Bug Fixes

- better error handling: put out error info, and keep local file. ([9631a62](https://github.com/AngusFu/webpack4-cdn-plugin/commit/9631a62))

<a name="1.2.2"></a>

## [1.2.2](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.2.1...v1.2.2) (2018-12-11)

### Bug Fixes

- more robust css matching regexp ([50a7fb0](https://github.com/AngusFu/webpack4-cdn-plugin/commit/50a7fb0))

<a name="1.2.1"></a>

## [1.2.1](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.2.0...v1.2.1) (2018-12-10)

### Bug Fixes

- fix wrong asserting, deal with possible Buffer object ([86abed2](https://github.com/AngusFu/webpack4-cdn-plugin/commit/86abed2))

<a name="1.2.0"></a>

# [1.2.0](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.1.0...v1.2.0) (2018-12-10)

### Bug Fixes

- add warning for publicPath ([42de621](https://github.com/AngusFu/webpack4-cdn-plugin/commit/42de621))

### Features

- works even if `optimization.minimize: true` ([ada3bff](https://github.com/AngusFu/webpack4-cdn-plugin/commit/ada3bff))
- support stylesheets with `url()`s ([ea472eb](https://github.com/AngusFu/webpack4-cdn-plugin/commit/ea472eb))

<a name="1.1.0"></a>

# [1.1.0](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.0.3...v1.1.0) (2018-12-09)

### Features

- support ([d11d296](https://github.com/AngusFu/webpack4-cdn-plugin/commit/d11d296))

<a name="1.0.3"></a>

## [1.0.3](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.0.2...v1.0.3) (2018-12-09)

### Bug Fixes

- rename `uploadContent` param name ([07548bf](https://github.com/AngusFu/webpack4-cdn-plugin/commit/07548bf))

<a name="1.0.2"></a>

## [1.0.2](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.0.1...v1.0.2) (2018-12-09)

### Bug Fixes

- stop working if not in production mode ([21ef435](https://github.com/AngusFu/webpack4-cdn-plugin/commit/21ef435))

<a name="1.0.1"></a>

## [1.0.1](https://github.com/AngusFu/webpack4-cdn-plugin/compare/v1.0.0...v1.0.1) (2018-12-09)

### Bug Fixes

- add fallback for publicPath ([d714653](https://github.com/AngusFu/webpack4-cdn-plugin/commit/d714653))

<a name="1.0.0"></a>

# 1.0.0 (2018-12-09)
