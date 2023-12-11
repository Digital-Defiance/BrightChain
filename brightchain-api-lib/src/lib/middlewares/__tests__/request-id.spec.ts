import { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER, requestIdMiddleware } from '../request-id';

describe('requestIdMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should generate a UUID v4 request ID', () => {
    requestIdMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest.requestId).toBeDefined();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(mockRequest.requestId).toMatch(uuidV4Regex);
  });

  it('should set the X-Request-ID response header', () => {
    requestIdMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      mockRequest.requestId,
    );
  });

  it('should call next() to continue the middleware chain', () => {
    requestIdMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should generate unique IDs for different requests', () => {
    const request1: Partial<Request> = {};
    const request2: Partial<Request> = {};

    requestIdMiddleware(
      request1 as Request,
      mockResponse as Response,
      nextFunction,
    );
    requestIdMiddleware(
      request2 as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(request1.requestId).not.toBe(request2.requestId);
  });
});
