import { Attestation } from '../../types/models/Attestation'

export class AttestationService extends Attestation {
  static init(poolId: string, remarkId: string, timestamp: Date, data: string) {
    const id = `${poolId}-${remarkId}`
    logger.info(`Initialising new attestation ${id} with data: ${data}`)
    const attestation = new this(id, poolId, timestamp)
    attestation.data = data
    return attestation
  }
}
