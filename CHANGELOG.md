<!-- markdownlint-configure-file { "no-duplicate-heading": false } -->

# Changelog

All notable changes will be documented in this file. See [conventional commits](https://www.conventionalcommits.org) for commit guidelines.

The format is based on [Keep a Changelog](https://keepachangelog.com) and this project adheres to [Semantic Versioning](https://semver.org).

## [0.3.1](https://github.com/michen00/invisible-squiggles/compare/v0.3.0..v0.3.1) - 2026-01-11

### 🐛 Fixes

- **(CHANGELOG.md)** correct two dates - ([e18ddaf](https://github.com/michen00/invisible-squiggles/commit/e18ddafee0640d64e369066871d6a673ed6331ae)) - [@michen00](https://github.com/michen00)
- **(toggleSquigglesCore)** return isInvisibleState - ([db7cfcd](https://github.com/michen00/invisible-squiggles/commit/db7cfcd3e73095667ad6052fc6c06071bdbb423a)) - [@michen00](https://github.com/michen00)
- correct variable naming in changelog template - ([4ca2429](https://github.com/michen00/invisible-squiggles/commit/4ca2429d8553298be8c2eee1f9c8d917c5ce474c)) - [@michen00](https://github.com/michen00)
- recover from stuck transparent state - ([824a28a](https://github.com/michen00/invisible-squiggles/commit/824a28a12ac3dbc63b12597e5be37d4406521bee)) - [@michen00](https://github.com/michen00)
- clean up settings on shutdown/uninstall - ([d3cdb41](https://github.com/michen00/invisible-squiggles/commit/d3cdb41b6cad320d255535c1aad43f2bfc484717)) - [@michen00](https://github.com/michen00)
- preserve partial staging - ([57b08b6](https://github.com/michen00/invisible-squiggles/commit/57b08b6e3df1cce78a253ec1e7a12d0c77abdaff)) - [@michen00](https://github.com/michen00)
- enhance toggleSquigglesCore state logic - ([7310e2b](https://github.com/michen00/invisible-squiggles/commit/7310e2b99c3a36212b6ed537cb1c88bce192bb67)) - [@michen00](https://github.com/michen00)
- fix([`f9a9b25`](https://github.com/michen00/invisible-squiggles/commit/f9a9b25)): use undefined instead of "" - ([65726a8](https://github.com/michen00/invisible-squiggles/commit/65726a82aaa54b50564062ee9ee3e0348b988c76)) - [@michen00](https://github.com/michen00)
- use empty strings instead of nulls ([#75](https://github.com/michen00/invisible-squiggles/issues/75)) - ([f9a9b25](https://github.com/michen00/invisible-squiggles/commit/f9a9b25800cc1f56a7583977027ec8d4c391ecf4)) - [@michen00](https://github.com/michen00)

### ⚡ Performance

- don't cache pip since we don't use it - ([644f19a](https://github.com/michen00/invisible-squiggles/commit/644f19af0bc7948846dc8cf5cf454b9b9ed64f51)) - [@michen00](https://github.com/michen00)
- remove data from cache key - ([cccadb2](https://github.com/michen00/invisible-squiggles/commit/cccadb2758c9f156b8f448c0c901948c336debe7)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen@aicadium.ai)

## [0.3.0](https://github.com/michen00/invisible-squiggles/compare/v0.2.1..v0.3.0) - 2025-12-21

### ✨ Features

- **(package.json)** adjust categories - ([466e7ee](https://github.com/michen00/invisible-squiggles/commit/466e7ee12aa8c2631e33c5114150524f21344115)) - [@michen00](https://github.com/michen00)
- add an icon - ([689153e](https://github.com/michen00/invisible-squiggles/commit/689153e6e39f3e46a139b973c3a27f92002eb221)) - [@michen00](https://github.com/michen00)

### 🐛 Fixes

- **(Makefile)** fix indentation - ([598b9f5](https://github.com/michen00/invisible-squiggles/commit/598b9f5fc92bb3018782edbf92d89ae98661f5ee)) - [@michen00](https://github.com/michen00)

### ⏪️ Revert

- remove branch archival utilities - ([f1fb3ce](https://github.com/michen00/invisible-squiggles/commit/f1fb3cec995aecca82b65ede21f24f9e84b2d35f)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen@aicadium.ai)

## [0.2.1](https://github.com/michen00/invisible-squiggles/compare/v0.2.0..v0.2.1) - 2025-12-21

### ✨ Features

- **(package.json)** update display name - ([f1af9a4](https://github.com/michen00/invisible-squiggles/commit/f1af9a43f6875fcefc07957d63edad85ee2224ba)) - [@michen00](https://github.com/michen00)
- **(package.json)** add keywords - ([57bbfee](https://github.com/michen00/invisible-squiggles/commit/57bbfeed864df90c893201bd24a1ff7e56bf154e)) - [@michen00](https://github.com/michen00)
- use consistent floor version - ([cddd13f](https://github.com/michen00/invisible-squiggles/commit/cddd13f4a98ea1794159d84220b50f3998e31ae0)) - [@michen00](https://github.com/michen00)

### 🐛 Fixes

- **(esbuild.js)** add null check for location - ([42cd7be](https://github.com/michen00/invisible-squiggles/commit/42cd7befb78bbbac3a67a8e14c1516aa6f049376)) - [@michen00](https://github.com/michen00)
- **(package.json)** fix minification flag - ([7292222](https://github.com/michen00/invisible-squiggles/commit/7292222b669ef35116b27b7807e50ee6c95b245e)) - [@michen00](https://github.com/michen00)
- **(package.json)** fix bugs URL - ([c7da183](https://github.com/michen00/invisible-squiggles/commit/c7da183a19bd8cfadfe2ef5a6b8df36887fcb22c)) - [@michen00](https://github.com/michen00)
- **(src/extension.ts)** fix core logic - ([d0905c3](https://github.com/michen00/invisible-squiggles/commit/d0905c3b87af138e585f4258ba0974770e0248b1)) - [@michen00](https://github.com/michen00)
- cover an edge case - ([166f51a](https://github.com/michen00/invisible-squiggles/commit/166f51a87a3e851a43f6f1bdb0fecca4aa403f93)) - [@michen00](https://github.com/michen00)
- prevent erroneous status bar updates - ([d3834a6](https://github.com/michen00/invisible-squiggles/commit/d3834a60b9f1c2ac1743d036042953633df946ba)) - [@michen00](https://github.com/michen00)
- remove erroneous package manager - ([38ee76f](https://github.com/michen00/invisible-squiggles/commit/38ee76f277575f44b941084eedfa3b58c9c408bf)) - [@michen00](https://github.com/michen00)
- add missing issue_message ([#46](https://github.com/michen00/invisible-squiggles/issues/46)) - ([d2e16bc](https://github.com/michen00/invisible-squiggles/commit/d2e16bc465756753bd2575c2040e81d833034957)) - [@michen00](https://github.com/michen00)
- update for breaking changes in v3 - ([9ec6aee](https://github.com/michen00/invisible-squiggles/commit/9ec6aee22bb22f519b6cbaf7641eec32beceb7f7)) - [@michen00](https://github.com/michen00)

### ⚡ Performance

- **(package.json)** remove a redundant command - ([4675b88](https://github.com/michen00/invisible-squiggles/commit/4675b880ba655626e041587716d9192072046f36)) - [@michen00](https://github.com/michen00)
- remove unnecessary null guard - ([980bbe9](https://github.com/michen00/invisible-squiggles/commit/980bbe92e9a972342ea22dae7ae5e0b1b23ac030)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen@aicadium.ai)

## [0.2.0](https://github.com/michen00/invisible-squiggles/compare/v0.1.1..v0.2.0) - 2025-02-26

### ✨ Features

- disable status bar message by default - ([b61e43a](https://github.com/michen00/invisible-squiggles/commit/b61e43a9f63f42d03b39ba69efc12d5ca8f52104)) - [@michen00](https://github.com/michen00)

### 🐛 Fixes

- replace invalid problemMatcher value - ([e5d576c](https://github.com/michen00/invisible-squiggles/commit/e5d576ca21611548a933c8534e5aa9a1fbdd9f32)) - [@michen00](https://github.com/michen00)

### ⏪️ Revert

- reverted my other changes only keeping the bug fix as noted! - ([766c760](https://github.com/michen00/invisible-squiggles/commit/766c760afd4570bfd8c2dcc76798c0de937df8e6)) - [@MadhurDixit13](https://github.com/MadhurDixit13)

### 👷 Build

- ❗revise tsconfig.json - ([6d7b3b7](https://github.com/michen00/invisible-squiggles/commit/6d7b3b7bc33c8ad8b65c741011f439bfd4a51111)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen.0@gmail.com)
- [@MadhurDixit13](https://github.com/MadhurDixit13) | [Madhur Dixit](mailto:madhurdixit37@gmail.com)

## [0.1.0] - 2024-12-10

<!-- generated by git-cliff -->
