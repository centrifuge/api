# Changelog

## [2.3.0](https://github.com/centrifuge/api/compare/v2.2.0...v2.3.0) (2025-04-22)


### Features

* handle force-clean in entrypoint ([a9b6ae0](https://github.com/centrifuge/api/commit/a9b6ae0d39630e2e3b9ebc6af4102262b7649755))


### Bug Fixes

* demo endpoint ([457c818](https://github.com/centrifuge/api/commit/457c81837dc3e88241d2561e7c7620263fd83b25))
* handle missingPools in remarks ([dfbbdb2](https://github.com/centrifuge/api/commit/dfbbdb27361996da58d769ffa8edf26aa1d92f2c))
* missing tinlake borrowings ([#283](https://github.com/centrifuge/api/issues/283)) ([58c78ca](https://github.com/centrifuge/api/commit/58c78caa1f572e086e523e8a22e104285980600c))

## [2.2.0](https://github.com/centrifuge/api/compare/v2.1.0...v2.2.0) (2025-01-28)


### Features

* add 7 day apy ([#218](https://github.com/centrifuge/api/issues/218)) ([8a13a97](https://github.com/centrifuge/api/commit/8a13a97c397d86d1d7cfe837206240a921e3439e))
* add AssetPosition entity and track realized p&l ([#193](https://github.com/centrifuge/api/issues/193)) ([cc358ee](https://github.com/centrifuge/api/commit/cc358eeadac190d36732bdd2d8fe7eb1650c233b))
* add initialised at timestamp to tranche balances ([#264](https://github.com/centrifuge/api/issues/264)) ([e9faa04](https://github.com/centrifuge/api/commit/e9faa04c95fd16aabca0959d74f44318cd17646d))
* add missing quantity settlement price for handleLoanDebtTransferred1024 ([#192](https://github.com/centrifuge/api/issues/192)) ([6a7b554](https://github.com/centrifuge/api/commit/6a7b554ebe736dd857f8460a4f24d1042be46c44))
* add unrealized P&L ([#197](https://github.com/centrifuge/api/issues/197)) ([43f43b0](https://github.com/centrifuge/api/commit/43f43b0748b23759f182ecaf7320e8e87c6fc6c9))
* add yieldMTD, yieldQTD, yieldYTD ([#204](https://github.com/centrifuge/api/issues/204)) ([8c6c48e](https://github.com/centrifuge/api/commit/8c6c48eb01347c1072c88996ec3c77da9e3da173)), closes [#176](https://github.com/centrifuge/api/issues/176)
* extend tinlake data, add debt increase/decrease handlers ([#241](https://github.com/centrifuge/api/issues/241)) ([42bc43c](https://github.com/centrifuge/api/commit/42bc43c734ba9813686139f66b7167f097611266))
* link asset transactions and pool fee transactions to epoch entity ([#203](https://github.com/centrifuge/api/issues/203)) ([eeb9e3f](https://github.com/centrifuge/api/commit/eeb9e3f04b3665a248d4213f8f8ac3647d140860))
* migration to liquidity pools v2 ([#244](https://github.com/centrifuge/api/issues/244)) ([b1e78e1](https://github.com/centrifuge/api/commit/b1e78e1c4134f86f1f91296db3f51446dd9faf72))
* set up remark handler ([#273](https://github.com/centrifuge/api/issues/273)) ([8cc1cc6](https://github.com/centrifuge/api/commit/8cc1cc6f7bce2c87856c5b462b95f03d43df6f96))
* track cash transfers between offchain cash assets ([#238](https://github.com/centrifuge/api/issues/238)) ([fca415a](https://github.com/centrifuge/api/commit/fca415acdf2d1217013d756c0e5d117449e9ff87))
* track future cashflows per asset ([#219](https://github.com/centrifuge/api/issues/219)) ([99ea318](https://github.com/centrifuge/api/commit/99ea318f9775ab587a03de42a1f0df84dcf78e46))
* track investments and redemptions in onchain cash asset ([#188](https://github.com/centrifuge/api/issues/188)) ([aef3249](https://github.com/centrifuge/api/commit/aef32496b239fc34cda8babfb35a54578170e3a9)), closes [#163](https://github.com/centrifuge/api/issues/163)
* track investor side profit ([#226](https://github.com/centrifuge/api/issues/226)) ([7b38112](https://github.com/centrifuge/api/commit/7b3811268c89ddde4f9c1911955ea8000f1cb1da))
* track oracle transactions ([#200](https://github.com/centrifuge/api/issues/200)) ([1dcdb7c](https://github.com/centrifuge/api/commit/1dcdb7c99473db870b69daa1023bdc4029047f91)), closes [#161](https://github.com/centrifuge/api/issues/161)
* track tinlake token prices ([#261](https://github.com/centrifuge/api/issues/261)) ([5367606](https://github.com/centrifuge/api/commit/536760657cac3a09da5a515ec37c024f7e097e13))
* update prices ([#199](https://github.com/centrifuge/api/issues/199)) ([f4ccd62](https://github.com/centrifuge/api/commit/f4ccd6296fb2620c399e471aae204b2eb4f9bc78))


### Bug Fixes

* add normalized NAV to pool snapshot ([#212](https://github.com/centrifuge/api/issues/212)) ([091e1e8](https://github.com/centrifuge/api/commit/091e1e8f7edd3ece0ca63ee9c9fde93c791a11db))
* allow epoch number to be null ([#228](https://github.com/centrifuge/api/issues/228)) ([0da65cd](https://github.com/centrifuge/api/commit/0da65cdb6c6112cd464e653caa8ae525cec4406f))
* asset metadata updates ([#248](https://github.com/centrifuge/api/issues/248)) ([d310b6a](https://github.com/centrifuge/api/commit/d310b6adc243ea49cc96c086efc7263f484d0fa1))
* asset names ([#190](https://github.com/centrifuge/api/issues/190)) ([d8de413](https://github.com/centrifuge/api/commit/d8de413d2f43802dcdb59f6cd13a97bffa435af0))
* cfg no tranche snapshot values ([69b2b1f](https://github.com/centrifuge/api/commit/69b2b1f3fc6d17fc0a8d483a13a048ea8fba711c))
* cfg node chain init ([#269](https://github.com/centrifuge/api/issues/269)) ([2de44dc](https://github.com/centrifuge/api/commit/2de44dcf91fc7efd6a8cb1ea5d013df8e1471cc5))
* cfg pending amounts ([#270](https://github.com/centrifuge/api/issues/270)) ([d1ca2a2](https://github.com/centrifuge/api/commit/d1ca2a2e68b64204d08899e5ad04137632a18a3a))
* check if name is not null ([#191](https://github.com/centrifuge/api/issues/191)) ([e99d281](https://github.com/centrifuge/api/commit/e99d2818b2fb55a06f38d40e33816cb0b2d799e9))
* cli downgrade ([3974803](https://github.com/centrifuge/api/commit/3974803de9847eaedf5b65d34094dda9f3dbd64e))
* cli downgrade ([05623d3](https://github.com/centrifuge/api/commit/05623d30f6e992489e9a882ff35c0bc6de7680a6))
* disable async store cache ([#250](https://github.com/centrifuge/api/issues/250)) ([7bbcc7e](https://github.com/centrifuge/api/commit/7bbcc7ef74e5f946329c29be7d462e786100e74e))
* epoch nav computations for snapshots ([c7f2d5d](https://github.com/centrifuge/api/commit/c7f2d5d1dc82fca745573f3440bc812a9fd72d66))
* ff1 config ([#275](https://github.com/centrifuge/api/issues/275)) ([7cf4638](https://github.com/centrifuge/api/commit/7cf4638be1a2be77c87fce24e9bacca35f1477d5))
* fix last contract selection for FF1 ([b6e95b1](https://github.com/centrifuge/api/commit/b6e95b11d7db19ee62d28b377f6d5d132aee7149))
* improve eth node calls on init ([9ecc2ae](https://github.com/centrifuge/api/commit/9ecc2aec92a9b986c88037710a31f53d98346842))
* incosistent initialisation of accounts on evm ([f6c612c](https://github.com/centrifuge/api/commit/f6c612c21afb9c91bf512111ccd01241d7dfe2e7))
* init epoch number ([#229](https://github.com/centrifuge/api/issues/229)) ([113551b](https://github.com/centrifuge/api/commit/113551b3c529a6bf77edefd33b883b882d309551))
* investment positions ([#259](https://github.com/centrifuge/api/issues/259)) ([9ec23c4](https://github.com/centrifuge/api/commit/9ec23c4eb016640c5f7d39eb1c985b95b309f997))
* mapping of PoolManager to escrow addresses ([#263](https://github.com/centrifuge/api/issues/263)) ([d09dfc0](https://github.com/centrifuge/api/commit/d09dfc08252b92ff783566c71159dde0fe3fe627))
* missing “withdrawal for fees” asset tx in onchain reserve ([#246](https://github.com/centrifuge/api/issues/246)) ([ec2dd6a](https://github.com/centrifuge/api/commit/ec2dd6af6b0e181bebaadb3935adb1f82d2d3848)), closes [#233](https://github.com/centrifuge/api/issues/233)
* missing epoch on some poolFee creation leading to failing poolFee tracking ([eeb9e3f](https://github.com/centrifuge/api/commit/eeb9e3f04b3665a248d4213f8f8ac3647d140860))
* missing name in assets ([#201](https://github.com/centrifuge/api/issues/201)) ([39f5dc3](https://github.com/centrifuge/api/commit/39f5dc371e827a9f4a502e4debc560b97dada2fe)), closes [#155](https://github.com/centrifuge/api/issues/155)
* missing poolFee values ([#247](https://github.com/centrifuge/api/issues/247)) ([c91fc4a](https://github.com/centrifuge/api/commit/c91fc4a119f0f4520428245a49b03645c4f390e9))
* missing yield fields on tranche snapshots ([#206](https://github.com/centrifuge/api/issues/206)) ([5cc0611](https://github.com/centrifuge/api/commit/5cc0611abf124bf3274cead7f5169a35ed259375))
* missingId error ([#267](https://github.com/centrifuge/api/issues/267)) ([99480da](https://github.com/centrifuge/api/commit/99480daf1f33aaa57f04e95061dbf760bef21b9d))
* ns2 config ([#274](https://github.com/centrifuge/api/issues/274)) ([694bfdf](https://github.com/centrifuge/api/commit/694bfdf8e3e2e0dbf77e1297f497d3fbc319e757))
* processed pools object missing latest assessor ([#268](https://github.com/centrifuge/api/issues/268)) ([69d9c3c](https://github.com/centrifuge/api/commit/69d9c3c94a1d60bc2e91594cdc1a919c1015e785))
* rename disable flag ([#251](https://github.com/centrifuge/api/issues/251)) ([7908701](https://github.com/centrifuge/api/commit/7908701aba6282ae637b9ab83119d257df2396b9))
* skip failing calls for Fortunafi 1 ([#243](https://github.com/centrifuge/api/issues/243)) ([0546595](https://github.com/centrifuge/api/commit/0546595fab58e7d8101b5a829f3334d842ffb125))
* support assets without maturity ([#216](https://github.com/centrifuge/api/issues/216)) ([9e8d854](https://github.com/centrifuge/api/commit/9e8d8547f33b80ea16d7a306aa569bcf056b6c04)), closes [#205](https://github.com/centrifuge/api/issues/205)
* tranche init ([1caa336](https://github.com/centrifuge/api/commit/1caa336057257e9a8039803461cb016bfe4ea772))
* update ethHandler to properly parse loan data ([#252](https://github.com/centrifuge/api/issues/252)) ([f3373af](https://github.com/centrifuge/api/commit/f3373af8bae72c857d1a66b5684ae566732a887d))
* use tranche token price RT api ([#180](https://github.com/centrifuge/api/issues/180)) ([345f743](https://github.com/centrifuge/api/commit/345f743cc8cba5e83e6396abaaa2e3426b187acb))

## [2.1.0](https://github.com/centrifuge/pools-subql/compare/v2.0.0...v2.1.0) (2024-06-03)


### Features

* track oracle transactions ([#170](https://github.com/centrifuge/pools-subql/issues/170)) ([81b2736](https://github.com/centrifuge/pools-subql/commit/81b273673f67fd3a8f5df7e57e66a814f5a48b07))


### Bug Fixes

* align pool and pool snapshots ([#168](https://github.com/centrifuge/pools-subql/issues/168)) ([9674e54](https://github.com/centrifuge/pools-subql/commit/9674e5478edd27f56bdc08d21802fefb55f6fe0f))
* cash value when using nav call ([#182](https://github.com/centrifuge/pools-subql/issues/182)) ([c8858e7](https://github.com/centrifuge/pools-subql/commit/c8858e74d1ace03fc81b7e3978ac5c2fad3e8b53))
* handle 0 token supply in trancheToken price fix ([8874476](https://github.com/centrifuge/pools-subql/commit/88744762e09caf5b1f3e3f20923f123a3d443736))
* ISIN parsing for oracle keys ([#177](https://github.com/centrifuge/pools-subql/issues/177)) ([ba03d80](https://github.com/centrifuge/pools-subql/commit/ba03d80aa2f5573f47a5f296c5ecacf8bebb669b))
* move update NAV call ([#181](https://github.com/centrifuge/pools-subql/issues/181)) ([cffc3b3](https://github.com/centrifuge/pools-subql/commit/cffc3b3dfe7d92f26915b02087c280a73c186f62))
* nav comment ([#183](https://github.com/centrifuge/pools-subql/issues/183)) ([f25864c](https://github.com/centrifuge/pools-subql/commit/f25864c10db072df579c491b67d3eb1aa3208154))
* oracle handler definition ([#171](https://github.com/centrifuge/pools-subql/issues/171)) ([a8845d9](https://github.com/centrifuge/pools-subql/commit/a8845d9e64eb31f623d5439cae05331db9f9eee4))
* oracle pallet name ([#172](https://github.com/centrifuge/pools-subql/issues/172)) ([c0889d5](https://github.com/centrifuge/pools-subql/commit/c0889d5c3b2239daeb2ee819517562e5d255996f))
* remove dev query limit ([#166](https://github.com/centrifuge/pools-subql/issues/166)) ([040c8bc](https://github.com/centrifuge/pools-subql/commit/040c8bc3fc19544fc487f1bd453ba1006b26c85b))
* store oracle transactions properly ([#173](https://github.com/centrifuge/pools-subql/issues/173)) ([c574188](https://github.com/centrifuge/pools-subql/commit/c5741884702ea96667386ecf21d04662c29f30cd))
* update price to account for fees ([#184](https://github.com/centrifuge/pools-subql/issues/184)) ([c1e3fc8](https://github.com/centrifuge/pools-subql/commit/c1e3fc809f68adf85f13f3276efa90f791b18bcc))
* upgrade cli, re-add query limit flag ([#169](https://github.com/centrifuge/pools-subql/issues/169)) ([15b78d1](https://github.com/centrifuge/pools-subql/commit/15b78d18c94f01188da22981199f2fc44e359b69))

## [2.0.0](https://github.com/centrifuge/pools-subql/compare/v1.1.0...v2.0.0) (2024-05-28)


### ⚠ BREAKING CHANGES

* renamed several poolFees aggregators properties under the pool entity

### Features

* add current price & track quantities ([#164](https://github.com/centrifuge/pools-subql/issues/164)) ([4f44f5e](https://github.com/centrifuge/pools-subql/commit/4f44f5ef2f3c9d477978cf0af8c4621cd2b3f61a))
* improved naming of PoolFee accumulators in Pool entity ([#160](https://github.com/centrifuge/pools-subql/issues/160)) ([80a5608](https://github.com/centrifuge/pools-subql/commit/80a56087cb4885d2e9f05206c03728cd7382eb27))
* track total cash asset value in PoolSnapshot ([#156](https://github.com/centrifuge/pools-subql/issues/156)) ([2c96e12](https://github.com/centrifuge/pools-subql/commit/2c96e1265a1852d35e331b8044747d2c89b4dd48)), closes [#143](https://github.com/centrifuge/pools-subql/issues/143)


### Bug Fixes

* interest amount for transfer debt ([#158](https://github.com/centrifuge/pools-subql/issues/158)) ([9aef6c3](https://github.com/centrifuge/pools-subql/commit/9aef6c36e379f4db4acb7bac602e03c0c2194589))

## [1.1.0](https://github.com/centrifuge/pools-subql/compare/v1.0.0...v1.1.0) (2024-05-16)


### Features

* track cash transfers as asset transaction type ([#152](https://github.com/centrifuge/pools-subql/issues/152)) ([ec3949c](https://github.com/centrifuge/pools-subql/commit/ec3949cc6b6477464828da36423f3b85ed6d628d))


### Bug Fixes

* eth indexer fails to attach LP DynamicSource ([#154](https://github.com/centrifuge/pools-subql/issues/154)) ([5cab359](https://github.com/centrifuge/pools-subql/commit/5cab359c091f194f3a9004838c2b5876f254998b))
* remove celo ([#141](https://github.com/centrifuge/pools-subql/issues/141)) ([2b55255](https://github.com/centrifuge/pools-subql/commit/2b55255d719858a334d57b0434075878a7b11eed))
* transfer debt 2024 handler ([#149](https://github.com/centrifuge/pools-subql/issues/149)) ([0fc024a](https://github.com/centrifuge/pools-subql/commit/0fc024a4a99ce267603895888aaa9143a53dd664))

## 1.0.0 (2024-05-01)


### Features

* add computation of pool value in indexer ([#68](https://github.com/centrifuge/pools-subql/issues/68)) ([30ca266](https://github.com/centrifuge/pools-subql/commit/30ca266cb40b3fb1b3f7dbe054ab242ebfabc770))
* add debt transfers to/from ([82c0f1f](https://github.com/centrifuge/pools-subql/commit/82c0f1fb5950234ce33e0c59b253f319ef0a085a))
* add epoch handlers, add prettier, update order handling ([f9a9c76](https://github.com/centrifuge/pools-subql/commit/f9a9c76017d977f1473f484ec1950392da3a95f6))
* add hourly pool states ([d1cd879](https://github.com/centrifuge/pools-subql/commit/d1cd879eb7241478d40a69189c48af6dc626ba86))
* add mainnet dictionary ([#89](https://github.com/centrifuge/pools-subql/issues/89)) ([8ba471d](https://github.com/centrifuge/pools-subql/commit/8ba471d6688c6af7ce24b6cd5f264904470b559a))
* add more fields, disable outstanding orders for now ([fd7e3e3](https://github.com/centrifuge/pools-subql/commit/fd7e3e3e87cf1a3da536f054578d7c8fd33d7ed5))
* extend investor tx ([218b78f](https://github.com/centrifuge/pools-subql/commit/218b78f55a545f43a7826aaf7a1820ace52bdfe9))
* extend schema with loans, borrower transactions, and more fields ([6a49201](https://github.com/centrifuge/pools-subql/commit/6a49201c69093a0e6267f88a16edf0527be56a44))
* implement dynamic precision in pools ([#75](https://github.com/centrifuge/pools-subql/issues/75)) ([7bfda19](https://github.com/centrifuge/pools-subql/commit/7bfda19de1e24a9e0783b987f8c059fdd1e03340))
* include modulo filter for block handler and update indexer version ([#69](https://github.com/centrifuge/pools-subql/issues/69)) ([16c49a7](https://github.com/centrifuge/pools-subql/commit/16c49a749277d2355e91db4162bcb648e4b15200))
* index basic metadata from IPFS ([#227](https://github.com/centrifuge/pools-subql/issues/227)) ([37e12f9](https://github.com/centrifuge/pools-subql/commit/37e12f907d9a82790e69c8760f320b68105ac257))
* investor transaction references in epoches ([#67](https://github.com/centrifuge/pools-subql/issues/67)) ([aebf3bd](https://github.com/centrifuge/pools-subql/commit/aebf3bd90a04b42335073dfbb4042ad9cc7e4aac))
* set up daily pool data handler ([c089ca5](https://github.com/centrifuge/pools-subql/commit/c089ca53b4f0b2cc3f5242b500ad075efa2529c0))
* set up mainnet ([#87](https://github.com/centrifuge/pools-subql/issues/87)) ([c00d676](https://github.com/centrifuge/pools-subql/commit/c00d676fc2d3ecd2085211baf641df3826c330d9))
* set up pools subquery ([039edf0](https://github.com/centrifuge/pools-subql/commit/039edf0a369fb27e0be23fcffb69ffe7bddb4383))
* skip 0 borrower tx ([#92](https://github.com/centrifuge/pools-subql/issues/92)) ([da0be64](https://github.com/centrifuge/pools-subql/commit/da0be64c1acb9f397e1cfa86a797030ab65f0472))
* track daily pool states ([c66f194](https://github.com/centrifuge/pools-subql/commit/c66f194632f332b8bb740d795674e74d7cfffd30))
* track deltaPortfolioValuationByPeriod ([#240](https://github.com/centrifuge/pools-subql/issues/240)) ([d8ee503](https://github.com/centrifuge/pools-subql/commit/d8ee503deaf74308494e33a50722b309f8908f26)), closes [#205](https://github.com/centrifuge/pools-subql/issues/205)
* track loan KPIs in Pool and PoolsnapshotsFixes [#188](https://github.com/centrifuge/pools-subql/issues/188) ([ae9ff16](https://github.com/centrifuge/pools-subql/commit/ae9ff1695e0bd429f25b03a9ec84a93d7932851b))
* track outstanding orders ([d4e016d](https://github.com/centrifuge/pools-subql/commit/d4e016d112a3b17bc1f29647fa073567c1c6ac3d))
* track pool metadata updates ([#238](https://github.com/centrifuge/pools-subql/issues/238)) ([805d7ea](https://github.com/centrifuge/pools-subql/commit/805d7ea98e12cdd73d5a6c2cc2f70783a9b889f5))
* track sum fees on pool snapshots ([#239](https://github.com/centrifuge/pools-subql/issues/239)) ([a05c2c4](https://github.com/centrifuge/pools-subql/commit/a05c2c423fc04eaa2022b67cb4476d4d94d84df8)), closes [#233](https://github.com/centrifuge/pools-subql/issues/233)
* transfer debt handler ([#82](https://github.com/centrifuge/pools-subql/issues/82)) ([c2e8acc](https://github.com/centrifuge/pools-subql/commit/c2e8accf0d22ed67095dbf7461f1afb862f38202))
* upate subql versions ([#94](https://github.com/centrifuge/pools-subql/issues/94)) ([cd4905d](https://github.com/centrifuge/pools-subql/commit/cd4905d70ede3828097deb5738ab8ce6d0641839))
* update types ([#95](https://github.com/centrifuge/pools-subql/issues/95)) ([522d2d3](https://github.com/centrifuge/pools-subql/commit/522d2d30776f31c2bce3a0bd28f164698f90b97b))
* use multicall ([d8bf861](https://github.com/centrifuge/pools-subql/commit/d8bf8616a0300a5bc3757a236c92e2916363c9f5))


### Bug Fixes

* activate on transfer debt ([3f96cb3](https://github.com/centrifuge/pools-subql/commit/3f96cb3c209fd2faabba95d088c891b3be5fead5))
* add celo, disable base ([8e0c857](https://github.com/centrifuge/pools-subql/commit/8e0c8576f51b1cafe9774113bf5dfd6adf917804))
* add missing multicall abi to tinlake ([11f9db5](https://github.com/centrifuge/pools-subql/commit/11f9db555d5999ddb40f96a382f39ef0a08e84b8))
* add missing slash ([#100](https://github.com/centrifuge/pools-subql/issues/100)) ([6e19c65](https://github.com/centrifuge/pools-subql/commit/6e19c655dc2e61bb2a9676a4a59618968d416b4b))
* add totalRepaid and totalBorrowed ([8b46468](https://github.com/centrifuge/pools-subql/commit/8b4646895217ce12fe108283113c2d8083057d3c))
* appease the linter ([ae5a067](https://github.com/centrifuge/pools-subql/commit/ae5a0675f252b9d596c39125ce21784b50388988))
* assert epoch existance on upon asset transactions ([87d3c9e](https://github.com/centrifuge/pools-subql/commit/87d3c9e6d4e9f705a80b4baf90a0a0b801c2ad31))
* cicd ipfs cid extraction from clu output ([#78](https://github.com/centrifuge/pools-subql/issues/78)) ([f420de0](https://github.com/centrifuge/pools-subql/commit/f420de0057808d59dac0ceca0af88b96b62b100b))
* cli flags ([f2baae2](https://github.com/centrifuge/pools-subql/commit/f2baae2aa55bd5ee13f8db2ae38d8c7ed83e0ebe))
* correct wrong array destruction ([e8ab969](https://github.com/centrifuge/pools-subql/commit/e8ab96967a717d27b9f7ef744cee96d3f1bb905f))
* currency balance offset ([76ec367](https://github.com/centrifuge/pools-subql/commit/76ec367ffcdd5fb21d813aea0e8b4bfbd3d7038a))
* demo environment indexing ([#71](https://github.com/centrifuge/pools-subql/issues/71)) ([ac16ba8](https://github.com/centrifuge/pools-subql/commit/ac16ba8ae999a818a5275bf6a91b4fe5d9b57ae5))
* demo start block on october 1st ([#72](https://github.com/centrifuge/pools-subql/issues/72)) ([874552f](https://github.com/centrifuge/pools-subql/commit/874552f680eb7073fd897bf0bce3ed7168263d09))
* drop eth indexer separation ([4135244](https://github.com/centrifuge/pools-subql/commit/41352443d58bdc60801e836bb27e5e08483ee43e))
* duplicate setting of prices ([aaab47b](https://github.com/centrifuge/pools-subql/commit/aaab47b481b7ee7611d4d2cc23b5d07d16074b97))
* enable historical state ([#83](https://github.com/centrifuge/pools-subql/issues/83)) ([6b355a9](https://github.com/centrifuge/pools-subql/commit/6b355a914339e8e215c56fb3f4d08f993020d0cd))
* enable query aggregate for deployments ([#99](https://github.com/centrifuge/pools-subql/issues/99)) ([7e009fa](https://github.com/centrifuge/pools-subql/commit/7e009fa9e9d104d1fe6ecfe3e032a700f9214cbc))
* enable unsafe indexer deployment ([e3585dd](https://github.com/centrifuge/pools-subql/commit/e3585ddb945289da4aefe37015e71c51b2a320a7))
* escape newlines ([eff9c58](https://github.com/centrifuge/pools-subql/commit/eff9c58ba882b70ee372fa01475d99ecfe0e91d7))
* even more base references ([419cb24](https://github.com/centrifuge/pools-subql/commit/419cb24993ce475c3b329f7038119c5ab9ceda28))
* fetching and accruals of poolFees vie runtime ([e6be4c6](https://github.com/centrifuge/pools-subql/commit/e6be4c62e57b3b32e59827bbfc31e9f693124aa4))
* filter out blocktower pools from maturity date operations ([decc19b](https://github.com/centrifuge/pools-subql/commit/decc19b6b542253a24c072777161da56c7e121bd))
* fix bug in processCalls ([f953ef1](https://github.com/centrifuge/pools-subql/commit/f953ef1675704df0fcf56699a04142e7d986f7fa))
* fix bug in processCalls that was overwriting results ([8079564](https://github.com/centrifuge/pools-subql/commit/8079564d3d26001a15e06de8a224df537c1b11fd))
* fix loanrate and debt fetching ([68096f6](https://github.com/centrifuge/pools-subql/commit/68096f6fa107b1e4012c7191c6a217ee1dad2935))
* genesisHash =&gt; chainId ([#75](https://github.com/centrifuge/pools-subql/issues/75)) ([3fa4e67](https://github.com/centrifuge/pools-subql/commit/3fa4e671ed4c389f1cb03840016f6c599a94c8f0))
* get pool update multicall working again ([48ef388](https://github.com/centrifuge/pools-subql/commit/48ef388925cbade0d4576693520da2cd509bb6cf))
* include subql cli ([5dd0de2](https://github.com/centrifuge/pools-subql/commit/5dd0de2c771a630760480450da96c2f45c9b317e))
* incorrect TVL indexing tinlake ([#223](https://github.com/centrifuge/pools-subql/issues/223)) ([3b7852b](https://github.com/centrifuge/pools-subql/commit/3b7852b74ef4a30202d788a709c9d26d84cdc41b))
* init tranche currency details on tranche creation ([e0a4f21](https://github.com/centrifuge/pools-subql/commit/e0a4f21ac077ac8f7b79fdb5ddcbbb8cb49d727c))
* invalid poolValuation serialize error ([7c8a95c](https://github.com/centrifuge/pools-subql/commit/7c8a95ccb44d26e05406fd397231c4829b5edc5e))
* investment transactions prices in ray precision ([6d45b17](https://github.com/centrifuge/pools-subql/commit/6d45b17b2a4e3d3c4dba3856a7f356d54853e665))
* investor transactions price precision in ray ([a4a2271](https://github.com/centrifuge/pools-subql/commit/a4a2271ebdeaf4945d0f616e08f25d11e213dff4))
* investor transfer logic ([ce466c8](https://github.com/centrifuge/pools-subql/commit/ce466c893c878e9f9382e4a070ad62fd33b3d929))
* loans multicall working ([a3cd5a7](https://github.com/centrifuge/pools-subql/commit/a3cd5a7f84bf96b2b048880a4ce0ebfccc6faeeb))
* merge main ([488eb5c](https://github.com/centrifuge/pools-subql/commit/488eb5c1fba273b4e64b7bf7801249e81f0fb32c))
* merge tinlake with ethereum yaml ([ae1fd5d](https://github.com/centrifuge/pools-subql/commit/ae1fd5d50d11a3e20075f749de68e3a8710af12c))
* missing fulfilled orders calculations ([be2497e](https://github.com/centrifuge/pools-subql/commit/be2497ed28cafbb704e26626f53e523e1819f244))
* modulo interval for tinlake ([0cb3200](https://github.com/centrifuge/pools-subql/commit/0cb3200c6c605c44b1d215aa77b48d8fa1070c92))
* move tinlake manifest to chains-tinlake ([aece85e](https://github.com/centrifuge/pools-subql/commit/aece85ee693f067cc3d23e9bc70e801bdc8bd920))
* multicall working for pool data ([3b9be33](https://github.com/centrifuge/pools-subql/commit/3b9be337102ee1b6a7079b6a26281a2e63a5f1a1))
* multiline env output ([#77](https://github.com/centrifuge/pools-subql/issues/77)) ([5bd92f6](https://github.com/centrifuge/pools-subql/commit/5bd92f6ae1b9ab44eb01e8974053e0bc4131f4cf))
* nodes versions ([533b091](https://github.com/centrifuge/pools-subql/commit/533b091b6426cfb63590ac15c7912169aa9de2be))
* optimize updating pools ([870e6ba](https://github.com/centrifuge/pools-subql/commit/870e6baea11a237189e6df0178a1093edf286834))
* patch bug in paginatedGetter ([e7c5657](https://github.com/centrifuge/pools-subql/commit/e7c5657a32245339f61aea809e63256f4b6cae40))
* patch bug in portfolioValuation and reserve tracking ([fd6779c](https://github.com/centrifuge/pools-subql/commit/fd6779cd0192af49ff72e9ddbc3243bcfecdf9d4))
* pool seeding reference warnings ([810f887](https://github.com/centrifuge/pools-subql/commit/810f887537c763f3ccfc92eb917bc6050627e9a4))
* poolFee transactions for CHARGE and PAID not registered ([#215](https://github.com/centrifuge/pools-subql/issues/215)) ([e5181d2](https://github.com/centrifuge/pools-subql/commit/e5181d2c62b237ee1afb5e3dd271a8bac485afa8)), closes [#213](https://github.com/centrifuge/pools-subql/issues/213)
* poolFeesTransactions fallback for missing epochs ([cf391b0](https://github.com/centrifuge/pools-subql/commit/cf391b098e4cd292fcc6b6c3e02ee0fa7f00da11))
* provide dict value ([bb392b5](https://github.com/centrifuge/pools-subql/commit/bb392b565090372ca6f86c50efb3ff357062a22a))
* re-add bypass blocks ([6185d19](https://github.com/centrifuge/pools-subql/commit/6185d195652a3f441a80802691a7c97ee2cb8842))
* remove import again ([#96](https://github.com/centrifuge/pools-subql/issues/96)) ([7db5d8c](https://github.com/centrifuge/pools-subql/commit/7db5d8c04730a7a70c3c8844f29b7e177aa627ef))
* remove invalid flag ([#102](https://github.com/centrifuge/pools-subql/issues/102)) ([32a1659](https://github.com/centrifuge/pools-subql/commit/32a1659ffb6f5f8e4417489d07eb855bb259727b))
* remove more references to base ([0e694e3](https://github.com/centrifuge/pools-subql/commit/0e694e3c5f51e30266abbb0694b360371d328570))
* rename aggregate flag ([#101](https://github.com/centrifuge/pools-subql/issues/101)) ([a709cc5](https://github.com/centrifuge/pools-subql/commit/a709cc518a1d37167a35a2d8b2ace3f0fa004ecc))
* snapshotting issues ([395710b](https://github.com/centrifuge/pools-subql/commit/395710bae04d4fc615a864d91bf0a5920aa90789))
* switch to multicall3 ([6f380e5](https://github.com/centrifuge/pools-subql/commit/6f380e5ac2e09a5fdcdfdca951bb7c0d760ec198))
* tranche balance ordered amounts ([#90](https://github.com/centrifuge/pools-subql/issues/90)) ([d5d157c](https://github.com/centrifuge/pools-subql/commit/d5d157c85b86dc2c1f75a0d5c5fd0518eb2406c7))
* tranche prices should be initialised to 1 ([a4108ac](https://github.com/centrifuge/pools-subql/commit/a4108acc9bab3eb074ccf734121925dee3e0b737))
* trim multicall ABI ([952dbe6](https://github.com/centrifuge/pools-subql/commit/952dbe6dc815ff13a32ab2f898b0df63fef1565d))
* unable to depoly tinlake in multichain ([a7bd07d](https://github.com/centrifuge/pools-subql/commit/a7bd07d869d248412e6e7d2f4314916c1071c65d)), closes [#216](https://github.com/centrifuge/pools-subql/issues/216)
* unable to depoly tinlake in multichain ([#217](https://github.com/centrifuge/pools-subql/issues/217)) ([8e17ff3](https://github.com/centrifuge/pools-subql/commit/8e17ff349850795718211f968ddb1e0acb1626a0)), closes [#216](https://github.com/centrifuge/pools-subql/issues/216)
* update dependencies ([c4e9ab1](https://github.com/centrifuge/pools-subql/commit/c4e9ab1f3779ba3adf1cc36686af7fabe302a762))
* update genesis hash ([1f438d4](https://github.com/centrifuge/pools-subql/commit/1f438d4505dfb60418d5bedd026a2b4c66d1e35b))
* update genesis hash and chain data ([3450dcd](https://github.com/centrifuge/pools-subql/commit/3450dcd65142114d1a0159292a32f495e689d39f))
* update multicall to aggregate across all pools and execute in configurable chunks ([fed79be](https://github.com/centrifuge/pools-subql/commit/fed79be6a6ec6922c14e81807be8064069d67c2f))
* updated proj yaml ([0b6ee02](https://github.com/centrifuge/pools-subql/commit/0b6ee02377314f3c8ae1172e8db730016899e883))
* use const ([35fc002](https://github.com/centrifuge/pools-subql/commit/35fc002bc1167ebc702491b27b561950fe6ad669))
* use maker's multicall contract and update logic to better track mutlicalls ([5041c5b](https://github.com/centrifuge/pools-subql/commit/5041c5b84aa437893ad3e1dd3e3ab5ecf0e26fe3))
* use multicall for loan data ([1d0760a](https://github.com/centrifuge/pools-subql/commit/1d0760aa80e40d9aa94c1d95c15558f6236521b5))
