import { HexString } from '@digitaldefiance/ecies-lib';
import { IBasicObjectDTO } from './basicObjectDto';

/**
 * Read-only basic data transfer object
 *
 * @remarks
 * This interface extends IBasicObjectDTO with readonly modifiers to prevent
 * modification of the ID and creation date. It uses HexString for the ID
 * and Date for the timestamp.
 *
 * @example
 * ```typescript
 * const readOnlyDto: IReadOnlyBasicObjectDTO = {
 *   id: '0x123abc',
 *   dateCreated: new Date()
 * };
 *
 * // These would cause TypeScript errors:
 * // readOnlyDto.id = '0x456def';
 * // readOnlyDto.dateCreated = new Date();
 * ```
 */
export interface IReadOnlyBasicObjectDTO extends IBasicObjectDTO<HexString> {
  /** Unique identifier as a hex string (read-only) */
  readonly id: HexString;

  /** Creation timestamp (read-only) */
  readonly dateCreated: Date;
}
