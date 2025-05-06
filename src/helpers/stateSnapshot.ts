import type { Entity, FieldsExpression, FunctionPropertyNames, GetOptions } from '@subql/types-core'
/**
 * Creates a snapshot of a generic stateModel to a snapshotModel.
 * A snapshotModel has the same fields as the originating stateModel, however a timestamp and a blockNumber are added.
 * Fields ending with an ByPeriod underscore are reset to 0 at the end of a period.
 * All such resettable fields must be of type
 * BigInt.
 * @param stateModel - the data model to be snapshotted
 * @param snapshotModel - the data model where the snapshot is saved. (must have additional timestamp and
 * blockNumber fields)
 * @param block - the correspondint substrateBlock to provide additional state values to the snapshot
 * @param fkReferenceName - (optional) name of the foreignKey to save a reference to the originating entity.
 * @param resetPeriodStates - (optional) reset properties ending in ByPeriod to 0 after snapshot (defaults to true).
 * @returns A promise resolving when all state manipulations in the DB is completed
 */
export async function statesSnapshotter<T extends SnapshottableEntity, U extends SnapshottedEntity<T>>(
  relationshipField: StringForeignKeys<SnapshotAdditions>,
  relationshipId: string,
  stateEntities: T[],
  snapshotModel: EntityClass<U>,
  blockInfo: BlockInfo,
  fkReferenceField?: StringForeignKeys<U>,
  resetPeriodStates = true
): Promise<void[]> {
  const entitySaves: Promise<void>[] = []
  logger.info(`Performing ${snapshotModel.prototype._name}`)
  if (stateEntities.length === 0) logger.info('Nothing to snapshot!')
  for (const stateEntity of stateEntities) {
    const blockNumber = blockInfo.number
    const snapshot: SnapshottedEntity<T> = {
      ...stateEntity,
      id: `${stateEntity.id}-${blockNumber}`,
      timestamp: blockInfo.timestamp,
      blockNumber: blockNumber,
      [relationshipField]: relationshipId,
    }
    logger.info(`Creating ${snapshotModel.prototype._name} for: ${stateEntity.id}`)
    const snapshotEntity = snapshotModel.create(snapshot as U)
    if (fkReferenceField) snapshotEntity[fkReferenceField] = stateEntity.id as U[StringForeignKeys<U>]
    const propNames = Object.getOwnPropertyNames(stateEntity)
    const propNamesToReset = propNames.filter((propName) => propName.endsWith('ByPeriod')) as ResettableKeys<T>[]
    if (resetPeriodStates) {
      for (const propName of propNamesToReset) {
        logger.debug(`resetting ${stateEntity._name?.toLowerCase()}.${propName} to 0`)
        stateEntity[propName] = BigInt(0) as T[ResettableKeys<T>]
      }
      entitySaves.push(stateEntity.save())
    }
    entitySaves.push(snapshotEntity.save())
  }
  return Promise.all(entitySaves)
}

type ResettableKeyFormat = `${string}ByPeriod`
type ForeignKeyFormat = `${string}Id`
type ResettableKeys<T> = { [K in keyof T]: K extends ResettableKeyFormat ? K : never }[keyof T]
type ForeignKeys<T> = { [K in keyof T]: K extends ForeignKeyFormat ? K : never }[keyof T]
type StringFields<T> = { [K in keyof T]: T[K] extends string | undefined ? K : never }[keyof T]
type StringForeignKeys<T> = NonNullable<ForeignKeys<T> & StringFields<T>>

export interface SnapshottableEntity extends Entity {
  save(): Promise<void>
  blockchainId: string
}

export interface SnapshotAdditions {
  save(): Promise<void>
  id: string
  blockNumber: number
  timestamp: Date
  periodId?: string
  epochId?: string
}

//type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][]
export type EntityProps<E extends Entity> = Omit<E, NonNullable<FunctionPropertyNames<E>> | '_name'>
export type SnapshottedEntity<E extends Entity> = SnapshotAdditions & Partial<Omit<{ [K in keyof E]: E[K] }, 'id'>>

export interface EntityClass<T extends Entity> {
  prototype: { _name: string }
  getByFields(filter: FieldsExpression<EntityProps<T>>[], options: GetOptions<EntityProps<T>>): Promise<T[]>
  create(record: EntityProps<T>): T
}

export interface BlockInfo {
  number: number
  timestamp: Date
}
