import { errorHandler } from '../../helpers/errorHandler'
import { CfgMigrationInitiatedEvent } from '../../helpers/types'
import { SubstrateEvent } from '@subql/types'
import { AccountService } from '../services/accountService'
import { MigrationService } from '../services/migrationService'
import { nullAddress } from './evmHandlers'
import { utils } from 'ethers'

export const handleCfgMigrationInitiated = errorHandler(_handleCfgMigrationInitiated)
async function _handleCfgMigrationInitiated(event: SubstrateEvent<CfgMigrationInitiatedEvent>) {
  const [_sender, _receiver, _amount] = event.event.data
  const sender = _sender.toHex()
  const receiver = utils.getAddress(_receiver.toHex())
  const cfgTokenChainId =
    chainId === '0xb3db41421702df9a7fcac62b53ffeac85f7853cc4e689e0b93aeb3db18c09d82' ? '1' : '11155111'
  const receiverAddress = AccountService.evmToSubstrate(receiver, cfgTokenChainId)
  const amount = _amount.toBigInt()

  if (receiver === nullAddress) return
  logger.info(
    `CFG migration initiated event from ${sender}` +
      `to ${receiverAddress} with amount ${amount.toString(10)} at block: ${event.block.block.header.number.toString()}`
  )

  const senderAccount = await AccountService.getOrInit(sender)
  const receiverAccount = await AccountService.getOrInit(receiverAddress)

  await MigrationService.sent(
    event.extrinsic!.extrinsic.hash.toHex(),
    event.block.timestamp!,
    senderAccount.id,
    amount,
    receiverAccount.id
  )
}
