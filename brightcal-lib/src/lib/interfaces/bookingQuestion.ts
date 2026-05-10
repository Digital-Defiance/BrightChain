/**
 * Custom question on a booking page
 * @see Requirements 9.1
 */
export interface IBookingQuestion {
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea';
  required: boolean;
}
