/* eslint-disable no-var */
import { ApiPromise } from '@polkadot/api'
import type { Provider } from '@ethersproject/providers'
import { ApiDecoration } from '@polkadot/api/types'
import '@subql/types-core/dist/global'
import { ExtendedCall, ExtendedRpc } from '../helpers/types'
export type ApiAt = ApiDecoration<'promise'> & {
  rpc: ApiPromise['rpc'] & ExtendedRpc
  call: ApiPromise['call'] & ExtendedCall
}
declare global {
  const api: ApiAt & Provider
  const unsafeApi: ApiPromise | undefined
  function getNodeEvmChainId(): Promise<string | undefined>
  var isSubstrateNode: boolean
  var isEvmNode: boolean
}
export {}
