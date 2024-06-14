import { Option } from '@polkadot/types'
import { bnToBn, nToBigInt } from '@polkadot/util'
import { u64 } from '@polkadot/types'
import { WAD } from '../../config'
import { OrdersFulfillment } from '../../helpers/types'
import { Epoch, EpochState } from '../../types'

export class EpochService extends Epoch {
  private states: EpochState[]

  constructor(id: string, poolId: string, index: number) {
    super(id, poolId, index)
    this.states = []
  }

  static seed(poolId: string, index = 0) {
    logger.info(`Seeding epoch ${index} for pool ${poolId}`)
    return new this(`${poolId}-${index}`, poolId, index)
  }

  static init(poolId: string, epochNr: number, trancheIds: string[], timestamp: Date) {
    logger.info(`Initialising epoch ${epochNr} for pool ${poolId}`)
    const epoch = new this(`${poolId}-${epochNr.toString(10)}`, poolId, epochNr)
    epoch.openedAt = timestamp
    epoch.sumBorrowedAmount = BigInt(0)
    epoch.sumRepaidAmount = BigInt(0)
    epoch.sumInvestedAmount = BigInt(0)
    epoch.sumRedeemedAmount = BigInt(0)
    epoch.sumPoolFeesPaidAmount = BigInt(0)

    epoch.states = trancheIds.map((trancheId) => {
      const epochState = new EpochState(`${poolId}-${epochNr}-${trancheId}`, epoch.id, trancheId)
      epochState.sumOutstandingInvestOrders = BigInt(0)
      epochState.sumOutstandingRedeemOrders = BigInt(0)
      epochState.sumOutstandingRedeemOrdersCurrency = BigInt(0)
      epochState.sumFulfilledInvestOrders = BigInt(0)
      epochState.sumFulfilledRedeemOrders = BigInt(0)
      epochState.sumFulfilledRedeemOrdersCurrency = BigInt(0)
      return epochState
    })

    return epoch
  }

  static async getById(poolId: string, epochNr: number) {
    const epoch = (await this.get(`${poolId}-${epochNr.toString()}`)) as EpochService
    if (!epoch) return undefined
    const epochStates = await EpochState.getByEpochId(`${poolId}-${epochNr.toString(10)}`)
    epoch.states = epochStates
    return epoch
  }

  async saveWithStates() {
    await this.save()
    return Promise.all(this.states.map((epochState) => epochState.save()))
  }

  public getStates() {
    return [...this.states]
  }

  public closeEpoch(timestamp: Date) {
    logger.info(`Closing epoch ${this.id} on ${timestamp}`)
    this.closedAt = timestamp
  }

  public async executeEpoch(timestamp: Date) {
    logger.info(`Updating Epoch OrderFulfillmentData for pool ${this.poolId} on epoch ${this.index}`)
    this.executedAt = timestamp

    for (const epochState of this.states) {
      logger.info(`Fetching data for tranche: ${epochState.trancheId}`)
      const trancheCurrency = [this.poolId, epochState.trancheId]
      const [investOrderId, redeemOrderId] = await Promise.all([
        api.query.investments.investOrderId<u64>(trancheCurrency),
        api.query.investments.redeemOrderId<u64>(trancheCurrency),
      ])
      logger.info(`investOrderId: ${investOrderId.toNumber()}, redeemOrderId: ${redeemOrderId.toNumber()}`)
      const [investOrderFulfillment, redeemOrderFulfillment] = await Promise.all([
        api.query.investments.clearedInvestOrders<Option<OrdersFulfillment>>(
          trancheCurrency,
          investOrderId.toNumber() - 1
        ),
        api.query.investments.clearedRedeemOrders<Option<OrdersFulfillment>>(
          trancheCurrency,
          redeemOrderId.toNumber() - 1
        ),
      ])

      if (investOrderFulfillment.isNone || redeemOrderFulfillment.isNone)
        throw new Error('Failed to fetch epoch solutions')

      const investSolution = investOrderFulfillment.unwrap(),
        redeemSolution = redeemOrderFulfillment.unwrap()

      epochState.tokenPrice = investSolution.price.toBigInt()
      epochState.investFulfillmentPercentage = investSolution.ofAmount.toBigInt()
      epochState.redeemFulfillmentPercentage = redeemSolution.ofAmount.toBigInt()
      epochState.sumFulfilledInvestOrders = nToBigInt(
        bnToBn(epochState.sumOutstandingInvestOrders).mul(investSolution.ofAmount.toBn()).div(WAD)
      )
      epochState.sumFulfilledRedeemOrders = nToBigInt(
        bnToBn(epochState.sumOutstandingRedeemOrders).mul(redeemSolution.ofAmount.toBn()).div(WAD)
      )
      epochState.sumFulfilledRedeemOrdersCurrency = this.computeCurrencyAmount(
        epochState.sumFulfilledRedeemOrders,
        epochState.tokenPrice
      )

      this.sumInvestedAmount += epochState.sumFulfilledInvestOrders
      this.sumRedeemedAmount += epochState.sumFulfilledRedeemOrdersCurrency
    }
    return this
  }

  public updateOutstandingInvestOrders(trancheId: string, newAmount: bigint, oldAmount: bigint) {
    logger.info(`Updating outstanding invest orders for epoch ${this.id}`)
    const trancheState = this.states.find((epochState) => epochState.trancheId === trancheId)
    if (trancheState === undefined) throw new Error(`No epochState with could be found for tranche: ${trancheId}`)
    trancheState.sumOutstandingInvestOrders = trancheState.sumOutstandingInvestOrders + newAmount - oldAmount
    return this
  }

  public updateOutstandingRedeemOrders(trancheId: string, newAmount: bigint, oldAmount: bigint, tokenPrice: bigint) {
    logger.info(`Updating outstanding redeem orders for epoch ${this.id}`)
    const trancheState = this.states.find((trancheState) => trancheState.trancheId === trancheId)
    if (trancheState === undefined) throw new Error(`No epochState with could be found for tranche: ${trancheId}`)
    trancheState.sumOutstandingRedeemOrders = trancheState.sumOutstandingRedeemOrders + newAmount - oldAmount
    trancheState.sumOutstandingRedeemOrdersCurrency = this.computeCurrencyAmount(
      trancheState.sumOutstandingRedeemOrders,
      tokenPrice
    )
    return this
  }

  private computeCurrencyAmount(amount: bigint, price: bigint) {
    return nToBigInt(bnToBn(amount).mul(bnToBn(price)).div(WAD))
  }

  public increaseBorrowings(amount: bigint) {
    logger.info(`Increasing borrowings for epoch ${this.id} of ${amount}`)
    this.sumBorrowedAmount += amount
  }

  public increaseRepayments(amount: bigint) {
    logger.info(`Increasing repayments for epoch ${this.id} of ${amount}`)
    this.sumRepaidAmount += amount
  }

  public increasePaidFees(paidAmount: bigint) {
    logger.info(`Increasing paid fees for epoch ${this.id} by ${paidAmount.toString(10)}`)
    this.sumPoolFeesPaidAmount += paidAmount
    return this
  }
}
