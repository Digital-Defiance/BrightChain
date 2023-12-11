/**
 * Thrown by `AssetAccountStore.settle()` when the reservation TTL has
 * elapsed before settlement. Callers MUST handle this by issuing a fresh
 * reservation.
 *
 * @see asset-account-store-generalization spec, Requirement 4.6.
 */
export class ReservationExpiredError extends Error {
  constructor(
    public readonly reservationId: string,
    public readonly expiredAt: Date,
    message?: string,
  ) {
    super(
      message ??
        `Reservation '${reservationId}' expired at ${expiredAt.toISOString()}.`,
    );
    this.name = 'ReservationExpiredError';
    Object.setPrototypeOf(this, ReservationExpiredError.prototype);
  }
}
