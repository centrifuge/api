import { AccountService } from './accountService'

global.isSubstrateNode = true
global.isEvmNode = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.query['evmChainId'] = { chainId: jest.fn(() => ({ toString: () => '2030' })) } as any

test('Account is created in database', async () => {
  const id = 'ABCDE'
  const account = await AccountService.init(id)
  await account.save()

  expect(logger.info).toHaveBeenCalled()
  expect(store.set).toHaveBeenCalledWith('Account', id, { id, chainId: '0' })
})
