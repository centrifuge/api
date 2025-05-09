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
import { TrancheBalanceService } from '../services/trancheBalanceService'
import { escrows, iouCfg } from '../../config'
import { InvestorPositionService } from '../services/investorPositionService'
import { getPeriodStart } from '../../helpers/timekeeperService'
import { MigrationService } from '../services/migrationService'

const nullAddress = '0x0000000000000000000000000000000000000000'
const LP_TOKENS_MIGRATION_DATE = '2024-08-07'

export const handleEvmDeployTranche = errorHandler(_handleEvmDeployTranche)
async function _handleEvmDeployTranche(event: DeployTrancheLog): Promise<void> {
  if (!event.args) throw new Error('Missing event arguments')
  const [_poolId, _trancheId, tokenAddress] = event.args
  const poolManagerAddress = event.address

  const chainId = await getNodeEvmChainId()
  if (!chainId) throw new Error('Unable to retrieve chainId')
  await BlockchainService.getOrInit(LOCAL_CHAIN_ID)
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
  if (!(poolManagerAddress in escrows))
    throw new Error(`Escrow address for PoolManager ${poolManagerAddress} missing in config!`)
  const escrowAddress: string = escrows[poolManagerAddress as keyof typeof escrows]

  await currency.initTrancheDetails(tranche.poolId, tranche.trancheId, tokenAddress, escrowAddress)
  await currency.save()

  await createTrancheTrackerDatasource({ address: tokenAddress })
}

export const handleEvmTransfer = errorHandler(_handleEvmTransfer)
async function _handleEvmTransfer(event: TransferLog): Promise<void> {
  if (!event.args) throw new Error('Missing event arguments')
  const [fromEvmAddress, toEvmAddress, amount] = event.args
  logger.info(
    `Tranche token transfer ${fromEvmAddress}-${toEvmAddress} of ${amount.toString()} at block: ${event.blockNumber}`
  )

  const timestamp = new Date(Number(event.block.timestamp) * 1000)
  const evmTokenAddress = event.address
  const chainId = await getNodeEvmChainId()
  if (!chainId) throw new Error('Unable to retrieve chainId')
  const evmBlockchain = await BlockchainService.getOrInit(chainId)
  const evmToken = await CurrencyService.getOrInitEvm(evmBlockchain.id, evmTokenAddress)
  const { escrowAddress, userEscrowAddress } = evmToken
  const serviceAddresses = [evmTokenAddress, escrowAddress, userEscrowAddress, nullAddress]

  const isFromUserAddress = !serviceAddresses.includes(fromEvmAddress)
  const isToUserAddress = !serviceAddresses.includes(toEvmAddress)
  const isFromEscrow = fromEvmAddress === escrowAddress
  const _isFromUserEscrow = fromEvmAddress === userEscrowAddress

  if (!evmToken.poolId || !evmToken.trancheId) throw new Error('This is not a tranche token')
  const pool = await PoolService.getById(evmToken.poolId)
  if (!pool) throw new Error('Pool not found!')
  const trancheId = evmToken.trancheId.split('-')[1]
  const tranche = await TrancheService.getById(pool.id, trancheId)
  if (!tranche) throw new Error('Tranche not found!')

  const orderData: Omit<InvestorTransactionData, 'address'> = {
    poolId: pool.id,
    trancheId: trancheId,
    hash: event.transactionHash,
    timestamp: timestamp,
    amount: amount.toBigInt(),
    price: tranche.snapshot?.tokenPrice,
  }

  const isLpTokenMigrationDay =
    chainId === '1' && orderData.timestamp.toISOString().startsWith(LP_TOKENS_MIGRATION_DATE)

  let fromAddress: string, fromAccount: AccountService
  if (isFromUserAddress) {
    fromAddress = AccountService.evmToSubstrate(fromEvmAddress, evmBlockchain.id)
    fromAccount = await AccountService.getOrInit(fromAddress)
  }

  let toAddress: string, toAccount: AccountService
  if (isToUserAddress) {
    toAddress = AccountService.evmToSubstrate(toEvmAddress, evmBlockchain.id)
    toAccount = await AccountService.getOrInit(toAddress)
  }

  // Handle Currency Balance Updates
  if (isToUserAddress) {
    const toBalance = await CurrencyBalanceService.getOrInit(toAddress!, evmToken.id)
    await toBalance.credit(amount.toBigInt())
    await toBalance.save()
  }

  if (isFromUserAddress) {
    const fromBalance = await CurrencyBalanceService.getOrInit(fromAddress!, evmToken.id)
    await fromBalance.debit(amount.toBigInt())
    await fromBalance.save()
  }

  // Handle INVEST_LP_COLLECT
  if (isFromEscrow && isToUserAddress) {
    const investLpCollect = InvestorTransactionService.collectLpInvestOrder({ ...orderData, address: toAccount!.id })
    await investLpCollect.save()

    const trancheBalance = await TrancheBalanceService.getOrInit(
      toAccount!.id,
      orderData.poolId,
      orderData.trancheId,
      timestamp
    )
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

    const txIn = InvestorTransactionService.transferIn({ ...orderData, address: toAccount!.id, price })
    await txIn.save()
    if (!isLpTokenMigrationDay)
      try {
        await InvestorPositionService.buy(
          txIn.accountId,
          txIn.trancheId,
          txIn.hash,
          txIn.timestamp,
          txIn.tokenAmount!,
          txIn.tokenPrice!
        )
      } catch (error) {
        logger.error(`Unable to save buy investor position: ${error}`)
        // TODO: Fallback use PoolManager Contract to read price
      }

    const txOut = InvestorTransactionService.transferOut({ ...orderData, address: fromAccount!.id, price })
    if (!isLpTokenMigrationDay) {
      try {
        const profit = await InvestorPositionService.sellFifo(
          txOut.accountId,
          txOut.trancheId,
          txOut.tokenAmount!,
          txOut.tokenPrice!
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

export const handleCfgTransfer = errorHandler(_handleCfgTransfer)
async function _handleCfgTransfer(event: TransferLog): Promise<void> {
  if (!event.args) throw new Error('Missing event arguments')
  const [fromEvmAddress, toEvmAddress, _amount] = event.args
  const receiverAddress = AccountService.evmToSubstrate(toEvmAddress, chainId)
  const amount = _amount.toBigInt()
  const timestamp = new Date(Number(event.block.timestamp) * 1000)

  if (fromEvmAddress !== nullAddress) return
  logger.info(
    `CFG migration received event for receiver ${receiverAddress} ` +
      `with amount ${amount.toString()} at block: ${event.blockNumber}`
  )
  const receiverAccount = await AccountService.getOrInit(receiverAddress)
  await MigrationService.received(event.transactionHash, timestamp, receiverAccount.id, amount)
}

export const handleWcfgTransfer = errorHandler(_handleWcfgTransfer)
async function _handleWcfgTransfer(event: TransferLog): Promise<void> {
  if (!event.args) throw new Error('Missing event arguments')
  const [fromEvmAddress, toEvmAddress, _amount] = event.args
  const senderAddress = AccountService.evmToSubstrate(fromEvmAddress, chainId)
  const amount = _amount.toBigInt()
  const timestamp = new Date(Number(event.block.timestamp) * 1000)
  if (toEvmAddress === iouCfg[chainId as keyof typeof iouCfg] && fromEvmAddress !== nullAddress) {
    logger.info(
      `wCFG migration sent event for ${senderAddress} to ${senderAddress} ` +
        `with amount ${amount.toString()} at block: ${event.blockNumber} and timestamp: ${timestamp}`
    )
    const senderAccount = await AccountService.getOrInit(senderAddress)
    await MigrationService.sent(event.transactionHash, timestamp, senderAccount.id, amount, senderAddress)
  }
}
