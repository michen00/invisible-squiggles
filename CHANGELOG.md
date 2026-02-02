<!-- markdownlint-configure-file { "no-duplicate-heading": false } -->

# Changelog

All notable changes will be documented in this file. See [conventional commits](https://www.conventionalcommits.org) for commit guidelines.

The format is based on [Keep a Changelog](https://keepachangelog.com) and this project adheres to [Semantic Versioning](https://semver.org).

## [Unreleased]

### ✨ Features

- **(extension)** add 'startHidden' setting - ([ee190c2](https://github.com/michen00/invisible-squiggles/commit/ee190c2c9ac0b749085012e31b70b329af025bd1)) - [@michen00](https://github.com/michen00)
- **(icon.png)** optimize the icon - ([f67ac60](https://github.com/michen00/invisible-squiggles/commit/f67ac608b0f37ece5ff044cf785ce312ba321c7e)) - [@michen00](https://github.com/michen00)
- improve fallback - ([9280750](https://github.com/michen00/invisible-squiggles/commit/92807504c06845971345dde525e714c7ccfe3e49)) - [@michen00](https://github.com/michen00)

### 🐛 Fixes

- **(scripts/update-unreleased.sh)** fix cleanup - ([42659d3](https://github.com/michen00/invisible-squiggles/commit/42659d30c46c62d87c708178111248b867cd9b16)) - [@michen00](https://github.com/michen00)
- **(update-unreleased.sh)** fix commit flag - ([16723e6](https://github.com/michen00/invisible-squiggles/commit/16723e6979d7e202a59a410ffdb70e4b571958fa)) - [@michen00](https://github.com/michen00)
- prevent a race condition - ([c5b7701](https://github.com/michen00/invisible-squiggles/commit/c5b770155e1636f92717e4d6c28f9255da98c6e8)) - [@michen00](https://github.com/michen00)
- fix state management bug - ([a974d90](https://github.com/michen00/invisible-squiggles/commit/a974d900b975c67644c09d41190aebaec5c2de51)) - [@michen00](https://github.com/michen00)
- fix state management - ([98a5894](https://github.com/michen00/invisible-squiggles/commit/98a58948a8a55efad35ae791c29a0ac5bd546cb9)) - [@michen00](https://github.com/michen00)
- apply suggestions - ([c415f39](https://github.com/michen00/invisible-squiggles/commit/c415f3949c94ce7d8c9921e7ee00f11f08df2e78)) - [@michen00](https://github.com/michen00)
- preserve partial staging - ([dfd5671](https://github.com/michen00/invisible-squiggles/commit/dfd5671faf219c0a0ed84d8bd54387a00338662d)) - [@michen00](https://github.com/michen00)
- fix argument parsing - ([61b24af](https://github.com/michen00/invisible-squiggles/commit/61b24af27c43698e65f89a9c5d46131d9c281514)) - [@michen00](https://github.com/michen00)

### ⏪️ Revert

- **(cliff.toml)** restore several changes - ([752f267](https://github.com/michen00/invisible-squiggles/commit/752f26701aa15c571430a959b5472b8387a7e7b3)) - [@michen00](https://github.com/michen00)
- use undefined for config key removal - ([d0a773e](https://github.com/michen00/invisible-squiggles/commit/d0a773e4967e20fb5a2894ef5f3bc0661a86eba5)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen.0@gmail.com)

## [0.3.1](https://github.com/michen00/invisible-squiggles/compare/v0.3.0..v0.3.1) - 2026-01-11

### 🐛 Fixes

- **(CHANGELOG.md)** correct two dates - ([e18ddaf](https://github.com/michen00/invisible-squiggles/commit/e18ddafee0640d64e369066871d6a673ed6331ae)) - [@michen00](https://github.com/michen00)
- **(toggleSquigglesCore)** return isInvisibleState - ([db7cfcd](https://github.com/michen00/invisible-squiggles/commit/db7cfcd3e73095667ad6052fc6c06071bdbb423a)) - [@michen00](https://github.com/michen00)
- correct variable naming in changelog template - ([4ca2429](https://github.com/michen00/invisible-squiggles/commit/4ca2429d8553298be8c2eee1f9c8d917c5ce474c)) - [@michen00](https://github.com/michen00)
- recover from stuck transparent state - ([824a28a](https://github.com/michen00/invisible-squiggles/commit/824a28a12ac3dbc63b12597e5be37d4406521bee)) - [@michen00](https://github.com/michen00)
- clean up settings on shutdown/uninstall - ([d3cdb41](https://github.com/michen00/invisible-squiggles/commit/d3cdb41b6cad320d255535c1aad43f2bfc484717)) - [@michen00](https://github.com/michen00)
- preserve partial staging - ([57b08b6](https://github.com/michen00/invisible-squiggles/commit/57b08b6e3df1cce78a253ec1e7a12d0c77abdaff)) - [@michen00](https://github.com/michen00)
- enhance toggleSquigglesCore state logic - ([7310e2b](https://github.com/michen00/invisible-squiggles/commit/7310e2b99c3a36212b6ed537cb1c88bce192bb67)) - [@michen00](https://github.com/michen00)
- **([`f9a9b25`](https://github.com/michen00/invisible-squiggles/commit/f9a9b25))** use undefined instead of "" - ([65726a8](https://github.com/michen00/invisible-squiggles/commit/65726a82aaa54b50564062ee9ee3e0348b988c76)) - [@michen00](https://github.com/michen00)
- use empty strings instead of nulls ([#75](https://github.com/michen00/invisible-squiggles/issues/75)) - ([f9a9b25](https://github.com/michen00/invisible-squiggles/commit/f9a9b25800cc1f56a7583977027ec8d4c391ecf4)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen.0@gmail.com)

## [0.3.0](https://github.com/michen00/invisible-squiggles/compare/v0.2.1..v0.3.0) - 2025-12-21

### ✨ Features

- **(package.json)** adjust categories - ([466e7ee](https://github.com/michen00/invisible-squiggles/commit/466e7ee12aa8c2631e33c5114150524f21344115)) - [@michen00](https://github.com/michen00)
- add an icon - ([689153e](https://github.com/michen00/invisible-squiggles/commit/689153e6e39f3e46a139b973c3a27f92002eb221)) - [@michen00](https://github.com/michen00)

### 🐛 Fixes

- **(Makefile)** fix indentation - ([598b9f5](https://github.com/michen00/invisible-squiggles/commit/598b9f5fc92bb3018782edbf92d89ae98661f5ee)) - [@michen00](https://github.com/michen00)

### ⏪️ Revert

- remove branch archival utilities - ([f1fb3ce](https://github.com/michen00/invisible-squiggles/commit/f1fb3cec995aecca82b65ede21f24f9e84b2d35f)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen.0@gmail.com)

## [0.2.1](https://github.com/michen00/invisible-squiggles/compare/v0.2.0..v0.2.1) - 2025-12-21

### ✨ Features

- **(package.json)** update display name - ([079cca7](https://github.com/michen00/invisible-squiggles/commit/079cca700e8978b70f96c4b99ad832af121a02ef)) - [@michen00](https://github.com/michen00)
- **(package.json)** add keywords - ([910e77d](https://github.com/michen00/invisible-squiggles/commit/910e77d5bc60e49aa4e4bed9703ed187a3492ccb)) - [@michen00](https://github.com/michen00)
- use consistent floor version - ([cddd13f](https://github.com/michen00/invisible-squiggles/commit/cddd13f4a98ea1794159d84220b50f3998e31ae0)) - [@michen00](https://github.com/michen00)
- update package.json with a new 'Hint' setting - ([3c4e113](https://github.com/michen00/invisible-squiggles/commit/3c4e113d0a328c3d9b8b074f0b3409a4493b0109)) - [@parvatijay2901](https://github.com/parvatijay2901)
- add Hint squiggle - ([5126de5](https://github.com/michen00/invisible-squiggles/commit/5126de50d3e3c76adf6a08b9869fe0072b589420)) - [@parvatijay2901](https://github.com/parvatijay2901)
- update transparentColorsToApply to use SQUIGGLE_TYPES - ([1bf6b08](https://github.com/michen00/invisible-squiggles/commit/1bf6b08cc53a0287a70ab25728001a67e070eab1)) - [@parvatijay2901](https://github.com/parvatijay2901)

### 🐛 Fixes

- **(esbuild.js)** add null check for location - ([42cd7be](https://github.com/michen00/invisible-squiggles/commit/42cd7befb78bbbac3a67a8e14c1516aa6f049376)) - [@michen00](https://github.com/michen00)
- **(package.json)** fix minification flag - ([7292222](https://github.com/michen00/invisible-squiggles/commit/7292222b669ef35116b27b7807e50ee6c95b245e)) - [@michen00](https://github.com/michen00)
- **(package.json)** fix bugs URL - ([c7da183](https://github.com/michen00/invisible-squiggles/commit/c7da183a19bd8cfadfe2ef5a6b8df36887fcb22c)) - [@michen00](https://github.com/michen00)
- **(src/extension.ts)** fix core logic - ([d0905c3](https://github.com/michen00/invisible-squiggles/commit/d0905c3b87af138e585f4258ba0974770e0248b1)) - [@michen00](https://github.com/michen00)
- cover an edge case - ([166f51a](https://github.com/michen00/invisible-squiggles/commit/166f51a87a3e851a43f6f1bdb0fecca4aa403f93)) - [@michen00](https://github.com/michen00)
- prevent erroneous status bar updates - ([d3834a6](https://github.com/michen00/invisible-squiggles/commit/d3834a60b9f1c2ac1743d036042953633df946ba)) - [@michen00](https://github.com/michen00)
- remove erroneous package manager - ([38ee76f](https://github.com/michen00/invisible-squiggles/commit/38ee76f277575f44b941084eedfa3b58c9c408bf)) - [@michen00](https://github.com/michen00)
- add missing issue_message (#46) - ([d2e16bc](https://github.com/michen00/invisible-squiggles/commit/d2e16bc465756753bd2575c2040e81d833034957)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- update for breaking changes in v3 - ([9ec6aee](https://github.com/michen00/invisible-squiggles/commit/9ec6aee22bb22f519b6cbaf7641eec32beceb7f7)) - [@michen00](https://github.com/michen00)

### ⚡ Performance

- **(package.json)** remove a redundant command - ([4675b88](https://github.com/michen00/invisible-squiggles/commit/4675b880ba655626e041587716d9192072046f36)) - [@michen00](https://github.com/michen00)
- remove unnecessary null guard - ([980bbe9](https://github.com/michen00/invisible-squiggles/commit/980bbe92e9a972342ea22dae7ae5e0b1b23ac030)) - [@michen00](https://github.com/michen00)
- code cleanup and optimization - ([8f088fa](https://github.com/michen00/invisible-squiggles/commit/8f088fac536c51312e381e0d6d4cd16b9c726ac7)) - [@parvatijay2901](https://github.com/parvatijay2901)

### ⏪️ Revert

- revert suggestion - ([def95a4](https://github.com/michen00/invisible-squiggles/commit/def95a47aac5ed4710faa412613a5b588ed3b01c)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- restore status bar toggle accidentally removed in 8f088fa - ([107534b](https://github.com/michen00/invisible-squiggles/commit/107534ba27a22bfab154da95632fcae1a5398c46)) - [@parvatijay2901](https://github.com/parvatijay2901)

### ♻️ Refactor

- inline JSON parsing logic - ([7cbf999](https://github.com/michen00/invisible-squiggles/commit/7cbf999b4f274501169d0e9fb420efea300c5025)) - [@parvatijay2901](https://github.com/parvatijay2901)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen.0@gmail.com)

## [0.2.0](https://github.com/michen00/invisible-squiggles/compare/v0.1.1..v0.2.0) - 2025-02-26

### ✨ Features

- disable status bar message by default - ([b61e43a](https://github.com/michen00/invisible-squiggles/commit/b61e43a9f63f42d03b39ba69efc12d5ca8f52104)) - [@michen00](https://github.com/michen00)
- Added status bar toggle for squiggles - ([4cbcd4b](https://github.com/michen00/invisible-squiggles/commit/4cbcd4b255e0c267a9513a848493133b76ca0458)) - [@Joshi2502](https://github.com/Joshi2502)
- Set initial status bar item - ([9ecb36e](https://github.com/michen00/invisible-squiggles/commit/9ecb36e7d0f80ff25fa4c47f497801c39da67614)) - [@michen00](https://github.com/michen00)
- Ensure activation after startup - ([507c8a5](https://github.com/michen00/invisible-squiggles/commit/507c8a5c94c3c0c60877e82616d30e0be4491f27)) - [@michen00](https://github.com/michen00)
- Update initial tooltip - ([bcd52b3](https://github.com/michen00/invisible-squiggles/commit/bcd52b3eba7cf902f43a9aa1161dc4d7bc640490)) - [@michen00](https://github.com/michen00)
- Make tooltip text conditional - ([3981033](https://github.com/michen00/invisible-squiggles/commit/3981033dcdda237dc8e17860ff3be98a6c7079fa)) - [@michen00](https://github.com/michen00)
- Simplify status bar text - ([bbd8a64](https://github.com/michen00/invisible-squiggles/commit/bbd8a6485244b8e0ef47f6e0c366bf6d06597ed7)) - [@michen00](https://github.com/michen00)
- updated task.json - ([ec18048](https://github.com/michen00/invisible-squiggles/commit/ec1804835359ace210966f9d0f5620e477333d50)) - [@MadhurDixit13](https://github.com/MadhurDixit13)
- Update extension.ts - ([a8b0236](https://github.com/michen00/invisible-squiggles/commit/a8b023633985552e15cdd1bfbb89678f71c72b7d)) - [@MadhurDixit13](https://github.com/MadhurDixit13)

### 🐛 Fixes

- replace invalid problemMatcher value - ([e5d576c](https://github.com/michen00/invisible-squiggles/commit/e5d576ca21611548a933c8534e5aa9a1fbdd9f32)) - [@michen00](https://github.com/michen00)
- Fix problemMatcher key in tasks.json - ([5d58f0c](https://github.com/michen00/invisible-squiggles/commit/5d58f0c1cc1638111565686ab1e76100827c8716)) - [@michen00](https://github.com/michen00)
- Fix tooltip copy - ([9aaaffa](https://github.com/michen00/invisible-squiggles/commit/9aaaffa92ed6945226deff846fa486bf0b1f78b7)) - [@michen00](https://github.com/michen00)

### ⚡ Performance

- code cleanup and optimization - ([4f26f4f](https://github.com/michen00/invisible-squiggles/commit/4f26f4f701655e8922df1f0f20e7cac0b14d0819)) - [@parvatijay2901](https://github.com/parvatijay2901)

### ⏪️ Revert

- reverted my other changes only keeping the bug fix as noted! - ([766c760](https://github.com/michen00/invisible-squiggles/commit/766c760afd4570bfd8c2dcc76798c0de937df8e6)) - [@MadhurDixit13](https://github.com/MadhurDixit13)

### 👷 Build

- ❗revise tsconfig.json - ([6d7b3b7](https://github.com/michen00/invisible-squiggles/commit/6d7b3b7bc33c8ad8b65c741011f439bfd4a51111)) - [@michen00](https://github.com/michen00)

### 📝 Documentation

- Updated README and PR description to include new features - ([bd5cb03](https://github.com/michen00/invisible-squiggles/commit/bd5cb034bc322e4c8eeb594a60e86f64d3ff7e23)) - [@Joshi2502](https://github.com/Joshi2502)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen.0@gmail.com)
- [@MadhurDixit13](https://github.com/MadhurDixit13) | [Madhur Dixit](mailto:madhurdixit37@gmail.com)
- [@Joshi2502](https://github.com/Joshi2502) | [Sneha Joshi](mailto:sjoshi32@hawk.iit.edu)
- [@parvatijay2901](https://github.com/parvatijay2901) | [Parvati](mailto:parvatijay2901@gmail.com)

## [0.1.1](https://github.com/michen00/invisible-squiggles/compare/v0.1.0..v0.1.1) - 2024-12-10

### 📝 Documentation

- Update demo .gif URL - ([f1e7732](https://github.com/michen00/invisible-squiggles/commit/f1e7732616666c3309d77822705c62203b9e84fa)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen.0@gmail.com)

## [0.1.0] - 2024-12-10

### ✨ Features

- Expose settings for checkbox options - ([f7eeb7e](https://github.com/michen00/invisible-squiggles/commit/f7eeb7ed749cc31a77a1920e4dc706d006ef389b)) - [@michen00](https://github.com/michen00)
- Prefer a transient message in the status bar - ([f85ca2b](https://github.com/michen00/invisible-squiggles/commit/f85ca2b8dcc9c5fa2a6a5c20759d13ceaf169d60)) - [@michen00](https://github.com/michen00)
- Improve handling of edge cases - ([44c0130](https://github.com/michen00/invisible-squiggles/commit/44c0130940072a6dcbeab0fbf8ed9b95b7a9dec4)) - [@michen00](https://github.com/michen00)
- Expand transparentColors - ([1d28629](https://github.com/michen00/invisible-squiggles/commit/1d286295b02332e2ebee07554b3c7b3310cfbdd9)) - [@michen00](https://github.com/michen00)
- Modify extension code - ([44f22db](https://github.com/michen00/invisible-squiggles/commit/44f22db7f49aa059ac4c545f65616b0bad7c0f6c)) - [@michen00](https://github.com/michen00)

### 📝 Documentation

- Add demo gif to README.md - ([cccb94e](https://github.com/michen00/invisible-squiggles/commit/cccb94e3af4236a72b6895ef21b743502f62b1fe)) - [@michen00](https://github.com/michen00)
- Add license to package-lock.json - ([be691f2](https://github.com/michen00/invisible-squiggles/commit/be691f26a71fd695eada8a675d36a5869c25d605)) - [@michen00](https://github.com/michen00)

### 👥 Contributors

- [@michen00](https://github.com/michen00) | [Michael I Chen](mailto:michael.chen.0@gmail.com)

<!-- generated by git-cliff -->
