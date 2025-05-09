import { MigrationPair } from '../../types/models/MigrationPair'
import { SentMigration } from '../../types/models/SentMigration'
import { ReceivedMigration } from '../../types/models/ReceivedMigration'

export class MigrationService {
  static async getOrInit(fromAccountId: string, toAccountId: string) {
    let migrationPair = await MigrationPair.get(
      `${fromAccountId}-${toAccountId}`
    )
    if (!migrationPair) {
      migrationPair = new MigrationPair(`${fromAccountId}-${toAccountId}`, fromAccountId, toAccountId)
      await migrationPair.save()
    }
    return new MigrationPair(`${fromAccountId}-${toAccountId}`, fromAccountId, toAccountId)
  }

  static async sent(txHash: string, timestamp: Date, fromAccountId: string, sentAmount: bigint, toAccountId: string) {
    logger.info(
      `Processing migration sent with txHash ${txHash} ` +
        `from ${fromAccountId} to ${toAccountId} for amount ${sentAmount}`
    )

    // initialise migrationPair
    const migrationPair = await this.getOrInit(fromAccountId, toAccountId)

    //initialise sentMigration
    const sentMigration = new SentMigration(
      txHash,
      timestamp,
      sentAmount,
      migrationPair.fromAccountId,
      migrationPair.toAccountId,
      migrationPair.id
    )

    // check if receivedMigration exists and reconcile
    const receivedMigration = (
      await ReceivedMigration.getByFields(
        [
          ['toAccountId', '=', toAccountId],
          ['receivedAmount', '=', sentAmount],
        ],
        { limit: 1 }
      )
    ).pop()
    if (receivedMigration) {
      logger.info(`Migration reconciled! linking to pair ${migrationPair.id}`)
      receivedMigration.migrationPairId = migrationPair.id
      await receivedMigration.save()
    }
    await sentMigration.save()
    return
  }

  static async received(txHash: string, timestamp: Date, toAccountId: string, receivedAmount: bigint) {
    logger.info(
      `Processing migration received with txHash ${txHash} ` + `to ${toAccountId} for amount ${receivedAmount}`
    )

    const receivedMigration = new ReceivedMigration(txHash, timestamp, receivedAmount, toAccountId)

    const sentMigration = (
      await SentMigration.getByFields(
        [
          ['fromAccountId', '=', toAccountId],
          ['sentAmount', '=', receivedAmount],
        ],
        { limit: 1 }
      )
    ).pop()

    if (!sentMigration) {
      await receivedMigration.save()
      return
    }

    logger.info(`Migration reconciled! linking to pair ${sentMigration.migrationPairId}`)
    receivedMigration.migrationPairId = sentMigration.migrationPairId
    await receivedMigration.save()
    return
  }
}
