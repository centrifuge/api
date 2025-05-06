import { SubstrateBlock } from '@subql/types'
import { getPeriodStart, TimekeeperService } from '../../helpers/timekeeperService'
import { errorHandler } from '../../helpers/errorHandler'
import { statesSnapshotter } from '../../helpers/stateSnapshot'
import { SNAPSHOT_INTERVAL_SECONDS } from '../../config'
import { PoolService } from '../services/poolService'
import { TrancheService } from '../services/trancheService'
import { AssetService } from '../services/assetService'
import { PoolFeeService } from '../services/poolFeeService'
import { PoolFeeTransactionService } from '../services/poolFeeTransactionService'
import { AssetSnapshot, PoolFeeSnapshot, PoolSnapshot, TrancheSnapshot } from '../../types/models'
import { AssetPositionService } from '../services/assetPositionService'
import { EpochService } from '../services/epochService'
import { SnapshotPeriodService } from '../services/snapshotPeriodService'
import { TrancheBalanceService } from '../services/trancheBalanceService'
import { InvestorPositionService } from '../services/investorPositionService'
import { CurrencyService } from '../services/currencyService'
import { BlockchainService, LOCAL_CHAIN_ID } from '../services/blockchainService'

const timekeeper = TimekeeperService.init()

export const handleBlock = errorHandler(_handleBlock)
async function _handleBlock(block: SubstrateBlock): Promise<void> {
  if (!block.timestamp) throw new Error('Missing block timestamp')

  const blockPeriodStart = getPeriodStart(block.timestamp)
  const blockNumber = block.block.header.number.toNumber()
  const isNewPeriod = (await timekeeper).processBlock(block.timestamp)

  if (!isNewPeriod) return

  const specVersion = api.runtimeVersion.specVersion.toNumber()
  logger.info(
    `# It's a new period on block ${blockNumber}: ${block.timestamp.toISOString()} (specVersion: ${specVersion})`
  )
  const _blockchain = BlockchainService.getOrInit(LOCAL_CHAIN_ID)
  const period = SnapshotPeriodService.init(blockPeriodStart)
  await period.save()

  const lastPeriodStart = new Date(period.start.valueOf() - SNAPSHOT_INTERVAL_SECONDS * 1000)
  const daysAgo7 = new Date(period.start.valueOf() - 7 * 24 * 3600 * 1000)
  const daysAgo30 = new Date(period.start.valueOf() - 30 * 24 * 3600 * 1000)
  const daysAgo90 = new Date(period.start.valueOf() - 90 * 24 * 3600 * 1000)
  const beginningOfMonth = new Date(period.year, period.month, 1)
  const quarter = Math.floor(period.month / 3)
  const beginningOfQuarter = new Date(period.year, quarter * 3, 1)
  const beginningOfYear = new Date(period.year, 0, 1)

  const poolsToSnapshot: PoolService[] = []
  const tranchesToSnapshot: TrancheService[] = []
  const assetsToSnapshot: AssetService[] = []
  const poolFeesToSnapshot: PoolFeeService[] = []

  // Update Pool States
  const pools = await PoolService.getCfgActivePools()
  for (const pool of pools) {
    logger.info(` ## Updating pool ${pool.id} states...`)
    if (!pool.currencyId) {
      logger.error(`Pool currencyId not set for ${pool.id}, skipping...`)
      continue
    }
    const [chainId, currencyType, currencyValue] = pool.currencyId.split('-')
    const currency = await CurrencyService.getOrInit(chainId, currencyType, currencyValue)

    if (!pool.currentEpoch) {
      logger.error(`Pool currentEpoch not set for ${pool.id}, skipping...`)
      continue
    }

    const currentEpoch = await EpochService.getById(pool.id, pool.currentEpoch)
    if (!currentEpoch) {
      logger.error(`Current epoch ${pool.currentEpoch} for pool ${pool.id} not found, skipping pool`)
      continue
    }

    await pool.updateState()
    await pool.resetDebtOverdue()

    // Update tranche states
    const tranches = await TrancheService.getActivesByPoolId(pool.id)
    const trancheData = await pool.getTranches()
    const trancheTokenPrices = await pool.getTrancheTokenPrices()
    for (const tranche of tranches) {
      if (typeof tranche.index !== 'number') {
        logger.error('Tranche index not set, skipping tranche')
        continue
      }
      if (!trancheTokenPrices) {
        logger.error('trancheTokenPrices not available, skipping tranche updates')
        break
      }
      await tranche.updatePrice(trancheTokenPrices[tranche.index].toBigInt(), block.block.header.number.toNumber())
      await tranche.updateSupply()
      await tranche.updateDebt(trancheData[tranche.trancheId].debt)
      await tranche.computeYield('yieldSinceLastPeriod', lastPeriodStart)
      await tranche.computeYield('yieldSinceInception')
      await tranche.computeYield('yieldYTD', beginningOfYear)
      await tranche.computeYield('yieldQTD', beginningOfQuarter)
      await tranche.computeYield('yieldMTD', beginningOfMonth)
      await tranche.computeYieldAnnualized('yield7DaysAnnualized', period.start, daysAgo7)
      await tranche.computeYieldAnnualized('yield30DaysAnnualized', period.start, daysAgo30)
      await tranche.computeYieldAnnualized('yield90DaysAnnualized', period.start, daysAgo90)
      await tranche.save()
      tranchesToSnapshot.push(tranche)

      // Compute TrancheBalances Unrealized Profit
      const trancheBalances = (await TrancheBalanceService.getByTrancheId(tranche.id, {
        limit: 100,
      })) as TrancheBalanceService[]
      for (const trancheBalance of trancheBalances) {
        if (typeof tranche.tokenPrice !== 'bigint') {
          console.warn(`tokenPrice not set, unable to update unrealizedProfit for trancheBalance ${trancheBalance.id}`)
          continue
        }
        const unrealizedProfit = await InvestorPositionService.computeUnrealizedProfitAtPrice(
          trancheBalance.accountId,
          tranche.id,
          tranche.tokenPrice
        )
        await trancheBalance.updateUnrealizedProfit(unrealizedProfit)
        await trancheBalance.save()
      }
    }
    // Asset operations
    logger.info(` ## Updating assets for pool ${pool.id}...`)
    const activeAssetData = await pool.getPortfolio()
    pool.resetOffchainCashValue()
    pool.resetUnrealizedProfit()
    for (const [assetId, assetData] of Object.entries(activeAssetData)) {
      const asset = await AssetService.getById(pool.id, assetId)
      if (!asset) continue
      await asset.loadSnapshot(lastPeriodStart)
      await asset.updateActiveAssetData(assetData)
      if (asset.notional && asset.currentPrice) {
        await asset.updateUnrealizedProfit(
          await AssetPositionService.computeUnrealizedProfitAtPrice(asset.id, asset.currentPrice),
          await AssetPositionService.computeUnrealizedProfitAtPrice(asset.id, asset.notional)
        )
      } else {
        console.warn(`Missing current price or notional, unable to update unrealized profit for asset ${assetId}`)
      }
      await asset.save()
      assetsToSnapshot.push(asset)

      if (typeof asset.interestAccruedByPeriod === 'bigint') {
        await pool.increaseInterestAccrued(asset.interestAccruedByPeriod)
      } else {
        logger.warn(`interestAccruedByPeriod not set, unable to compute accrued interest for asset ${assetId}`)
      }
      if (asset.isNonCash()) {
        if (
          typeof asset.unrealizedProfitAtMarketPrice === 'bigint' &&
          typeof asset.unrealizedProfitAtNotional === 'bigint' &&
          typeof asset.unrealizedProfitByPeriod === 'bigint'
        ) {
          pool.increaseUnrealizedProfit(
            asset.unrealizedProfitAtMarketPrice,
            asset.unrealizedProfitAtNotional,
            asset.unrealizedProfitByPeriod
          )
        } else {
          logger.warn(`Missing unrealized profit figures, unable to increase unrealized profit for asset ${assetId}`)
        }
      }
      if (asset.isBeyondMaturity(block.timestamp)) {
        if (typeof asset.outstandingDebt === 'bigint') {
          pool.increaseDebtOverdue(asset.outstandingDebt)
        } else {
          logger.warn(`Unable to increase debt overdue, missing outstandingDebt for ${assetId}`)
        }
      }
      if (asset.isOffchainCash()) {
        if (typeof asset.presentValue === 'bigint') {
          pool.increaseOffchainCashValue(asset.presentValue)
        } else {
          logger.warn(`Asset present value not set, unable to increase offchain cash value for ${assetId}`)
        }
      }
    }
    await pool.updateNumberOfActiveAssets(BigInt(Object.keys(activeAssetData).length))

    // NAV update requires updated offchain cash value
    if (currency) {
      await pool.updateNAV(currency.decimals)
    } else {
      logger.warn(`Cannot update NAV for pool ${pool.id} as NO currency found / initialised`)
    }
    logger.info(` ## Pool ${pool.id} assets update completed!`)

    //PoolFees operations
    logger.info(` ## Updating poolFees for pool ${pool.id}...`)
    const poolFees = await PoolFeeService.getActives(pool.id)
    const accruedFees = await pool.getAccruedFees()
    for (const accruals of accruedFees) {
      const [feeId, pending, disbursement] = accruals
      const poolFee = poolFees.find((fee) => fee.id === `${pool.id}-${feeId}`)
      if (!poolFee) {
        logger.error(`Unable to retrieve PoolFee ${pool.id}-${feeId}, skipping accruals!`)
        continue
      }
      await poolFee.updateAccruals(pending, disbursement)
      await poolFee.save()
      poolFeesToSnapshot.push(poolFee)

      if (typeof poolFee.sumAccruedAmountByPeriod === 'bigint') {
        await pool.increaseAccruedFees(poolFee.sumAccruedAmountByPeriod)
        const poolFeeTransaction = PoolFeeTransactionService.accrue({
          poolId: pool.id,
          feeId,
          blockNumber,
          amount: poolFee.sumAccruedAmountByPeriod,
          epochId: currentEpoch.id,
          hash: block.hash.toHex(),
          timestamp: block.timestamp,
        })
        await poolFeeTransaction.save()
      } else {
        logger.warn(`sumAccruedAmountByPeriod not set. unable to increase accrued fees for ${poolFee.id}`)
      }
    }
    const sumPoolFeesPendingAmount = await PoolFeeService.computeSumPendingFees(poolFees)
    await pool.updateSumPoolFeesPendingAmount(sumPoolFeesPendingAmount)
    logger.info(` ## Pool ${pool.id} poolFees update completed!`)

    await pool.save()
    poolsToSnapshot.push(pool)
    logger.info(`## Pool ${pool.id} states update completed!`)
  }

  logger.info('## Performing snapshots...')
  const blockInfo = { number: block.block.header.number.toNumber(), timestamp: block.timestamp }
  await statesSnapshotter('periodId', period.id, poolsToSnapshot, PoolSnapshot, blockInfo, 'poolId')
  await statesSnapshotter('periodId', period.id, tranchesToSnapshot, TrancheSnapshot, blockInfo, 'trancheId')
  await statesSnapshotter('periodId', period.id, assetsToSnapshot, AssetSnapshot, blockInfo, 'assetId')
  await statesSnapshotter('periodId', period.id, poolFeesToSnapshot, PoolFeeSnapshot, blockInfo, 'poolFeeId')
  logger.info('## Snapshotting completed!')

  //Update tracking of period and continue
  await (await timekeeper).update(period.start)
}
