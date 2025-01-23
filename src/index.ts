import '@polkadot/api-augment'
import { atob } from 'abab'
import fetch from 'node-fetch'
import type { u64 } from '@polkadot/types'
import type { Provider } from '@ethersproject/providers'

const isSubstrateNode = 'query' in api
const isEvmNode = typeof (api as Provider).getNetwork === 'function'
const ethNetworkProm = isEvmNode ? (api as Provider).getNetwork() : null

global.isSubstrateNode = isSubstrateNode
global.isEvmNode = isEvmNode
global.fetch = fetch as unknown as typeof global.fetch
global.atob = atob as typeof global.atob
global.getNodeEvmChainId = async function () {
  if (isSubstrateNode) return ((await api.query.evmChainId.chainId()) as u64).toString(10)
  if (isEvmNode) return (await ethNetworkProm)?.chainId.toString(10)
}

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
