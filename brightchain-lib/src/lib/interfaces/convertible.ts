export interface IConvertible<StorageType, HydratedType, OperationalType> {
  hydrate(value: StorageType): HydratedType;
  dehydrate(value: HydratedType): StorageType;
  serialize(value: OperationalType): string;
  deserialize(value: string): StorageType;
}
