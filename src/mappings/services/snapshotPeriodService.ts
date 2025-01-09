import { SnapshotPeriod } from '../../types/models/SnapshotPeriod'
export class SnapshotPeriodService extends SnapshotPeriod {
  static init(periodStart: Date) {
    const id = periodStart.toISOString()
    const day = periodStart.getUTCDate()
    const weekday = periodStart.getUTCDay()
    const month = periodStart.getUTCMonth()
    const year = periodStart.getUTCFullYear()
    logger.info(`Initialising new SnapshotPeriod with id ${id}`)
    return new this(id,periodStart,day,weekday,month,year)
  }
}
