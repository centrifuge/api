import { Account } from '../../types/models/Account'
import { BlockchainService, LOCAL_CHAIN_ID } from './blockchainService'
import { u64 } from '@polkadot/types'

const EVM_SUFFIX = '45564d00'

export class AccountService extends Account {
  static async init(address: string) {
    if (await this.isForeignEvm(address)) {
      const chainId = this.readEvmChainId(address)
      logger.info(`Initialising new account: ${address} as foreign for chainId: ${chainId}`)
      const account = new this(address, chainId)
      account.evmAddress = address.substring(0, 42)
      return account
    } else {
      logger.info(`Initialising new account: ${address} on local chainId: ${LOCAL_CHAIN_ID}`)
      const account = new this(address, LOCAL_CHAIN_ID)
      if (this.isEvm(address)) account.evmAddress = address.substring(0, 42)
      return account
    }
  }

  static async getOrInit(address: string, blockchainService = BlockchainService): Promise<AccountService> {
    let account = await this.get(address)
    if (!account) {
      account = await this.init(address)
      await blockchainService.getOrInit(account.chainId)
      await account.save()
    }
    return account as AccountService
  }

  static evmToSubstrate(evmAddress: string, chainId: string) {
    const chainHex = parseInt(chainId, 10).toString(16).padStart(4, '0')
    return `0x${evmAddress.substring(2).toLowerCase()}000000000000${chainHex}${EVM_SUFFIX}`
  }

  static readEvmChainId(address: string) {
    return parseInt(address.slice(-14, -8), 16).toString(10)
  }

  static isEvm(address: string) {
    return address.length === 68 && address.endsWith(EVM_SUFFIX)
  }

  static async isForeignEvm(address: string) {
    if (isSubstrateNode) {
      const nodeEvmChainId = await getSubstrateEvmChainId()
      return this.isEvm(address) && this.readEvmChainId(address) !== nodeEvmChainId
    } else {
      return this.isEvm(address)
    }
  }

  public isForeignEvm() {
    return this.chainId !== LOCAL_CHAIN_ID
  }

  public isEvm() {
    return AccountService.isEvm(this.id)
  }
}

async function getSubstrateEvmChainId() {
  return ((await api.query.evmChainId.chainId()) as u64).toString(10)
}
