import { Option, u128, Vec } from '@polkadot/types'
import { paginatedGetter } from '../../helpers/paginatedGetter'
import type {
  NavDetails,
  PoolDetails,
  PoolFeesList,
  PoolMetadata,
  TrancheCurrency,
  TrancheCurrencyBefore1400,
  TrancheDetails,
} from '../../helpers/types'
import { Pool } from '../../types'
import { cid, readIpfs } from '../../helpers/ipfsFetch'
import { EpochService } from './epochService'
import { WAD_DIGITS } from '../../config'
import { assertPropInitialized } from '../../helpers/validation'

export class PoolService extends Pool {
  static seed(poolId: string, blockchain = '0') {
    logger.info(`Seeding pool ${poolId}`)
    return new this(`${poolId}`, blockchain, 'ALL', false)
  }

  static async getOrSeed(
    poolId: string,
    saveSeed = true,
    seedEpoch = false,
    blockchain = '0',
    epochService = EpochService
  ) {
    let pool = await this.getById(poolId)
    if (!pool) {
      pool = this.seed(poolId, blockchain)
      if (saveSeed) {
        if (seedEpoch) pool.currentEpoch = 1
        await pool.save()
        if (seedEpoch) {
          const epoch = epochService.seed(poolId, 1)
          await epoch.save()
        }
      }
    }
    return pool
  }

  public init(
    currencyId: string,
    maxReserve: bigint,
    maxPortfolioValuationAge: number,
    minEpochTime: number,
    timestamp: Date,
    blockNumber: number
  ) {
    logger.info(`Initialising pool ${this.id}`)
    this.isActive = true
    this.createdAt = timestamp
    this.createdAtBlockNumber = blockNumber

    this.minEpochTime = minEpochTime
    this.maxPortfolioValuationAge = maxPortfolioValuationAge

    this.currentEpoch = 1

    this.normalizedNAV = BigInt(0)

    this.netAssetValue = BigInt(0)
    this.totalReserve = BigInt(0)
    this.offchainCashValue = BigInt(0)
    this.portfolioValuation = BigInt(0)

    this.availableReserve = BigInt(0)
    this.maxReserve = maxReserve

    this.sumDebt = BigInt(0)

    this.sumNumberOfActiveAssets = BigInt(0)
    this.sumDebtOverdue = BigInt(0)
    this.sumDebtWrittenOffByPeriod = BigInt(0)

    this.sumBorrowedAmountByPeriod = BigInt(0)
    this.sumRepaidAmountByPeriod = BigInt(0)
    this.sumPrincipalRepaidAmountByPeriod = BigInt(0)
    this.sumInterestRepaidAmountByPeriod = BigInt(0)
    this.sumUnscheduledRepaidAmountByPeriod = BigInt(0)
    this.sumInvestedAmountByPeriod = BigInt(0)
    this.sumRedeemedAmountByPeriod = BigInt(0)
    this.sumNumberOfAssetsByPeriod = BigInt(0)
    this.sumPoolFeesChargedAmountByPeriod = BigInt(0)
    this.sumPoolFeesAccruedAmountByPeriod = BigInt(0)
    this.sumPoolFeesPaidAmountByPeriod = BigInt(0)
    this.deltaPortfolioValuationByPeriod = BigInt(0)
    this.sumInterestAccruedByPeriod = BigInt(0)

    this.sumRealizedProfitFifoByPeriod = BigInt(0)
    this.sumUnrealizedProfitAtMarketPrice = BigInt(0)
    this.sumUnrealizedProfitAtNotional = BigInt(0)
    this.sumUnrealizedProfitByPeriod = BigInt(0)

    this.sumBorrowedAmount = BigInt(0)
    this.sumRepaidAmount = BigInt(0)
    this.sumPrincipalRepaidAmount = BigInt(0)
    this.sumInterestRepaidAmount = BigInt(0)
    this.sumUnscheduledRepaidAmount = BigInt(0)
    this.sumNumberOfAssets = BigInt(0)
    this.sumPoolFeesAccruedAmount = BigInt(0)
    this.sumPoolFeesChargedAmount = BigInt(0)
    this.sumPoolFeesPaidAmount = BigInt(0)
    this.sumPoolFeesPendingAmount = BigInt(0)

    this.currencyId = currencyId

    return this
  }

  public initTinlake(name: string, currencyId: string, timestamp: Date, blockNumber: number) {
    logger.info(`Initialising tinlake pool ${this.id}`)
    this.isActive = true
    this.name = name
    this.createdAt = timestamp
    this.createdAtBlockNumber = blockNumber

    this.normalizedNAV = BigInt(0)
    this.netAssetValue = BigInt(0)
    this.totalReserve = BigInt(0)
    this.portfolioValuation = BigInt(0)

    this.currencyId = currencyId

    return this
  }

  public async initData() {
    logger.info(`Initialising data for pool: ${this.id}`)
    const [poolReq, metadataReq] = await Promise.all([
      api.query.poolSystem.pool<Option<PoolDetails>>(this.id),
      api.query.poolRegistry.poolMetadata<Option<PoolMetadata>>(this.id),
    ])

    if (poolReq.isNone) throw new Error('No pool data available to create the pool')

    const poolData = poolReq.unwrap()
    this.metadata = metadataReq.isSome ? metadataReq.unwrap().metadata.toUtf8() : undefined
    this.minEpochTime = poolData.parameters.minEpochTime.toNumber()
    this.maxPortfolioValuationAge = poolData.parameters.maxNavAge.toNumber()
    return this
  }

  public updateMetadata(metadata: string) {
    logger.info(`Updating metadata for pool ${this.id} to ${metadata}`)
    this.metadata = metadata
  }

  public async initIpfsMetadata(): Promise<Required<PoolIpfsMetadata['pool']>['poolFees']> {
    if (!this.metadata) {
      logger.warn('No IPFS metadata')
      return []
    }
    const matchedMetadata = this.metadata.match(cid)
    if (!matchedMetadata || matchedMetadata.length !== 1) throw new Error('Unable to read metadata')
    const metadata = await readIpfs<PoolIpfsMetadata>(matchedMetadata[0])
    this.name = metadata.pool.name
    this.assetClass = metadata.pool.asset.class
    this.assetSubclass = metadata.pool.asset.subClass
    this.icon = metadata.pool.icon.uri
    return metadata.pool?.poolFees ?? []
  }

  public async getIpfsPoolFeeMetadata(): Promise<Required<PoolIpfsMetadata['pool']>['poolFees']> {
    if (!this.metadata) return logger.warn('No IPFS metadata')
    const matchedMetadata = this.metadata.match(cid)
    if (!matchedMetadata || matchedMetadata.length !== 1) throw new Error('Unable to read metadata')
    const metadata = await readIpfs<PoolIpfsMetadata>(matchedMetadata[0])
    return metadata.pool.poolFees ?? []
  }

  public async getIpfsPoolFeeName(poolFeeId: string): Promise<string> {
    if (!this.metadata) return logger.warn('No IPFS metadata')
    const poolFeeMetadata = await this.getIpfsPoolFeeMetadata()
    if (!poolFeeMetadata) {
      logger.warn('Missing poolFee object in pool metadata!')
      return ''
    }
    return poolFeeMetadata.find((elem) => elem.id.toString(10) === poolFeeId)?.name ?? ''
  }

  static async getById(poolId: string) {
    return this.get(poolId) as Promise<PoolService | undefined>
  }

  static async getAll() {
    const pools = await paginatedGetter(this, [['type', '=', 'ALL']])
    return pools as PoolService[]
  }

  static async getCfgActivePools(): Promise<PoolService[]> {
    logger.info('Fetching active pools')
    const pools = await paginatedGetter(this, [
      ['isActive', '=', true],
      ['blockchainId', '=', '0'],
    ])
    return pools as PoolService[]
  }

  public async updateState() {
    const poolResponse = await api.query.poolSystem.pool<Option<PoolDetails>>(this.id)
    logger.info(`Updating state for pool: ${this.id}`)
    if (poolResponse.isSome) {
      const poolData = poolResponse.unwrap()
      this.totalReserve = poolData.reserve.total.toBigInt()
      this.availableReserve = poolData.reserve.available.toBigInt()
      this.maxReserve = poolData.reserve.max.toBigInt()
    }
    return this
  }

  public async updateNAV(poolCurrencyDecimals: number) {
    const specVersion = api.runtimeVersion.specVersion.toNumber()
    const specName = api.runtimeVersion.specName.toString()
    switch (specName) {
      case 'centrifuge-devel':
        await (specVersion < 1038 ? this.updateNAVQuery() : this.updateNAVCall())
        break
      default:
        await (specVersion < 1025 ? this.updateNAVQuery() : this.updateNAVCall())
        break
    }
    await this.updateNormalizedNAV(poolCurrencyDecimals)
    return this
  }

  private async updateNAVQuery() {
    logger.info(`Updating portfolio valuation for pool: ${this.id} (state)`)
    assertPropInitialized(this, 'offchainCashValue', 'bigint')
    assertPropInitialized(this, 'portfolioValuation', 'bigint')
    assertPropInitialized(this, 'totalReserve', 'bigint')

    const navResponse = await api.query.loans.portfolioValuation<NavDetails>(this.id)
    const newPortfolioValuation = navResponse.value.toBigInt() - this.offchainCashValue!

    this.deltaPortfolioValuationByPeriod = newPortfolioValuation - this.portfolioValuation!
    this.portfolioValuation = newPortfolioValuation

    // The query was only used before fees were introduced,
    // so NAV == portfolioValuation + offchainCashValue + totalReserve
    this.netAssetValue = newPortfolioValuation + this.offchainCashValue! + this.totalReserve!

    logger.info(
      `portfolio valuation: ${this.portfolioValuation.toString(10)} delta: ${this.deltaPortfolioValuationByPeriod}`
    )
    return this
  }

  private async updateNAVCall() {
    logger.info(`Updating portfolio valuation for pool: ${this.id} (runtime)`)

    assertPropInitialized(this, 'offchainCashValue', 'bigint')
    assertPropInitialized(this, 'portfolioValuation', 'bigint')

    const navResponse = await api.call.poolsApi.nav(this.id)
    if (navResponse.isEmpty) {
      logger.warn('Empty pv response')
      return
    }
    const newNAV = navResponse.unwrap().total.toBigInt()
    const newPortfolioValuation = navResponse.unwrap().navAum.toBigInt() - this.offchainCashValue!

    this.deltaPortfolioValuationByPeriod = newPortfolioValuation - this.portfolioValuation!
    this.portfolioValuation = newPortfolioValuation
    this.netAssetValue = newNAV

    logger.info(
      `portfolio valuation: ${this.portfolioValuation.toString(10)} delta: ${this.deltaPortfolioValuationByPeriod}`
    )
    return this
  }

  public updateNormalizedNAV(poolCurrencyDecimals: number) {
    assertPropInitialized(this, 'netAssetValue', 'bigint')
    const digitsMismatch = WAD_DIGITS - poolCurrencyDecimals
    if (digitsMismatch === 0) {
      this.normalizedNAV = this.netAssetValue
      return this
    }
    if (digitsMismatch > 0) {
      this.normalizedNAV = BigInt(this.netAssetValue!.toString(10) + '0'.repeat(digitsMismatch))
    } else {
      this.normalizedNAV = BigInt(this.netAssetValue!.toString(10).substring(0, WAD_DIGITS))
    }
    logger.info(`Normalized NAV for pool ${this.id} set to ${this.normalizedNAV.toString(10)}`)
    return this
  }

  public setNav(nav: bigint) {
    logger.info(`Setting nav for pool ${this.id} to ${nav.toString(10)}`)
    this.netAssetValue = nav
    return this
  }

  public increaseNumberOfAssets() {
    assertPropInitialized(this, 'sumNumberOfAssetsByPeriod', 'bigint')
    assertPropInitialized(this, 'sumNumberOfAssets', 'bigint')
    this.sumNumberOfAssetsByPeriod! += BigInt(1)
    this.sumNumberOfAssets! += BigInt(1)
  }

  public updateNumberOfActiveAssets(numberOfActiveAssets: bigint) {
    this.sumNumberOfActiveAssets = numberOfActiveAssets
  }

  public increaseBorrowings(borrowedAmount: bigint) {
    assertPropInitialized(this, 'sumBorrowedAmountByPeriod', 'bigint')
    assertPropInitialized(this, 'sumBorrowedAmount', 'bigint')
    this.sumBorrowedAmountByPeriod! += borrowedAmount
    this.sumBorrowedAmount! += borrowedAmount
  }

  public increaseRepayments(
    principalRepaidAmount: bigint,
    interestRepaidAmount: bigint,
    unscheduledRepaidAmount: bigint
  ) {
    assertPropInitialized(this, 'sumRepaidAmountByPeriod', 'bigint')
    this.sumRepaidAmountByPeriod! += principalRepaidAmount + interestRepaidAmount + unscheduledRepaidAmount

    assertPropInitialized(this, 'sumRepaidAmount', 'bigint')
    this.sumRepaidAmount! += principalRepaidAmount + interestRepaidAmount + unscheduledRepaidAmount

    assertPropInitialized(this, 'sumPrincipalRepaidAmountByPeriod', 'bigint')
    this.sumPrincipalRepaidAmountByPeriod! += principalRepaidAmount

    assertPropInitialized(this, 'sumPrincipalRepaidAmount', 'bigint')
    this.sumPrincipalRepaidAmount! += principalRepaidAmount

    assertPropInitialized(this, 'sumInterestRepaidAmountByPeriod', 'bigint')
    this.sumInterestRepaidAmountByPeriod! += interestRepaidAmount

    assertPropInitialized(this, 'sumInterestRepaidAmount', 'bigint')
    this.sumInterestRepaidAmount! += interestRepaidAmount

    assertPropInitialized(this, 'sumUnscheduledRepaidAmountByPeriod', 'bigint')
    this.sumUnscheduledRepaidAmountByPeriod! += unscheduledRepaidAmount

    assertPropInitialized(this, 'sumUnscheduledRepaidAmount', 'bigint')
    this.sumUnscheduledRepaidAmount! += unscheduledRepaidAmount
  }

  public increaseRepayments1024(repaidAmount: bigint) {
    assertPropInitialized(this, 'sumRepaidAmountByPeriod', 'bigint')
    this.sumRepaidAmountByPeriod! += repaidAmount

    assertPropInitialized(this, 'sumRepaidAmount', 'bigint')
    this.sumRepaidAmount! += repaidAmount
  }

  public increaseInvestments(currencyAmount: bigint) {
    assertPropInitialized(this, 'sumInvestedAmountByPeriod', 'bigint')
    this.sumInvestedAmountByPeriod! += currencyAmount
  }

  public increaseRedemptions(currencyAmount: bigint) {
    assertPropInitialized(this, 'sumRedeemedAmountByPeriod', 'bigint')
    this.sumRedeemedAmountByPeriod! += currencyAmount
  }

  public closeEpoch(epochId: number) {
    this.lastEpochClosed = epochId
    this.currentEpoch = epochId + 1
  }

  public executeEpoch(epochId: number) {
    this.lastEpochExecuted = epochId
  }

  public resetDebtOverdue() {
    logger.info('Resetting sumDebtOverdue')
    this.sumDebtOverdue = BigInt(0)
  }

  public increaseDebtOverdue(amount: bigint) {
    logger.info(`Increasing sumDebtOverdue by ${amount}`)
    assertPropInitialized(this, 'sumDebtOverdue', 'bigint')
    this.sumDebtOverdue! += amount
  }

  public increaseWriteOff(amount: bigint) {
    logger.info(`Increasing writeOff by ${amount}`)
    assertPropInitialized(this, 'sumDebtWrittenOffByPeriod', 'bigint')
    this.sumDebtWrittenOffByPeriod! += amount
  }

  public increaseInterestAccrued(amount: bigint) {
    logger.info(`Increasing interestAccrued by ${amount}`)
    assertPropInitialized(this, 'sumInterestAccruedByPeriod', 'bigint')
    this.sumInterestAccruedByPeriod! += amount
  }

  public async fetchTranchesFrom1400(): Promise<TrancheData[]> {
    logger.info(`Fetching tranches for pool: ${this.id} with specVersion >= 1400`)
    const poolResponse = await api.query.poolSystem.pool<Option<PoolDetails>>(this.id)
    if (poolResponse.isNone) throw new Error('Unable to fetch pool data!')
    const poolData = poolResponse.unwrap()
    const { ids, tranches } = poolData.tranches
    const trancheData: TrancheData[] = []
    for (const [index, tranche] of tranches.entries()) {
      const currency = tranche.currency as TrancheCurrency
      trancheData.push({
        index,
        id: ids[index].toHex(),
        trancheType: tranche.trancheType.type,
        seniority: tranche.seniority.toNumber(),
        poolId: currency[0].toString(),
        trancheId: currency[1].toHex(),
        debt: tranche.debt.toBigInt(),
        reserve: tranche.reserve.toBigInt(),
        loss: tranche.loss.toBigInt(),
        ratio: tranche.ratio.toBigInt(),
        lastUpdatedInterest: tranche.lastUpdatedInterest.toBigInt(),
        interestRatePerSec: tranche.trancheType.isNonResidual
          ? tranche.trancheType.asNonResidual.interestRatePerSec.toBigInt()
          : undefined,
        minRiskBuffer: tranche.trancheType.isNonResidual
          ? tranche.trancheType.asNonResidual.minRiskBuffer.toBigInt()
          : undefined,
      })
    }
    return trancheData
  }

  public async fetchTranchesBefore1400(): Promise<TrancheData[]> {
    logger.info(`Fetching tranches for pool: ${this.id} with specVersion < 1400`)
    const poolResponse = await api.query.poolSystem.pool<Option<PoolDetails>>(this.id)
    if (poolResponse.isNone) throw new Error('Unable to fetch pool data!')
    const poolData = poolResponse.unwrap()
    const { ids, tranches } = poolData.tranches
    const trancheData: TrancheData[] = []
    for (const [index, tranche] of tranches.entries()) {
      const currency = tranche.currency as TrancheCurrencyBefore1400
      trancheData.push({
        index,
        id: ids[index].toHex(),
        trancheType: tranche.trancheType.type,
        seniority: tranche.seniority.toNumber(),
        poolId: currency.poolId.toString(10),
        trancheId: currency.trancheId.toString() as `0x${string}`,
        debt: tranche.debt.toBigInt(),
        reserve: tranche.reserve.toBigInt(),
        loss: tranche.loss.toBigInt(),
        ratio: tranche.ratio.toBigInt(),
        lastUpdatedInterest: tranche.lastUpdatedInterest.toBigInt(),
        interestRatePerSec: tranche.trancheType.isNonResidual
          ? tranche.trancheType.asNonResidual.interestRatePerSec.toBigInt()
          : undefined,
        minRiskBuffer: tranche.trancheType.isNonResidual
          ? tranche.trancheType.asNonResidual.minRiskBuffer.toBigInt()
          : undefined,
      })
    }
    return trancheData
  }

  public async getTranches() {
    const specVersion = api.runtimeVersion.specVersion.toNumber()
    let tranches: TrancheData[]
    if (specVersion >= 1400) {
      tranches = await this.fetchTranchesFrom1400()
    } else {
      tranches = await this.fetchTranchesBefore1400()
    }
    return tranches.reduce<PoolTranches>((obj, data) => ({ ...obj, [data.id]: { ...data } }), {})
  }

  public async getPortfolio(): Promise<ActiveLoanData> {
    logger.info(`Querying runtime loansApi.portfolio for pool: ${this.id}`)
    const portfolioData = await api.call.loansApi.portfolio(this.id)
    logger.info(`Updating ${portfolioData.length} assets for pool: ${this.id}`)

    const portfolio: ActiveLoanData = {}
    for (const [assetId, asset] of portfolioData.toArray()) {
      const {
        outstandingPrincipal,
        outstandingInterest,
        presentValue,
        currentPrice,
        activeLoan: {
          schedule: { maturity },
          originationDate,
          writeOffPercentage,
          totalBorrowed,
          totalRepaid: { principal, interest, unscheduled },
        },
      } = asset

      const actualMaturityDate = maturity.isFixed ? new Date(maturity.asFixed.date.toNumber() * 1000) : undefined
      const timeToMaturity = actualMaturityDate
        ? Math.round((actualMaturityDate.valueOf() - Date.now().valueOf()) / 1000)
        : undefined
      const assetData = {
        outstandingPrincipal: outstandingPrincipal.toBigInt(),
        outstandingInterest: outstandingInterest.toBigInt(),
        outstandingDebt: outstandingPrincipal.toBigInt() + outstandingInterest.toBigInt(),
        presentValue: presentValue.toBigInt(),
        currentPrice: currentPrice?.isSome ? currentPrice.unwrap().toBigInt() : BigInt(0),
        actualMaturityDate,
        timeToMaturity,
        actualOriginationDate: new Date(originationDate.toNumber() * 1000),
        writeOffPercentage: writeOffPercentage.toBigInt(),
        totalBorrowed: totalBorrowed.toBigInt(),
        totalRepaid: principal.toBigInt() + interest.toBigInt() + unscheduled.toBigInt(),
        totalRepaidPrincipal: principal.toBigInt(),
        totalRepaidInterest: interest.toBigInt(),
        totalRepaidUnscheduled: unscheduled.toBigInt(),
      }
      portfolio[assetId.toString(10)] = { ...assetData }
    }
    return portfolio
  }

  public async getTrancheTokenPrices() {
    logger.info(`Querying Runtime tranche token prices for pool ${this.id}`)
    const poolId = this.id
    let tokenPrices: Vec<u128>
    try {
      const apiRes = await api.call.poolsApi.trancheTokenPrices(poolId)
      tokenPrices = apiRes.unwrap()
    } catch (err) {
      logger.error(`Unable to fetch tranche token prices for pool: ${this.id}: ${err}`)
      return undefined
    }
    return tokenPrices
  }

  public async getAccruedFees() {
    const specVersion = api.runtimeVersion.specVersion.toNumber()
    const specName = api.runtimeVersion.specName.toString()
    switch (specName) {
      case 'centrifuge-devel':
        if (specVersion < 1040) return []
        break
      default:
        if (specVersion < 1026) return []
        break
    }
    logger.info(`Querying runtime poolFeesApi.listFees for pool ${this.id}`)
    const poolFeesListRequest = await api.call.poolFeesApi.listFees(this.id)
    let poolFeesList: PoolFeesList
    try {
      poolFeesList = poolFeesListRequest.unwrap()
    } catch (error) {
      console.error(error)
      return []
    }
    const fees = poolFeesList.flatMap((poolFee) => poolFee.fees.filter((fee) => fee.amounts.feeType.isFixed))
    const accruedFees = fees.map((fee): [feeId: string, pending: bigint, disbursement: bigint] => [
      fee.id.toString(),
      fee.amounts.pending.toBigInt(),
      fee.amounts.disbursement.toBigInt(),
    ])
    return accruedFees
  }

  public increaseChargedFees(chargedAmount: bigint) {
    logger.info(`Increasing charged fees for pool ${this.id} by ${chargedAmount.toString(10)}`)
    assertPropInitialized(this, 'sumPoolFeesChargedAmountByPeriod', 'bigint')
    this.sumPoolFeesChargedAmountByPeriod! += chargedAmount

    assertPropInitialized(this, 'sumPoolFeesChargedAmount', 'bigint')
    this.sumPoolFeesChargedAmount! += chargedAmount
    return this
  }

  public decreaseChargedFees(unchargedAmount: bigint) {
    logger.info(`Decreasing charged fees for pool ${this.id} by ${unchargedAmount.toString(10)}`)
    assertPropInitialized(this, 'sumPoolFeesChargedAmountByPeriod', 'bigint')
    this.sumPoolFeesChargedAmountByPeriod! -= unchargedAmount

    assertPropInitialized(this, 'sumPoolFeesChargedAmount', 'bigint')
    this.sumPoolFeesChargedAmount! -= unchargedAmount
    return this
  }

  public increaseAccruedFees(accruedAmount: bigint) {
    logger.info(`Increasing accrued fees for pool ${this.id} by ${accruedAmount.toString(10)}`)
    assertPropInitialized(this, 'sumPoolFeesAccruedAmountByPeriod', 'bigint')
    this.sumPoolFeesAccruedAmountByPeriod! += accruedAmount

    assertPropInitialized(this, 'sumPoolFeesAccruedAmount', 'bigint')
    this.sumPoolFeesAccruedAmount! += accruedAmount
    return this
  }

  public increasePaidFees(paidAmount: bigint) {
    logger.info(`Increasing paid fees for pool ${this.id} by ${paidAmount.toString(10)}`)
    assertPropInitialized(this, 'sumPoolFeesPaidAmountByPeriod', 'bigint')
    this.sumPoolFeesPaidAmountByPeriod! += paidAmount

    assertPropInitialized(this, 'sumPoolFeesPaidAmount', 'bigint')
    this.sumPoolFeesPaidAmount! += paidAmount
    return this
  }

  public resetOffchainCashValue() {
    logger.info(`Resetting offchainCashValue for pool ${this.id}`)
    this.offchainCashValue = BigInt(0)
  }

  public increaseOffchainCashValue(amount: bigint) {
    logger.info(`Increasing offchainCashValue for pool ${this.id} by ${amount.toString(10)}`)
    assertPropInitialized(this, 'offchainCashValue', 'bigint')
    this.offchainCashValue! += amount
  }

  public updateSumPoolFeesPendingAmount(pendingAmount: bigint) {
    logger.info(`Updating sumPoolFeesPendingAmount for pool ${this.id} to ${pendingAmount.toString(10)}`)
    this.sumPoolFeesPendingAmount = pendingAmount
  }

  public increaseRealizedProfitFifo(amount: bigint) {
    logger.info(`Increasing umRealizedProfitFifoByPeriod for pool ${this.id} by ${amount.toString(10)}`)
    assertPropInitialized(this, 'sumRealizedProfitFifoByPeriod', 'bigint')
    this.sumRealizedProfitFifoByPeriod! += amount
  }

  public resetUnrealizedProfit() {
    logger.info(`Resetting unrealizedProfit for pool ${this.id}`)
    this.sumUnrealizedProfitAtMarketPrice = BigInt(0)
    this.sumUnrealizedProfitAtNotional = BigInt(0)
    this.sumUnrealizedProfitByPeriod = BigInt(0)
  }

  public increaseUnrealizedProfit(atMarket: bigint, atNotional: bigint, byPeriod: bigint) {
    logger.info(`Increasing unrealizedProfit for pool ${this.id} atMarket: ${atMarket}, atNotional: ${atNotional}`)
    assertPropInitialized(this, 'sumUnrealizedProfitAtMarketPrice', 'bigint')
    assertPropInitialized(this, 'sumUnrealizedProfitAtNotional', 'bigint')
    assertPropInitialized(this, 'sumUnrealizedProfitByPeriod', 'bigint')
    this.sumUnrealizedProfitAtMarketPrice! += atMarket
    this.sumUnrealizedProfitAtNotional! += atNotional
    this.sumUnrealizedProfitByPeriod! += byPeriod
  }

  public setPortfolioValuation(value: bigint) {
    logger.info(`Setting pool ${this.id} portfolioValuation to: ${value.toString()}`)
    this.portfolioValuation = value
  }

  public setTotalReserve(value: bigint) {
    logger.info(`Setting pool ${this.id} totalReserve to: ${value.toString()}`)
    this.totalReserve = value
  }

  public setNetAssetValue() {
    assertPropInitialized(this, 'portfolioValuation', 'bigint')
    assertPropInitialized(this, 'totalReserve', 'bigint')
    this.netAssetValue = this.portfolioValuation! + this.totalReserve!
    logger.info(`Set pool ${this.id} netAssetValue to: ${this.netAssetValue.toString()}`)
  }

  public close(closedAt: Date, closedAtBlockNumber: number) {
    this.isActive = false
    this.closedAt = closedAt
    this.closedAtBlockNumber = closedAtBlockNumber
  }

  public isClosed() {
    return !this.isActive && this.closedAt !== undefined && this.closedAtBlockNumber !== undefined
  }
}

export interface ActiveLoanData {
  [loanId: string]: {
    outstandingPrincipal: bigint
    outstandingInterest: bigint
    outstandingDebt: bigint
    presentValue: bigint
    currentPrice: bigint | undefined
    actualMaturityDate: Date | undefined
    timeToMaturity: number | undefined
    actualOriginationDate: Date
    writeOffPercentage: bigint
    totalBorrowed: bigint
    totalRepaid: bigint
    totalRepaidPrincipal: bigint
    totalRepaidInterest: bigint
    totalRepaidUnscheduled: bigint
  }
}

export interface TrancheData {
  index: number
  id: `0x${string}`
  trancheType: TrancheDetails['trancheType']['type']
  seniority: number
  poolId: string
  trancheId: `0x${string}`
  debt: bigint
  reserve: bigint
  loss: bigint
  ratio: bigint
  lastUpdatedInterest: bigint
  interestRatePerSec?: bigint
  minRiskBuffer?: bigint
}

export interface PoolTranches {
  [trancheId: string]: TrancheData
}

interface PoolIpfsMetadata {
  version: number
  pool: {
    name: string
    icon: { uri: string; mime: string }
    asset: { class: string; subClass: string }
    poolFees?: Array<{ id: number; name: string }>
  }
  [key: string]: unknown
}
