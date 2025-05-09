//find out types: const a = createType(api.registry, '[u8;32]', 18)
import { AugmentedCall, AugmentedRpc, PromiseRpcResult } from '@polkadot/api/types'
import {
  Enum,
  Null,
  Struct,
  u128,
  u32,
  u64,
  U8aFixed,
  Option,
  Vec,
  Bytes,
  Result,
  bool,
  GenericCall,
} from '@polkadot/types'
import { AccountId32, Perquintill, Balance, H160 } from '@polkadot/types/interfaces'
import { ITuple, Observable } from '@polkadot/types/types'

export interface PoolDetails extends Struct {
  reserve: { total: u128; available: u128; max: u128 }
  currency: TokensCurrencyId
  parameters: { minEpochTime: u64; maxNavAge: u64 }
  tranches: TrancheData
  epoch: { current: u32; lastClosed: u64; lastExecuted: u32 }
  metadata: Option<Bytes>
}

export interface PoolEssence extends Struct {
  currency: TokensCurrencyId
  maxReserve: u128
  maxNavAge: u64
  minEpochTime: u64
  tranches: TrancheEssence[]
}

export interface PoolMetadata extends Struct {
  metadata: Bytes
}

export interface PoolNav extends Struct {
  navAum: Balance
  navFees: Balance
  reserve: Balance
  total: Balance
}

export interface TrancheData extends Struct {
  tranches: TrancheDetails[]
  ids: U8aFixed[]
  salt: ITuple<[u64, u64]>
}

export interface TrancheEssence extends Struct {
  currency: TrancheCurrency | TrancheCurrencyBefore1400
  ty: TrancheTypeEnum
  metadata: TrancheMetadata
}

export interface TrancheMetadata extends Struct {
  tokenName: Bytes
  tokenSymbol: Bytes
}

export interface TrancheDetails extends Struct {
  trancheType: TrancheTypeEnum
  seniority: u32
  currency: TrancheCurrency | TrancheCurrencyBefore1400
  debt: u128
  reserve: u128
  loss: u128
  ratio: Perquintill
  lastUpdatedInterest: u64
  index?: number
}

export interface TrancheTypeEnum extends Enum {
  isResidual: boolean
  isNonResidual: boolean
  asNonResidual: { interestRatePerSec: u128; minRiskBuffer: Perquintill }
  asResidual: Null
  readonly type: 'Residual' | 'NonResidual'
}

export interface NavDetails extends Struct {
  value: u128
  lastUpdated: u64
}

export interface EpochExecutionInfo extends Struct {
  epoch: u32
  nav: u128
  reserve: u128
  maxReserve: u128
  tranches: { tranches: EpochExecutionTranche[] }
  bestSubmission: Option<EpochSolution>
  challengePeriodEnd: Option<u32>
}

export interface EpochExecutionTranche extends Struct {
  currency: TrancheCurrency | TrancheCurrencyBefore1400
  supply: u128
  price: u128
  invest: u128
  redeem: u128
  minRiskBuffer: Perquintill
  seniority: u32
}

export interface EpochSolution extends Enum {
  isHealthy: boolean
  isUnhealthy: boolean
  asHealthy: { solution: TrancheSolution[]; score: u128 }
  asUnhealthy: {
    state: Enum[]
    solution: TrancheSolution[]
    riskBufferImprovementScores: Option<Vec<u128>>
    reserveImprovementScore: Option<u128>
  }
}

export interface TokensStakingCurrency extends Enum {
  readonly isBlockRewards: boolean
  readonly type: 'BlockRewards'
}

export interface TokensCurrencyId extends Enum {
  readonly isNative: boolean
  readonly asNative: unknown
  readonly isTranche: boolean
  readonly asTranche: TrancheCurrency | TrancheCurrencyBefore1400
  readonly isAusd: boolean
  readonly asAusd: unknown
  readonly isForeignAsset: boolean
  readonly asForeignAsset: u32
  readonly isStaking: boolean
  readonly asStaking: TokensStakingCurrency
  readonly isLocalAsset: boolean
  readonly asLocalAsset: u32
  readonly type: 'Native' | 'Tranche' | 'Ausd' | 'ForeignAsset' | 'Staking' | 'LocalAsset'
  get value(): TrancheCurrency & TrancheCurrencyBefore1400 & u32 & TokensStakingCurrency
}

export interface TrancheSolution extends Struct {
  investFulfillment: Perquintill
  redeemFulfillment: Perquintill
}

export interface InvestCollection extends Struct {
  payoutInvestmentInvest: u128
  remainingInvestmentInvest: u128
}

export interface RedeemCollection extends Struct {
  payoutInvestmentRedeem: u128
  remainingInvestmentRedeem: u128
}

export interface OrdersFulfillment extends Struct {
  ofAmount: Perquintill
  price: u128
}

export interface AssetMetadata extends Struct {
  decimals: u32
  name: Bytes
  symbol: Bytes
  existentialDeposit: u128
}

export interface CfgInterestRate extends Enum {
  isFixed: boolean
  asFixed: {
    ratePerYear: u128
    compounding: Enum
  }
}

export interface LoanInfoCreated extends Struct {
  schedule: LoanRepaymentSchedule
  collateral: ITuple<[u64, u128]>
  interestRate: CfgInterestRate
  pricing: LoanPricing
  restrictions: {
    borrows: Enum
    repayments: Enum
  }
}

export interface LoanInfoActivePortfolio extends Struct {
  activeLoan: LoanInfoActive
  presentValue: Balance
  outstandingPrincipal: Balance
  outstandingInterest: Balance
  currentPrice?: Option<Balance>
}

export interface LoanInfoActive extends Struct {
  schedule: LoanRepaymentSchedule
  collateral: ITuple<[u64, u128]>
  restrictions: {
    borrows: Enum
    repayments: Enum
  }
  borrower: AccountId32
  writeOffPercentage: u128
  originationDate: u64
  pricing: LoanActivePricing
  totalBorrowed: u128
  totalRepaid: {
    principal: u128
    interest: u128
    unscheduled: u128
  }
  repaymentsOnScheduleUntil: u64
}

export interface LoanActivePricing extends Enum {
  isInternal: boolean
  isExternal: boolean
  asInternal: LoanInternalActivePricing
  asExternal: LoanExternalActivePricing
}

export interface LoanInternalActivePricing extends Struct {
  info: {
    collateralValue: u128
    valuationMethod: LoanValuationMethod
    maxBorrowAmount: LoanInternalPricingMaxBorrowAmount
  }
  interest: {
    interestRate: CfgInterestRate
    normalizedAcc: u128
    penalty: u128
  }
}

export interface LoanExternalActivePricing extends Struct {
  info: {
    priceId: OracleKey
    maxBorrowAmount: LoanExternalPricingMaxBorrowAmount
    notional: u128
    maxPriceVariation: u128
  }
  outstandingQuantity: u128
  interest: {
    interestRate: CfgInterestRate
    normalizedAcc: u128
    penalty: u128
  }
  latestSettlementPrice: u128
}

export interface LoanExternalPricingMaxBorrowAmount extends Enum {
  isNoLimit: boolean
  isQuantity: boolean
  asNoLimit: Null
  asQuantity: u128
}

export interface LoanInternalPricingMaxBorrowAmount extends Enum {
  isUpToTotalBorrowed: boolean
  isUpToOutstandingDebt: boolean
  asUpToTotalBorrowed: {
    advanceRate: u128
  }
  asUpToOutstandingDebt: {
    advanceRate: u128
  }
}

export interface LoanPricing extends Enum {
  isInternal: boolean
  isExternal: boolean
  asInternal: {
    collateralValue: u128
    valuationMethod: LoanValuationMethod
    maxBorrowAmount: LoanInternalPricingMaxBorrowAmount
  }
  asExternal: {
    priceId: OracleKey
    maxBorrowAmount: LoanExternalPricingMaxBorrowAmount
    notional: u128
    maxPriceVariation: u128
  }
}

export interface LoanValuationMethod extends Enum {
  isDiscountedCashFlow: boolean
  isOutstandingDebt: boolean
  isCash: boolean
  asDiscountedCashFlow: LoanValuationDiscountedCashFlow
  asOutstandingDebt: Null
  asCash: Null
  type: 'DiscountedCashFlow' | 'OutstandingDebt' | 'Cash'
}

export interface LoanRepaymentSchedule extends Struct {
  maturity: { isFixed: boolean; asFixed: { date: u64; extension: u64 } } & Enum
  interestPayments: Enum
  payDownSchedule: Enum
}

export interface LoanValuationDiscountedCashFlow extends Struct {
  probabilityOfDefault: u128
  lossGivenDefault: u128
  discountRate: CfgInterestRate
}

export interface LoanRestrictions extends Struct {
  maxBorrowAmount: Enum
  borrows: Enum
  repayments: Enum
}

export interface LoanWriteOffStatus extends Struct {
  percentage: u128
  penalty: u128
}

export interface InterestAccrualRateDetails extends Struct {
  interestRatePerSec: u128
  accumulatedRate: u128
  referenceCount: u32
}

export interface LoanPricingAmount extends Enum {
  isInternal: boolean
  isExternal: boolean
  asInternal: u128
  asExternal: {
    quantity: u128
    settlementPrice: u128
  }
  type: 'Internal' | 'External'
}

export interface LoanPricingRepaidAmount extends Struct {
  principal: LoanPricingAmount
  interest: u128
  unscheduled: u128
}

export interface AccountData extends Struct {
  free: u128
  reserved: u128
  frozen: u128
}

export interface NftItemMetadata extends Struct {
  deposit: u128
  data: Bytes
  isFrozen: boolean
}

export interface PoolFeeBucket extends Enum {
  isTop: boolean
  type: 'Top'
}

export interface PoolFeesOfBucket extends Struct {
  bucket: PoolFeeBucket
  fees: Vec<PoolFee>
}

export interface PoolFeeEditor extends Enum {
  isRoot: boolean
  isAccount: boolean
  asAccount: AccountId32
  type: 'Root' | 'Account'
}

export interface PoolFeeAmount extends Enum {
  isShareOfPortfolioValuation: boolean
  asShareOfPortfolioValuation: u128
  isAmountPerSecond: boolean
  asAmountPerSecond: u128
  type: 'ShareOfPortfolioValuation' | 'AmountPerSecond'
}

interface PayableFeeAmount extends Enum {
  readonly isAllPending: boolean
  readonly isUpTo: boolean
  readonly asUpTo: u128
  readonly type: 'AllPending' | 'UpTo'
}

export interface PoolFeeAmounts extends Struct {
  readonly feeType: PoolFeeType
  readonly pending: u128
  readonly disbursement: u128
  readonly payable: PayableFeeAmount
}

export interface PoolFeeType extends Enum {
  isFixed: boolean
  asFixed: {
    limit: PoolFeeAmount
  } & Struct
  isChargedUpTo: boolean
  asChargedUpTo: {
    limit: PoolFeeAmount
  } & Struct
  type: 'Fixed' | 'ChargedUpTo'
}

export interface PoolFeeInfo extends Struct {
  destination: AccountId32
  editor: PoolFeeEditor
  feeType: PoolFeeType
}

export interface PoolFee extends Struct {
  id: u64
  destination: AccountId32
  //editor: PoolFeeEditor
  amounts: PoolFeeAmounts
}

export interface OracleKey extends Enum {
  readonly isIsin: boolean
  readonly asIsin: U8aFixed
  readonly isConversionRatio: boolean
  readonly asConversionRatio: ITuple<[TokensCurrencyId, TokensCurrencyId]>
  readonly isPoolLoanId: boolean
  readonly asPoolLoanId: ITuple<[u64, u64]>
  readonly type: 'Isin' | 'ConversionRatio' | 'PoolLoanId'
}

interface DevelopmentRuntimeOriginCaller extends Enum {
  readonly isSystem: boolean
  readonly asSystem: unknown //FrameSupportDispatchRawOrigin;
  readonly isVoid: boolean
  readonly isCouncil: boolean
  readonly asCouncil: unknown //PalletCollectiveRawOrigin;
  readonly isLiquidityPoolsGateway: boolean
  readonly asLiquidityPoolsGateway: unknown //PalletLiquidityPoolsGatewayOriginGatewayOrigin;
  readonly isPolkadotXcm: boolean
  readonly asPolkadotXcm: unknown //PalletXcmOrigin;
  readonly isCumulusXcm: boolean
  readonly asCumulusXcm: unknown //CumulusPalletXcmOrigin;
  readonly isEthereum: boolean
  readonly asEthereum: unknown //PalletEthereumRawOrigin;
  readonly type: 'System' | 'Void' | 'Council' | 'LiquidityPoolsGateway' | 'PolkadotXcm' | 'CumulusXcm' | 'Ethereum'
}

export interface CashflowPayment extends Struct {
  when: u64
  principal: Balance
  interest: Balance
}

export interface DispatchError extends Enum {}

export type LoanAsset = ITuple<[collectionId: u64, itemId: u128]>
export type LoanCreatedEvent = ITuple<[poolId: u64, loanId: u64, loanInfo: LoanInfoCreated]>
export type LoanClosedEvent = ITuple<[poolId: u64, loanId: u64, collateralInfo: LoanAsset]>
export type LoanBorrowedEvent = ITuple<[poolId: u64, loanId: u64, amount: LoanPricingAmount]>
export type LoanRepaidEvent = ITuple<[poolId: u64, loanId: u64, amount: LoanPricingRepaidAmount]>
export type LoanWrittenOffEvent = ITuple<[poolId: u64, loanId: u64, writeOffStatus: LoanWriteOffStatus]>
export type LoanDebtTransferred = ITuple<
  [poolId: u64, fromLoanId: u64, toLoanId: u64, repaidAmount: LoanPricingRepaidAmount, borrowAmount: LoanPricingAmount]
>
export type LoanDebtTransferred1024 = ITuple<[poolId: u64, fromLoanId: u64, toLoanId: u64, amount: u128]>
export type LoanDebtIncreased = ITuple<[poolId: u64, loanId: u64, borrowAmount: LoanPricingAmount]>
export type LoanDebtDecreased = ITuple<[poolId: u64, loanId: u64, repaidAmount: LoanPricingRepaidAmount]>

export type PoolCreatedEvent = ITuple<[admin: AccountId32, depositor: AccountId32, poolId: u64, essence: PoolEssence]>
export type PoolUpdatedEvent = ITuple<[admin: AccountId32, old: PoolEssence, new: PoolEssence]>
export type PoolMetadataSetEvent = ITuple<[poolId: u64, metadata: Bytes]>

export type EpochClosedExecutedEvent = ITuple<[poolId: u64, epochId: u32]>
export type EpochSolutionEvent = ITuple<[poolId: u64, epochId: u32, solution: EpochSolution]>

export type InvestOrdersCollectedEvent = ITuple<
  [
    investmentId: TrancheCurrency | TrancheCurrencyBefore1400,
    who: AccountId32,
    processedOrders: Vec<u64>,
    collection: InvestCollection,
    outcome: Enum,
  ]
>

export interface RemarksRemark extends Enum {
  readonly isIpfsHash: boolean
  readonly asIpfsHash: Bytes
  readonly isNamed: boolean
  readonly asNamed: Bytes
  readonly isLoan: boolean
  readonly asLoan: ITuple<[u64, u64]>
  readonly type: 'IpfsHash' | 'Named' | 'Loan'
}

export type RedeemOrdersCollectedEvent = ITuple<
  [
    investmentId: TrancheCurrency | TrancheCurrencyBefore1400,
    who: AccountId32,
    collections: Vec<u64>,
    collection: RedeemCollection,
    outcome: Enum,
  ]
>
export type OrderUpdatedEvent = ITuple<
  [investmentId: TrancheCurrency | TrancheCurrencyBefore1400, submittedAt: u64, who: AccountId32, amount: u128]
>
export type OrdersClearedEvent = ITuple<
  [investmentId: TrancheCurrency | TrancheCurrencyBefore1400, orderId: u64, fulfillment: OrdersFulfillment]
>
export type TokensTransferEvent = ITuple<
  [currencyId: TokensCurrencyId, from: AccountId32, to: AccountId32, amount: u128]
>
export type TokensEndowedDepositedWithdrawnEvent = ITuple<
  [currencyId: TokensCurrencyId, who: AccountId32, amount: u128]
>

export type UniquesMetadataSetEvent = ITuple<[collection: u64, item: u128, data: Bytes, isFrozen: bool]>

export type PoolFeesProposedEvent = ITuple<[poolId: u64, feeId: u64, bucket: PoolFeeBucket, fee: PoolFeeInfo]>
export type PoolFeesAddedEvent = ITuple<[poolId: u64, bucket: PoolFeeBucket, feeId: u64, fee: PoolFeeInfo]>
export type PoolFeesRemovedEvent = ITuple<[poolId: u64, bucket: PoolFeeBucket, feeId: u64]>
export type PoolFeesChargedEvent = ITuple<[poolId: u64, feeId: u64, amount: u128, pending: u128]>
export type PoolFeesUnchargedEvent = PoolFeesChargedEvent
export type PoolFeesPaidEvent = ITuple<[poolId: u64, feeId: u64, amount: u128, destination: AccountId32]>
export type PoolFeesList = Vec<PoolFeesOfBucket>

export type OracleFedEvent = ITuple<[feeder: DevelopmentRuntimeOriginCaller, key: OracleKey, value: u128]>

export type RemarkEvent = ITuple<[remarks: Vec<RemarksRemark>, call: GenericCall]>

export type CfgMigrationInitiatedEvent = ITuple<[sender: AccountId32, receiver: H160, amount: u128]>

export type ExtendedRpc = {
  pools: {
    trancheTokenPrice: PromiseRpcResult<
      AugmentedRpc<(poolId: number | string, trancheId: number[]) => Observable<u128>>
    >
    trancheTokenPrices: PromiseRpcResult<AugmentedRpc<(poolId: number | string) => Observable<Vec<u128>>>>
  }
}

export type ExtendedCall = {
  loansApi: {
    portfolio: AugmentedCall<'promise', (poolId: string) => Observable<Vec<ITuple<[u64, LoanInfoActivePortfolio]>>>>
    expectedCashflows: AugmentedCall<
      'promise',
      (poolId: string, loanId: string) => Observable<Result<Vec<CashflowPayment>, DispatchError>>
    >
  }
  poolsApi: {
    nav: AugmentedCall<'promise', (poolId: string) => Observable<Option<PoolNav>>>
    trancheTokenPrices: AugmentedCall<'promise', (poolId: string) => Observable<Option<Vec<u128>>>>
    trancheTokenPrice: AugmentedCall<'promise', (poolId: string, trancheId: string) => Observable<Option<u128>>>
  }
  poolFeesApi: {
    listFees: AugmentedCall<'promise', (poolId: string) => Observable<Option<PoolFeesList>>>
  }
}

export type ApiQueryLoansActiveLoans = Vec<ITuple<[u64, LoanInfoActive]>>

export type TrancheCurrency = ITuple<[poolId: u64, trancheId: U8aFixed]>
export interface TrancheCurrencyBefore1400 extends Struct {
  poolId: u64
  trancheId: U8aFixed
}
