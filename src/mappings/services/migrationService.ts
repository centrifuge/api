import { MigrationPair } from '../../types/models/MigrationPair'
import { SentMigration } from '../../types/models/SentMigration'
import { ReceivedMigration } from '../../types/models/ReceivedMigration'

export class MigrationService {
  static async getOrInit(fromAccountId: string, toAccountId: string) {
    let migrationPair = await MigrationPair.get(`${fromAccountId}-${toAccountId}`)
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
    const receivedMigrations = await ReceivedMigration.getByFields(
      [
        ['toAccountId', '=', toAccountId],
        ['receivedAmount', '=', sentAmount],
      ],
      { limit: 100 }
    )

    if (receivedMigrations.length > 1)
      receivedMigrations.sort((a, b) => a.receivedAt.valueOf() - b.receivedAt.valueOf())

    const receivedMigration = receivedMigrations.find((r) => r.receivedAt.valueOf() > timestamp.valueOf())

    if (receivedMigration) {
      logger.info(`Migration reconciled! linking to pair ${migrationPair.id} and sent migration ${sentMigration.id}`)
      receivedMigration.migrationPairId = migrationPair.id
      receivedMigration.sentMigrationId = sentMigration.id
      await receivedMigration.save()
    } else {
      logger.info(`Unable to reconcile yet! No received migration found for sent migration ${sentMigration.id}`)
    }
    await sentMigration.save()
    return
  }

  static async received(txHash: string, timestamp: Date, toAccountId: string, receivedAmount: bigint) {
    logger.info(
      `Processing migration received with txHash ${txHash} ` + `to ${toAccountId} for amount ${receivedAmount}`
    )

    const receivedMigration = new ReceivedMigration(txHash, timestamp, receivedAmount, toAccountId)

    const sentMigrations = await SentMigration.getByFields(
      [
        ['toAccountId', '=', toAccountId],
        ['sentAmount', '=', receivedAmount],
      ],
      { limit: 100 }
    )

    if (sentMigrations.length > 1) sentMigrations.sort((a, b) => a.sentAt.valueOf() - b.sentAt.valueOf())
    const sentMigration = sentMigrations.find((s) => s.sentAt.valueOf() <= timestamp.valueOf())
    if (!sentMigration) {
      logger.info(`Unable to reconcile yet! No sent migration found for received migration ${receivedMigration.id}`)
      await receivedMigration.save()
      return
    }

    logger.info(
      `Migration reconciled! linking to pair ${sentMigration.migrationPairId} ` +
        `and received migration ${receivedMigration.id}`
    )
    receivedMigration.migrationPairId = sentMigration.migrationPairId
    receivedMigration.sentMigrationId = sentMigration.id
    await receivedMigration.save()
    return
  }
}
