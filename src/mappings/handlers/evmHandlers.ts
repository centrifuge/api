import { createTrancheTrackerDatasource } from '../../types'
import { errorHandler } from '../../helpers/errorHandler'
import { DeployTrancheLog } from '../../types/abi-interfaces/PoolManagerAbi'
import { TransferLog } from '../../types/abi-interfaces/Erc20Abi'
import { AccountService } from '../services/accountService'
import { PoolService } from '../services/poolService'
import { TrancheService } from '../services/trancheService'
import { InvestorTransactionData, InvestorTransactionService } from '../services/investorTransactionService'
import { CurrencyService } from '../services/currencyService'
import { BlockchainService, LOCAL_CHAIN_ID } from '../services/blockchainService'
import { CurrencyBalanceService } from '../services/currencyBalanceService'
import type { Provider } from '@ethersproject/providers'
import { TrancheBalanceService } from '../services/trancheBalanceService'
import { escrows } from '../../config'
import { InvestorPositionService } from '../services/investorPositionService'
import { getPeriodStart } from '../../helpers/timekeeperService'

const _ethApi = api as unknown as Provider
//const networkPromise = typeof ethApi.getNetwork === 'function' ? ethApi.getNetwork() : null

export const handleEvmDeployTranche = errorHandler(_handleEvmDeployTranche)
async function _handleEvmDeployTranche(event: DeployTrancheLog): Promise<void> {
  const [_poolId, _trancheId, tokenAddress] = event.args
  const poolManagerAddress = event.address

  await BlockchainService.getOrInit(LOCAL_CHAIN_ID)
  const chainId = await getNodeEvmChainId() //(await networkPromise).chainId.toString(10)
  const evmBlockchain = await BlockchainService.getOrInit(chainId)

  const poolId = _poolId.toString()
  const trancheId = _trancheId.substring(0, 34)

  logger.info(
    `Attaching DynamicSource for tranche ${poolId}-${trancheId} token: ${tokenAddress}` +
      ` block: ${event.blockNumber} poolManager: ${poolManagerAddress}`
  )

  const pool = await PoolService.getOrSeed(poolId)
  const tranche = await TrancheService.getOrSeed(pool.id, trancheId)

  const currency = await CurrencyService.getOrInitEvm(evmBlockchain.id, tokenAddress)
  // TODO: fetch escrow from poolManager
  //const poolManager = PoolManagerAbi__factory.connect(poolManagerAddress, ethApi)
  //const escrowAddress = await poolManager.escrow()
  if (!(tokenAddress in escrows)) throw new Error(`Escrow address for token ${tokenAddress} missing in config!`)
  const escrowAddress: string = escrows[tokenAddress]

  // TODO: fetch escrow from investmentManager
  //const investmentManagerAddress = await poolManager.investmentManager()
  //const investmentManager = InvestmentManagerAbi__factory.connect(investmentManagerAddress, ethApi)
  //const userEscrowAddress = await investmentManager.userEscrow()
  //const userEscrowAddress = userEscrows[chainId]

  await currency.initTrancheDetails(
    tranche.poolId,
    tranche.trancheId,
    tokenAddress,
    escrowAddress
  )
  await currency.save()

  await createTrancheTrackerDatasource({ address: tokenAddress })
}
const nullAddress = '0x0000000000000000000000000000000000000000'
const LP_TOKENS_MIGRATION_DATE = '2024-08-07'

export const handleEvmTransfer = errorHandler(_handleEvmTransfer)
async function _handleEvmTransfer(event: TransferLog): Promise<void> {
  const [fromEvmAddress, toEvmAddress, amount] = event.args
  logger.info(`Transfer ${fromEvmAddress}-${toEvmAddress} of ${amount.toString()} at block: ${event.blockNumber}`)

  const timestamp = new Date(Number(event.block.timestamp) * 1000)
  const evmTokenAddress = event.address
  const chainId = await getNodeEvmChainId() //(await networkPromise).chainId.toString(10)
  const evmBlockchain = await BlockchainService.getOrInit(chainId)
  const evmToken = await CurrencyService.getOrInitEvm(evmBlockchain.id, evmTokenAddress)
  const { escrowAddress, userEscrowAddress } = evmToken
  const serviceAddresses = [evmTokenAddress, escrowAddress, userEscrowAddress, nullAddress]

  const isFromUserAddress = !serviceAddresses.includes(fromEvmAddress)
  const isToUserAddress = !serviceAddresses.includes(toEvmAddress)
  const isFromEscrow = fromEvmAddress === escrowAddress
  const _isFromUserEscrow = fromEvmAddress === userEscrowAddress

  const trancheId = evmToken.trancheId.split('-')[1]
  const tranche = await TrancheService.getById(evmToken.poolId, trancheId)

  const orderData: Omit<InvestorTransactionData, 'address'> = {
    poolId: evmToken.poolId,
    trancheId: trancheId,
    hash: event.transactionHash,
    timestamp: timestamp,
    amount: amount.toBigInt(),
    price: tranche.snapshot?.tokenPrice,
  }

  const isLpTokenMigrationDay =
    chainId === '1' && orderData.timestamp.toISOString().startsWith(LP_TOKENS_MIGRATION_DATE)

  let fromAddress: string = null,
    fromAccount: AccountService = null
  if (isFromUserAddress) {
    fromAddress = AccountService.evmToSubstrate(fromEvmAddress, evmBlockchain.id)
    fromAccount = await AccountService.getOrInit(fromAddress)
  }

  let toAddress: string = null,
    toAccount: AccountService = null
  if (isToUserAddress) {
    toAddress = AccountService.evmToSubstrate(toEvmAddress, evmBlockchain.id)
    toAccount = await AccountService.getOrInit(toAddress)
  }

  // Handle Currency Balance Updates
  if (isToUserAddress) {
    const toBalance = await CurrencyBalanceService.getOrInit(toAddress, evmToken.id)
    await toBalance.credit(amount.toBigInt())
    await toBalance.save()
  }

  if (isFromUserAddress) {
    const fromBalance = await CurrencyBalanceService.getOrInit(fromAddress, evmToken.id)
    await fromBalance.debit(amount.toBigInt())
    await fromBalance.save()
  }

  // Handle INVEST_LP_COLLECT
  if (isFromEscrow && isToUserAddress) {
    const investLpCollect = InvestorTransactionService.collectLpInvestOrder({ ...orderData, address: toAccount.id })
    await investLpCollect.save()

    const trancheBalance = await TrancheBalanceService.getOrInit(toAccount.id, orderData.poolId, orderData.trancheId)
    await trancheBalance.investCollect(orderData.amount)
    await trancheBalance.save()
  }
  // TODO: Handle REDEEM_LP_COLLECT
  // if (isFromUserEscrow && isToUserAddress) {
  //   const redeemLpCollect = InvestorTransactionService.collectLpRedeemOrder()
  // }

  // Handle Transfer In and Out
  if (isFromUserAddress && isToUserAddress) {
    await tranche.loadSnapshot(getPeriodStart(timestamp))
    const price = tranche.tokenPrice

    const txIn = InvestorTransactionService.transferIn({ ...orderData, address: toAccount.id, price })
    await txIn.save()
    if (!isLpTokenMigrationDay)
      try {
        await InvestorPositionService.buy(
          txIn.accountId,
          txIn.trancheId,
          txIn.hash,
          txIn.timestamp,
          txIn.tokenAmount,
          txIn.tokenPrice
        )
      } catch (error) {
        logger.error(`Unable to save buy investor position: ${error}`)
        // TODO: Fallback use PoolManager Contract to read price
      }

    const txOut = InvestorTransactionService.transferOut({ ...orderData, address: fromAccount.id, price })
    if (!isLpTokenMigrationDay) {
      try {
        const profit = await InvestorPositionService.sellFifo(
          txOut.accountId,
          txOut.trancheId,
          txOut.tokenAmount,
          txOut.tokenPrice
        )
        await txOut.setRealizedProfitFifo(profit)
      } catch (error) {
        logger.error(`Unable to save sell investor position: ${error}`)
        // TODO: Fallback use PoolManager Contract to read price
      }
    }
    await txOut.save()
  }
}
