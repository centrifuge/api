import { AssetStatus, AssetType, AssetValuationMethod, PoolSnapshot } from '../../types'
import { EthereumBlock } from '@subql/types-ethereum'
import { DAIName, DAISymbol, DAIMainnetAddress, multicallAddress, tinlakePools } from '../../config'
import { errorHandler, missingPool } from '../../helpers/errorHandler'
import { PoolService } from '../services/poolService'
import { TrancheService } from '../services/trancheService'
import { CurrencyService } from '../services/currencyService'
import { BlockchainService } from '../services/blockchainService'
import {
  ShelfAbi__factory,
  NavfeedAbi__factory,
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

const timekeeper = TimekeeperService.init()

const ALT_1_POOL_ID = '0xf96f18f2c70b57ec864cc0c8b828450b82ff63e3'
const ALT_1_END_BLOCK = 20120759

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
  const processedPools: Record<
    PoolService['id'],
    {
      pool: PoolService
      tinlakePool:  typeof tinlakePools[0]
      latestNavFeed?: ContractArray
      latestReserve?: ContractArray
    }
  > = {}
  const poolUpdateCalls: PoolMulticall[] = []

  for (const tinlakePool of tinlakePools) {
    if (blockNumber < tinlakePool.startBlock) continue
    const pool = await PoolService.getOrSeed(tinlakePool.id, false, false, blockchain.id)
    const latestNavFeed = getLatestContract(tinlakePool.navFeed, blockNumber)
    const latestReserve = getLatestContract(tinlakePool.reserve, blockNumber)
    processedPools[pool.id] = { pool, latestNavFeed, latestReserve, tinlakePool }

    // initialize new pool
    if (!pool.isActive) {
      await pool.initTinlake(tinlakePool.shortName, currency.id, date, blockNumber)
      await pool.save()

      const senior = await TrancheService.getOrSeed(pool.id, 'senior', blockchain.id)
      await senior.initTinlake(pool.id, `${pool.name} (Senior)`, 1, BigInt(tinlakePool.seniorInterestRate))
      await senior.save()

      const junior = await TrancheService.getOrSeed(pool.id, 'junior', blockchain.id)
      await junior.initTinlake(pool.id, `${pool.name} (Junior)`, 0)
      await junior.save()
    }

    //Append navFeed Call for pool
    if (latestNavFeed && latestNavFeed.address) {
      poolUpdateCalls.push({
        id: pool.id,
        type: 'currentNAV',
        call: {
          target: latestNavFeed.address,
          callData: NavfeedAbi__factory.createInterface().encodeFunctionData('currentNAV'),
        },
        result: '',
      })
    }
    //Append totalBalance Call for pool
    if (latestReserve && latestReserve.address) {
      poolUpdateCalls.push({
        id: pool.id,
        type: 'totalBalance',
        call: {
          target: latestReserve.address,
          callData: ReserveAbi__factory.createInterface().encodeFunctionData('totalBalance'),
        },
        result: '',
      })
    }
  }

  //Execute available calls
  const callResults: PoolMulticall[] = await processCalls(poolUpdateCalls).catch((err) => {
    logger.error(`poolUpdateCalls failed: ${err}`)
    return []
  })

  for (const callResult of callResults) {
    const { pool, latestNavFeed, latestReserve, tinlakePool } = processedPools[callResult.id]
    // Update pool vurrentNav
    if (callResult.type === 'currentNAV' && latestNavFeed) {
      const currentNAV =
        pool.id === ALT_1_POOL_ID && blockNumber > ALT_1_END_BLOCK
          ? BigInt(0)
          : NavfeedAbi__factory.createInterface().decodeFunctionResult('currentNAV', callResult.result)[0].toBigInt()
      pool.portfolioValuation = currentNAV
      pool.netAssetValue =
        pool.id === ALT_1_POOL_ID && blockNumber > ALT_1_END_BLOCK
          ? BigInt(0)
          : (pool.portfolioValuation ?? BigInt(0)) + (pool.totalReserve ?? BigInt(0))
      await pool.updateNormalizedNAV()
      logger.info(`Updating pool ${pool.id} with portfolioValuation: ${pool.portfolioValuation}`)
    }

    // Update pool reserve
    if (callResult.type === 'totalBalance' && latestReserve) {
      const totalBalance =
        pool.id === ALT_1_POOL_ID && blockNumber > ALT_1_END_BLOCK
          ? BigInt(0)
          : ReserveAbi__factory.createInterface().decodeFunctionResult('totalBalance', callResult.result)[0].toBigInt()
      pool.totalReserve = totalBalance
      pool.netAssetValue = (pool.portfolioValuation ?? BigInt(0)) + (pool.totalReserve ?? BigInt(0))
      await pool.updateNormalizedNAV()
      logger.info(`Updating pool ${pool.id} with totalReserve: ${pool.totalReserve}`)
    }

    // Update loans (only index if fully synced)
    if (latestNavFeed && latestNavFeed.address && date.toDateString() === new Date().toDateString()) {
      await updateLoans(
        pool.id,
        date,
        blockNumber,
        tinlakePool!.shelf[0].address,
        tinlakePool!.pile[0].address,
        latestNavFeed.address
      )
    }

    await pool.save()
  }

  // Take snapshots
  const blockInfo: BlockInfo = { timestamp: date, number: block.number }
  const poolsToSnapshot: PoolService[] = Object.values(processedPools).map(e => e.pool)
  await statesSnapshotter('periodId', snapshotPeriod.id, poolsToSnapshot, PoolSnapshot, blockInfo, 'poolId')

  //Update tracking of period and continue
  await (await timekeeper).update(snapshotPeriod.start)
}

type NewLoanData = {
  id: string
  nftId: string
  maturityDate?: unknown
}

async function updateLoans(
  poolId: string,
  blockDate: Date,
  blockNumber: number,
  shelf: string,
  pile: string,
  navFeed: string
) {
  logger.info(`Updating loans for pool ${poolId}`)
  let existingLoans = await AssetService.getByPoolId(poolId, { limit: 100 })
  const existingLoanIds = existingLoans?.map((loan) => parseInt(loan.id.split('-')[1]))
  const newLoans = await getNewLoans(existingLoanIds as number[], shelf)
  logger.info(`Found ${newLoans.length} new loans for pool ${poolId}`)

  const pool = await PoolService.getById(poolId)
  if (!pool) throw missingPool
  const isAlt1AndAfterEndBlock = poolId === ALT_1_POOL_ID && blockNumber > ALT_1_END_BLOCK

  const nftIdCalls: PoolMulticall[] = []
  for (const loanIndex of newLoans) {
    nftIdCalls.push({
      id: loanIndex.toString(),
      call: {
        target: navFeed,
        callData: NavfeedAbi__factory.createInterface().encodeFunctionData('nftID', [loanIndex]),
      },
      type: 'nftId',
      result: '',
    })
  }
  if (nftIdCalls.length > 0) {
    const newLoanData: NewLoanData[] = []
    const nftIdResponses: PoolMulticall[] = await processCalls(nftIdCalls).catch((err) => {
      logger.error(`nftIdCalls failed: ${err}`)
      return []
    })
    for (const response of nftIdResponses) {
      if (response.result) {
        const data: NewLoanData = {
          id: response.id,
          nftId: NavfeedAbi__factory.createInterface().decodeFunctionResult('nftID', response.result)[0],
        }
        newLoanData.push(data)
      }
    }

    // Ignore Blocktower pools, since their loans have no maturity dates
    const isBlocktower = [
      '0x4597f91cc06687bdb74147c80c097a79358ed29b',
      '0xb5c08534d1e73582fbd79e7c45694cad6a5c5ab2',
      '0x90040f96ab8f291b6d43a8972806e977631affde',
      '0x55d86d51ac3bcab7ab7d2124931fba106c8b60c7',
    ].includes(poolId)

    if (!isBlocktower) {
      const maturityDateCalls: PoolMulticall[] = []
      for (const { id, nftId } of newLoanData) {
        maturityDateCalls.push({
          id,
          type: 'maturityDate',
          call: {
            target: navFeed,
            callData: NavfeedAbi__factory.createInterface().encodeFunctionData('maturityDate', [nftId]),
          },
          result: '',
        })
      }
      const maturityDateResponses: PoolMulticall[] = await processCalls(maturityDateCalls).catch((err) => {
        logger.error(`naturityDateCalls failed: ${err}`)
        return []
      })
      maturityDateResponses.map((response) => {
        if (response.result) {
          const loan = newLoanData.find((loan) => loan.id === response.id)
          if (loan) {
            loan.maturityDate = NavfeedAbi__factory.createInterface().decodeFunctionResult(
              'maturityDate',
              response.result
            )[0]
          }
        }
      })
    }

    // create new loans
    for (const { id, nftId, maturityDate } of newLoanData) {
      const loan = AssetService.init(
        poolId,
        id,
        AssetType.Other,
        AssetValuationMethod.DiscountedCashFlow,
        undefined,
        undefined,
        blockDate
      )
      if (!isBlocktower) {
        loan.actualMaturityDate = new Date((maturityDate as BigNumber).toNumber() * 1000)
      }
      loan.nftId = nftId
      loan.name = id
      loan.totalBorrowed = BigInt(0)
      loan.totalRepaid = BigInt(0)
      loan.outstandingDebt = BigInt(0)
      loan.borrowedAmountByPeriod = BigInt(0)
      loan.repaidAmountByPeriod = BigInt(0)
      loan.save()
    }
    logger.info(`Creating ${newLoans.length} new loans for pool ${poolId}`)
  }

  // update all loans
  existingLoans =
    (await AssetService.getByPoolId(poolId, { limit: 100 }))?.filter((loan) => loan.status !== AssetStatus.CLOSED) ?? []
  logger.info(`Updating ${existingLoans?.length} existing loans for pool ${poolId}`)
  const loanDetailsCalls: PoolMulticall[] = []
  existingLoans.forEach((loan) => {
    const loanIndex = loan.id.split('-')[1]
    loanDetailsCalls.push({
      id: loanIndex,
      type: 'nftLocked',
      call: {
        target: shelf,
        callData: ShelfAbi__factory.createInterface().encodeFunctionData('nftLocked', [loanIndex]),
      },
      result: '',
    })
    loanDetailsCalls.push({
      id: loanIndex,
      type: 'debt',
      call: {
        target: pile,
        callData: PileAbi__factory.createInterface().encodeFunctionData('debt', [loanIndex]),
      },
      result: '',
    })
    loanDetailsCalls.push({
      id: loanIndex,
      type: 'loanRates',
      call: {
        target: pile,
        callData: PileAbi__factory.createInterface().encodeFunctionData('loanRates', [loanIndex]),
      },
      result: '',
    })
  })
  if (loanDetailsCalls.length > 0) {
    const loanDetailsResponses: PoolMulticall[] = await processCalls(loanDetailsCalls).catch((err) => {
      logger.error(`loanDetailsCalls failed: ${err}`)
      return []
    })
    const loanDetails: LoanDetails = {}
    for (const loanDetailsResponse of loanDetailsResponses) {
      const loanId = loanDetailsResponse.id
      if (!loanDetailsResponse.result) continue

      if (!loanDetails[loanId]) loanDetails[loanId] = {}

      if (loanDetailsResponse.type !== 'nftLocked') {
        loanDetails[loanId].nftLocked = ShelfAbi__factory.createInterface().decodeFunctionResult(
          'nftLocked',
          loanDetailsResponse.result
        )[0]
      }
      if (loanDetailsResponse.type === 'debt') {
        loanDetails[loanId].debt = isAlt1AndAfterEndBlock
          ? BigInt(0)
          : PileAbi__factory.createInterface().decodeFunctionResult('debt', loanDetailsResponse.result)[0].toBigInt()
      }
      if (loanDetailsResponse.type === 'loanRates') {
        loanDetails[loanId].loanRates = PileAbi__factory.createInterface().decodeFunctionResult(
          'loanRates',
          loanDetailsResponse.result
        )[0]
      }
    }

    let sumDebt = BigInt(0)
    let sumBorrowed = BigInt(0)
    let sumRepaid = BigInt(0)
    let sumInterestRatePerSec = BigInt(0)
    let sumBorrowsCount = BigInt(0)
    let sumRepaysCount = BigInt(0)
    for (const existingLoan of existingLoans) {
      const loan = existingLoan
      const loanIndex = loan.id.split('-')[1]
      const nftLocked = loanDetails[loanIndex].nftLocked
      const prevDebt = loan.outstandingDebt ?? BigInt(0)
      const debt = loanDetails[loanIndex].debt
      if (debt && debt > BigInt(0)) {
        loan.status = AssetStatus.ACTIVE
      }
      // if the loan is not locked or the debt is 0 and the loan was active before, close it
      if (!nftLocked || (loan.status === AssetStatus.ACTIVE && debt === BigInt(0))) {
        loan.isActive = false
        loan.status = AssetStatus.CLOSED
        await loan.save()
      }
      loan.outstandingDebt = debt
      const currentDebt = loan.outstandingDebt ?? BigInt(0)
      const rateGroup = loanDetails[loanIndex].loanRates
      const pileContract = PileAbi__factory.connect(pile, api as Provider)
      if (!rateGroup) throw new Error(`Missing rateGroup for loan ${loan.id}`)
      const rates = await pileContract.rates(rateGroup)
      loan.interestRatePerSec = rates.ratePerSecond.toBigInt()

      if (prevDebt > currentDebt) {
        loan.repaidAmountByPeriod = prevDebt - currentDebt
        loan.totalRepaid = (loan.totalRepaid ?? BigInt(0)) + loan.repaidAmountByPeriod
        loan.repaysCount = (loan.repaysCount ?? BigInt(0)) + BigInt(1)
      }
      if (
        prevDebt * (loan.interestRatePerSec / BigInt(10) ** BigInt(27)) * BigInt(86400) <
        (loan.outstandingDebt ?? BigInt(0))
      ) {
        loan.borrowedAmountByPeriod = (loan.outstandingDebt ?? BigInt(0)) - prevDebt
        loan.totalBorrowed = (loan.totalBorrowed ?? BigInt(0)) + loan.borrowedAmountByPeriod
        loan.borrowsCount = (loan.borrowsCount ?? BigInt(0)) + BigInt(1)
      }
      logger.info(`Updating loan ${loan.id} for pool ${poolId}`)
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
    await pool.save()
  }
}

async function getNewLoans(existingLoans: number[], shelfAddress: string) {
  let loanIndex = existingLoans.length || 1
  const contractLoans: number[] = []
  const shelfContract = ShelfAbi__factory.connect(shelfAddress, api as Provider)
  // eslint-disable-next-line
  while (true) {
    let response: Awaited<ReturnType<typeof shelfContract.token>>
    try {
      response = await shelfContract.token(loanIndex)
    } catch (e) {
      logger.error(`Failed shelfcontract.token call. ${e}`)
      break
    }
    if (!response || response.registry === '0x0000000000000000000000000000000000000000') {
      logger.info('No more loans')
      // no more loans
      break
    }
    contractLoans.push(loanIndex)
    loanIndex++
  }
  return contractLoans.filter((loanIndex) => !existingLoans.includes(loanIndex))
}

function getLatestContract(contractArray: ContractArray[], blockNumber: number) {
  return contractArray.find((entry) => entry.startBlock <= blockNumber)
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

async function processCalls(callsArray: PoolMulticall[], chunkSize = 30): Promise<PoolMulticall[]> {
  if (callsArray.length === 0) return []
  const callChunks = chunkArray(callsArray, chunkSize)
  for (const [i, chunk] of callChunks.entries()) {
    const multicall = MulticallAbi__factory.connect(multicallAddress, api as Provider)
    let results: [BigNumber, string[]] & {
      blockNumber: BigNumber
      returnData: string[]
    }
    try {
      const calls = chunk.map((call) => call.call)
      results = await multicall.callStatic.aggregate(calls)
      const [_blocknumber, returnData] = results
      returnData.forEach((result, j) => (callsArray[i * chunkSize + j].result = result))
    } catch (e) {
      logger.error(`Error fetching chunk ${i}: ${e}`)
    }
  }
  return callsArray
}

interface PoolMulticall {
  id: string
  type: string
  call: Multicall3.CallStruct
  result: string
}

interface LoanDetails {
  [loanId: string]: {
    nftLocked?: string
    debt?: bigint
    loanRates?: bigint
  }
}

interface ContractArray {
  address: string | null
  startBlock: number
}
