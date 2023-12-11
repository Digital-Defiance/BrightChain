/**
 * Thrown by `AssetAccountStore.settle()` / `release()` when the supplied
 * reservation handle is unknown (already settled, released, or never issued).
 *
 * @see asset-account-store-generalization spec, Error Handling table.
 */
export class ReservationNotFoundError extends Error {
  constructor(
    public readonly reservationId: string,
    message?: string,
  ) {
    super(message ?? `Reservation not found: '${reservationId}'.`);
    this.name = 'ReservationNotFoundError';
    Object.setPrototypeOf(this, ReservationNotFoundError.prototype);
  }
}
