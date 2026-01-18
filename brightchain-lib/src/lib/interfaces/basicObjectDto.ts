import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Basic data transfer object with ID and creation date
 *
 * @remarks
 * This is the base interface for all DTOs in the system. It provides
 * common fields that all data objects should have: a unique identifier
 * and a creation timestamp.
 *
 * @typeParam TID - The type used for the ID field (defaults to Uint8Array)
 * @typeParam D - The type used for dates (Date or string, defaults to Date)
 *
 * @example
 * ```typescript
 * // Using default types
 * const dto: IBasicObjectDTO = {
 *   id: new Uint8Array([1, 2, 3]),
 *   dateCreated: new Date()
 * };
 *
 * // Using string ID and ISO date string
 * const stringDto: IBasicObjectDTO<string, string> = {
 *   id: 'abc-123',
 *   dateCreated: '2024-01-01T00:00:00Z'
 * };
 * ```
 */
export interface IBasicObjectDTO<
  TID extends PlatformID = Uint8Array,
  D extends Date | string = Date,
> {
  /**
   * ID of the data object. Must be unique, usually UUID v4.
   */
  id: TID;
  /**
   * The date this object was created
   */
  dateCreated: D;
}
