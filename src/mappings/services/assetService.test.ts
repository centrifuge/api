import { AssetType, AssetValuationMethod } from '../../types'
import { AssetService } from './assetService'

const poolId = '1111111111'
const loanId = 'ABCD'
const nftClassId = BigInt(1)
const nftItemId = BigInt(2)
const timestamp = new Date()
const metadata = 'AAAAAA'

api.query['uniques']= {
  instanceMetadataOf: jest.fn(() => ({
    isNone: false,
    unwrap: () => ({ data: { toUtf8: () => metadata } }),
  })),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const loan = AssetService.init(
  poolId,
  loanId,
  AssetType.OffchainCash,
  AssetValuationMethod.Cash,
  nftClassId,
  nftItemId,
  timestamp
)

describe('Given a new loan, when initialised', () => {
  test('then type is inactive', () => {
    expect(loan.isActive).toBe(false)
    expect(loan.status).toBe('CREATED')
  })

  test('then reset accumulators are set to 0', () => {
    const resetAccumulators = Object.getOwnPropertyNames(loan).filter((prop) => prop.endsWith('ByPeriod'))
    for (const resetAccumulator of resetAccumulators) {
      expect(loan[resetAccumulator as keyof typeof loan]).toBe(BigInt(0))
    }
  })

  test('when the metadata is fetched, then the correct values are set', async () => {
    await loan.updateItemMetadata()
    expect(api.query.uniques.instanceMetadataOf).toHaveBeenCalledWith(nftClassId, nftItemId)
    expect(loan.metadata).toBe(metadata)
  })

  test('then it can be saved to the database with the correct id format', async () => {
    await loan.save()
    expect(store.set).toHaveBeenCalledWith('Asset', `${poolId}-${loanId}`, expect.anything())
  })
})
