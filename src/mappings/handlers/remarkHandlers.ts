import { SubstrateEvent } from '@subql/types'
import { errorHandler } from '../../helpers/errorHandler'
import { RemarkEvent } from '../../helpers/types'
import { AttestationService } from '../services/attestationService'

export const handleRemark = errorHandler(_handleRemark)
async function _handleRemark(event: SubstrateEvent<RemarkEvent>) {
  const [remarks, _call] = event.event.data
  logger.info(`Remark event fired for ${event.hash.toString()} at block ${event.block.block.header.number.toNumber()}`)
  const namedRemarks = remarks.filter((remark) => remark.isNamed)

  for (const namedRemark of namedRemarks) {
    const namedRemarkData = namedRemark.asNamed.toUtf8()
    const [type, poolId, attestationData] = namedRemarkData.split(':')
    logger.info(`Named remark with data: ${namedRemarkData}`)
    if (type === 'attestation') {
      const attestation = await AttestationService.init(
        poolId,
        event.hash.toString(),
        event.block.timestamp!,
        attestationData
      )
      await attestation.save()
    }
  }
}
