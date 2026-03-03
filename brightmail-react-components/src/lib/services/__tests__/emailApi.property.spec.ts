/**
 * Property-based tests for EmailApiClient error envelope propagation.
 * Feature: brightmail-frontend, Property 2: API Error Envelope Propagation
 *
 * For any HTTP error response from the Email API that contains an
 * IApiEnvelope with an error.message field, the handleApiCall error
 * handler SHALL extract and propagate that exact error message string.
 *
 * **Validates: Requirements 2.4**
 */

import { IApiEnvelope } from '@brightchain/brightchain-lib';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import fc from 'fast-check';
import { handleApiCall } from '../emailApi';

describe('Feature: brightmail-frontend, Property 2: API Error Envelope Propagation', () => {
  /**
   * Property 2a: When the API returns a 2xx response with status: 'error'
   * in the envelope body, handleApiCall SHALL throw an Error whose message
   * matches the envelope's error.message exactly.
   */
  it('extracts error message from envelope with status "error" in response body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (errorMessage: string, errorCode: string) => {
          const envelope: IApiEnvelope<unknown> = {
            status: 'error',
            error: {
              code: errorCode,
              message: errorMessage,
            },
          };

          const fakeResponse: AxiosResponse<IApiEnvelope<unknown>> = {
            data: envelope,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: { headers: new AxiosHeaders() },
          };

          try {
            await handleApiCall(() => Promise.resolve(fakeResponse));
            return false; // should have thrown
          } catch (err) {
            return (err as Error).message === errorMessage;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2b: When the Axios call rejects with an AxiosError whose
   * response.data contains an IApiEnvelope error.message, handleApiCall
   * SHALL throw an Error whose message matches that exact string.
   */
  it('extracts error message from AxiosError response envelope', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.integer({ min: 400, max: 599 }),
        async (errorMessage: string, errorCode: string, httpStatus: number) => {
          const envelope: IApiEnvelope<unknown> = {
            status: 'error',
            error: {
              code: errorCode,
              message: errorMessage,
            },
          };

          const axiosError = new AxiosError(
            'Request failed',
            AxiosError.ERR_BAD_REQUEST,
            { headers: new AxiosHeaders() },
            {},
            {
              data: envelope,
              status: httpStatus,
              statusText: 'Error',
              headers: {},
              config: { headers: new AxiosHeaders() },
            },
          );

          try {
            await handleApiCall(() => Promise.reject(axiosError));
            return false; // should have thrown
          } catch (err) {
            return (err as Error).message === errorMessage;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2c: When the envelope body has status 'error' but no
   * error.message, handleApiCall SHALL throw with 'Unknown error'.
   */
  it('falls back to "Unknown error" when envelope error has no message', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const envelope: IApiEnvelope<unknown> = {
          status: 'error',
        };

        const fakeResponse: AxiosResponse<IApiEnvelope<unknown>> = {
          data: envelope,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: new AxiosHeaders() },
        };

        try {
          await handleApiCall(() => Promise.resolve(fakeResponse));
          return false;
        } catch (err) {
          return (err as Error).message === 'Unknown error';
        }
      }),
      { numRuns: 100 },
    );
  });
});
