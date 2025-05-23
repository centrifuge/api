import { bnToBn } from '@polkadot/util'

export const IPFS_NODE = 'https://centrifuge.mypinata.cloud'
export const SNAPSHOT_INTERVAL_SECONDS = 3600 * 24
export const WAD_DIGITS = 18
export const WAD = bnToBn(10).pow(bnToBn(WAD_DIGITS))
export const RAY_DIGITS = 27
export const RAY = bnToBn(10).pow(bnToBn(RAY_DIGITS))
export const CPREC = (digits: number) => bnToBn(10).pow(bnToBn(digits))
export const DAIName = 'Dai Stablecoin'
export const DAISymbol = 'DAI'
export const DAIMainnetAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'
export const multicallAddress = '0xeefba1e63905ef1d7acba5a8513c70307c1ce441'

export const tinlakePools = [
  {
    id: '0x09e43329552c9d81cf205fd5f44796fbc40c822e',
    shortName: 'REIF Pool',
    startBlock: 13796246,
    navFeed: [{ address: '0x67ee93df5ff0805d6bfbcd747bf4e3ad20af5cc3', startBlock: 13796262 }],
    reserve: [{ address: '0xdcc68229b0d0fb7668f3304d88ee9a2738a7b51d', startBlock: 13796304 }],
    shelf: [{ address: '0xbcCB3516D0fDE02DC46d9Bf591CF9cb3880D9842' }],
    pile: [{ address: '0xc2a75288cf644b068fC1e765586c170f2529a87F' }],
    assessor: [{ address: '0xbAC0588400b84367E1F9601b96ac6C7f3e28F979' }],
    seniorInterestRate: '1000000001585489599188229325',
  },
  {
    id: '0x0ced6166873038ac0cc688e7e6d19e2cbe251bf0',
    shortName: 'Bling Series 1',
    startBlock: 11196893,
    navFeed: [{ address: '0x1621b607a62dac0dc2e4044ff1235a30f135cbd2', startBlock: 11197170 }],
    reserve: [{ address: '0x932344ba99bf34035b4bc25cbd98f912ebc60371', startBlock: 11197219 }],
    shelf: [{ address: '0xCFad06aDAcf221f8119995c8bCa25184A6b5A268' }],
    pile: [{ address: '0x05739C677286d38CcBF0FfC8f9cdbD45904B47Fd' }],
    assessor: [{ address: '0x2B8feA4eEDB43fCa58ccb063221FaE5858b47538' }],
    seniorInterestRate: '1000000002378234398782343987',
  },
  {
    id: '0x235893bf9695f68a922dac055598401d832b538b',
    shortName: 'Pezesha 1',
    startBlock: 12453056,
    navFeed: [{ address: '0xd9b2471f5c7494254b8d52f4ab3146e747abc9ab', startBlock: 12453087 }],
    reserve: [{ address: '0xb12e705733042610174ed22f6726d26db12dbdfe', startBlock: 12703288 }],
    shelf: [{ address: '0x4Ca7049E61629407a7E829564C1Dd2538d70182C' }],
    pile: [{ address: '0xAAEaCfcCc3d3249f125Ba0644495560309C266cB' }],
    assessor: [{ address: '0x623f6DbDcB637f357551F8EFD7b4c304cf7Bcbd0' }],
    seniorInterestRate: '1000000004439370877727042110',
  },
  {
    id: '0x3170d353772ed68676044f8b76f0641b2cba084e',
    shortName: 'Fortunafi 2',
    startBlock: 13512637,
    navFeed: [{ address: '0x3263b3a84543abfceca35ab1b02c6ab4f1e66b17', startBlock: 13512663 }],
    reserve: [{ address: '0x101e8f7598639bf3d1320ac9999977a0678aa186', startBlock: 13513359 }],
    shelf: [{ address: '0x720E872De93F3416bD0d43d3ACA6891f26D60797' }],
    pile: [{ address: '0x2bD53Bd2341329e0cf36c55380A77a3E457028Ca' }],
    assessor: [{ address: '0x038a0a70E99D2fD12d7D9FeFD912c9A8E670eB83' }],
    seniorInterestRate: '1000000001090816844241501775',
  },
  {
    id: '0x3b03863bd553c4ce07eabf2278016533451c9101',
    shortName: 'Cauris Global Fintech 1',
    startBlock: 13397601,
    navFeed: [{ address: '0x431548e6f14134b7e2955c4f2d42054f7588afce', startBlock: 13397666 }],
    reserve: [{ address: '0xb15ccb81f633b98845a0f6c91a89483298a41cc3', startBlock: 13402984 }],
    shelf: [{ address: '0x5621d692DEEea943C0c694dC3000E32d3CE28bA7' }],
    pile: [{ address: '0x696866ea53C0f521C24a28D92fAbD2c559182D38' }],
    assessor: [{ address: '0x909127EEec2797804ee62E196e6e731D6eb2d037' }],
    seniorInterestRate: '1000000001902587519025875190',
  },
  {
    id: '0x3d167bd08f762fd391694c67b5e6af0868c45538',
    shortName: 'GIG Pool',
    startBlock: 12901666,
    navFeed: [{ address: '0x468eb2408c6f24662a291892550952eb0d70b707', startBlock: 12901939 }],
    reserve: [{ address: '0x1794a4b29ff2ecdc044ad5d4972fa118d4c121b9', startBlock: 12902086 }],
    shelf: [{ address: '0x661f03AcE6Bd3087201503541ac7b0Cb1185d673' }],
    pile: [{ address: '0x9E39e0130558cd9A01C1e3c7b2c3803baCb59616' }],
    assessor: [{ address: '0x87C67534d9aF78d678101f2dE0F796F4d911697a' }],
    seniorInterestRate: '1000000002695332318619989852',
  },
  {
    id: '0x4597f91cc06687bdb74147c80c097a79358ed29b',
    shortName: 'BT1',
    startBlock: 16041343,
    navFeed: [{ address: '0x479506bff98b18d62e62862a02a55047ca6583fa', startBlock: 16041344 }],
    reserve: [{ address: '0x50f8a1cdedd9aef2901c7ec0859d8adbf61b1263', startBlock: 16041344 }],
    shelf: [{ address: '0x35Cbc4F6de5333DAFb372200591E69b68B2A5FbF' }],
    pile: [{ address: '0x62E6225d9DbFa9C5f09ccB43304F60a0a7dDeb7A' }],
    assessor: [{ address: '0x9A359b74BaDd48c23A0A848d149D96B87816F944' }],
    seniorInterestRate: '1000000001268391679350583460',
  },
  {
    id: '0x4b6ca198d257d755a5275648d471fe09931b764a',
    shortName: 'Fortunafi 1',
    startBlock: 11282587,
    navFeed: [
      { address: '0xcAB9ed8e5EF4607A97f4e22Ad1D984ADB93ce890', startBlock: 11282611 },
      { address: null, startBlock: 16537499 },
      { address: '0x887db3ee1166ddaf5f7df96b195912594112431e', startBlock: 16799275 },
    ],
    reserve: [
      { address: '0x78aF512B18C0893e77138b02B1393cd887816EDF', startBlock: 11282854 },
      { address: '0xd9cec614db2b5a7490df2462a4621d96bcd4bfe2', startBlock: 12996577 },
    ],
    shelf: [{ address: '0x9C3a54AC3af2e1FC9ee49e991a0452629C9bca64' }],
    pile: [{ address: '0x11C14AAa42e361Cf3500C9C46f34171856e3f657' }],
    assessor: [
      { address: '0x4e7D665FB7747747bd770CB35F604412249AE8bC', startBlock: 11282864 },
      { address: '0xCC2cA000DB7Df0499667ca4048987727151b0b1f', startBlock: 12996577 },
    ],
    seniorInterestRate: '1000000003170979198376458650',
  },
  {
    id: '0x4ca805ce8ece2e63ffc1f9f8f2731d3f48df89df',
    shortName: 'Harbor Trade 2',
    startBlock: 11464178,
    navFeed: [{ address: '0xdb9a84e5214e03a4e5dd14cfb3782e0bcd7567a7', startBlock: 11464206 }],
    reserve: [
      { address: '0x573a8a054e0C80F0E9B1e96E8a2198BB46c999D6', startBlock: 11464255 },
      { address: '0x86284a692430c25eff37007c5707a530a6d63a41', startBlock: 13004076 },
    ],
    shelf: [{ address: '0x5b2b43b3676057e38F332De73A9fCf0F8f6Babf7' }],
    pile: [{ address: '0xE7876f282bdF0f62e5fdb2C63b8b89c10538dF32' }],
    assessor: [
      { address: '0x6e40A9d1eE2c8eF95322b879CBae35BE6Dd2D143', startBlock: 11464257 },
      { address: '0xf2ED14102ee9D86606Ec24E48e89060ADB6DeFdb', startBlock: 13004076 },
    ],
    seniorInterestRate: '1000000003488077118214104515',
  },
  {
    id: '0x53b2d22d07e069a3b132bfeaad275b10273d381e',
    shortName: 'New Silver 2',
    startBlock: 11288849,
    navFeed: [{ address: '0x41fad1eb242de19da0206b0468763333bb6c2b3d', startBlock: 11288866 }],
    reserve: [
      { address: '0x30FDE788c346aBDdb564110293B20A13cF1464B6', startBlock: 11288965 },
      { address: '0xD9E4391cF31638a8Da718Ff0Bf69249Cdc48fB2B', startBlock: 12283004 },
      { address: '0x1f5Fa2E665609CE4953C65CE532Ac8B47EC97cD5', startBlock: 12702995 },
    ],
    shelf: [{ address: '0x7d057A056939bb96D682336683C10EC89b78D7CE' }],
    pile: [{ address: '0x3eC5c16E7f2C6A80E31997C68D8Fa6ACe089807f' }],
    assessor: [
      { address: '0xdA0bA5Dd06C8BaeC53Fa8ae25Ad4f19088D6375b', startBlock: 11288969 },
      { address: '0x83E2369A33104120746B589Cc90180ed776fFb91', startBlock: 12282961 },
    ],
    seniorInterestRate: '1000000001585489599188229325',
  },
  {
    id: '0x55d86d51ac3bcab7ab7d2124931fba106c8b60c7',
    shortName: 'BT4',
    startBlock: 16047892,
    navFeed: [{ address: '0x60eeba86ce045d54ce625d71a5c2baebfb2e46e9', startBlock: 16047892 }],
    reserve: [{ address: '0xeeaeb5dd73f59b985620ba957c7c1917efcaa36b', startBlock: 16047892 }],
    shelf: [{ address: '0x9ACe0E10D30bee67F096861e36faA984005d2DA3' }],
    pile: [{ address: '0xFE2cC8f110311D9aeB116292687697FD805D9FDB' }],
    assessor: [{ address: '0x3540948a82B7dA7078A635f9c806023bc146eEA0' }],
    seniorInterestRate: '1000000001268391679350583460',
  },
  {
    id: '0x560ac248ce28972083b718778eeb0dbc2de55740',
    shortName: 'Branch Series 3',
    startBlock: 12554323,
    navFeed: [{ address: '0x2cc23f2c2451c55a2f4da389bc1d246e1cf10fc6', startBlock: 12554399 }],
    reserve: [
      { address: '0xE5FDaE082F6E22f25f0382C56cb3c856a803c9dD', startBlock: 12554505 },
      { address: '0xb74c0a7929f5c35e5f4e74b628ee32a35a7535d7', startBlock: 12703246 },
    ],
    shelf: [{ address: '0xeCc564B98f3F50567C3ED0C1E784CbA4f97C6BcD' }],
    pile: [{ address: '0xe17F3c35C18b2Af84ceE2eDed673c6A08A671695' }],
    assessor: [{ address: '0x546F37C27483ffd6deC56076d0F8b4B636C5616B' }],
    seniorInterestRate: '1000000003646626078132927447',
  },
  {
    id: '0x714d520cfac2027834c8af8ffc901855c3ad41ec',
    shortName: 'FactorChain 1',
    startBlock: 12003036,
    navFeed: [{ address: '0x30e3f738f22f5a4671d1252793deb6e657e4b8aa', startBlock: 12003518 }],
    reserve: [{ address: '0x0958c089e6389f2bba2eedd754047265241baf55', startBlock: 12003573 }],
    shelf: [{ address: '0x8868b1e995CBCBaD4D904012D4c2a590510773d8' }],
    pile: [{ address: '0x99D0333f97432fdEfA25B7634520d505e58B131B' }],
    assessor: [{ address: '0xab321CDc90b8882D19c2866b377b450284501219' }],
    seniorInterestRate: '1000000003488077118214104515',
  },
  {
    id: '0x82b8617a16e388256617febba1826093401a3fe5',
    shortName: 'Paperchain 3',
    startBlock: 11458901,
    navFeed: [{ address: '0xc61e65114cbd5508e31fd755a49a817798c132cb', startBlock: 11458986 }],
    reserve: [{ address: '0xb873c152c06be54c704f891e37a7e3b554514964', startBlock: 11459264 }],
    shelf: [{ address: '0x67C1d2552a0cE8572AAfFD0c9664EeA7edbBCeF3' }],
    pile: [{ address: '0x37c8B836eA1b89b7cC4cFdDed4C4fbC454CcC679' }],
    assessor: [{ address: '0x966F53cb928ab361714AF16E301e82fDf01bCbb9' }],
    seniorInterestRate: '1000000002219685438863521055',
  },
  {
    id: '0x90040f96ab8f291b6d43a8972806e977631affde',
    shortName: 'BT3',
    startBlock: 16047729,
    navFeed: [{ address: '0xea5e577df382889497534a0258345e78bbd4e31d', startBlock: 16047729 }],
    reserve: [{ address: '0xb54900bcc0674e356627b58420fd051f2d47b9e9', startBlock: 16047729 }],
    shelf: [{ address: '0xE791898207C129dB963260D6A3b23C8e7B8E31f2' }],
    pile: [{ address: '0x6af9dA8dB1925F8ef359274A59eF01e1c6Df7bE0' }],
    assessor: [{ address: '0xFe37f99cd0597164BFdaBFB7c9f98E4fc44BeF52' }],
    seniorInterestRate: '1000000001268391679350583460',
  },
  {
    id: '0x9de3064f49696a25066252c35ede68850ea33bf8',
    shortName: 'UP Series 1',
    startBlock: 12951444,
    navFeed: [{ address: '0x800aa0dd91374364e3de476d97dca32848cea6c4', startBlock: 12951456 }],
    reserve: [{ address: '0x6942f8779c5c4aa385121a3ee203f2ca1d9d10bc', startBlock: 12951486 }],
    shelf: [{ address: '0xE80C9e9fbaE9868e1D645f9727436afE5381047A' }],
    pile: [{ address: '0xB7d1DE24c0243e6A3eC4De9fAB2B19AB46Fa941F' }],
    assessor: [{ address: '0xdBBa712f10061A3c7619Dc46852d8399F33C9fC7' }],
    seniorInterestRate: '1000000001902587519025875190',
  },
  {
    id: '0xb5c08534d1e73582fbd79e7c45694cad6a5c5ab2',
    shortName: 'BT2',
    startBlock: 16047557,
    navFeed: [{ address: '0xeff42b6d4527a6a2fb429082386b34f5d4050b2c', startBlock: 16047557 }],
    reserve: [{ address: '0x86ade02617911d2bf020b29b3035e6b3d805992d', startBlock: 16047557 }],
    shelf: [{ address: '0x77bd5e87fBdae67C495d17ba268DD9E494983627' }],
    pile: [{ address: '0x611e36809ad4BB94ae6dE889fd4e830Fc21835f7' }],
    assessor: [{ address: '0x03354D4E877aE79Aba6a7955fa7B80aF0A4Ace8d' }],
    seniorInterestRate: '1000000001268391679350583460',
  },
  {
    id: '0xd8486c565098360a24f858088a6d29a380ddf7ec',
    shortName: 'FNO1',
    startBlock: 15460148,
    navFeed: [{ address: '0x9ec3f3a40ba2572a48c8865e4aa89b3ee4ad4915', startBlock: 15460155 }],
    reserve: [{ address: '0xc156aa23a29ef7678b4dec5b812b84797ed21ee0', startBlock: 15460175 }],
    shelf: [{ address: '0x511680e8eD9cA463E5F1776281992de4Aec22039' }],
    pile: [{ address: '0x8f7b701a7309c2Ef5c0Fe850ab7589d5b23a8f76' }],
    assessor: [{ address: '0x28D56f3286c400c16e2aFBBA6989d7BfAA4FCA7c' }],
    seniorInterestRate: '1000000004756468797564687975',
  },
  {
    id: '0xdb3bc9fb1893222d266762e9ff857eb74d75c7d6',
    shortName: 'ConsolFreight 4',
    startBlock: 11063000,
    navFeed: [{ address: '0x69504da6b2cd8320b9a62f3aed410a298d3e7ac6', startBlock: 11063046 }],
    reserve: [
      { address: '0x0d601b451aFD502e473bA4CE6E3876D652BCbee7', startBlock: 11063150 },
      { address: '0xfaec38ffee969cf18e88097ec62e30b70494e234', startBlock: 13004061 },
    ],
    shelf: [{ address: '0xA0B0d8394ADC79f5d1563a892abFc6186E519644' }],
    pile: [{ address: '0x3fC72dA5545E2AB6202D81fbEb1C8273Be95068C' }],
    assessor: [{ address: '0x6aaf2EE5b2B62fb9E29E021a1bF3B381454d900a' }],
    seniorInterestRate: '1000000002536783358701166920',
  },
  {
    id: '0xf96f18f2c70b57ec864cc0c8b828450b82ff63e3',
    shortName: 'ALT 1.0',
    startBlock: 14167745,
    navFeed: [{ address: '0x6fb02533b264d103b84d8f13d11a4865ec96307a', startBlock: 14167760 }],
    reserve: [{ address: '0x35f7de72c8597599ef4f2a18eafd162257301435', startBlock: 14167898 }],
    shelf: [{ address: '0x11daC3fA9d2216377A79Bef04F6A2682630371c3' }],
    pile: [{ address: '0xE18AAB16cC26EB23740D72875e0C6b52cEbb46b3' }],
    assessor: [{ address: '0x623419515a24F2F5d9c9d48cA27969aD107E7a6f' }],
    seniorInterestRate: '1000000002536783358701166920',
  },
  {
    id: '0xfc2950dd337ca8496c18dfc0256fb905a7e7e5c6',
    shortName: 'databased.FINANCE 1',
    startBlock: 11639815,
    navFeed: [{ address: '0x00cd3ae59fdbd375a187bf8074db59edaf766c19', startBlock: 11639830 }],
    reserve: [{ address: '0x729e12cdc0190a2e4ab4401bca4c16132d75adc5', startBlock: 11639877 }],
    shelf: [{ address: '0xC42CfB07bC1140f9A615bD63c4fFAE5F8260Ab22' }],
    pile: [{ address: '0xdB07B21109117208a0317adfbed484C87c9c2aFf' }],
    assessor: [{ address: '0x95bC79d2Aa5147108C285d71CFfB842B7A781a96' }],
    seniorInterestRate: '1000000001585489599188229325',
  },
] as const

export const escrows = {
  // PoolManager Contract Address: Escrow Address
  '0x78E9e622A57f70F1E0Ec652A4931E4e278e58142': '0xd595E1483c507E74E2E6A3dE8e7D08d8f6F74936', //PoolManagerV1 (ETH,BASE)
  '0x91808B5E2F6d7483D41A681034D7c9DbB64B9E29': '0x0000000005F458Fd6ba9EEb5f365D83b7dA913dD', //PoolManagerV2 (ETH)
  '0x5c8657b827a138D52a4e3f03683A28B1FaD86893': '0x1AB6cD0c08120215E241a6108ae7458c995E1694', //PoolManagerV1 (SEPOLIA)
  '0x7f192F34499DdB2bE06c4754CFf2a21c4B056994': '0x0000000005F458Fd6ba9EEb5f365D83b7dA913dD', //PoolManagerV2 (BASE)
  '0xa3Ce97352C1469884EEF3547Ec9362329FE78Cf0': '0x9EDf9FC14DDBEE68CE1a69827b09794367180717', //PoolManager V2 (CELO)
} as const

export const iouCfg = {
  '1': '0xACF3c07BeBd65d5f7d86bc0bc716026A0C523069',
  '11155111': '0xDD1D785F26e547c72CAe501081Deb61a56288204',
} as const
