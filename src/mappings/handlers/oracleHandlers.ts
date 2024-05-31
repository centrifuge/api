import { SubstrateEvent } from '@subql/types'
import { OracleFedEvent } from '../../helpers/types'
import { errorHandler } from '../../helpers/errorHandler'
import { OracleTransactionData, OracleTransactionService } from '../services/oracleTransactionService'

export const handleOracleFed = errorHandler(_handleOracleFed)
async function _handleOracleFed(event: SubstrateEvent<OracleFedEvent>) {
  const [feeder, key, value] = event.event.data
  logger.info(`Oracle feed: ${feeder.toString()} key: ${key.toString()} value: ${value.toString()}`)
  logger.info(`Oracle feed: ${feeder.toString()} key: ${key.asIsin.toString()} value: ${value.toString()}`)

  const oracleTxData: OracleTransactionData = {
    hash: event.extrinsic.extrinsic.hash.toString(),
    timestamp: event.block.timestamp,
    key: hex2a(key.asIsin.substring(2)),
    value: value.toBigInt(),
  }

  const oracleTx = OracleTransactionService.init(oracleTxData)
  await oracleTx.save()
}

const hex2a = (hexx: string) => {
  const hex = hexx.toString()
  let str = ''
  for (let i = 0; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substring(i, 2), 16))
  return str
}
