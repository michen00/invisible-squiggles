<!-- markdownlint-configure-file { "no-duplicate-heading": false } -->

# Changelog

All notable changes will be documented in this file. See [conventional commits](https://www.conventionalcommits.org) for commit guidelines.

The format is based on [Keep a Changelog](https://keepachangelog.com) and this project adheres to [Semantic Versioning](https://semver.org).

## [0.3.1](https://github.com/michen00/invisible-squiggles/compare/v0.3.0..v0.3.1) - 2026-01-11

### 🐛 Fixes

- **(f9a9b25)** use undefined instead of "" - ([65726a8](https://github.com/michen00/invisible-squiggles/commit/65726a82aaa54b50564062ee9ee3e0348b988c76)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- **(toggleSquigglesCore)** return isInvisibleState - ([db7cfcd](https://github.com/michen00/invisible-squiggles/commit/db7cfcd3e73095667ad6052fc6c06071bdbb423a)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- recover from stuck transparent state - ([824a28a](https://github.com/michen00/invisible-squiggles/commit/824a28a12ac3dbc63b12597e5be37d4406521bee)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- clean up settings on shutdown/uninstall - ([d3cdb41](https://github.com/michen00/invisible-squiggles/commit/d3cdb41b6cad320d255535c1aad43f2bfc484717)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- preserve partial staging - ([57b08b6](https://github.com/michen00/invisible-squiggles/commit/57b08b6e3df1cce78a253ec1e7a12d0c77abdaff)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- enhance toggleSquigglesCore state logic - ([7310e2b](https://github.com/michen00/invisible-squiggles/commit/7310e2b99c3a36212b6ed537cb1c88bce192bb67)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- use empty strings instead of nulls (#75) - ([f9a9b25](https://github.com/michen00/invisible-squiggles/commit/f9a9b25800cc1f56a7583977027ec8d4c391ecf4)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### ⚡ Performance

- don't cache pip since we don't use it - ([644f19a](https://github.com/michen00/invisible-squiggles/commit/644f19af0bc7948846dc8cf5cf454b9b9ed64f51)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- remove data from cache key - ([cccadb2](https://github.com/michen00/invisible-squiggles/commit/cccadb2758c9f156b8f448c0c901948c336debe7)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### 👥 Contributors

- Michael I Chen

## [0.3.0](https://github.com/michen00/invisible-squiggles/compare/v0.2.1..v0.3.0) - 2025-12-21

### ✨ Features

- **(package.json)** adjust categories - ([466e7ee](https://github.com/michen00/invisible-squiggles/commit/466e7ee12aa8c2631e33c5114150524f21344115)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- add an icon - ([689153e](https://github.com/michen00/invisible-squiggles/commit/689153e6e39f3e46a139b973c3a27f92002eb221)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### 🐛 Fixes

- **(Makefile)** fix indentation - ([598b9f5](https://github.com/michen00/invisible-squiggles/commit/598b9f5fc92bb3018782edbf92d89ae98661f5ee)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### ⏪️ Revert

- remove branch archival utilities - ([f1fb3ce](https://github.com/michen00/invisible-squiggles/commit/f1fb3cec995aecca82b65ede21f24f9e84b2d35f)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### 👥 Contributors

- Michael I Chen

## [0.2.1](https://github.com/michen00/invisible-squiggles/compare/v0.2.0..v0.2.1) - 2025-12-20

### ✨ Features

- **(package.json)** update display name - ([f1af9a4](https://github.com/michen00/invisible-squiggles/commit/f1af9a43f6875fcefc07957d63edad85ee2224ba)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- **(package.json)** add keywords - ([57bbfee](https://github.com/michen00/invisible-squiggles/commit/57bbfeed864df90c893201bd24a1ff7e56bf154e)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- use consistent floor version - ([cddd13f](https://github.com/michen00/invisible-squiggles/commit/cddd13f4a98ea1794159d84220b50f3998e31ae0)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### 🐛 Fixes

- **(esbuild.js)** add null check for location - ([42cd7be](https://github.com/michen00/invisible-squiggles/commit/42cd7befb78bbbac3a67a8e14c1516aa6f049376)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- **(package.json)** fix minification flag - ([7292222](https://github.com/michen00/invisible-squiggles/commit/7292222b669ef35116b27b7807e50ee6c95b245e)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- **(package.json)** fix bugs URL - ([c7da183](https://github.com/michen00/invisible-squiggles/commit/c7da183a19bd8cfadfe2ef5a6b8df36887fcb22c)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- **(src/extension.ts)** fix core logic - ([d0905c3](https://github.com/michen00/invisible-squiggles/commit/d0905c3b87af138e585f4258ba0974770e0248b1)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- cover an edge case - ([166f51a](https://github.com/michen00/invisible-squiggles/commit/166f51a87a3e851a43f6f1bdb0fecca4aa403f93)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- prevent erroneous status bar updates - ([d3834a6](https://github.com/michen00/invisible-squiggles/commit/d3834a60b9f1c2ac1743d036042953633df946ba)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- remove erroneous package manager - ([38ee76f](https://github.com/michen00/invisible-squiggles/commit/38ee76f277575f44b941084eedfa3b58c9c408bf)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- add missing issue_message (#46) - ([d2e16bc](https://github.com/michen00/invisible-squiggles/commit/d2e16bc465756753bd2575c2040e81d833034957)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- update for breaking changes in v3 - ([9ec6aee](https://github.com/michen00/invisible-squiggles/commit/9ec6aee22bb22f519b6cbaf7641eec32beceb7f7)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### ⚡ Performance

- **(package.json)** remove a redundant command - ([4675b88](https://github.com/michen00/invisible-squiggles/commit/4675b880ba655626e041587716d9192072046f36)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)
- remove unnecessary null guard - ([980bbe9](https://github.com/michen00/invisible-squiggles/commit/980bbe92e9a972342ea22dae7ae5e0b1b23ac030)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### 👥 Contributors

- Michael I Chen

## [0.2.0](https://github.com/michen00/invisible-squiggles/compare/v0.1.1..v0.2.0) - 2025-02-26

### ✨ Features

- disable status bar message by default - ([b61e43a](https://github.com/michen00/invisible-squiggles/commit/b61e43a9f63f42d03b39ba69efc12d5ca8f52104)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### 🐛 Fixes

- replace invalid problemMatcher value - ([e5d576c](https://github.com/michen00/invisible-squiggles/commit/e5d576ca21611548a933c8534e5aa9a1fbdd9f32)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### ⏪️ Revert

- reverted my other changes only keeping the bug fix as noted! - ([766c760](https://github.com/michen00/invisible-squiggles/commit/766c760afd4570bfd8c2dcc76798c0de937df8e6)) - [Madhur Dixit](mailto:madhurdixit37@gmail.com)

### 👷 Build

- [**breaking**]revise tsconfig.json - ([6d7b3b7](https://github.com/michen00/invisible-squiggles/commit/6d7b3b7bc33c8ad8b65c741011f439bfd4a51111)) - [Michael I Chen](mailto:michael.chen.0@mail.google.com)

### 👥 Contributors

- Michael I Chen
- Madhur Dixit

## [0.1.1](https://github.com/michen00/invisible-squiggles/compare/v0.1.0..v0.1.1) - 2024-12-09

_Documentation updates only._

### 👥 Contributors

- Michael I Chen

## [0.1.0] - 2024-12-09

### ✨ Features

- Expose settings for checkbox options - ([f7eeb7e](https://github.com/michen00/invisible-squiggles/commit/f7eeb7ed749cc31a77a1920e4dc706d006ef389b)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Prefer a transient message in the status bar - ([f85ca2b](https://github.com/michen00/invisible-squiggles/commit/f85ca2b8dcc9c5fa2a6a5c20759d13ceaf169d60)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Improve handling of edge cases - ([44c0130](https://github.com/michen00/invisible-squiggles/commit/44c0130940072a6dcbeab0fbf8ed9b95b7a9dec4)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### 👥 Contributors

- Michael I Chen

<!-- generated by git-cliff -->
