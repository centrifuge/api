import { SubstrateEvent } from '@subql/types'
import { errorHandler, missingPool } from '../../helpers/errorHandler'
import { EpochService } from '../services/epochService'
import { PoolService } from '../services/poolService'
import { TrancheService } from '../services/trancheService'
import { EpochClosedExecutedEvent, PoolCreatedEvent, PoolMetadataSetEvent, PoolUpdatedEvent } from '../../helpers/types'
import { OutstandingOrderService } from '../services/outstandingOrderService'
import { InvestorTransactionService } from '../services/investorTransactionService'
import { CurrencyService, currencyFormatters } from '../services/currencyService'
import { TrancheBalanceService } from '../services/trancheBalanceService'
import { BlockchainService, LOCAL_CHAIN_ID } from '../services/blockchainService'
import { AssetService, ONCHAIN_CASH_ASSET_ID } from '../services/assetService'
import { AssetTransactionData, AssetTransactionService } from '../services/assetTransactionService'
import { statesSnapshotter } from '../../helpers/stateSnapshot'
import { PoolSnapshot } from '../../types'
import { InvestorPositionService } from '../services/investorPositionService'
import { PoolFeeService } from '../services/poolFeeService'
import { assertPropInitialized } from '../../helpers/validation'

export const handlePoolCreated = errorHandler(_handlePoolCreated)
async function _handlePoolCreated(event: SubstrateEvent<PoolCreatedEvent>): Promise<void> {
  const [, , poolId, essence] = event.event.data
  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)

  const formattedCurrency =
    `${LOCAL_CHAIN_ID}-${essence.currency.type}-` +
    `${currencyFormatters[essence.currency.type](essence.currency.value).join('-')}`

  logger.info(
    `Creating Pool ${poolId.toString()} with currency: ${formattedCurrency} ` +
      `in block ${event.block.block.header.number}`
  )

  const blockchain = await BlockchainService.getOrInit(LOCAL_CHAIN_ID)
  const currency = await CurrencyService.getOrInit(
    blockchain.id,
    essence.currency.type,
    ...currencyFormatters[essence.currency.type](essence.currency.value)
  )

  // Initialise Pool
  const pool = await PoolService.getOrSeed(poolId.toString(10), false, false, blockchain.id)
  await pool.init(
    currency.id,
    essence.maxReserve.toBigInt(),
    essence.maxNavAge.toNumber(),
    essence.minEpochTime.toNumber(),
    timestamp,
    event.block.block.header.number.toNumber()
  )
  await pool.initData()
  const poolFeesMetadata = await pool.initIpfsMetadata().catch<ReturnType<typeof pool.initIpfsMetadata>>((err) => {
    logger.error(`IPFS Request failed ${err}`)
    return Promise.resolve([])
  })

  for (const { id: feeId, name } of poolFeesMetadata) {
    const poolFee = await PoolFeeService.getById(pool.id, feeId.toString(10))
    if (!poolFee) throw new Error('poolFee not found!')

    await poolFee.setName(name)
    await poolFee.save()
  }
  await pool.save()

  // Initialise the tranches
  const trancheData = await pool.getTranches()

  const tranches = await Promise.all(
    essence.tranches.map((trancheEssence) => {
      const trancheId = Array.isArray(trancheEssence.currency)
        ? trancheEssence.currency[1].toHex()
        : trancheEssence.currency.trancheId.toHex()
      logger.info(`Creating tranche with id: ${pool.id}-${trancheId}`)
      return TrancheService.getOrSeed(pool.id, trancheId, blockchain.id)
    })
  )

  for (const [index, tranche] of tranches.entries()) {
    await tranche.init(index, trancheData[tranche.trancheId])
    await tranche.updateSupply()
    await tranche.save()

    const currency = await CurrencyService.getOrInit(blockchain.id, 'Tranche', pool.id, tranche.trancheId)
    await currency.initTrancheDetails(pool.id, tranche.trancheId)
    await currency.save()
  }

  // Initialise Epoch
  assertPropInitialized(pool, 'currentEpoch', 'number')
  const trancheIds = tranches.map((tranche) => tranche.trancheId)
  const epoch = await EpochService.init(pool.id, pool.currentEpoch!, trancheIds, timestamp)
  await epoch.saveWithStates()

  const onChainCashAsset = AssetService.initOnchainCash(pool.id, timestamp)
  await onChainCashAsset.save()
  logger.info(`Pool ${pool.id} successfully created!`)
}

export const handlePoolUpdated = errorHandler(_handlePoolUpdated)
async function _handlePoolUpdated(event: SubstrateEvent<PoolUpdatedEvent>): Promise<void> {
  const [poolId] = event.event.data
  logger.info(`Pool ${poolId.toString()} updated on block ${event.block.block.header.number}`)

  const blockchain = await BlockchainService.getOrInit(LOCAL_CHAIN_ID)
  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  await pool.initData()
  await pool.initIpfsMetadata()
  await pool.save()

  // Deactivate active tranches
  const activeTranches = await TrancheService.getActivesByPoolId(poolId.toString())
  for (const activeTranche of activeTranches) {
    await activeTranche.deactivate()
    await activeTranche.save()
  }

  // Reprocess tranches
  const tranches = await pool.getTranches()
  for (const [id, tranche] of Object.entries(tranches)) {
    logger.info(`Syncing tranche with id: ${id}`)
    const trancheService = await TrancheService.getOrSeed(poolId.toString(), id)
    trancheService.init(tranche.index, tranche)
    await trancheService.activate()
    await trancheService.updateSupply()
    await trancheService.updateDebt(tranche.debt)
    await trancheService.save()

    const currency = await CurrencyService.getOrInit(blockchain.id, 'Tranche', pool.id, trancheService.trancheId)
    await currency.initTrancheDetails(pool.id, trancheService.trancheId)
    await currency.save()
  }
  logger.info(`Pool ${pool.id} successfully updated!`)
}

export const handleMetadataSet = errorHandler(_handleMetadataSet)
async function _handleMetadataSet(event: SubstrateEvent<PoolMetadataSetEvent>) {
  const [poolId, metadata] = event.event.data
  logger.info(`Pool metadata set for pool ${poolId.toString(10)}`)
  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool
  await pool.updateMetadata(metadata.toUtf8())
  await pool.initIpfsMetadata()
  await pool.save()
}

export const handleEpochClosed = errorHandler(_handleEpochClosed)
async function _handleEpochClosed(event: SubstrateEvent<EpochClosedExecutedEvent>): Promise<void> {
  const [poolId, epochId] = event.event.data
  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)
  logger.info(
    `Epoch ${epochId.toNumber()} closed for pool ${poolId.toString()} in block ${event.block.block.header.number}`
  )
  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  // Close the current epoch and open a new one
  const tranches = await TrancheService.getActivesByPoolId(poolId.toString())
  const epoch = await EpochService.getById(poolId.toString(), epochId.toNumber())
  if (!epoch) throw new Error(`Epoch ${epochId.toString(10)} not found for pool ${poolId.toString(10)}`)
  await epoch.closeEpoch(timestamp)
  await epoch.saveWithStates()

  const trancheIds = tranches.map((tranche) => tranche.trancheId)
  const nextEpoch = await EpochService.init(poolId.toString(), epochId.toNumber() + 1, trancheIds, timestamp)
  await nextEpoch.saveWithStates()

  await pool.closeEpoch(epochId.toNumber())
  await pool.save()
}

export const handleEpochExecuted = errorHandler(_handleEpochExecuted)
async function _handleEpochExecuted(event: SubstrateEvent<EpochClosedExecutedEvent>): Promise<void> {
  const [poolId, epochId] = event.event.data
  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)
  logger.info(
    `Epoch ${epochId.toString()} executed event for pool ${poolId.toString()} ` +
      `at block ${event.block.block.header.number.toString()} wit hash ${event.block.hash.toHex()}`
  )

  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  const epoch = await EpochService.getById(poolId.toString(), epochId.toNumber())
  if (!epoch) throw new Error(`Epoch ${epochId.toString(10)} not found for pool ${poolId.toString(10)}`)

  await epoch.executeEpoch(timestamp)
  await epoch.saveWithStates()

  await pool.executeEpoch(epochId.toNumber())
  await pool.increaseInvestments(epoch.sumInvestedAmount!)
  await pool.increaseRedemptions(epoch.sumRedeemedAmount!)
  await pool.save()

  // Compute and save aggregated order fulfillment
  const tranches = await TrancheService.getByPoolId(poolId.toString())
  const nextEpoch = await EpochService.getById(poolId.toString(), epochId.toNumber() + 1)
  if (!nextEpoch) throw new Error(`Epoch ${epochId.toNumber() + 1} not found for pool ${poolId.toString(10)}`)
  for (const tranche of tranches) {
    const epochState = epoch.getStates().find((epochState) => epochState.trancheId === tranche.trancheId)
    if (!epochState) throw new Error('EpochState not found!')
    await tranche.updateSupply()
    await tranche.updatePrice(epochState.tokenPrice!, event.block.block.header.number.toNumber())
    await tranche.updateFulfilledInvestOrders(epochState.sumFulfilledInvestOrders!)
    await tranche.updateFulfilledRedeemOrders(epochState.sumFulfilledRedeemOrders!)
    await tranche.save()

    // Carry over aggregated unfulfilled orders to next epoch
    await nextEpoch.updateOutstandingInvestOrders(
      tranche.trancheId,
      epochState.sumOutstandingInvestOrders! - epochState.sumFulfilledInvestOrders!,
      BigInt(0)
    )
    await nextEpoch.updateOutstandingRedeemOrders(
      tranche.trancheId,
      epochState.sumOutstandingRedeemOrders! - epochState.sumFulfilledRedeemOrders!,
      BigInt(0),
      epochState.tokenPrice!
    )

    // Find single outstanding orders posted for this tranche and fulfill them to investorTransactions
    const oos = await OutstandingOrderService.getAllByTrancheId(poolId.toString(), tranche.trancheId)
    logger.info(`Fulfilling ${oos.length} outstanding orders for tranche ${tranche.trancheId}`)
    for (const oo of oos) {
      logger.info(`Outstanding invest before fulfillment: ${oo.investAmount} redeem:${oo.redeemAmount}`)
      const orderData = {
        poolId: poolId.toString(),
        trancheId: tranche.trancheId,
        epochNumber: epochId.toNumber(),
        address: oo.accountId,
        hash: oo.hash,
        price: epochState.tokenPrice,
        fee: BigInt(0),
        timestamp,
      }

      const trancheBalance = await TrancheBalanceService.getOrInit(
        orderData.address,
        orderData.poolId,
        orderData.trancheId,
        timestamp
      )

      if (oo.investAmount > BigInt(0) && epochState.investFulfillmentPercentage! > BigInt(0)) {
        const it = InvestorTransactionService.executeInvestOrder({
          ...orderData,
          amount: oo.investAmount,
          fulfillmentPercentage: epochState.investFulfillmentPercentage,
        })
        await it.save()
        await oo.updateUnfulfilledInvest(it.currencyAmount!)
        await trancheBalance.investExecute(it.currencyAmount!, it.tokenAmount!)

        await InvestorPositionService.buy(
          it.accountId,
          it.trancheId,
          it.hash,
          it.timestamp,
          it.tokenAmount!,
          it.tokenPrice!
        )
      }

      if (oo.redeemAmount > BigInt(0) && epochState.redeemFulfillmentPercentage! > BigInt(0)) {
        const it = InvestorTransactionService.executeRedeemOrder({
          ...orderData,
          amount: oo.redeemAmount,
          fulfillmentPercentage: epochState.redeemFulfillmentPercentage,
        })
        await oo.updateUnfulfilledRedeem(it.tokenAmount!)
        await trancheBalance.redeemExecute(it.tokenAmount!, it.currencyAmount!)

        const profit = await InvestorPositionService.sellFifo(
          it.accountId,
          it.trancheId,
          it.tokenAmount!,
          it.tokenPrice!
        )
        await it.setRealizedProfitFifo(profit)
        await it.save()
      }

      await trancheBalance.save()

      // Remove outstandingOrder if completely fulfilled
      if (oo.investAmount > BigInt(0) || oo.redeemAmount > BigInt(0)) {
        await oo.save()
      } else {
        await OutstandingOrderService.remove(oo.id)
      }
      logger.info(`Outstanding invest after fulfillment: ${oo.investAmount} redeem:${oo.redeemAmount}`)
    }
  }
  await nextEpoch.saveWithStates()

  // Track investments and redemptions for onchain cash
  if (!event.extrinsic) throw new Error('Event has no extrinsic')
  const onChainCashAsset = await AssetService.getById(pool.id, ONCHAIN_CASH_ASSET_ID)
  if (!onChainCashAsset) throw new Error(`OnChain Asset not found for ${pool.id}`)
  const txData: Omit<AssetTransactionData, 'amount'> = {
    poolId: pool.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp: timestamp,
    assetId: ONCHAIN_CASH_ASSET_ID,
  }
  const assetTransactionSaves: Array<Promise<void>> = []
  if (epoch.sumInvestedAmount! > BigInt(0)) {
    const deposit = AssetTransactionService.depositFromInvestments({ ...txData, amount: epoch.sumInvestedAmount })
    assetTransactionSaves.push(deposit.save())
  }

  if (epoch.sumRedeemedAmount! > BigInt(0)) {
    const withdrawalRedemptions = await AssetTransactionService.withdrawalForRedemptions({
      ...txData,
      amount: epoch.sumRedeemedAmount,
    })
    assetTransactionSaves.push(withdrawalRedemptions.save())
  } else {
    logger.info(`No withdrawal redemptions for pool ${pool.id}`)
  }

  if (epoch.sumPoolFeesPaidAmount! > BigInt(0)) {
    const withdrawalFees = await AssetTransactionService.withdrawalForFees({
      ...txData,
      amount: epoch.sumPoolFeesPaidAmount,
    })
    assetTransactionSaves.push(withdrawalFees.save())
  } else {
    logger.info(`No withdrawal for fees for pool ${pool.id}`)
  }

  await Promise.all(assetTransactionSaves)

  await statesSnapshotter(
    'epochId',
    epoch.id,
    [pool],
    PoolSnapshot,
    { timestamp, number: event.block.block.header.number.toNumber() },
    'poolId',
    false
  )
}
