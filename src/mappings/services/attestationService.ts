import { Attestation } from '../../types/models/Attestation'

export class AttestationService extends Attestation {
  static init(poolId: string, hash: string, timestamp: Date, accountId: string, data: string) {
    const id = `${poolId}-${hash}`
    logger.info(`Initialising new attestation ${id} with data: ${data}`)
    const attestation = new this(id, poolId, timestamp, accountId)
    attestation.data = data
    return attestation
  }
}
