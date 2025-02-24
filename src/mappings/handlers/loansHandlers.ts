import { SubstrateEvent } from '@subql/types'
import {
  LoanBorrowedEvent,
  LoanClosedEvent,
  LoanCreatedEvent,
  LoanDebtTransferred,
  LoanDebtTransferred1024,
  LoanDebtIncreased,
  LoanDebtDecreased,
  LoanRepaidEvent,
  LoanWrittenOffEvent,
} from '../../helpers/types'
import { errorHandler, missingPool } from '../../helpers/errorHandler'
import { PoolService } from '../services/poolService'
import { AssetService, AssetSpecs, ONCHAIN_CASH_ASSET_ID } from '../services/assetService'
import { AssetTransactionData, AssetTransactionService } from '../services/assetTransactionService'
import { AccountService } from '../services/accountService'
import { EpochService } from '../services/epochService'
import { AssetType, AssetValuationMethod } from '../../types'
import { bnToBn, nToBigInt } from '@polkadot/util'
import { WAD } from '../../config'
import { AssetPositionService } from '../services/assetPositionService'
import { AssetCashflowService } from '../services/assetCashflowService'
import { assertPropInitialized } from '../../helpers/validation'

export const handleLoanCreated = errorHandler(_handleLoanCreated)
async function _handleLoanCreated(event: SubstrateEvent<LoanCreatedEvent>) {
  const [poolId, loanId, loanInfo] = event.event.data
  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)
  logger.info(`Loan created event for pool: ${poolId.toString()} loan: ${loanId.toString()}`)

  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  if (!event.extrinsic) throw new Error('Missing event extrinsic!')
  const account = await AccountService.getOrInit(event.extrinsic.extrinsic.signer.toHex())

  const isInternal = loanInfo.pricing.isInternal
  const internalLoanPricing = isInternal ? loanInfo.pricing.asInternal : undefined
  const externalLoanPricing = !isInternal ? loanInfo.pricing.asExternal : undefined

  const assetType: AssetType =
    isInternal && internalLoanPricing!.valuationMethod.isCash ? AssetType.OffchainCash : AssetType.Other

  const valuationMethod: AssetValuationMethod = isInternal
    ? AssetValuationMethod[internalLoanPricing!.valuationMethod.type]
    : AssetValuationMethod.Oracle

  const asset = await AssetService.init(
    poolId.toString(),
    loanId.toString(),
    assetType,
    valuationMethod,
    loanInfo.collateral[0].toBigInt(),
    loanInfo.collateral[1].toBigInt(),
    timestamp
  )

  const assetSpecs: AssetSpecs = {
    advanceRate:
      internalLoanPricing && internalLoanPricing.maxBorrowAmount.isUpToOutstandingDebt
        ? internalLoanPricing.maxBorrowAmount.asUpToOutstandingDebt.advanceRate.toBigInt()
        : undefined,
    collateralValue: internalLoanPricing ? internalLoanPricing.collateralValue.toBigInt() : undefined,
    probabilityOfDefault:
      internalLoanPricing && internalLoanPricing.valuationMethod.isDiscountedCashFlow
        ? internalLoanPricing.valuationMethod.asDiscountedCashFlow.probabilityOfDefault.toBigInt()
        : undefined,
    lossGivenDefault:
      internalLoanPricing && internalLoanPricing.valuationMethod.isDiscountedCashFlow
        ? internalLoanPricing.valuationMethod.asDiscountedCashFlow.lossGivenDefault.toBigInt()
        : undefined,
    discountRate:
      internalLoanPricing?.valuationMethod.isDiscountedCashFlow &&
      internalLoanPricing.valuationMethod.asDiscountedCashFlow.discountRate.isFixed
        ? internalLoanPricing.valuationMethod.asDiscountedCashFlow.discountRate.asFixed.ratePerYear.toBigInt()
        : undefined,
    maturityDate: loanInfo.schedule.maturity.isFixed
      ? new Date(loanInfo.schedule.maturity.asFixed.date.toNumber() * 1000)
      : undefined,
    notional: !isInternal ? externalLoanPricing!.notional.toBigInt() : undefined,
  }

  await asset.updateAssetSpecs(assetSpecs)
  await asset.updateItemMetadata()
  await asset.updateIpfsAssetName()
  await asset.save()

  assertPropInitialized(pool, 'currentEpoch', 'number')
  const epoch = await EpochService.getById(pool.id, pool.currentEpoch!)
  if (!epoch) throw new Error('Epoch not found!')

  const at = await AssetTransactionService.created({
    poolId: poolId.toString(),
    assetId: loanId.toString(),
    address: account.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp,
  })
  await at.save()

  // Update pool info
  await pool.increaseNumberOfAssets()
  await pool.save()

  // Record cashflows
  await AssetCashflowService.recordAssetCashflows(asset.id)
}

export const handleLoanBorrowed = errorHandler(_handleLoanBorrowed)
async function _handleLoanBorrowed(event: SubstrateEvent<LoanBorrowedEvent>): Promise<void> {
  const [poolId, loanId, borrowAmount] = event.event.data
  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)
  const specVersion = api.runtimeVersion.specVersion.toNumber()

  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  const amount = AssetService.extractPrincipalAmount(borrowAmount)

  logger.info(`Loan borrowed event for pool: ${poolId.toString()} amount: ${amount.toString()}`)

  if (!event.extrinsic) throw new Error('Missing event extrinsic!')
  const account = await AccountService.getOrInit(event.extrinsic.extrinsic.signer.toHex())

  assertPropInitialized(pool, 'currentEpoch', 'number')
  const epoch = await EpochService.getById(pool.id, pool.currentEpoch!)
  if (!epoch) throw new Error('Epoch not found!')

  // Update loan amount
  const asset = await AssetService.getById(poolId.toString(), loanId.toString())
  if (!asset) throw new Error('Unable to retrieve asset!')

  await asset.activate()

  const assetTransactionBaseData = {
    poolId: poolId.toString(),
    assetId: loanId.toString(),
    address: account.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp,
    amount: amount,
    principalAmount: amount,
    quantity: borrowAmount.isExternal ? borrowAmount.asExternal.quantity.toBigInt() : undefined,
    settlementPrice: borrowAmount.isExternal ? borrowAmount.asExternal.settlementPrice.toBigInt() : undefined,
  }

  if (asset.isOffchainCash()) {
    const ct = await AssetTransactionService.cashTransfer({
      ...assetTransactionBaseData,
      fromAssetId: ONCHAIN_CASH_ASSET_ID,
      toAssetId: loanId.toString(),
    })
    await ct.save()
  } else {
    await asset.borrow(amount)

    if (borrowAmount.isExternal) {
      // Prices were based on the settlement prices only until spec version 1025
      if (specVersion < 1025) await asset.updateCurrentPrice(borrowAmount.asExternal.settlementPrice.toBigInt())

      await asset.increaseQuantity(borrowAmount.asExternal.quantity.toBigInt())
      await AssetPositionService.buy(
        asset.id,
        assetTransactionBaseData.hash,
        assetTransactionBaseData.timestamp,
        assetTransactionBaseData.quantity!,
        assetTransactionBaseData.settlementPrice!
      )
    }

    const at = await AssetTransactionService.borrowed(assetTransactionBaseData)
    await at.save()

    // Update pool info
    await pool.increaseBorrowings(amount)
    await pool.save()

    // Update epoch info
    await epoch.increaseBorrowings(amount)
    await epoch.save()
  }
  await asset.save()

  // Record cashflows
  await AssetCashflowService.recordAssetCashflows(asset.id)
}

export const handleLoanRepaid = errorHandler(_handleLoanRepaid)
async function _handleLoanRepaid(event: SubstrateEvent<LoanRepaidEvent>) {
  const [poolId, loanId, { principal, interest, unscheduled }] = event.event.data
  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)
  const specVersion = api.runtimeVersion.specVersion.toNumber()

  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  const principalAmount = AssetService.extractPrincipalAmount(principal)
  const amount = principalAmount + interest.toBigInt() + unscheduled.toBigInt()

  logger.info(`Loan repaid event for pool: ${poolId.toString()} amount: ${amount.toString()}`)

  if (!event.extrinsic) throw new Error('Missing event extrinsic!')
  const account = await AccountService.getOrInit(event.extrinsic.extrinsic.signer.toHex())

  assertPropInitialized(pool, 'currentEpoch', 'number')
  const epoch = await EpochService.getById(pool.id, pool.currentEpoch!)
  if (!epoch) throw new Error('Epoch not found!')

  const asset = await AssetService.getById(poolId.toString(), loanId.toString())
  if (!asset) throw new Error('Unable to retrieve asset!')
  const assetTransactionBaseData = {
    poolId: poolId.toString(),
    assetId: loanId.toString(),
    address: account.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp,
    amount: amount,
    principalAmount: principalAmount,
    interestAmount: interest.toBigInt(),
    unscheduledAmount: unscheduled.toBigInt(),
    quantity: principal.isExternal ? principal.asExternal.quantity.toBigInt() : undefined,
    settlementPrice: principal.isExternal ? principal.asExternal.settlementPrice.toBigInt() : undefined,
  }

  if (asset.isOffchainCash()) {
    const ct = await AssetTransactionService.cashTransfer({
      ...assetTransactionBaseData,
      fromAssetId: loanId.toString(),
      toAssetId: ONCHAIN_CASH_ASSET_ID,
    })
    await ct.save()
  } else {
    await asset.repay(amount)

    let realizedProfitFifo: bigint
    if (principal.isExternal) {
      const { quantity, settlementPrice } = principal.asExternal

      // Prices were based on the settlement prices only until spec version 1025
      if (specVersion < 1025) await asset.updateCurrentPrice(settlementPrice.toBigInt())

      await asset.decreaseQuantity(quantity.toBigInt())
      realizedProfitFifo = await AssetPositionService.sellFifo(
        asset.id,
        quantity.toBigInt(),
        settlementPrice.toBigInt()
      )
      await asset.increaseRealizedProfitFifo(realizedProfitFifo)
      await pool.increaseRealizedProfitFifo(realizedProfitFifo)
    }

    const at = await AssetTransactionService.repaid({
      ...assetTransactionBaseData,
      realizedProfitFifo: realizedProfitFifo!,
    })
    await at.save()

    // Update pool info
    await pool.increaseRepayments(principalAmount, interest.toBigInt(), unscheduled.toBigInt())
    await pool.save()

    // Update epoch info
    await epoch.increaseRepayments(amount)
    await epoch.save()
  }

  await asset.save()

  // Record cashflows
  await AssetCashflowService.recordAssetCashflows(asset.id)
}

export const handleLoanWrittenOff = errorHandler(_handleLoanWrittenOff)
async function _handleLoanWrittenOff(event: SubstrateEvent<LoanWrittenOffEvent>) {
  const [poolId, loanId, status] = event.event.data
  logger.info(`Loan writtenoff event for pool: ${poolId.toString()} loanId: ${loanId.toString()}`)
  const { percentage, penalty } = status
  const asset = await AssetService.getById(poolId.toString(), loanId.toString())
  if (!asset) throw new Error('Unable to retrieve asset!')
  await asset.writeOff(percentage.toBigInt(), penalty.toBigInt())
  await asset.save()

  const pool = await PoolService.getById(poolId.toString())
  if (pool === undefined) throw missingPool

  await pool.increaseWriteOff(asset.writtenOffAmountByPeriod!)
  await pool.save()

  // Record cashflows
  await AssetCashflowService.recordAssetCashflows(asset.id)
}

export const handleLoanClosed = errorHandler(_handleLoanClosed)
async function _handleLoanClosed(event: SubstrateEvent<LoanClosedEvent>) {
  const [poolId, loanId] = event.event.data
  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)
  logger.info(`Loan closed event for pool: ${poolId.toString()} loanId: ${loanId.toString()}`)

  const pool = await PoolService.getById(poolId.toString())
  if (pool === undefined) throw missingPool

  if (!event.extrinsic) throw new Error('Missing event extrinsic!')
  const account = await AccountService.getOrInit(event.extrinsic.extrinsic.signer.toHex())

  const asset = await AssetService.getById(poolId.toString(), loanId.toString())
  if (!asset) throw new Error('Unable to retrieve asset!')
  await asset.close()
  await asset.save()

  assertPropInitialized(pool, 'currentEpoch', 'number')
  const epoch = await EpochService.getById(pool.id, pool.currentEpoch!)
  if (!epoch) throw new Error('Epoch not found!')

  const at = await AssetTransactionService.closed({
    poolId: poolId.toString(),
    assetId: loanId.toString(),
    address: account.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp,
  })
  await at.save()

  // Record cashflows
  await AssetCashflowService.recordAssetCashflows(asset.id)
}

export const handleLoanDebtTransferred = errorHandler(_handleLoanDebtTransferred)
async function _handleLoanDebtTransferred(event: SubstrateEvent<LoanDebtTransferred>) {
  const specVersion = api.runtimeVersion.specVersion.toNumber()
  const [poolId, fromLoanId, toLoanId, _repaidAmount, _borrowAmount] = event.event.data

  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)

  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  const repaidPrincipalAmount = AssetService.extractPrincipalAmount(_repaidAmount.principal)
  // Interest amount until spec version 1100 is off
  const repaidInterestAmount = specVersion < 1100 ? BigInt(0) : _repaidAmount.interest.toBigInt()
  const repaidUnscheduledAmount = _repaidAmount.unscheduled.toBigInt()
  const repaidAmount = repaidPrincipalAmount + repaidInterestAmount + repaidUnscheduledAmount

  const borrowPrincipalAmount = AssetService.extractPrincipalAmount(_borrowAmount)

  logger.info(
    `Asset debt transferred event for pool: ${poolId.toString()}, from asset: ${fromLoanId.toString()} ` +
      `to asset: ${toLoanId.toString()} amount: ${repaidAmount.toString()}`
  )

  if (!event.extrinsic) throw new Error('Missing event extrinsic!')
  const account = await AccountService.getOrInit(event.extrinsic.extrinsic.signer.toHex())

  const fromAsset = await AssetService.getById(poolId.toString(), fromLoanId.toString())
  if (!fromAsset) throw new Error('Unable to retrieve fromAsset!')
  const toAsset = await AssetService.getById(poolId.toString(), toLoanId.toString())
  if (!toAsset) throw new Error('Unable to retrieve toAsset!')

  assertPropInitialized(pool, 'currentEpoch', 'number')
  const epoch = await EpochService.getById(pool.id, pool.currentEpoch!)
  if (!epoch) throw new Error('Epoch not found!')

  const txData: Omit<
    AssetTransactionData,
    'assetId' | 'amount' | 'interestAmount' | 'principalAmount' | 'unscheduledAmount'
  > = {
    poolId: pool.id,
    address: account.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp,
  }

  if (fromAsset.isNonCash() && toAsset.isOffchainCash()) {
    //Track repayment
    await fromAsset.activate()
    await fromAsset.repay(repaidAmount)
    let realizedProfitFifo: bigint
    if (_repaidAmount.principal.isExternal) {
      const { quantity, settlementPrice } = _repaidAmount.principal.asExternal

      // Prices were based on the settlement prices only until spec version 1025
      if (specVersion < 1025) await fromAsset.updateCurrentPrice(settlementPrice.toBigInt())

      await fromAsset.decreaseQuantity(quantity.toBigInt())
      realizedProfitFifo = await AssetPositionService.sellFifo(
        fromAsset.id,
        quantity.toBigInt(),
        settlementPrice.toBigInt()
      )
      await fromAsset.increaseRealizedProfitFifo(realizedProfitFifo)
      await pool.increaseRealizedProfitFifo(realizedProfitFifo)
    }
    await fromAsset.save()

    await pool.increaseRepayments(repaidPrincipalAmount, repaidInterestAmount, repaidUnscheduledAmount)
    await pool.save()

    await epoch.increaseRepayments(repaidAmount)
    await epoch.save()

    // principal repayment transaction
    const principalRepayment = await AssetTransactionService.repaid({
      ...txData,
      assetId: fromLoanId.toString(10),
      amount: repaidAmount,
      interestAmount: repaidInterestAmount,
      principalAmount: repaidPrincipalAmount,
      unscheduledAmount: repaidUnscheduledAmount,
      quantity: _repaidAmount.principal.isExternal ? _repaidAmount.principal.asExternal.quantity.toBigInt() : undefined,
      settlementPrice: _repaidAmount.principal.isExternal
        ? _repaidAmount.principal.asExternal.settlementPrice.toBigInt()
        : undefined,
      fromAssetId: fromLoanId.toString(10),
      toAssetId: toLoanId.toString(10),
      realizedProfitFifo: realizedProfitFifo!,
    })
    await principalRepayment.save()

    // Record cashflows
    await AssetCashflowService.recordAssetCashflows(principalRepayment.assetId)
  }

  if (fromAsset.isOffchainCash() && toAsset.isNonCash()) {
    //Track borrowed / financed amount
    await toAsset.activate()
    await toAsset.borrow(borrowPrincipalAmount)
    if (_borrowAmount.isExternal) {
      const { quantity, settlementPrice } = _borrowAmount.asExternal

      // Prices were based on the settlement prices only until spec version 1025
      if (specVersion < 1025) await toAsset.updateCurrentPrice(settlementPrice.toBigInt())

      await toAsset.increaseQuantity(quantity.toBigInt())
      await AssetPositionService.buy(
        toAsset.id,
        txData.hash,
        txData.timestamp,
        quantity.toBigInt(),
        settlementPrice.toBigInt()
      )
    }
    await toAsset.save()

    await pool.increaseBorrowings(borrowPrincipalAmount)
    await pool.save()

    await epoch.increaseBorrowings(borrowPrincipalAmount)
    await epoch.save()

    // purchase transaction
    const purchaseTransaction = await AssetTransactionService.borrowed({
      ...txData,
      assetId: toLoanId.toString(10),
      amount: borrowPrincipalAmount,
      principalAmount: borrowPrincipalAmount,
      quantity: _borrowAmount.isExternal ? _borrowAmount.asExternal.quantity.toBigInt() : undefined,
      settlementPrice: _borrowAmount.isExternal ? _borrowAmount.asExternal.settlementPrice.toBigInt() : undefined,
      fromAssetId: fromLoanId.toString(10),
    })
    await purchaseTransaction.save()

    // Record cashflows
    await AssetCashflowService.recordAssetCashflows(purchaseTransaction.assetId)
  }

  if (fromAsset.isOffchainCash() && toAsset.isOffchainCash()) {
    const ct = await AssetTransactionService.cashTransfer({
      ...txData,
      assetId: toLoanId.toString(10),
      amount: borrowPrincipalAmount,
      principalAmount: borrowPrincipalAmount,
      quantity: _borrowAmount.isExternal ? _borrowAmount.asExternal.quantity.toBigInt() : undefined,
      settlementPrice: _borrowAmount.isExternal ? _borrowAmount.asExternal.settlementPrice.toBigInt() : undefined,
      fromAssetId: fromLoanId.toString(10),
      toAssetId: toLoanId.toString(10),
    })
    await ct.save()
  }
}

export const handleLoanDebtTransferred1024 = errorHandler(_handleLoanDebtTransferred1024)
async function _handleLoanDebtTransferred1024(event: SubstrateEvent<LoanDebtTransferred1024>) {
  const [poolId, fromLoanId, toLoanId, _amount] = event.event.data

  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)

  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  const amount = _amount.toBigInt()
  logger.info(
    `Asset debt transferred event for pool: ${poolId.toString()}, from asset: ${fromLoanId.toString()} ` +
      `to asset: ${toLoanId.toString()} amount: ${amount.toString()}`
  )

  if (!event.extrinsic) throw new Error('Missing event extrinsic!')
  const account = await AccountService.getOrInit(event.extrinsic.extrinsic.signer.toHex())

  const fromAsset = await AssetService.getById(poolId.toString(), fromLoanId.toString())
  if (!fromAsset) throw new Error('Unable to retrieve fromAsset!')
  const toAsset = await AssetService.getById(poolId.toString(), toLoanId.toString())
  if (!toAsset) throw new Error('Unable to retrieve toAsset!')

  assertPropInitialized(pool, 'currentEpoch', 'number')
  const epoch = await EpochService.getById(pool.id, pool.currentEpoch!)
  if (!epoch) throw new Error('Epoch not found!')

  const txData: Omit<
    AssetTransactionData,
    'assetId' | 'amount' | 'interestAmount' | 'principalAmount' | 'unscheduledAmount'
  > = {
    poolId: pool.id,
    address: account.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp,
  }

  if (fromAsset.isNonCash() && toAsset.isOffchainCash()) {
    const quantity = nToBigInt(bnToBn(amount).mul(WAD).div(bnToBn(fromAsset.currentPrice)))
    const realizedProfitFifo = await AssetPositionService.sellFifo(toAsset.id, quantity, toAsset.currentPrice!)

    //Track repayment
    await fromAsset.activate()
    await fromAsset.updateExternalAssetPricingFromState()
    await fromAsset.repay(amount)
    await fromAsset.increaseRealizedProfitFifo(realizedProfitFifo)
    await fromAsset.save()

    await pool.increaseRealizedProfitFifo(realizedProfitFifo)
    await pool.increaseRepayments1024(amount)
    await pool.save()

    await epoch.increaseRepayments(amount)
    await epoch.save()

    // principal repayment transaction
    const principalRepayment = await AssetTransactionService.repaid({
      ...txData,
      assetId: fromLoanId.toString(10),
      amount: amount,
      fromAssetId: fromLoanId.toString(10),
      toAssetId: toLoanId.toString(10),
      settlementPrice: fromAsset.currentPrice,
      quantity: nToBigInt(bnToBn(amount).mul(WAD).div(bnToBn(fromAsset.currentPrice))),
      realizedProfitFifo,
    })
    await principalRepayment.save()
  }

  if (fromAsset.isOffchainCash() && toAsset.isNonCash()) {
    //Track borrowed / financed amount
    await toAsset.activate()
    await toAsset.updateExternalAssetPricingFromState()
    await toAsset.borrow(amount)
    await toAsset.save()

    await pool.increaseBorrowings(amount)
    await pool.save()

    await epoch.increaseBorrowings(amount)
    await epoch.save()

    const quantity = nToBigInt(bnToBn(amount).mul(WAD).div(bnToBn(toAsset.currentPrice)))
    await AssetPositionService.buy(toAsset.id, txData.hash, txData.timestamp, quantity, toAsset.currentPrice!)

    // purchase transaction
    const purchaseTransaction = await AssetTransactionService.borrowed({
      ...txData,
      assetId: toLoanId.toString(10),
      amount: amount,
      principalAmount: amount,
      fromAssetId: fromLoanId.toString(10),
      toAssetId: toLoanId.toString(10),
      settlementPrice: toAsset.currentPrice,
      quantity: quantity,
    })
    await purchaseTransaction.save()
  }
}

export const handleLoanDebtIncreased = errorHandler(_handleLoanDebtIncreased)
async function _handleLoanDebtIncreased(event: SubstrateEvent<LoanDebtIncreased>) {
  const [poolId, loanId, _borrowAmount] = event.event.data

  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)

  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  const borrowPrincipalAmount = AssetService.extractPrincipalAmount(_borrowAmount)

  logger.info(
    `Asset debt increased  event for pool: ${poolId.toString()}, asset: ${loanId.toString()} ` +
      `amount: ${borrowPrincipalAmount.toString()}`
  )

  if (!event.extrinsic) throw new Error('Missing event extrinsic!')
  const account = await AccountService.getOrInit(event.extrinsic.extrinsic.signer.toHex())

  const asset = await AssetService.getById(poolId.toString(), loanId.toString())
  if (!asset) throw new Error('Unable to retrieve asset!')

  assertPropInitialized(pool, 'currentEpoch', 'number')
  const epoch = await EpochService.getById(pool.id, pool.currentEpoch!)
  if (!epoch) throw new Error('Epoch not found!')

  const txData: AssetTransactionData = {
    poolId: pool.id,
    address: account.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp,
    assetId: loanId.toString(10),
    amount: borrowPrincipalAmount,
    principalAmount: borrowPrincipalAmount,
    quantity: _borrowAmount.isExternal ? _borrowAmount.asExternal.quantity.toBigInt() : undefined,
    settlementPrice: _borrowAmount.isExternal ? _borrowAmount.asExternal.settlementPrice.toBigInt() : undefined,
  }

  //TODO: should be tracked separately as corrections
  if (_borrowAmount.isExternal) {
    const { quantity } = _borrowAmount.asExternal
    await asset.increaseQuantity(quantity.toBigInt())
  }
  await asset.save()

  const tx = await AssetTransactionService.decreaseDebt({
    ...txData,
  })
  await tx.save()
}

export const handleLoanDebtDecreased = errorHandler(_handleLoanDebtDecreased)
async function _handleLoanDebtDecreased(event: SubstrateEvent<LoanDebtDecreased>) {
  const [poolId, loanId, _repaidAmount] = event.event.data
  const timestamp = event.block.timestamp
  if (!timestamp) throw new Error(`Block ${event.block.block.header.number.toString()} has no timestamp`)

  const pool = await PoolService.getById(poolId.toString())
  if (!pool) throw missingPool

  const repaidPrincipalAmount = AssetService.extractPrincipalAmount(_repaidAmount.principal)
  const repaidInterestAmount = _repaidAmount.interest.toBigInt()
  const repaidUnscheduledAmount = _repaidAmount.unscheduled.toBigInt()
  const repaidAmount = repaidPrincipalAmount + repaidInterestAmount + repaidUnscheduledAmount

  logger.info(
    `Asset debt decreased  event for pool: ${poolId.toString()}, asset: ${loanId.toString()} ` +
      `amount: ${repaidAmount.toString()}`
  )

  if (!event.extrinsic) throw new Error('Missing event extrinsic!')
  const account = await AccountService.getOrInit(event.extrinsic.extrinsic.signer.toHex())

  const asset = await AssetService.getById(poolId.toString(), loanId.toString())
  if (!asset) throw new Error('Unable to retrieve asset!')

  assertPropInitialized(pool, 'currentEpoch', 'number')
  const epoch = await EpochService.getById(pool.id, pool.currentEpoch!)
  if (!epoch) throw new Error('Epoch not found!')

  const txData: AssetTransactionData = {
    poolId: pool.id,
    address: account.id,
    epochNumber: epoch.index,
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp: timestamp,
    assetId: loanId.toString(10),
    amount: repaidAmount,
    interestAmount: repaidInterestAmount,
    principalAmount: repaidPrincipalAmount,
    unscheduledAmount: repaidUnscheduledAmount,
    quantity: _repaidAmount.principal.isExternal ? _repaidAmount.principal.asExternal.quantity.toBigInt() : undefined,
    settlementPrice: _repaidAmount.principal.isExternal
      ? _repaidAmount.principal.asExternal.settlementPrice.toBigInt()
      : undefined,
  }

  //Track repayment
  //TODO: should be tracked separately as corrections, but for now tracking as simple repayments
  await asset.activate()
  await asset.repay(repaidAmount)
  if (_repaidAmount.principal.isExternal) {
    const { quantity } = _repaidAmount.principal.asExternal

    await asset.decreaseQuantity(quantity.toBigInt())
  }
  await asset.save()

  await pool.increaseRepayments(repaidPrincipalAmount, repaidInterestAmount, repaidUnscheduledAmount)
  await pool.save()

  await epoch.increaseRepayments(repaidAmount)
  await epoch.save()

  const tx = await AssetTransactionService.decreaseDebt({
    ...txData,
  })
  await tx.save()
}
