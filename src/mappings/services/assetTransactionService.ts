import { AssetTransaction, AssetTransactionType } from '../../types'

export interface AssetTransactionData {
  readonly poolId: string
  readonly epochNumber: number
  readonly hash: string
  readonly address?: string
  readonly amount?: bigint
  readonly principalAmount?: bigint
  readonly interestAmount?: bigint
  readonly unscheduledAmount?: bigint
  readonly quantity?: bigint
  readonly settlementPrice?: bigint
  readonly timestamp: Date
  readonly assetId: string
  readonly fromAssetId?: string
  readonly toAssetId?: string
  readonly realizedProfitFifo?: bigint
}

export class AssetTransactionService extends AssetTransaction {
  static init = (data: AssetTransactionData, type: AssetTransactionType) => {
    const tx = new this(
      `${data.hash}-${data.epochNumber.toString()}-${type.toString()}`,
      data.timestamp,
      data.poolId,
      data.hash,
      data.epochNumber,
      `${data.poolId}-${data.epochNumber.toString(10)}`,
      `${data.poolId}-${data.assetId}`,
      type
    )
    tx.accountId = data.address
    tx.amount = data.amount
    tx.principalAmount = data.principalAmount
    tx.interestAmount = data.interestAmount
    tx.unscheduledAmount = data.unscheduledAmount
    tx.quantity = data.quantity
    tx.settlementPrice = data.settlementPrice
    tx.fromAssetId = data.fromAssetId ? `${data.poolId}-${data.fromAssetId}` : undefined
    tx.toAssetId = data.toAssetId ? `${data.poolId}-${data.toAssetId}` : undefined
    tx.realizedProfitFifo = data.realizedProfitFifo
    return tx
  }

  static created(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type created for address ${data.address} in pool ${data.poolId} for loan ${data.assetId}`
    )
    const tx = this.init(data, AssetTransactionType.CREATED)
    return tx
  }

  static borrowed(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type borrowed for address ${data.address} in pool ${data.poolId} ` +
        `for loan ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.BORROWED)
    return tx
  }

  static repaid(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type repaid for address ${data.address} in pool ${data.poolId} ` +
        `for loan ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.REPAID)
    return tx
  }

  static closed(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type closed for address ${data.address} in pool ${data.poolId} ` +
        `for loan ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.CLOSED)
    return tx
  }

  static cashTransfer(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type cash transfer for address ${data.address} in pool ${data.poolId} ` +
        `for asset ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.CASH_TRANSFER)
    return tx
  }

  static depositFromInvestments(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type deposit from investments for address ${data.address} in pool ${data.poolId} ` +
        `for asset ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.DEPOSIT_FROM_INVESTMENTS)
    return tx
  }

  static withdrawalForRedemptions(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type withdrawal for redemptions for address ${data.address} in pool ${data.poolId} ` +
        `for asset ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.WITHDRAWAL_FOR_REDEMPTIONS)
    return tx
  }

  static withdrawalForFees(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type withdrawal for fees for address ${data.address} in pool ${data.poolId} ` +
        `for asset ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.WITHDRAWAL_FOR_FEES)
    return tx
  }

  static increaseDebt(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type increase debt from investments for address ${data.address} in pool ${data.poolId} ` +
        `for asset ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.INCREASE_DEBT)
    return tx
  }

  static decreaseDebt(data: AssetTransactionData) {
    logger.info(
      `Asset transaction of type decrease debt from investments for address ${data.address} in pool ${data.poolId} ` +
        `for asset ${data.assetId} amount: ${data.amount}`
    )
    const tx = this.init(data, AssetTransactionType.DECREASE_DEBT)
    return tx
  }
}
