import { u128 } from '@polkadot/types'
import { bnToBn, nToBigInt } from '@polkadot/util'
import { paginatedGetter } from '../../helpers/paginatedGetter'
import { WAD } from '../../config'
import { Tranche, TrancheSnapshot } from '../../types'
import { TrancheData } from './poolService'

const MAINNET_CHAINID = '0xb3db41421702df9a7fcac62b53ffeac85f7853cc4e689e0b93aeb3db18c09d82'

export class TrancheService extends Tranche {
  snapshot?: TrancheSnapshot

  static seed(poolId: string, trancheId: string, blockchain = '0') {
    const id = `${poolId}-${trancheId}`
    logger.info(`Seeding tranche ${id}`)
    return new this(id, blockchain, 'ALL', poolId, trancheId, false)
  }

  static async getOrSeed(poolId: string, trancheId: string, blockchain = '0') {
    let tranche = await this.getById(poolId, trancheId)
    if (!tranche) {
      tranche = this.seed(poolId, trancheId, blockchain)
      await tranche.save()
    }
    return tranche
  }

  public init(index: number, trancheData: TrancheData) {
    logger.info(`Initializing tranche ${this.id}`)
    this.index = index
    this.isResidual = trancheData.trancheType === 'Residual'
    this.seniority = trancheData.seniority
    this.isActive = true
    this.sumOutstandingInvestOrdersByPeriod = BigInt(0)
    this.sumOutstandingRedeemOrdersByPeriod = BigInt(0)
    this.sumOutstandingRedeemOrdersCurrencyByPeriod = BigInt(0)
    this.sumFulfilledInvestOrdersByPeriod = BigInt(0)
    this.sumFulfilledRedeemOrdersByPeriod = BigInt(0)
    this.sumFulfilledRedeemOrdersCurrencyByPeriod = BigInt(0)

    this.tokenPrice = nToBigInt(WAD)
    this.sumDebt = trancheData.debt

    this.interestRatePerSec = trancheData.interestRatePerSec
    this.minRiskBuffer = trancheData.minRiskBuffer

    return this
  }

  public initTinlake(poolId: string, name: string, index: number, interestRatePerSec?: bigint) {
    logger.info(`Initializing tinlake tranche ${this.id} for pool ${poolId}`)
    this.activate()
    this.name = name
    this.index = index
    this.interestRatePerSec = interestRatePerSec
    return this
  }

  static async getById(poolId: string, trancheId: string) {
    const tranche = await this.get(`${poolId}-${trancheId}`)
    return tranche as TrancheService | undefined
  }

  static async getByPoolId(poolId: string): Promise<TrancheService[]> {
    const tranches = (await paginatedGetter<Tranche>(this, [['poolId', '=', poolId]])) as TrancheService[]
    return tranches
  }

  static async getActivesByPoolId(poolId: string): Promise<TrancheService[]> {
    const tranches = (await paginatedGetter<Tranche>(this, [
      ['poolId', '=', poolId],
      ['isActive', '=', true],
    ])) as TrancheService[]
    return tranches
  }

  public async updateSupply() {
    logger.info(`Updating supply for tranche ${this.id}`)
    const requestPayload = { Tranche: [this.poolId, this.trancheId] }
    const supplyResponse = await api.query.ormlTokens.totalIssuance<u128>(requestPayload)
    this.tokenSupply = supplyResponse.toBigInt()
    return this
  }

  public async updatePrice(price: bigint, block?: number) {
    const specVersion = api.runtimeVersion.specVersion.toNumber()
    if (MAINNET_CHAINID === chainId && !!block) {
      if (block < 4058350) return this.updatePriceFixDecimalError(price, block)
      if (specVersion >= 1025 && specVersion < 1029) return await this.updatePriceFixForFees(price)
    }
    logger.info(`Updating price for tranche ${this.id} to: ${this.tokenPrice}`)
    this.tokenPrice = price
    return this
  }

  private updatePriceFixDecimalError(price: bigint, block: number) {
    // https://centrifuge.subscan.io/extrinsic/4058350-0?event=4058350-0
    // fix decimal error in old blocks, the fix was enacted at block #4058350
    logger.info(
      `Updating price for tranche ${this.id} to: ${this.tokenPrice} (WITH CORRECTION FACTOR) at block ${block}`
    )
    this.tokenPrice = nToBigInt(bnToBn(price).div(bnToBn(1000000000)))
    return this
  }

  private async updatePriceFixForFees(price: bigint) {
    // fix token price not accounting for fees
    const navResponse = await api.call.poolsApi.nav(this.poolId)
    if (navResponse.isEmpty) {
      logger.warn(`No NAV response! Saving inaccurate price: ${price} `)
      this.tokenPrice = price
      return this
    }
    const accruedFees = bnToBn(navResponse.unwrap().navFees.toBigInt())
    if (!this.tokenSupply || this.tokenSupply === BigInt(0)) {
      logger.warn(`Token supply equal 0! Cannot perform division. Token price: ${price}`)
      this.tokenPrice = price
      return this
    }
    this.tokenPrice = nToBigInt(bnToBn(price).sub(accruedFees.mul(WAD).div(bnToBn(this.tokenSupply))))
    logger.info(`Updating price for tranche ${this.id} to: ${this.tokenPrice} (ACCOUNTING FOR ACCRUED FEES)`)
    return this
  }

  public async updatePriceFromRuntime(block?: number) {
    logger.info(`Querying token price for tranche ${this.id} from runtime`)
    const { poolId } = this

    const tokenPricesReq = await api.call.poolsApi.trancheTokenPrices(poolId)
    if (tokenPricesReq.isNone) return this
    if (typeof this.index !== 'number') throw new Error('Index is not a number')
    const tokenPrice = tokenPricesReq.unwrap()[this.index].toBigInt()
    logger.info(`Token price: ${tokenPrice.toString()}`)
    if (tokenPrice <= BigInt(0)) throw new Error(`Zero or negative price returned for tranche: ${this.id}`)
    this.updatePrice(tokenPrice, block)
    return this
  }

  public updateDebt(debt: bigint) {
    logger.info(`Updating debt for tranche ${this.id} to :${debt}`)
    this.sumDebt = debt
    return this
  }

  public async computeYield(yieldField: BigIntFields<TrancheService>, referencePeriodStart?: Date) {
    logger.info(
      `Computing yield ${yieldField} for tranche ${this.trancheId} of ` +
        `pool ${this.poolId} with reference date ${referencePeriodStart}`
    )

    let trancheSnapshot: TrancheSnapshot | undefined
    if (referencePeriodStart) {
      const trancheSnapshots = await TrancheSnapshot.getByPeriodId(referencePeriodStart.toISOString(), { limit: 100 })
      if (trancheSnapshots.length === 0) {
        logger.warn(`No tranche snapshot exist for pool ${this.poolId} with reference date ${referencePeriodStart}`)
        return this
      }

      trancheSnapshot = trancheSnapshots.find((snapshot) => snapshot.trancheId === `${this.poolId}-${this.trancheId}`)
      if (!trancheSnapshot) {
        logger.warn(
          `No tranche snapshot found tranche ${this.poolId}-${this.trancheId} with ` +
            `reference date ${referencePeriodStart}`
        )
        return this
      }
      if (!this.tokenPrice) {
        logger.warn('Price information missing')
        return this
      }
    }
    const priceCurrent = bnToBn(this.tokenPrice)
    const priceOld = referencePeriodStart ? bnToBn(trancheSnapshot!.tokenPrice) : WAD
    this[yieldField] = nToBigInt(priceCurrent.mul(WAD).div(priceOld).sub(WAD))
    logger.info(`Price: ${priceOld} to ${priceCurrent} = ${this[yieldField]}`)
    return this
  }

  public async computeYieldAnnualized(
    yieldField: BigIntFields<TrancheService>,
    currentPeriodStart: Date,
    referencePeriodStart: Date
  ) {
    logger.info(
      `Computing annualized yield ${yieldField} for tranche ${this.trancheId} of ` +
        `pool ${this.poolId} with reference date ${referencePeriodStart}`
    )
    const trancheSnapshots = await TrancheSnapshot.getByPeriodId(referencePeriodStart.toISOString(), { limit: 100 })
    if (trancheSnapshots.length === 0) {
      logger.warn(`No tranche snapshot found pool ${this.poolId} with reference date ${referencePeriodStart}`)
      return this
    }
    const trancheSnapshot = trancheSnapshots.find(
      (snapshot) => snapshot.trancheId === `${this.poolId}-${this.trancheId}`
    )
    if (trancheSnapshot === undefined) {
      logger.warn(
        `No tranche snapshot found tranche ${this.poolId}-${this.poolId} with ` +
          `reference date ${referencePeriodStart}`
      )
      return this
    }
    if (typeof this.tokenPrice !== 'bigint') {
      logger.warn('Price information missing')
      return this
    }
    const annualizationFactor = bnToBn(365 * 24 * 3600 * 1000).div(
      bnToBn(currentPeriodStart.valueOf() - referencePeriodStart.valueOf())
    )
    const priceCurrent = bnToBn(this.tokenPrice)
    const priceOld = bnToBn(trancheSnapshot.tokenPrice)
    this[yieldField] = nToBigInt(priceCurrent.mul(WAD).div(priceOld).sub(WAD).mul(annualizationFactor))
    return this
  }

  public updateOutstandingInvestOrders = (newAmount: bigint, oldAmount: bigint) => {
    logger.info(`Updating outstanding investment orders by period for tranche ${this.id}`)
    if (typeof this.sumOutstandingInvestOrdersByPeriod !== 'bigint')
      throw new Error('sumOutstandingInvestOrdersByPeriod not initialized')
    this.sumOutstandingInvestOrdersByPeriod = this.sumOutstandingInvestOrdersByPeriod + newAmount - oldAmount
    logger.info(`to ${this.sumOutstandingInvestOrdersByPeriod}`)
    return this
  }

  public updateOutstandingRedeemOrders(newAmount: bigint, oldAmount: bigint) {
    logger.info(`Updating outstanding investment orders by period for tranche ${this.id}`)
    if (typeof this.sumOutstandingRedeemOrdersByPeriod !== 'bigint')
      throw new Error('sumOutstandingRedeemOrdersByPeriod not initialized')
    this.sumOutstandingRedeemOrdersByPeriod = this.sumOutstandingRedeemOrdersByPeriod + newAmount - oldAmount
    this.sumOutstandingRedeemOrdersCurrencyByPeriod = this.computeCurrencyAmount(
      this.sumOutstandingRedeemOrdersByPeriod
    )
    logger.info(`to ${this.sumOutstandingRedeemOrdersByPeriod}`)
    return this
  }

  public updateFulfilledInvestOrders(amount: bigint) {
    logger.info(`Updating fulfilled investment orders by period for tranche ${this.id}`)
    if (typeof this.sumFulfilledInvestOrdersByPeriod !== 'bigint')
      throw new Error('sumFulfilledInvestOrdersByPeriod not initialized')
    this.sumFulfilledInvestOrdersByPeriod = this.sumFulfilledInvestOrdersByPeriod + amount
    logger.info(`to ${this.sumFulfilledInvestOrdersByPeriod}`)
    return this
  }

  public updateFulfilledRedeemOrders(amount: bigint) {
    logger.info(`Updating fulfilled redeem orders by period for tranche ${this.id}`)
    if (typeof this.sumFulfilledRedeemOrdersByPeriod !== 'bigint')
      throw new Error('sumFulfilledRedeemOrdersByPeriod not initialized')

    this.sumFulfilledRedeemOrdersByPeriod = this.sumFulfilledRedeemOrdersByPeriod + amount
    this.sumFulfilledRedeemOrdersCurrencyByPeriod = this.computeCurrencyAmount(this.sumFulfilledRedeemOrdersByPeriod)
    logger.info(`to ${this.sumFulfilledRedeemOrdersByPeriod}`)
    return this
  }

  private computeCurrencyAmount(amount: bigint) {
    return nToBigInt(bnToBn(amount).mul(bnToBn(this.tokenPrice)).div(WAD))
  }

  public deactivate() {
    logger.info(`Deactivating tranche ${this.id}`)
    this.isActive = false
  }

  public activate() {
    logger.info(`Activating tranche ${this.id}`)
    this.isActive = true
  }

  public setTokenPrice(value: bigint) {
  logger.info(`Setting tranche ${this.id} token price to: ${value.toString()}`)
    this.tokenPrice = value
  }

  public async loadSnapshot(periodStart: Date) {
    const snapshots = await TrancheSnapshot.getByFields(
      [
        ['trancheId', '=', this.id],
        ['periodId', '=', periodStart.toISOString()],
      ],
      { limit: 100 }
    )
    if (snapshots.length !== 1) {
      logger.warn(`Unable to load snapshot for asset ${this.id} for period ${periodStart.toISOString()}`)
      return
    }
    this.snapshot = snapshots.pop()
  }

  public computePartialNav(): bigint {
    const supply = bnToBn(this.tokenSupply)
    const price = bnToBn(this.tokenPrice)
    return nToBigInt(supply.mul(price).div(WAD))
  }
}

type BigIntFields<T> = { [K in keyof Required<T>]: Required<T>[K] extends bigint ? K : never }[keyof Required<T>]
