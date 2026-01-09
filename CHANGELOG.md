<!-- markdownlint-configure-file { "no-duplicate-heading": false } -->

# Changelog

All notable changes will be documented in this file. See [conventional commits](https://www.conventionalcommits.org) for commit guidelines.

The format is based on [Keep a Changelog](https://keepachangelog.com) and this project adheres to [Semantic Versioning](https://semver.org).

## [Unreleased]

### 🐛 Fixes

- **(f9a9b25)** use undefined instead of "" - ([65726a8](https://github.com/michen00/invisible-squiggles/commit/65726a82aaa54b50564062ee9ee3e0348b988c76)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(toggleSquigglesCore)** return isInvisibleState - ([db7cfcd](https://github.com/michen00/invisible-squiggles/commit/db7cfcd3e73095667ad6052fc6c06071bdbb423a)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- enhance toggleSquigglesCore state logic - ([7310e2b](https://github.com/michen00/invisible-squiggles/commit/7310e2b99c3a36212b6ed537cb1c88bce192bb67)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- use empty strings instead of nulls (#75) - ([f9a9b25](https://github.com/michen00/invisible-squiggles/commit/f9a9b25800cc1f56a7583977027ec8d4c391ecf4)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### ⚡ Performance

- don't cache pip since we don't use it - ([644f19a](https://github.com/michen00/invisible-squiggles/commit/644f19af0bc7948846dc8cf5cf454b9b9ed64f51)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove data from cache key - ([cccadb2](https://github.com/michen00/invisible-squiggles/commit/cccadb2758c9f156b8f448c0c901948c336debe7)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 🧪 Testing

- add a failing test - ([a569466](https://github.com/michen00/invisible-squiggles/commit/a569466b1b2e978566ab2d2fbc538d8cfde4110d)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- refactor toggleSquiggles unit tests - ([51e9d1b](https://github.com/michen00/invisible-squiggles/commit/51e9d1bb368a0a7277d64a115f9529070192a05e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add unit tests - ([3bb5f12](https://github.com/michen00/invisible-squiggles/commit/3bb5f12582e0b869be871891aa26a0cd2795717e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add setStatus unit tests - ([b3116e9](https://github.com/michen00/invisible-squiggles/commit/b3116e9c92ad5a675c4822072d9d97ef89daa1a3)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- strengthen double-toggle integration test - ([7b20be2](https://github.com/michen00/invisible-squiggles/commit/7b20be20edeff787e212a4fa48530a12c8dbef2e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- rename misleading E2E status bar tests - ([0d3472a](https://github.com/michen00/invisible-squiggles/commit/0d3472abc203ba1961d7ae9b3c42650391cc6cdf)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove misleading activation tests - ([9281d79](https://github.com/michen00/invisible-squiggles/commit/9281d79037363c8088ccf17baeb13b77161199ea)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- consolidate redundant unit tests - ([dfd32dc](https://github.com/michen00/invisible-squiggles/commit/dfd32dcce1f8e158b06540f679bab80c78936d15)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 💚 Continuous Integration

- **(.github/workflows/ci.yml)** skip setup-python - ([3d76fad](https://github.com/michen00/invisible-squiggles/commit/3d76fad3f247e2ab0fae10c0a9a0ea7cfa78e838)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.github/workflows/ci.yml)** run pre-commit - ([03b10c6](https://github.com/michen00/invisible-squiggles/commit/03b10c6031afdb734f4401b223ccf3745f71e529)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(pre-commit)** add a workflow for updates - ([8716b67](https://github.com/michen00/invisible-squiggles/commit/8716b6792984d3e258d6123e48a7b1b83a940e76)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- simplify interaction logic - ([700323d](https://github.com/michen00/invisible-squiggles/commit/700323d09a10ec6661eddca0381822c463b587a9)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 👷 Build

- **(.pre-commit-config.yaml)** reorganize hooks - ([7001d5d](https://github.com/michen00/invisible-squiggles/commit/7001d5db4449bae984182d64636afb9f5fa45d46)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** include omitted hooks - ([50e75ec](https://github.com/michen00/invisible-squiggles/commit/50e75ecf51fcf8adffde80f3e5cc252b9056f9e0)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(deps-dev)** bump @typescript-eslint/parser from 8.50.1 to 8.51.0 - ([d11bdbb](https://github.com/michen00/invisible-squiggles/commit/d11bdbb5306a04ca6bb9c5b2f431422683fbd409)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** bump @typescript-eslint/eslint-plugin from 8.50.1 to 8.51.0 (#71) - ([82e2e4d](https://github.com/michen00/invisible-squiggles/commit/82e2e4d2dc0bdada198efe2ecc686d1057f27fdb)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** bump qs in the npm_and_yarn group across 1 directory (#70) - ([6b4cc65](https://github.com/michen00/invisible-squiggles/commit/6b4cc65a62e472977172e2cfe4c24c931994c288)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** bump @typescript-eslint/eslint-plugin - ([9346e16](https://github.com/michen00/invisible-squiggles/commit/9346e1660ef5d14a2fb8eb53634950273874413e)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** bump @typescript-eslint/parser from 8.50.0 to 8.50.1 - ([7fc95b9](https://github.com/michen00/invisible-squiggles/commit/7fc95b929ae62580d1f12c86f92d659f895e018e)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- mark additional dependencies as peer - ([33c8612](https://github.com/michen00/invisible-squiggles/commit/33c8612782f7e699c19eb7c2422286549cbeb135)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove an unused extension - ([caaa2a4](https://github.com/michen00/invisible-squiggles/commit/caaa2a4a779f47fab1d6b3b0f7ef4e59256b07a2)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 📝 Documentation

- **(CHANGELOG.md)** update for unreleased items - ([7e53637](https://github.com/michen00/invisible-squiggles/commit/7e536370bd6d4419da97257078e54e4350217fdc)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(CONTRIBUTING.md)** improve release guidance - ([e388875](https://github.com/michen00/invisible-squiggles/commit/e38887597f48360ad9eb4d053936ccf6df7c4bc4)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(README.md)** update problem icons behavior - ([b1ca471](https://github.com/michen00/invisible-squiggles/commit/b1ca4712b9b388c2976eddc731ef65bb6b761960)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(src/extension.ts)** clarify a comment - ([644161e](https://github.com/michen00/invisible-squiggles/commit/644161e97ee56f6bc4adec34a37bb79bfddf259a)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### ♻️ Refactor

- update E2E tests and avoid redundancy - ([7082072](https://github.com/michen00/invisible-squiggles/commit/708207286a929cac2273ddf60ec0d10ea50a87f4)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- exit on error instead of warning - ([27ff320](https://github.com/michen00/invisible-squiggles/commit/27ff32072fd23270b61893284ea1f81dd5803eb9)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### ⚙️ Miscellaneous Tasks

- **(.editorconfig)** remove an invalid key - ([be54bd1](https://github.com/michen00/invisible-squiggles/commit/be54bd18f41d9634d03efa931d464d695490328f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.pre-commit-config.yaml)** update hooks - ([7e0053a](https://github.com/michen00/invisible-squiggles/commit/7e0053abc2fd2b489b9524a63312667a24934256)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.yamllint)** drop yamlfmt - ([f23956d](https://github.com/michen00/invisible-squiggles/commit/f23956d6e5c4f2026a511aa4657ab80fa7a61f96)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** improve the portability of colors - ([9802145](https://github.com/michen00/invisible-squiggles/commit/9802145aad6ffe9fd7c6a655430631d34a9e8d3f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** improve security - ([746a531](https://github.com/michen00/invisible-squiggles/commit/746a531cbdea5c0197c7a7e2bac468e8745f578b)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** update to match boilerplate - ([6c58415](https://github.com/michen00/invisible-squiggles/commit/6c5841583fe74942804a4637c2fb7ad352f9213a)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(package.json)** remove a staling comment - ([7212e8f](https://github.com/michen00/invisible-squiggles/commit/7212e8f0cc30b9e98fd8c09e21327fa72d5ab614)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(src/extension.ts)** revert to a safer type - ([bec9cce](https://github.com/michen00/invisible-squiggles/commit/bec9cce18b47c4d9b277f6b605a6eb7ca547785c)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update .gitignore - ([9062a4a](https://github.com/michen00/invisible-squiggles/commit/9062a4aeb4d617381a732ff534dfe15925632687)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- autoupdate pre-commit hooks - ([2c879f8](https://github.com/michen00/invisible-squiggles/commit/2c879f8a3491fac3fe3ca410f8b65f60e635f768)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- remove a python-specific pre-commit hook - ([39fe15d](https://github.com/michen00/invisible-squiggles/commit/39fe15dff3a3b1e99145044d0aaed6e38a40de9c)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

## [0.3.0](https://github.com/michen00/invisible-squiggles/compare/v0.2.1..v0.3.0) - 2025-12-21

### ✨ Features

- **(package.json)** adjust categories - ([466e7ee](https://github.com/michen00/invisible-squiggles/commit/466e7ee12aa8c2631e33c5114150524f21344115)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add an icon - ([689153e](https://github.com/michen00/invisible-squiggles/commit/689153e6e39f3e46a139b973c3a27f92002eb221)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 🐛 Fixes

- **(Makefile)** fix indentation - ([598b9f5](https://github.com/michen00/invisible-squiggles/commit/598b9f5fc92bb3018782edbf92d89ae98661f5ee)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 👷 Build

- robustify develop target - ([0cf4fd6](https://github.com/michen00/invisible-squiggles/commit/0cf4fd6f74fdaf32c431d601b8dd8b7212d34e06)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add branch archive aliases - ([19298cd](https://github.com/michen00/invisible-squiggles/commit/19298cd870bfe68d183b89ec0688ef6438baef2f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- set up for LFS - ([ae4bb92](https://github.com/michen00/invisible-squiggles/commit/ae4bb929b086efc75f653afe3b56b33ea5a2d67c)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update publishing flow - ([92c2f55](https://github.com/michen00/invisible-squiggles/commit/92c2f553b7acf532adb41e2871925d30f33ec7c5)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 📝 Documentation

- **(package.json)** expand categories - ([52cfe91](https://github.com/michen00/invisible-squiggles/commit/52cfe91ea02f09bfe0ebecad536f0dcd445a53f5)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### ⏪️ Revert

- remove branch archival utilities - ([f1fb3ce](https://github.com/michen00/invisible-squiggles/commit/f1fb3cec995aecca82b65ede21f24f9e84b2d35f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

## [0.2.1](https://github.com/michen00/invisible-squiggles/compare/v0.2.0..v0.2.1) - 2025-12-20

### ✨ Features

- **(package.json)** update display name - ([079cca7](https://github.com/michen00/invisible-squiggles/commit/079cca700e8978b70f96c4b99ad832af121a02ef)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(package.json)** add keywords - ([910e77d](https://github.com/michen00/invisible-squiggles/commit/910e77d5bc60e49aa4e4bed9703ed187a3492ccb)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- use consistent floor version - ([cddd13f](https://github.com/michen00/invisible-squiggles/commit/cddd13f4a98ea1794159d84220b50f3998e31ae0)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update package.json with a new 'Hint' setting - ([3c4e113](https://github.com/michen00/invisible-squiggles/commit/3c4e113d0a328c3d9b8b074f0b3409a4493b0109)) - [Parvati](mailto:parvatijay2901@gmail.com)
- add Hint squiggle - ([5126de5](https://github.com/michen00/invisible-squiggles/commit/5126de50d3e3c76adf6a08b9869fe0072b589420)) - [Parvati](mailto:parvatijay2901@gmail.com)
- update transparentColorsToApply to use SQUIGGLE_TYPES - ([1bf6b08](https://github.com/michen00/invisible-squiggles/commit/1bf6b08cc53a0287a70ab25728001a67e070eab1)) - [Parvati](mailto:parvatijay2901@gmail.com)

### 🐛 Fixes

- **(esbuild.js)** add null check for location - ([42cd7be](https://github.com/michen00/invisible-squiggles/commit/42cd7befb78bbbac3a67a8e14c1516aa6f049376)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(package.json)** fix minification flag - ([7292222](https://github.com/michen00/invisible-squiggles/commit/7292222b669ef35116b27b7807e50ee6c95b245e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(package.json)** fix bugs URL - ([c7da183](https://github.com/michen00/invisible-squiggles/commit/c7da183a19bd8cfadfe2ef5a6b8df36887fcb22c)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(src/extension.ts)** fix core logic - ([d0905c3](https://github.com/michen00/invisible-squiggles/commit/d0905c3b87af138e585f4258ba0974770e0248b1)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- cover an edge case - ([166f51a](https://github.com/michen00/invisible-squiggles/commit/166f51a87a3e851a43f6f1bdb0fecca4aa403f93)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- prevent erroneous status bar updates - ([d3834a6](https://github.com/michen00/invisible-squiggles/commit/d3834a60b9f1c2ac1743d036042953633df946ba)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove erroneous package manager - ([38ee76f](https://github.com/michen00/invisible-squiggles/commit/38ee76f277575f44b941084eedfa3b58c9c408bf)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add missing issue_message (#46) - ([d2e16bc](https://github.com/michen00/invisible-squiggles/commit/d2e16bc465756753bd2575c2040e81d833034957)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- update for breaking changes in v3 - ([9ec6aee](https://github.com/michen00/invisible-squiggles/commit/9ec6aee22bb22f519b6cbaf7641eec32beceb7f7)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### ⚡ Performance

- **(package.json)** remove a redundant command - ([4675b88](https://github.com/michen00/invisible-squiggles/commit/4675b880ba655626e041587716d9192072046f36)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove unnecessary null guard - ([980bbe9](https://github.com/michen00/invisible-squiggles/commit/980bbe92e9a972342ea22dae7ae5e0b1b23ac030)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- code cleanup and optimization - ([8f088fa](https://github.com/michen00/invisible-squiggles/commit/8f088fac536c51312e381e0d6d4cd16b9c726ac7)) - [Parvati](mailto:parvatijay2901@gmail.com)

### 🧪 Testing

- **(package.json)** fix coverage - ([132bdd3](https://github.com/michen00/invisible-squiggles/commit/132bdd3c225956440ce52cd8813e1714ed8edbb1)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(src/test/unit/setup.ts)** fix a mock - ([b924142](https://github.com/michen00/invisible-squiggles/commit/b924142b1d49d99ba81715a0f5f47f7c8b4ba0d2)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- lower branch threshold - ([c9d3682](https://github.com/michen00/invisible-squiggles/commit/c9d36823da5f5a3cdf847ccd71ffdf13cfb30c6e)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- test against 1.107.1 - ([bcd134b](https://github.com/michen00/invisible-squiggles/commit/bcd134b641aac43c5d25e909df28652716933b3b)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- test core logic - ([77ec170](https://github.com/michen00/invisible-squiggles/commit/77ec1701ef183c2329a6c563b36f95647b22743e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- provide coverage with unit tests only - ([cb6d6cd](https://github.com/michen00/invisible-squiggles/commit/cb6d6cd6d9ed2158fff7cfcaeab1f1233188b661)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- fix stub handling - ([a53ef64](https://github.com/michen00/invisible-squiggles/commit/a53ef647b12f5e2ef1fce5cd5273f7bc144e3e85)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- enhance type handling and test setup - ([e02bc32](https://github.com/michen00/invisible-squiggles/commit/e02bc32fb9b885da8d1a585448714ac03378c4ea)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- improve teardown - ([0a43184](https://github.com/michen00/invisible-squiggles/commit/0a431843db74ea2ec47117349cf48929f34af290)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- enhance with setup and teardown - ([053010a](https://github.com/michen00/invisible-squiggles/commit/053010a6c5a2b849cc6905b8b6eb356914947f13)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- reduce redundancy - ([bd435da](https://github.com/michen00/invisible-squiggles/commit/bd435dae781bbb9bd5366aeaaae5f12f24287fe2)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update edge case handling in setStatus - ([cd2ce2f](https://github.com/michen00/invisible-squiggles/commit/cd2ce2fde54a022f13c6f171cc1218718683a9a9)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- fix a test - ([09aefa6](https://github.com/michen00/invisible-squiggles/commit/09aefa6bbaf4cb6e67fca443249f29e64d08676e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- fix tests - ([55eb2fe](https://github.com/michen00/invisible-squiggles/commit/55eb2fe5ceea7687a568e7f9711b9e0144b6a8bb)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add tests - ([d49d5c6](https://github.com/michen00/invisible-squiggles/commit/d49d5c6135bfbd50f839021c822694d3e5d30a32)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 💚 Continuous Integration

- also run on main push - ([3080953](https://github.com/michen00/invisible-squiggles/commit/308095302616234e1b6cefc7c08454053fe3af12)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add integration tests - ([78d687c](https://github.com/michen00/invisible-squiggles/commit/78d687c5de092071431004382ed63debb0725a9d)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- provide coverage in CI - ([3546830](https://github.com/michen00/invisible-squiggles/commit/35468303ec91ac5dc6ebe0df2657c94bc425e29e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add CI - ([9f3187a](https://github.com/michen00/invisible-squiggles/commit/9f3187a71a851f232000fb68f64e19b79e30e872)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove non-functioning action - ([c5abe33](https://github.com/michen00/invisible-squiggles/commit/c5abe333d17783884f0639b280f2040189f79511)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- exclude bot-only authors from welcome workflow (#49) - ([4c9231d](https://github.com/michen00/invisible-squiggles/commit/4c9231d15b22ba4f5ff33f962615cb8a212dee94)) - [Copilot](mailto:198982749+Copilot@users.noreply.github.com)
- add perms - ([0d1fa30](https://github.com/michen00/invisible-squiggles/commit/0d1fa3086cd625643370d6d20d1900085b6a309b)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- provide linting for actions - ([87f9276](https://github.com/michen00/invisible-squiggles/commit/87f9276e8e24cc86e2685d4b194f4747ba02f71e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- fix a typo - ([37323f5](https://github.com/michen00/invisible-squiggles/commit/37323f56bf33577753cd2f8aad6a3b06f053d086)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add dependabot.yml - ([3dae9b0](https://github.com/michen00/invisible-squiggles/commit/3dae9b042e3eec7e023673028126a0d118c7643b)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- improve new contributor greeting - ([26e40af](https://github.com/michen00/invisible-squiggles/commit/26e40af9d6e6d968c95b8e85468d888e294acd65)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add a workflow for greeting new contributors - ([46970fd](https://github.com/michen00/invisible-squiggles/commit/46970fd67941e019ba50a658f7fc67bacd133e1a)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 👷 Build

- **(Makefile)** account for missing pre-commit - ([969251f](https://github.com/michen00/invisible-squiggles/commit/969251f06551ac3ae1d7408228236d2dac259ddb)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- include README and CHANGELOG in .VSIX - ([4beeb73](https://github.com/michen00/invisible-squiggles/commit/4beeb7377e7b8d9c589a5ebfc70c89b8f733b4fa)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.pre-commit-config.yaml)** add default stage - ([4fdea6a](https://github.com/michen00/invisible-squiggles/commit/4fdea6a138906d9f47aa8a69f0fe0510d6e2b37b)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.yamllint)** configure yamllint - ([83c804b](https://github.com/michen00/invisible-squiggles/commit/83c804b5482f8b5bda52d90d1b26e50ffec60496)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** use pre-commit by default - ([8053081](https://github.com/michen00/invisible-squiggles/commit/8053081f1d69c529c077ac2d4cbe60b230f911ba)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(pre-commit)** avoid a mutable reference - ([4cb0763](https://github.com/michen00/invisible-squiggles/commit/4cb07632c7be3f0f749c06fcdb88b22191e6fef3)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- switch to custom-commit-hooks - ([76414c8](https://github.com/michen00/invisible-squiggles/commit/76414c85622e2a320d238837627f14b42e77256d)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add more pre-commit hooks - ([91e491d](https://github.com/michen00/invisible-squiggles/commit/91e491dc7049f5106c51046aa75951dc789f5b38)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- increase large file threshold - ([09b163c](https://github.com/michen00/invisible-squiggles/commit/09b163cac330684f64f1957e8bfd2aec9fec671b)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- build(pre-commit) add talisman on push - ([1a5de54](https://github.com/michen00/invisible-squiggles/commit/1a5de54189ed7da1d880a757cc55e6a8ab15bea5)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.gitignore)** add coverage to gitignore - ([9155c5b](https://github.com/michen00/invisible-squiggles/commit/9155c5ba957f0bec0ee0d23940ee599ef6e79cde)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.pre-commit-config.yaml)** revamp pre-commit - ([fef27f0](https://github.com/michen00/invisible-squiggles/commit/fef27f04579abf96a8dd28b4c36ab2f4d94ceb69)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.vscodeignore)** use explicit negation - ([798464e](https://github.com/michen00/invisible-squiggles/commit/798464e6f7c3abdd24d031d1cd3de5896cdea7f6)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(AGENTS.md)** add agentic helper context - ([300e5f8](https://github.com/michen00/invisible-squiggles/commit/300e5f8e00dd5eaf82a4cd0bbe6ad3a37bafa97f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(CLAUDE.md)** add agentic help text - ([8b846e7](https://github.com/michen00/invisible-squiggles/commit/8b846e758cc6fa9646b6852546dfa9868633df49)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** update build and install - ([6da92c3](https://github.com/michen00/invisible-squiggles/commit/6da92c3ffaa65a9edc8088765911f95a741f431a)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** update vsce command for packaging - ([58142c1](https://github.com/michen00/invisible-squiggles/commit/58142c1042fa996251b39826b5b4371aef1472ab)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** revise targets - ([36abcd3](https://github.com/michen00/invisible-squiggles/commit/36abcd3441239552a11c2ad490dccb4695e4681a)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** add dev shortcuts - ([95c6d42](https://github.com/michen00/invisible-squiggles/commit/95c6d42ec1fe80d088c1e8a107b85d96303a5e50)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** use a more portable sed option - ([f83b657](https://github.com/michen00/invisible-squiggles/commit/f83b657b43cfc53b40c440021bb1ba80890d4ef4)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** fix enable-git-hooks dep - ([f581a7b](https://github.com/michen00/invisible-squiggles/commit/f581a7b9659c043d122ac0e014e434bb2b99be01)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(deps)** bump actions/checkout from 5 to 6 (#44) - ([e328385](https://github.com/michen00/invisible-squiggles/commit/e3283855a5894d8df117ebfa83fbb67f1a1a0a17)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps)** bump actions/checkout from 4 to 6 (#41) - ([655cb24](https://github.com/michen00/invisible-squiggles/commit/655cb24ef7037cdee192660ad6fa8a9d2134a5c1)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps)** update gitleaks to v8.29.1 and markdownlint to v0.46.0 - ([1d9eae2](https://github.com/michen00/invisible-squiggles/commit/1d9eae23de363aacd95bb64a76c3d37a74a31dcc)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(deps)** bump glob in the npm_and_yarn group across 1 directory - ([1500262](https://github.com/michen00/invisible-squiggles/commit/1500262bc2045d6762e9fef74d72120a0d85aec3)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps)** bump actions/github-script from 7 to 8 - ([d683bb5](https://github.com/michen00/invisible-squiggles/commit/d683bb5f56cf246f84a3ef6c780f62b73dfa6f22)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps)** bump actions/first-interaction from 2 to 3 (#28) - ([2529383](https://github.com/michen00/invisible-squiggles/commit/25293837655a31d49b8e44191f1f304116ce0f1f)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps)** bump actions/first-interaction from 1 to 2 (#26) - ([ba4463b](https://github.com/michen00/invisible-squiggles/commit/ba4463b31cfd1145e7fa398128a3bd4ba5dc3219)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** update multiple dependencies - ([9c2adda](https://github.com/michen00/invisible-squiggles/commit/9c2addac3cd4e1dca296c234c9d02f0cd6e2498f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(deps-dev)** bump @vscode/test-electron from 2.4.1 to 2.5.2 - ([7f35327](https://github.com/michen00/invisible-squiggles/commit/7f35327f8087d4a9265e3a18efcb7546c27cb1bd)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** bump @types/node from 20.17.19 to 25.0.3 (#58) - ([4fd3847](https://github.com/michen00/invisible-squiggles/commit/4fd3847471c6fbd56ee43aa231cc44ac21fc61c1)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** bump @typescript-eslint/parser from 8.24.1 to 8.50.0 (#57) - ([c0cd8a9](https://github.com/michen00/invisible-squiggles/commit/c0cd8a90962c32fe0269ec1451a899ba948e156e)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** bump sinon from 21.0.0 to 21.0.1 - ([d4d93c6](https://github.com/michen00/invisible-squiggles/commit/d4d93c644733e1938805b2827d05dfd87559a12a)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(deps-dev)** bump js-yaml - ([b942e59](https://github.com/michen00/invisible-squiggles/commit/b942e59f0edbcce66d9d1a74ca308c21adf73fe9)) - [dependabot[bot]](mailto:49699333+dependabot[bot]@users.noreply.github.com)
- **(package.json)** update package command - ([d582d0a](https://github.com/michen00/invisible-squiggles/commit/d582d0a8c359b3d8c261482c791245dc765ac9d4)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(package.json)** tweak coverage thresholds - ([c234c8d](https://github.com/michen00/invisible-squiggles/commit/c234c8d937d78cd05442a510c821d0fe4de7fff4)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(tsconfig.json)** use a safer default - ([33a154e](https://github.com/michen00/invisible-squiggles/commit/33a154e2ade8f470117d07a521dd8eaf9bad71b8)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- simplify the build - ([d6f9cdb](https://github.com/michen00/invisible-squiggles/commit/d6f9cdb7ca0d3367e9d328ebecb0e66924419fac)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update vscode engine version - ([9818519](https://github.com/michen00/invisible-squiggles/commit/98185195a7e01638a6f7edefd5151d94f5045866)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- use newer types/vscode - ([7abf644](https://github.com/michen00/invisible-squiggles/commit/7abf644aa3b115b93f4ce994ddc4ded3e261e9b8)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- properly exclude README.md from VSIX - ([0ce0553](https://github.com/michen00/invisible-squiggles/commit/0ce0553067b8f867aa6dfd2222a5545f3eb24da7)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- improve robustness and portability - ([474de7d](https://github.com/michen00/invisible-squiggles/commit/474de7d36a8878666f1a15a4e7469716972bfc87)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add build targets for extension packaging - ([af87f41](https://github.com/michen00/invisible-squiggles/commit/af87f41cedc08042cf44aca43c32e4af2c87fd9a)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add agentic scaffolding - ([63cc043](https://github.com/michen00/invisible-squiggles/commit/63cc04317d939a80718eaeafc190d15a40efe97d)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- enhance for documentation maintenance - ([a05dfb9](https://github.com/michen00/invisible-squiggles/commit/a05dfb9982cb90fd7a59f8651ffdb2e83b80c587)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update .github/copilot-instructions.md - ([0d7e4c0](https://github.com/michen00/invisible-squiggles/commit/0d7e4c0178bf39dc9390ff97932bbef206d07259)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- add instructions for Copilot review - ([13579de](https://github.com/michen00/invisible-squiggles/commit/13579defe831ea7f70b540c8f8d0de0c68c70ed0)) - [copilot-swe-agent[bot]](mailto:198982749+Copilot@users.noreply.github.com)
- remove a python-specific hook - ([75eb3dc](https://github.com/michen00/invisible-squiggles/commit/75eb3dc023c6c8399eb6264da3d893bbb3b4c869)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- introduce pre-commit - ([5c72c14](https://github.com/michen00/invisible-squiggles/commit/5c72c14eda6c0d1e989e844b80ae7e743f00bd2e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add a Makefile - ([2c99b5a](https://github.com/michen00/invisible-squiggles/commit/2c99b5aa9ec89671f7983b49abbf7637930f9fa2)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- introduce git hooks - ([fb76bc9](https://github.com/michen00/invisible-squiggles/commit/fb76bc9a5f8bd7747ad9955cda4471f62efcb8ba)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add typos config - ([cb72626](https://github.com/michen00/invisible-squiggles/commit/cb72626ff3b9c4b32e7e4ed29699cc90daf96f6e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add .editorconfig - ([85b8bd6](https://github.com/michen00/invisible-squiggles/commit/85b8bd64f728bd3691ac6ce732daa218d91f8207)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- configure markdownlint - ([00e2a66](https://github.com/michen00/invisible-squiggles/commit/00e2a6647616650a860923924889ce5cf41e79fc)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- set prettier printWidth - ([eb05398](https://github.com/michen00/invisible-squiggles/commit/eb053981e0683921cbae8d981cd71fa92e623020)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- updated recommended extensions - ([7722488](https://github.com/michen00/invisible-squiggles/commit/772248874a5c70578a49880bb8d9d3971dd548dc)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### 📝 Documentation

- **(CHANGELOG.md)** prepare for release - ([d37cf3e](https://github.com/michen00/invisible-squiggles/commit/d37cf3e0d03e98fa3e49d994b1790dd0b2c8dd52)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(CONTRIBUTING.md)** edit release guidelines - ([61ea346](https://github.com/michen00/invisible-squiggles/commit/61ea346d8564ad960caa1decbba8064b637e38f4)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(CHANGELOG.md)** update the changelog - ([ee45a84](https://github.com/michen00/invisible-squiggles/commit/ee45a841fa911272ed21848c72b5e179e4d6e27f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(package.json)** edit description - ([9327320](https://github.com/michen00/invisible-squiggles/commit/9327320cf8731f39c4f319d317232bef0db5de8b)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- bump version - ([dddad08](https://github.com/michen00/invisible-squiggles/commit/dddad08aa62f3cc4c4fd81ce3e7b30c9269d64da)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update contribution guidelines - ([552c9ac](https://github.com/michen00/invisible-squiggles/commit/552c9ac642852c251b081a425e00673724fc9d24)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update CHANGELOG.md - ([eead32e](https://github.com/michen00/invisible-squiggles/commit/eead32e0713f46afc512c878883db18de851a92f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(CONTRIBUTING.md)** add a TODO - ([3a00c7f](https://github.com/michen00/invisible-squiggles/commit/3a00c7f39a749525a739190ed9ef205fe5df9906)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(LICENSE)** update copyright year - ([3fc45a0](https://github.com/michen00/invisible-squiggles/commit/3fc45a0a73e846ac88e0ba8a7cf3d534ddb500ef)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- **(README.md)** update description to include hint squiggles - ([1d610a7](https://github.com/michen00/invisible-squiggles/commit/1d610a7efe0ee87b1070fa4f5facb3c7fad6ef4e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(README.md)** add DeepWiki badge - ([45521ff](https://github.com/michen00/invisible-squiggles/commit/45521ff28a887ea9298dd5269d37ee4094f57395)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(README.md)** edit bullet points - ([5e761fd](https://github.com/michen00/invisible-squiggles/commit/5e761fd220b3ee4cf15c77bbf2ca829620073cb1)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- **(cliff.toml)** edit comments - ([88c9037](https://github.com/michen00/invisible-squiggles/commit/88c9037a24f8653a5421fbe698cda444cc549045)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(copilot)** add conventional commit guidelines - ([4c626a0](https://github.com/michen00/invisible-squiggles/commit/4c626a005fbc94bf2b847791b04acfb434634dd2)) - [copilot-swe-agent[bot]](mailto:198982749+Copilot@users.noreply.github.com)
- clarify comments - ([76a6b67](https://github.com/michen00/invisible-squiggles/commit/76a6b676fc68af76a15295620c63c60bc311ab6e)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- add DeepWiki (#37) - ([3236da1](https://github.com/michen00/invisible-squiggles/commit/3236da173a44d5ae9ef29b79c1444e8a349bcdab)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- remove comments from json files - ([ff67df7](https://github.com/michen00/invisible-squiggles/commit/ff67df7d3dc8df826dfce8ea55aba575ecfa90ff)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update TODO - ([8ceffc2](https://github.com/michen00/invisible-squiggles/commit/8ceffc2175994e92ca0a4ec99e62c03c41d7553c)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add markdown ignore comment - ([0fc2601](https://github.com/michen00/invisible-squiggles/commit/0fc2601809be099f3cb4dac51c37ea6f4bc53c4e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add a TODO to CONTRIBUTING.md - ([0ab9373](https://github.com/michen00/invisible-squiggles/commit/0ab93731f711a5be3e1ab3b52fa84cb18b52133e)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- draft CONTRIBUTING.md - ([d57cfc2](https://github.com/michen00/invisible-squiggles/commit/d57cfc242af05f04f975e4b7a31cd5945e9a1ca8)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update CHANGELOG.md - ([9538820](https://github.com/michen00/invisible-squiggles/commit/9538820be6a4d8c78f655da41868a158dadb9243)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- track cliff.toml - ([951391a](https://github.com/michen00/invisible-squiggles/commit/951391a1496cde2a0b940dd169489a6539c41dae)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- revise/update README.md - ([66ffab1](https://github.com/michen00/invisible-squiggles/commit/66ffab13e70c0efc2119768b427c428e23e3fc4b)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### ♻️ Refactor

- streamline test setup and teardown - ([d726936](https://github.com/michen00/invisible-squiggles/commit/d7269369f8925aae3d2b155cbc1c3bdb7b713dfb)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- improve concision and readability - ([ed50384](https://github.com/michen00/invisible-squiggles/commit/ed50384c14fafdc1d72b9ef32c1ca6f26b5eafcc)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- combine setStatus(Hidden|Visible) - ([403c067](https://github.com/michen00/invisible-squiggles/commit/403c067782e0f3a31ce0ff478b90fa263231b475)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- inline JSON parsing logic - ([7cbf999](https://github.com/michen00/invisible-squiggles/commit/7cbf999b4f274501169d0e9fb420efea300c5025)) - [Parvati](mailto:parvatijay2901@gmail.com)

### 🎨 Styling

- **(Makefile)** adjust indentation - ([a54d01f](https://github.com/michen00/invisible-squiggles/commit/a54d01f8ad9acbce301fd957707b73b00d9bd6ef)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.editorconfig)** update editor config - ([ca7eed0](https://github.com/michen00/invisible-squiggles/commit/ca7eed0f986039fe4536e8a9fbb243f38f5d115d)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.gitlint)** configure gitlint - ([d38863f](https://github.com/michen00/invisible-squiggles/commit/d38863f23f7ba86d2da57066ff8aefa3a61ade87)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.yamllint)** set min spaces from content - ([3e2687d](https://github.com/michen00/invisible-squiggles/commit/3e2687d74d9131a1bc0f94726d8a86d80986ccee)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.yamllint)** edit yamllint - ([2f2cb1a](https://github.com/michen00/invisible-squiggles/commit/2f2cb1a587ed5877c8ec120a253216826583133b)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- format indentations/whitespace - ([8a8a8ba](https://github.com/michen00/invisible-squiggles/commit/8a8a8ba43f9a312314cd5488d7699306ae5d458b)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- use less whitespace - ([5c0c169](https://github.com/michen00/invisible-squiggles/commit/5c0c1697bf1c92c019c6f852722f7f710fc3bf03)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(src/extension.ts)** fix indentation - ([90d792c](https://github.com/michen00/invisible-squiggles/commit/90d792cf59bead010d50b0f476cf3ad9746a8099)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add whitespace to issue_message - ([c70b8e5](https://github.com/michen00/invisible-squiggles/commit/c70b8e5851a2e42f9ccd3e912a60ec39573ef573)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- edit whitespace - ([c9f3403](https://github.com/michen00/invisible-squiggles/commit/c9f34039cfd999087aa344208827220c38341229)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add language specification to fenced code - ([92de84f](https://github.com/michen00/invisible-squiggles/commit/92de84fc43a1efecad0af011e4049b609c3e510f)) - [copilot-swe-agent[bot]](mailto:198982749+Copilot@users.noreply.github.com)
- format two files - ([c416a3e](https://github.com/michen00/invisible-squiggles/commit/c416a3ea1e30cd46e475eb91b8798f172d862cb2)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- sort keys - ([4d31243](https://github.com/michen00/invisible-squiggles/commit/4d3124317920f6c69c9eb80203573d8e1e8cfc8f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- alphabetize SQUIGGLE_TYPES - ([88b7336](https://github.com/michen00/invisible-squiggles/commit/88b7336ce6a8b3761c076e7247ff7d80cc8330e3)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add curly braces - ([ba5a27b](https://github.com/michen00/invisible-squiggles/commit/ba5a27b446db300ebd82c7cb5f79db84f8ea79fc)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)

### ⚙️ Miscellaneous Tasks

- remove an unused hook - ([f17f86c](https://github.com/michen00/invisible-squiggles/commit/f17f86c474a174c2c02edc32d3ec204ad9aa1e03)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove a python pre-commit hook - ([eb560d7](https://github.com/michen00/invisible-squiggles/commit/eb560d7c9f6936de4a76ae835cd8f8597d5f5e91)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(.vscode-test.mjs)** remove unused test file - ([3cf1af2](https://github.com/michen00/invisible-squiggles/commit/3cf1af26e0cca431ed2862703ad9a85d7d066507)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- **(Makefile)** remove unused colors - ([cd7dba2](https://github.com/michen00/invisible-squiggles/commit/cd7dba2194c4eb6f18b8784437ed92806e7034ce)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove boilerplate - ([c82613b](https://github.com/michen00/invisible-squiggles/commit/c82613b0567164b6a2fdac263ec8ab34548f1b0f)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- bump actions versions - ([964511e](https://github.com/michen00/invisible-squiggles/commit/964511e1d2ba84a2860babb890a874eaf6a41570)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- add npm package ecosystem for updates - ([490a51d](https://github.com/michen00/invisible-squiggles/commit/490a51d26824e9a749768454de572c28956d3045)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove nullish coalescing operators - ([e41b58d](https://github.com/michen00/invisible-squiggles/commit/e41b58d6197bd22e1730958bb7f98572a6e3f76d)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove dead code - ([e57dfe9](https://github.com/michen00/invisible-squiggles/commit/e57dfe9aadb4230642033187822677e2de210641)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove line counts - ([403de39](https://github.com/michen00/invisible-squiggles/commit/403de39fe3fafe0b4ae58cbdc67101b59032cfe1)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove unused variable - ([7a0cff3](https://github.com/michen00/invisible-squiggles/commit/7a0cff3cd63ad5caf791fed70f53670b1210849e)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove agentic scaffolding - ([bd88839](https://github.com/michen00/invisible-squiggles/commit/bd88839bee22b835d554d0eba8e40857d3aa05f9)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- autoupdate pre-commit hooks - ([01ab268](https://github.com/michen00/invisible-squiggles/commit/01ab268881d07d2353a75f0589e44abd8bdc271f)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autoupdate pre-commit hooks (#43) - ([61b2b9c](https://github.com/michen00/invisible-squiggles/commit/61b2b9c961afe2723306cfd279143a172a6201cb)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autoupdate pre-commit hooks (#40) - ([05db299](https://github.com/michen00/invisible-squiggles/commit/05db2991aab300e731f9e6ca6e7df00cc369ba90)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autoupdate pre-commit hooks (#36) - ([22634c2](https://github.com/michen00/invisible-squiggles/commit/22634c2a7497aa3ab2fcd40977a673b709435440)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autofix via pre-commit hooks - ([a37b0ac](https://github.com/michen00/invisible-squiggles/commit/a37b0ac4d9a8ff868ec815d5763fc2d3c378c60c)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autoupdate pre-commit hooks (#29) - ([cbff608](https://github.com/michen00/invisible-squiggles/commit/cbff60889309b84f7c01ffcda4f3ef6ba05cac6d)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autoupdate pre-commit hooks (#27) - ([42573fb](https://github.com/michen00/invisible-squiggles/commit/42573fbf60200311aa32ad777c3671914ad14639)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autoupdate pre-commit hooks (#25) - ([0b6d79e](https://github.com/michen00/invisible-squiggles/commit/0b6d79ec0a0e0354af492eb4ba10759821531c6c)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autoupdate pre-commit hooks (#23) - ([eddda8f](https://github.com/michen00/invisible-squiggles/commit/eddda8f0e76177c581bf139409c884ec87a311de)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- autoupdate pre-commit hooks (#22) - ([1651ffa](https://github.com/michen00/invisible-squiggles/commit/1651ffae7e9248c7f0ad88f188c645066ae00665)) - [pre-commit-ci[bot]](mailto:66853113+pre-commit-ci[bot]@users.noreply.github.com)
- remove executable bits - ([4ce204b](https://github.com/michen00/invisible-squiggles/commit/4ce204bb9c13a83d05ba681955199c5afa1f1f4c)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update .pre-commit-config.yaml - ([5c19d8e](https://github.com/michen00/invisible-squiggles/commit/5c19d8e433e2b2ff458e0f14cfbc19a33fec01be)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- revert suggestion - ([def95a4](https://github.com/michen00/invisible-squiggles/commit/def95a47aac5ed4710faa412613a5b588ed3b01c)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- clean up awkward line breaks - ([226f073](https://github.com/michen00/invisible-squiggles/commit/226f07349f06d5eee222d4b694ef948e9f6f7b43)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- remove a duplicate line - ([a0832f6](https://github.com/michen00/invisible-squiggles/commit/a0832f6072b86d5c83a7efacfe2584cec8cc4cff)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- edit recommended extensions - ([5f6434f](https://github.com/michen00/invisible-squiggles/commit/5f6434f64f554699adf66d8eb8c97c61b612a7c4)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- fix .git-blame-ignore-revs - ([c40aff3](https://github.com/michen00/invisible-squiggles/commit/c40aff3dd34d7c316eb2f92a9193e78c19b42eec)) - [Michael I Chen](mailto:michael.chen@aicadium.ai)
- update CONTRIBUTING.md - ([1da6fc6](https://github.com/michen00/invisible-squiggles/commit/1da6fc63f22ae8bb825b235a55340e1da4913ca6)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- remove obsolete reference' - ([723a9d6](https://github.com/michen00/invisible-squiggles/commit/723a9d6876ea26e3525fefb114781601fd2144e0)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Merge pull request #18 from michen00/pre-commit-ci-update-config
- chore: autoupdate pre-commit hooks - ([2c3ccf3](https://github.com/michen00/invisible-squiggles/commit/2c3ccf3e6a2bd2ad09a3efc1d0edc667762da6a1)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- restore status bar toggle accidentally removed in 8f088fa - ([107534b](https://github.com/michen00/invisible-squiggles/commit/107534ba27a22bfab154da95632fcae1a5398c46)) - [Parvati](mailto:parvatijay2901@gmail.com)

## [0.2.0](https://github.com/michen00/invisible-squiggles/compare/v0.1.1..v0.2.0) - 2025-02-26

### ✨ Features

- Add status bar toggle for squiggles
- disable status bar message by default - ([b61e43a](https://github.com/michen00/invisible-squiggles/commit/b61e43a9f63f42d03b39ba69efc12d5ca8f52104)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Added status bar toggle for squiggles - ([4cbcd4b](https://github.com/michen00/invisible-squiggles/commit/4cbcd4b255e0c267a9513a848493133b76ca0458)) - [Sneha Joshi](mailto:sjoshi32@hawk.iit.edu)

### 🐛 Fixes

- replace invalid problemMatcher value - ([e5d576c](https://github.com/michen00/invisible-squiggles/commit/e5d576ca21611548a933c8534e5aa9a1fbdd9f32)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Fix problemMatcher key in tasks.json - ([5d58f0c](https://github.com/michen00/invisible-squiggles/commit/5d58f0c1cc1638111565686ab1e76100827c8716)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### 👷 Build

- [**breaking**]revise tsconfig.json - ([6d7b3b7](https://github.com/michen00/invisible-squiggles/commit/6d7b3b7bc33c8ad8b65c741011f439bfd4a51111)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### 📝 Documentation

- Edit CONTRIBUTING.md top heading - ([b6e7b3a](https://github.com/michen00/invisible-squiggles/commit/b6e7b3a7afe7af0927b9c33a13c994da063d2224)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Add a bugs url - ([e0a4d50](https://github.com/michen00/invisible-squiggles/commit/e0a4d505d0fa35ee7a47ec0c2683b94400bf00e7)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Add a TODO - ([ab84808](https://github.com/michen00/invisible-squiggles/commit/ab84808c03d86100f8aee424af6b9d6ac0d42460)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Add a TODO for new demo - ([a6ac5f7](https://github.com/michen00/invisible-squiggles/commit/a6ac5f7167e1ae8818e053f2d2cd8702df3616a0)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Draft CONTRIBUTING.md - ([7a1e9ad](https://github.com/michen00/invisible-squiggles/commit/7a1e9ad77a152a847a9a9a983b8079abfdca9c45)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Add a TODO to README.md - ([c75e7d7](https://github.com/michen00/invisible-squiggles/commit/c75e7d7895050a6b976bc553b6a0bed203fa3225)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Revise README.md - ([0e3a609](https://github.com/michen00/invisible-squiggles/commit/0e3a609c305f22febcc7c3fca60c141ba388e543)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Updated README and PR description to include new features - ([bd5cb03](https://github.com/michen00/invisible-squiggles/commit/bd5cb034bc322e4c8eeb594a60e86f64d3ff7e23)) - [Sneha Joshi](mailto:sjoshi32@hawk.iit.edu)

### ♻️ Refactor

- Refactor repeated string - ([4c1fd6c](https://github.com/michen00/invisible-squiggles/commit/4c1fd6c2f216b4ec5a3005b02a8f382e4c900696)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Refactor setters for status bar item - ([a1bb30d](https://github.com/michen00/invisible-squiggles/commit/a1bb30dec5e9bb41dbe0ff0480950ccfe124b366)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- code cleanup and optimization - ([4f26f4f](https://github.com/michen00/invisible-squiggles/commit/4f26f4f701655e8922df1f0f20e7cac0b14d0819)) - [Parvati](mailto:parvatijay2901@gmail.com)

### 🎨 Styling

- Format extension.ts - ([27ace5d](https://github.com/michen00/invisible-squiggles/commit/27ace5d751deb2a3944d825d387c4a555bad788c)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Remove old comments - ([e1c9c8b](https://github.com/michen00/invisible-squiggles/commit/e1c9c8bd5ac657d7cbd70c40e765dd5ebec5edae)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Add trailing whitespace - ([b9a16ca](https://github.com/michen00/invisible-squiggles/commit/b9a16ca656dec5d2cfed589d1cdf1d47d3f2bc7d)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Format README.md - ([118c9b0](https://github.com/michen00/invisible-squiggles/commit/118c9b0438e79182659f1f28b300abece45c3543)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Alphabetize SQUIGGLE_TYPES - ([14dcfdb](https://github.com/michen00/invisible-squiggles/commit/14dcfdb82bdb23f42fc37ac3c7c970cb43d25f76)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### ⚙️ Miscellaneous Tasks

- Bump dependencies - ([5cd211e](https://github.com/michen00/invisible-squiggles/commit/5cd211e9a0d22a3ca37a158a76dc47b1d62293e6)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### ⏪️ Revert

- reverted my other changes only keeping the bug fix as noted! - ([766c760](https://github.com/michen00/invisible-squiggles/commit/766c760afd4570bfd8c2dcc76798c0de937df8e6)) - [Madhur Dixit](mailto:madhurdixit37@gmail.com)

### 💼 Other

- Set initial status bar item - ([9ecb36e](https://github.com/michen00/invisible-squiggles/commit/9ecb36e7d0f80ff25fa4c47f497801c39da67614)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Ensure activation after startup - ([507c8a5](https://github.com/michen00/invisible-squiggles/commit/507c8a5c94c3c0c60877e82616d30e0be4491f27)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Update initial tooltip - ([bcd52b3](https://github.com/michen00/invisible-squiggles/commit/bcd52b3eba7cf902f43a9aa1161dc4d7bc640490)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Fix tooltip copy - ([9aaaffa](https://github.com/michen00/invisible-squiggles/commit/9aaaffa92ed6945226deff846fa486bf0b1f78b7)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Make tooltip text conditional - ([3981033](https://github.com/michen00/invisible-squiggles/commit/3981033dcdda237dc8e17860ff3be98a6c7079fa)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Simplify status bar text - ([bbd8a64](https://github.com/michen00/invisible-squiggles/commit/bbd8a6485244b8e0ef47f6e0c366bf6d06597ed7)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- updated task.json - ([ec18048](https://github.com/michen00/invisible-squiggles/commit/ec1804835359ace210966f9d0f5620e477333d50)) - [Madhur Dixit](mailto:madhurdixit37@gmail.com)
- Update extension.ts - ([a8b0236](https://github.com/michen00/invisible-squiggles/commit/a8b023633985552e15cdd1bfbb89678f71c72b7d)) - [Madhur Dixit](mailto:64360720+MadhurDixit13@users.noreply.github.com)

## [0.1.1](https://github.com/michen00/invisible-squiggles/compare/v0.1.0..v0.1.1) - 2024-12-10

### 📝 Documentation

- Update demo .gif URL - ([f1e7732](https://github.com/michen00/invisible-squiggles/commit/f1e7732616666c3309d77822705c62203b9e84fa)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

## [0.1.0] - 2024-12-10

### ✨ Features

- Expose settings for checkbox options - ([f7eeb7e](https://github.com/michen00/invisible-squiggles/commit/f7eeb7ed749cc31a77a1920e4dc706d006ef389b)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Prefer a transient message in the status bar - ([f85ca2b](https://github.com/michen00/invisible-squiggles/commit/f85ca2b8dcc9c5fa2a6a5c20759d13ceaf169d60)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Improve handling of edge cases - ([44c0130](https://github.com/michen00/invisible-squiggles/commit/44c0130940072a6dcbeab0fbf8ed9b95b7a9dec4)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### 📝 Documentation

- Add demo gif to README.md - ([cccb94e](https://github.com/michen00/invisible-squiggles/commit/cccb94e3af4236a72b6895ef21b743502f62b1fe)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Add instructions to README.md - ([d660b50](https://github.com/michen00/invisible-squiggles/commit/d660b50fc50912472ee450989fcbe670ae6a2017)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Update README.md - ([0c7c7d8](https://github.com/michen00/invisible-squiggles/commit/0c7c7d8e657bb2ac4ef63a13a75955d3bd322e3b)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Add license to package-lock.json - ([be691f2](https://github.com/michen00/invisible-squiggles/commit/be691f26a71fd695eada8a675d36a5869c25d605)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Add .git-blame-ignore-revs - ([9e2a02c](https://github.com/michen00/invisible-squiggles/commit/9e2a02c81494860801239541aadce7b362d8b5cd)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### ♻️ Refactor

- Refactor extension.ts - ([c48bf66](https://github.com/michen00/invisible-squiggles/commit/c48bf6612e51ca4754e05df1cf652a7a9e8b1c97)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### 🎨 Styling

- Format the repo - ([e62fdfa](https://github.com/michen00/invisible-squiggles/commit/e62fdfa1d0d1594192c63c566f548d3c283296eb)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Reorder fields - ([5edb995](https://github.com/michen00/invisible-squiggles/commit/5edb99506bb6c291d8617b643e4d088c307d536a)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Remove an old comment - ([8781971](https://github.com/michen00/invisible-squiggles/commit/878197122e1f1623ab361e160a0620248962a66c)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

### 💼 Other

- Expand transparentColors - ([1d28629](https://github.com/michen00/invisible-squiggles/commit/1d286295b02332e2ebee07554b3c7b3310cfbdd9)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Enhance package.json - ([32cf177](https://github.com/michen00/invisible-squiggles/commit/32cf1779b883ed9a757ad188d28339bd50c0386b)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Modify extension code - ([44f22db](https://github.com/michen00/invisible-squiggles/commit/44f22db7f49aa059ac4c545f65616b0bad7c0f6c)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Initialize repository - ([b86399e](https://github.com/michen00/invisible-squiggles/commit/b86399e76fa6a5af1847717ebf4ffbb6753b83c4)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)
- Initial commit - ([b57b5d4](https://github.com/michen00/invisible-squiggles/commit/b57b5d4b85af979c4e94b6501f0b29df337da93d)) - [Michael I Chen](mailto:michael.chen.0@gmail.com)

<!-- generated by git-cliff -->
