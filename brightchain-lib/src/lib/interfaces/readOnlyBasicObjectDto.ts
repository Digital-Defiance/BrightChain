import { HexString } from '@digitaldefiance/ecies-lib';
import { IBasicObjectDTO } from './basicObjectDto';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';

/**
 * Read-only basic data transfer object
 *
 * @remarks
 * This interface extends IBasicObjectDTO with readonly modifiers to prevent
 * modification of the ID and creation date. It uses HexString for the ID
 * and BrightDateTimestamp for the timestamp.
 *
 * @example
 * ```typescript
 * const readOnlyDto: IReadOnlyBasicObjectDTO = {
 *   id: '0x123abc',
 *   dateCreated: brightDateNow()
 * };
 *
 * // These would cause TypeScript errors:
 * // readOnlyDto.id = '0x456def';
 * // readOnlyDto.dateCreated = brightDateNow();
 * ```
 */
export interface IReadOnlyBasicObjectDTO extends IBasicObjectDTO<HexString, BrightDateTimestamp> {
  /** Unique identifier as a hex string (read-only) */
  readonly id: HexString;

  /** Creation timestamp (read-only) */
  readonly dateCreated: BrightDateTimestamp;
}
