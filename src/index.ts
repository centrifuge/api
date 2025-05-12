import '@polkadot/api-augment'
import { atob } from 'abab'
import fetch from 'node-fetch'
import type { Provider } from '@ethersproject/providers'

const isSubstrateNode = 'query' in api
const isEvmNode = typeof (api as Provider).getNetwork === 'function'

global.isSubstrateNode = chainId.startsWith('0x')
global.isEvmNode = !chainId.startsWith('0x')
global.fetch = fetch as unknown as typeof global.fetch
global.atob = atob as typeof global.atob

if (isSubstrateNode) logger.info('Substrate node detected with chainId: 0')
if (isEvmNode) logger.info(`EVM node detected with chainId: ${chainId}`)

export * from './mappings/handlers/blockHandlers'
export * from './mappings/handlers/poolsHandlers'
export * from './mappings/handlers/investmentsHandlers'
export * from './mappings/handlers/loansHandlers'
export * from './mappings/handlers/proxyHandlers'
export * from './mappings/handlers/ormlTokensHandlers'
export * from './mappings/handlers/logHandlers'
export * from './mappings/handlers/evmHandlers'
export * from './mappings/handlers/ethHandlers'
export * from './mappings/handlers/poolFeesHandlers'
export * from './mappings/handlers/oracleHandlers'
export * from './mappings/handlers/uniquesHandlers'
export * from './mappings/handlers/remarkHandlers'
export * from './mappings/handlers/migrationHandlers'
