import { Option } from '@polkadot/types'
import { bnToBn, nToBigInt } from '@polkadot/util'
import { WAD } from '../../config'
import { ApiQueryLoansActiveLoans, LoanPricingAmount, NftItemMetadata } from '../../helpers/types'
import { Asset, AssetType, AssetValuationMethod, AssetStatus, AssetSnapshot } from '../../types'
import { ActiveLoanData } from './poolService'
import { cid, readIpfs } from '../../helpers/ipfsFetch'
import { assertPropInitialized } from '../../helpers/validation'

export const ONCHAIN_CASH_ASSET_ID = '0'
export class AssetService extends Asset {
  snapshot?: AssetSnapshot

  static init(
    poolId: string,
    assetId: string,
    type: AssetType,
    valuationMethod: AssetValuationMethod,
    nftClassId: bigint | undefined,
    nftItemId: bigint | undefined,
    timestamp: Date,
    blockchain = '0'
  ) {
    logger.info(`Initialising asset ${assetId} for pool ${poolId}`)
    const isActive = false
    const asset = new this(
      `${poolId}-${assetId}`,
      timestamp,
      blockchain,
      type,
      valuationMethod,
      poolId,
      isActive,
      AssetStatus.CREATED
    )

    asset.collateralNftClassId = nftClassId
    asset.collateralNftItemId = nftItemId

    asset.outstandingPrincipal = BigInt(0)
    asset.outstandingInterest = BigInt(0)
    asset.outstandingDebt = BigInt(0)
    asset.presentValue = BigInt(0)
    asset.outstandingQuantity = BigInt(0)
    asset.currentPrice = BigInt(0)
    asset.notional = BigInt(0)
    asset.writeOffPercentage = BigInt(0)
    asset.totalBorrowed = BigInt(0)
    asset.totalRepaid = BigInt(0)
    asset.totalRepaidPrincipal = BigInt(0)
    asset.totalRepaidInterest = BigInt(0)
    asset.totalRepaidUnscheduled = BigInt(0)

    asset.borrowedAmountByPeriod = BigInt(0)
    asset.repaidAmountByPeriod = BigInt(0)
    asset.writtenOffPercentageByPeriod = BigInt(0)
    asset.writtenOffAmountByPeriod = BigInt(0)
    asset.interestAccruedByPeriod = BigInt(0)

    asset.unrealizedProfitAtMarketPrice = BigInt(0)
    asset.unrealizedProfitAtNotional = BigInt(0)
    asset.unrealizedProfitByPeriod = BigInt(0)
    asset.sumRealizedProfitFifo = BigInt(0)

    return asset
  }

  static initOnchainCash(poolId: string, timestamp: Date) {
    const asset = this.init(
      poolId,
      ONCHAIN_CASH_ASSET_ID,
      AssetType.OnchainCash,
      AssetValuationMethod.Cash,
      undefined,
      undefined,
      timestamp,
      '0'
    )
    asset.name = 'Onchain reserve'
    return asset
  }

  static async getById(poolId: string, assetId: string) {
    const asset = await this.get(`${poolId}-${assetId}`)
    return asset as AssetService
  }

  static async getByNftId(collectionId: string, itemId: string) {
    const asset = (
      await AssetService.getByFields(
        [
          ['collateralNftClassId', '=', collectionId],
          ['collateralNftItemId', '=', itemId],
        ],
        { limit: 100 }
      )
    ).pop() as AssetService | undefined
    return asset
  }

  public borrow(amount: bigint) {
    logger.info(`Increasing borrowings for asset ${this.id} by ${amount}`)
    assertPropInitialized(this, 'borrowedAmountByPeriod', 'bigint')
    this.borrowedAmountByPeriod! += amount
  }

  public repay(amount: bigint) {
    logger.info(`Increasing repayments for asset ${this.id} by ${amount}`)
    assertPropInitialized(this, 'repaidAmountByPeriod', 'bigint')
    this.repaidAmountByPeriod! += amount
  }

  public increaseQuantity(increase: bigint) {
    assertPropInitialized(this, 'outstandingQuantity', 'bigint')
    this.outstandingQuantity! += increase
  }

  public decreaseQuantity(decrease: bigint) {
    assertPropInitialized(this, 'outstandingQuantity', 'bigint')
    this.outstandingQuantity! -= decrease
  }

  public updateInterestRate(interestRatePerSec: bigint) {
    logger.info(`Updating interest rate for asset ${this.id} to ${interestRatePerSec}`)
    this.interestRatePerSec = interestRatePerSec
  }

  public writeOff(percentage: bigint, penaltyInterestRatePerSec: bigint) {
    logger.info(`Writing off asset ${this.id} with ${percentage}`)
    this.writtenOffPercentageByPeriod = percentage
    this.penaltyInterestRatePerSec = penaltyInterestRatePerSec

    this.writtenOffAmountByPeriod = nToBigInt(bnToBn(this.outstandingDebt).mul(bnToBn(percentage)).div(WAD))
  }

  public updateAssetSpecs(decodedAssetSpecs: AssetSpecs) {
    for (const [key, value] of Object.entries(decodedAssetSpecs)) {
      logger.info(`Updating ${key} for asset ${this.id} to : ${value}`)
    }
    Object.assign(this, decodedAssetSpecs)
  }

  public updateCurrentPrice(currentPrice: bigint) {
    logger.info(`Updating currentPrice for asset ${this.id} to ${currentPrice}`)
    this.currentPrice = currentPrice
  }

  public activate() {
    logger.info(`Activating asset ${this.id}`)
    this.isActive = true
    this.status = AssetStatus.ACTIVE
  }

  public close() {
    logger.info(`Closing asset ${this.id}`)
    this.isActive = false
    this.status = AssetStatus.CLOSED
  }

  public updateActiveAssetData(activeAssetData: ActiveLoanData[keyof ActiveLoanData]) {
    // Current price was always 0 until spec version 1025
    if (!activeAssetData) {
      logger.warn(`activeAssetData is undefined for assetId ${this.id} in pool ${this.poolId}`)
      return this
    }

    const specVersion = api.runtimeVersion.specVersion.toNumber()
    if (specVersion < 1025) delete activeAssetData.currentPrice

    for (const [key, value] of Object.entries(activeAssetData)) {
      logger.info(`Updating ${key} for asset ${this.id} to: ${value}`)
    }

    // Set all active asset values
    Object.assign(this, activeAssetData)

    if (this.snapshot) {
      assertPropInitialized(this, 'totalRepaid', 'bigint')
      assertPropInitialized(this, 'totalRepaidInterest', 'bigint')
      const deltaRepaidInterestAmount = this.totalRepaid! - this.snapshot.totalRepaidInterest!

      assertPropInitialized(this, 'outstandingInterest', 'bigint')
      assertPropInitialized(this.snapshot, 'outstandingInterest', 'bigint')
      this.interestAccruedByPeriod =
        this.outstandingInterest! - this.snapshot.outstandingInterest! + deltaRepaidInterestAmount
      logger.info(`Updated outstanding interest for asset: ${this.id} to ${this.outstandingInterest!.toString()}`)
    }
    return this
  }

  public async updateItemMetadata() {
    assertPropInitialized(this, 'collateralNftClassId', 'bigint')
    assertPropInitialized(this, 'collateralNftItemId', 'bigint')
    logger.info(
      `Updating metadata for asset: ${this.id} with ` +
        `collectionId ${this.collateralNftClassId!.toString()}, ` +
        `itemId: ${this.collateralNftItemId!.toString()}`
    )
    const itemMetadata = await api.query.uniques.instanceMetadataOf<Option<NftItemMetadata>>(
      this.collateralNftClassId,
      this.collateralNftItemId
    )
    if (itemMetadata.isNone) {
      throw new Error(
        `No metadata returned for asset: ${this.id} with ` +
          `collectionId ${this.collateralNftClassId!.toString()}, ` +
          `itemId: ${this.collateralNftItemId!.toString()}`
      )
    }

    const payload = itemMetadata.unwrap()
    this.metadata = payload.data.toUtf8()
    return this
  }

  public setMetadata(metadata: string) {
    this.metadata = metadata
  }

  static extractPrincipalAmount(principalObject: LoanPricingAmount) {
    let principal: bigint
    switch (principalObject.type) {
      case 'Internal':
        principal = principalObject.asInternal.toBigInt()
        break
      case 'External':
        principal = nToBigInt(
          principalObject.asExternal.quantity.toBn().mul(principalObject.asExternal.settlementPrice.toBn()).div(WAD)
        )
        break
    }
    return principal
  }

  public async updateIpfsAssetName(): Promise<void> {
    logger.info(`Fetching IPFS asset name for asset ${this.id} `)
    if (!this.metadata) {
      logger.warn(`No metadata field set for asset ${this.id}`)
      return
    }
    const matchedCid = this.metadata.match(cid)
    if (!matchedCid || matchedCid.length !== 1) throw new Error(`Could not read stored fetadata for object ${this.id}`)

    const metadata = await readIpfs<AssetIpfsMetadata>(matchedCid[0]).catch((err) => {
      logger.error(`Request for metadata failed: ${err}`)
      return undefined
    })
    if (!metadata) {
      logger.error(`No http response from IPFS for asset id ${this.id} CID: ${this.metadata}`)
      return
    }
    this.name = metadata.name
  }

  public isOffchainCash() {
    return this.type === AssetType.OffchainCash
  }

  public isNonCash() {
    return this.type === AssetType.Other
  }

  public async updateExternalAssetPricingFromState() {
    logger.info(`Executing state call loans.activeLoans to update asset ${this.id} pricing information`)
    const loansCall = await api.query.loans.activeLoans<ApiQueryLoansActiveLoans>(this.poolId)
    const assetTuple = loansCall.find((tuple) => tuple[0].toString(10) === this.id.split('-')[1])
    if (!assetTuple) throw new Error(`Asset ${this.id} not found in pool active loans!`)
    const loanData = assetTuple[1]
    if (loanData.pricing.isInternal) throw new Error(`Asset ${this.id} is not of type External!`)
    const { outstandingQuantity, latestSettlementPrice } = loanData.pricing.asExternal
    this.outstandingQuantity = outstandingQuantity.toBigInt()
    this.updateCurrentPrice(latestSettlementPrice.toBigInt())
    logger.info(
      `Updated outstandingQuantity: ${outstandingQuantity.toString(10)} ` +
        `currentPrice: ${latestSettlementPrice.toString(10)} for asset ${this.id}`
    )
  }

  public updateUnrealizedProfit(atMarketPrice: bigint, atNotional: bigint) {
    logger.info(
      `Updating unrealizedProfit for asset ${this.id} with atMarketPrice: ${atMarketPrice}, atNotional: ${atNotional}`
    )
    assertPropInitialized(this, 'unrealizedProfitAtMarketPrice', 'bigint')
    this.unrealizedProfitByPeriod = atMarketPrice - this.unrealizedProfitAtMarketPrice!
    this.unrealizedProfitAtMarketPrice = atMarketPrice
    this.unrealizedProfitAtNotional = atNotional
  }

  public increaseRealizedProfitFifo(increase: bigint) {
    assertPropInitialized(this, 'sumRealizedProfitFifo', 'bigint')
    this.sumRealizedProfitFifo! += increase
  }

  public async loadSnapshot(periodStart: Date) {
    const snapshots = await AssetSnapshot.getByFields(
      [
        ['assetId', '=', this.id],
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

  public isBeyondMaturity(blockTimestamp: Date) {
    return !!this.actualMaturityDate && this.actualMaturityDate < blockTimestamp
  }
}

export interface AssetSpecs {
  advanceRate?: bigint
  collateralValue?: bigint
  probabilityOfDefault?: bigint
  lossGivenDefault?: bigint
  discountRate?: bigint
  maturityDate?: Date
  currentPrice?: bigint
  notional?: bigint
}

interface AssetIpfsMetadata {
  name: string
  properties: unknown
  [key: string]: unknown
}
