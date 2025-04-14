import { AssetStatus, AssetType, AssetValuationMethod, PoolSnapshot } from '../../types'
import { EthereumBlock } from '@subql/types-ethereum'
import { DAIName, DAISymbol, DAIMainnetAddress, multicallAddress, tinlakePools } from '../../config'
import { errorHandler } from '../../helpers/errorHandler'
import { PoolService } from '../services/poolService'
import { TrancheService } from '../services/trancheService'
import { CurrencyService } from '../services/currencyService'
import { BlockchainService } from '../services/blockchainService'
import {
  ShelfAbi__factory,
  NavfeedAbi__factory,
  AssessorAbi__factory,
  ReserveAbi__factory,
  PileAbi__factory,
  MulticallAbi__factory,
} from '../../types/contracts'
import { TimekeeperService, getPeriodStart } from '../../helpers/timekeeperService'
import { AssetService } from '../services/assetService'
import { BlockInfo, statesSnapshotter } from '../../helpers/stateSnapshot'
import { Multicall3 } from '../../types/contracts/MulticallAbi'
import type { Provider } from '@ethersproject/providers'
import type { BigNumber } from '@ethersproject/bignumber'
import { SnapshotPeriodService } from '../services/snapshotPeriodService'
import type { BytesLike, Interface, Result } from 'ethers/lib/utils'
import { paginatedGetter } from '../../helpers/paginatedGetter'

const timekeeper = TimekeeperService.init()

const ALT_1_POOL_ID = '0xf96f18f2c70b57ec864cc0c8b828450b82ff63e3'
const ALT_1_END_BLOCK = 20120759

const BLOCKTOWER_POOLS = [
  '0x4597f91cc06687bdb74147c80c097a79358ed29b',
  '0xb5c08534d1e73582fbd79e7c45694cad6a5c5ab2',
  '0x90040f96ab8f291b6d43a8972806e977631affde',
  '0x55d86d51ac3bcab7ab7d2124931fba106c8b60c7',
]

export const handleEthBlock = errorHandler(_handleEthBlock)
async function _handleEthBlock(block: EthereumBlock): Promise<void> {
  const date = new Date(Number(block.timestamp) * 1000)
  const blockNumber = block.number
  const newPeriod = (await timekeeper).processBlock(date)
  const blockPeriodStart = getPeriodStart(date)

  if (!newPeriod) return
  logger.info(`It's a new period on EVM block ${blockNumber}: ${date.toISOString()}`)
  const blockchain = await BlockchainService.getOrInit(chainId)
  const currency = await CurrencyService.getOrInitEvm(blockchain.id, DAIMainnetAddress, DAISymbol, DAIName)

  const snapshotPeriod = SnapshotPeriodService.init(blockPeriodStart)
  await snapshotPeriod.save()

  // update pool states
  const processedPools: ProcessedPools = {}
  const poolUpdateCalls: MulticallArgs[] = []

  for (const tinlakePool of tinlakePools) {
    if (blockNumber < tinlakePool.startBlock) continue
    logger.info(`Preparing pool update calls for pool ${tinlakePool.id}`)
    const pool = await PoolService.getOrSeed(tinlakePool.id, false, false, blockchain.id)
    const latestNavFeed = getLatestContract(tinlakePool.navFeed, blockNumber)
    const latestReserve = getLatestContract(tinlakePool.reserve, blockNumber)
    const latestAssessor = getLatestContract(tinlakePool.assessor, blockNumber)
    const latestShelf = getLatestContract(tinlakePool.shelf, blockNumber)
    const latestPile = getLatestContract(tinlakePool.pile, blockNumber)
    const isClosedPool = pool.id === ALT_1_POOL_ID && blockNumber > ALT_1_END_BLOCK

    // initialize new pool
    if (!pool.isActive && !isClosedPool) {
      await pool.initTinlake(tinlakePool.shortName, currency.id, date, blockNumber)
      await pool.save()

      const senior = await TrancheService.getOrSeed(pool.id, 'senior', blockchain.id)
      await senior.initTinlake(pool.id, `${pool.name} (Senior)`, 1, BigInt(tinlakePool.seniorInterestRate))
      await senior.save()

      const junior = await TrancheService.getOrSeed(pool.id, 'junior', blockchain.id)
      await junior.initTinlake(pool.id, `${pool.name} (Junior)`, 0)
      await junior.save()
    }

    //Close pool if closing is pending
    if (isClosedPool && !pool.isClosed()) {
      pool.setPortfolioValuation(BigInt(0))
      pool.setTotalReserve(BigInt(0))
      pool.setNetAssetValue()
      pool.updateNormalizedNAV(currency.decimals)
      pool.close(date, blockNumber)
      continue
    }

    processedPools[pool.id] = {
      pool,
      latestNavFeed,
      latestReserve,
      latestAssessor,
      latestShelf,
      latestPile,
      tinlakePool,
    }

    //Append navFeed Call for pool
    if (latestNavFeed && !!latestNavFeed.address) {
      logger.info(`Appending navFeed Call for pool ${pool.id} to address ${latestNavFeed.address}`)
      poolUpdateCalls.push([NavfeedAbi__factory.createInterface(), pool.id, 'currentNAV', latestNavFeed.address])
    }
    //Append totalBalance Call for pool
    if (latestReserve && latestReserve.address) {
      logger.info(`Appending totalBalance Call for pool ${pool.id} to address ${latestReserve.address}`)
      poolUpdateCalls.push([ReserveAbi__factory.createInterface(), pool.id, 'totalBalance', latestReserve.address])
    }
    //Append token price calls for pool
    if (latestAssessor && latestAssessor.address) {
      logger.info(`Appending token price calls for pool ${pool.id} to address ${latestAssessor.address}`)
      poolUpdateCalls.push([
        AssessorAbi__factory.createInterface(),
        pool.id,
        'calcSeniorTokenPrice',
        latestAssessor.address,
      ])
      poolUpdateCalls.push([
        AssessorAbi__factory.createInterface(),
        pool.id,
        'calcJuniorTokenPrice',
        latestAssessor.address,
      ])
    }
  }

  //Execute available calls
  const poolData = await multicall(poolUpdateCalls)
  for (const [poolId, callData] of Object.entries(poolData)) {
    const { pool } = processedPools[poolId]
    const { currentNAV, totalBalance, calcSeniorTokenPrice, calcJuniorTokenPrice } = callData
    if (currentNAV) {
      pool.setPortfolioValuation(currentNAV[0].toBigInt())
      pool.setNetAssetValue()
      pool.updateNormalizedNAV(currency.decimals)
    }
    if (totalBalance) {
      pool.setTotalReserve(totalBalance[0].toBigInt())
      pool.setNetAssetValue()
      pool.updateNormalizedNAV(currency.decimals)
    }
    if (calcSeniorTokenPrice) {
      const senior = await TrancheService.getOrSeed(pool.id, 'senior', blockchain.id)
      senior.setTokenPrice(calcSeniorTokenPrice[0].toBigInt())
      await senior.save()
    }
    if (calcJuniorTokenPrice) {
      const junior = await TrancheService.getOrSeed(pool.id, 'junior', blockchain.id)
      junior.setTokenPrice(calcJuniorTokenPrice[0].toBigInt())
      await junior.save()
    }
  }

  for (const row of Object.values(processedPools)) {
    if (date.toDateString() !== new Date().toDateString()) break

    const { pool, latestNavFeed, latestShelf, latestPile } = row
    if (!latestNavFeed || !latestNavFeed.address) continue
    if (!latestShelf || !latestShelf.address) continue
    if (!latestPile || !latestPile.address) continue
    await updateLoans(
      blockchain,
      pool,
      date,
      blockNumber,
      latestShelf.address,
      latestPile.address,
      latestNavFeed.address
    )
  }

  // Save Pools
  const poolSaves = Object.values(processedPools).map(({ pool }) => pool.save())
  await Promise.all(poolSaves)

  // Take snapshots
  const blockInfo: BlockInfo = { timestamp: date, number: block.number }
  const poolsToSnapshot: PoolService[] = Object.values(processedPools).map(({ pool }) => pool)
  await statesSnapshotter('periodId', snapshotPeriod.id, poolsToSnapshot, PoolSnapshot, blockInfo, 'poolId')

  //Update tracking of period and continue
  await (await timekeeper).update(snapshotPeriod.start)
}

async function updateLoans(
  blockchain: BlockchainService,
  pool: PoolService,
  blockDate: Date,
  blockNumber: number,
  shelf: string,
  pile: string,
  navFeed: string
) {
  logger.info(`Starting the update of loans for pool ${pool.id}...`)
  const existingLoans = (await paginatedGetter(AssetService, [['poolId', '=', pool.id]])) as AssetService[]
  const existingLoanIds = existingLoans.map((loan) => parseInt(loan.id.split('-')[1]))
  const newLoans = (await getNewLoans(existingLoanIds, shelf)).map(([id]) =>
    AssetService.init(
      pool.id,
      id.toString(),
      AssetType.Other,
      AssetValuationMethod.DiscountedCashFlow,
      undefined,
      undefined,
      blockDate,
      blockchain.id
    )
  )
  logger.info(`Found ${newLoans.length} new loans for pool ${pool.id}`)

  const isBlocktower = BLOCKTOWER_POOLS.includes(pool.id)

  const nftIdCalls: MulticallArgs[] = []
  for (const newLoan of newLoans) {
    const [_poolId, loanIndex] = newLoan.id.split('-')
    nftIdCalls.push([NavfeedAbi__factory.createInterface(), newLoan.id, 'nftID', navFeed, [loanIndex]])
  }

  const nftIdData = await multicall(nftIdCalls)

  const maturityDateCalls: MulticallArgs[] = []
  for (const newLoan of newLoans) {
    const { nftId } = nftIdData[newLoan.id]
    if (!isBlocktower && nftId)
      maturityDateCalls.push([NavfeedAbi__factory.createInterface(), newLoan.id, 'maturityDate', navFeed, [nftId[0]]])
  }

  const maturityDateData = await multicall(maturityDateCalls)

  // create new loans
  for (const newLoan of newLoans) {
    const { nftId } = nftIdData[newLoan.id]
    const { maturityDate } = maturityDateData[newLoan.id] ?? { maturityDate: undefined }
    if (nftId) newLoan.nftId = nftId[0]
    if (maturityDate) newLoan.actualMaturityDate = new Date((maturityDate[0] as BigNumber).toNumber() * 1000)
    logger.info(
      `Initialising new loan ${newLoan.id} with nftId ${newLoan.nftId} and maturityDate ${newLoan.actualMaturityDate}`
    )
  }

  // update existing loans
  const loansToSave = [...existingLoans, ...newLoans].filter((loan) => loan.status !== AssetStatus.CLOSED)
  logger.info(` ${loansToSave.length} existing loans for pool ${pool.id}`)

  const loanDetailsCalls: MulticallArgs[] = []
  for (const loan of loansToSave) {
    const loanIndex = loan.id.split('-')[1]
    loanDetailsCalls.push([ShelfAbi__factory.createInterface(), loan.id, 'nftLocked', shelf, [loanIndex]])
    loanDetailsCalls.push([PileAbi__factory.createInterface(), loan.id, 'debt', pile, [loanIndex]])
    loanDetailsCalls.push([PileAbi__factory.createInterface(), loan.id, 'loanRates', pile, [loanIndex]])
  }

  const loanDetails = await multicall(loanDetailsCalls)

  const loanRatesCalls: MulticallArgs[] = []
  for (const loan of loansToSave) {
    const { loanRates } = loanDetails[loan.id]
    if (!loanRates) continue
    const rateGroup = loanRates[0].toBigInt()
    loanRatesCalls.push([PileAbi__factory.createInterface(), loan.id, 'rates', pile, [rateGroup]])
  }

  const loanRatesData = await multicall(loanRatesCalls)

  let sumDebt = BigInt(0)
  let sumBorrowed = BigInt(0)
  let sumRepaid = BigInt(0)
  let sumInterestRatePerSec = BigInt(0)
  let sumBorrowsCount = BigInt(0)
  let sumRepaysCount = BigInt(0)

  for (const loan of loansToSave) {
    const { nftLocked, debt } = loanDetails[loan.id]
    const prevDebt = loan.outstandingDebt ?? BigInt(0)
    const newDebt = debt ? debt[0].toBigInt() : undefined
    const { rates } = loanRatesData[loan.id]
    logger.info(`Loan ${loan.id} has newDebt ${newDebt} and rates ${rates}`)

    if (newDebt && newDebt > BigInt(0)) loan.activate()
    if (loan.status === AssetStatus.ACTIVE && newDebt === BigInt(0)) loan.close()
    if (!nftLocked) loan.close()
    if (newDebt) loan.outstandingDebt = newDebt

    const currentDebt = loan.outstandingDebt ?? BigInt(0)
    if (rates) loan.interestRatePerSec = rates.ratePerSecond.toBigInt()

    if (prevDebt > currentDebt) {
      loan.repaidAmountByPeriod = prevDebt - currentDebt
      loan.totalRepaid = (loan.totalRepaid ?? BigInt(0)) + loan.repaidAmountByPeriod
      loan.repaysCount = (loan.repaysCount ?? BigInt(0)) + BigInt(1)
    }
    if (
      loan.interestRatePerSec &&
      prevDebt * (loan.interestRatePerSec / BigInt(10) ** BigInt(27)) * BigInt(86400) <
        (loan.outstandingDebt ?? BigInt(0))
    ) {
      loan.borrowedAmountByPeriod = (loan.outstandingDebt ?? BigInt(0)) - prevDebt
      loan.totalBorrowed = (loan.totalBorrowed ?? BigInt(0)) + loan.borrowedAmountByPeriod
      loan.borrowsCount = (loan.borrowsCount ?? BigInt(0)) + BigInt(1)
    }
    logger.info(`Saving loan ${loan.id} for pool ${pool.id}`)
    await loan.save()

    sumDebt += loan.outstandingDebt ?? BigInt(0)
    sumBorrowed += loan.totalBorrowed ?? BigInt(0)
    sumRepaid += loan.totalRepaid ?? BigInt(0)
    sumInterestRatePerSec += (loan.interestRatePerSec ?? BigInt(0)) * (loan.outstandingDebt ?? BigInt(0))
    sumBorrowsCount += loan.borrowsCount ?? BigInt(0)
    sumRepaysCount += loan.repaysCount ?? BigInt(0)
  }

  pool.sumDebt = sumDebt
  pool.sumBorrowedAmount = sumBorrowed
  pool.sumRepaidAmount = sumRepaid
  pool.weightedAverageInterestRatePerSec = sumDebt > BigInt(0) ? sumInterestRatePerSec / sumDebt : BigInt(0)
  pool.sumBorrowsCount = sumBorrowsCount
  pool.sumRepaysCount = sumRepaysCount
  logger.info(`Completed the update of loans for pool ${pool.id}`)
}

async function getNewLoans(existingLoans: number[], shelfAddress: string) {
  const newLoans: [id: number, { registry: string; nft: BigNumber }][] = []
  const shelfContract = ShelfAbi__factory.connect(shelfAddress, api as Provider)
  let lastLoanId = existingLoans.length
  let isLoan = false
  do {
    lastLoanId++
    const response = await shelfContract.token(lastLoanId).catch((e) => {
      throw new Error(`Failed shelfcontract.token call. ${e}`)
    })
    isLoan = response && response.registry !== '0x0000000000000000000000000000000000000000'
    if (isLoan) newLoans.push([lastLoanId, { registry: response.registry, nft: response.nft }])
  } while (isLoan)
  logger.info(`Found ${newLoans.length} new loans`)

  return newLoans
}

function getLatestContract(contractArray: ContractArray[], blockNumber: number) {
  if (contractArray.length === 1) return contractArray[0]
  return contractArray.sort((a, b) => b.startBlock! - a.startBlock!).find((entry) => entry.startBlock! <= blockNumber)
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

function setupMulticall(
  abiInterface: Interface,
  key: string,
  functionFragment: string,
  address: string,
  params?: [BytesLike]
): MulticallData {
  const fragment = abiInterface.getFunction(functionFragment)
  logger.info(
    `Setting up multicall for ${key} for function ${fragment.name} to address ${address} with params ${params}`
  )
  return {
    id: key,
    type: fragment.name,
    interface: abiInterface,
    call: {
      target: address,
      callData: abiInterface.encodeFunctionData(fragment, params),
    },
    rawResult: undefined,
    decodedResult: undefined,
  }
}

async function processCalls(calls: MulticallData[], batchSize = 30): Promise<void> {
  if (calls.length === 0) return

  const callBatches = chunkArray(calls, batchSize)

  for (const [i, callBatch] of callBatches.entries()) {
    logger.info(
      `Processing Multicall batch ${i + 1} of ${callBatches.length} ` +
        `with size ${callBatch.length} to address ${multicallAddress}...`
    )
    try {
      const multicall = MulticallAbi__factory.connect(multicallAddress, api as Provider)
      const [_blockNumber, returnData] = await multicall.callStatic.aggregate(callBatch.map((call) => call.call))

      // Process successful results
      for (const [j, rawResult] of returnData.entries()) {
        const callIndex = i * batchSize + j
        calls[callIndex]['rawResult'] = rawResult
      }
    } catch (e) {
      logger.error(`Error calling Multicall batch ${i + 1}: ${e}`)
    }
  }
}

function decodeResults(multicallData: MulticallData[]) {
  for (const result of multicallData) {
    if (!result.rawResult) {
      logger.error(`Missing raw result for call ${result.id}-${result.type}`)
      continue
    }
    try {
      logger.info(`Decoding result for call ${result.id}-${result.type}`)
      result.decodedResult = result.interface.decodeFunctionResult(result.type, result.rawResult)
    } catch (err) {
      const { message } = err as Error
      logger.error(`Failed to decode interface call ${result.id}-${result.type}: ${message}`)
      result.decodedResult = undefined
    }
  }
}

async function multicall(callParameters: MulticallArgs[], batchSize = 30) {
  const results = callParameters.map((call) => setupMulticall(...call))
  await processCalls(results, batchSize)
  await decodeResults(results)

  const unpackedResults = results.reduce<Record<string, Record<string, Result | undefined>>>(
    (unpackedResult, result) => {
      if (unpackedResult[result.id] === undefined) unpackedResult[result.id] = {}
      unpackedResult[result.id][result.type] = result.decodedResult
      return unpackedResult
    },
    {}
  )
  return unpackedResults
}

type MulticallArgs = [
  abiInterface: Interface,
  key: string,
  functionFragment: string,
  address: string,
  params?: [BytesLike],
]

interface MulticallData {
  id: string
  type: string
  interface: Interface
  call: Multicall3.CallStruct
  rawResult?: BytesLike
  decodedResult?: Result
}

interface ContractArray {
  address: string | null
  startBlock?: number
}

type ProcessedPools = Record<
  PoolService['id'],
  {
    pool: PoolService
    tinlakePool: (typeof tinlakePools)[0]
    latestNavFeed?: ContractArray
    latestReserve?: ContractArray
    latestAssessor?: ContractArray
    latestShelf?: ContractArray
    latestPile?: ContractArray
  }
>
