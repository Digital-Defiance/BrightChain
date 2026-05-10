/**
 * CalDavMiddleware
 *
 * Express middleware implementing CalDAV protocol support (RFC 4791).
 * Routes WebDAV methods (PROPFIND, REPORT, GET, PUT, DELETE, MKCALENDAR, POST)
 * to the appropriate handler, with ETag-based conditional requests and
 * authentication via BrightChain identity tokens.
 *
 * URL structure:
 *   /caldav/{userId}                                    — User's CalDAV root
 *   /caldav/{userId}/calendars/                         — Calendar home set
 *   /caldav/{userId}/calendars/{calendarId}/            — Calendar collection
 *   /caldav/{userId}/calendars/{calendarId}/{uid}.ics   — Individual event
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10
 */

import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

// ─── CalDAV resource types ───────────────────────────────────────────────────

/**
 * Parsed CalDAV URL components extracted from the request path.
 */
export interface CalDavUrlParams {
  userId: string;
  /** Present when the path reaches /calendars/ or deeper */
  calendarId?: string;
  /** Present when the path targets an individual .ics resource */
  eventUid?: string;
}

// ─── CalDAV data types ───────────────────────────────────────────────────────

/**
 * Metadata about a calendar collection returned by CalDAV discovery.
 */
export interface CalDavCalendarInfo {
  calendarId: string;
  displayName: string;
  color: string;
  description: string;
  ctag: string;
}

/**
 * An individual event resource with its iCalendar data and ETag.
 */
export interface CalDavEventResource {
  uid: string;
  etag: string;
  icalData: string;
}

/**
 * Result of a PUT operation (create or update).
 */
export interface CalDavPutResult {
  created: boolean;
  etag: string;
}

/**
 * Filter criteria for calendar-query REPORT requests.
 */
export interface CalDavFilter {
  timeRangeStart?: string;
  timeRangeEnd?: string;
  uids?: string[];
}

// ─── Service interface ───────────────────────────────────────────────────────

/**
 * Interface for the CalDAV service layer that handles protocol logic,
 * resource discovery, and event persistence.
 *
 * @see Requirements 2.2, 2.6, 2.7, 2.8
 */
export interface ICalDavService {
  discoverCalendars(userId: string): Promise<CalDavCalendarInfo[]>;
  getCalendarEvents(
    userId: string,
    calendarId: string,
    filter?: CalDavFilter,
  ): Promise<CalDavEventResource[]>;
  getEvent(
    userId: string,
    calendarId: string,
    eventUid: string,
  ): Promise<CalDavEventResource | null>;
  putEvent(
    userId: string,
    calendarId: string,
    eventUid: string,
    icalData: string,
    etag?: string,
  ): Promise<CalDavPutResult>;
  deleteEvent(
    userId: string,
    calendarId: string,
    eventUid: string,
    etag?: string,
  ): Promise<boolean>;
  createCalendar(
    userId: string,
    displayName: string,
  ): Promise<CalDavCalendarInfo>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAV_NAMESPACE = 'DAV:';
const CALDAV_NAMESPACE = 'urn:ietf:params:xml:ns:caldav';
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

const SUPPORTED_METHODS = [
  'PROPFIND',
  'REPORT',
  'GET',
  'PUT',
  'DELETE',
  'MKCALENDAR',
  'POST',
  'OPTIONS',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate an ETag from content by computing its SHA-256 hash.
 */
export function generateETag(content: string): string {
  const hash = createHash('sha256').update(content).digest('hex');
  return `"${hash.substring(0, 32)}"`;
}

/**
 * Parse a CalDAV URL path into its component parts.
 *
 * Expected patterns:
 *   /caldav/{userId}
 *   /caldav/{userId}/calendars/
 *   /caldav/{userId}/calendars/{calendarId}/
 *   /caldav/{userId}/calendars/{calendarId}/{eventUid}.ics
 */
export function parseCalDavUrl(path: string): CalDavUrlParams | null {
  // Normalize: remove trailing slash for matching, but keep awareness of it
  const normalized = path.replace(/\/+$/, '');

  // Match: /caldav/{userId}/calendars/{calendarId}/{eventUid}.ics
  const eventMatch = normalized.match(
    /^\/caldav\/([^/]+)\/calendars\/([^/]+)\/([^/]+)\.ics$/,
  );
  if (eventMatch) {
    return {
      userId: eventMatch[1],
      calendarId: eventMatch[2],
      eventUid: eventMatch[3],
    };
  }

  // Match: /caldav/{userId}/calendars/{calendarId}
  const calendarMatch = normalized.match(
    /^\/caldav\/([^/]+)\/calendars\/([^/]+)$/,
  );
  if (calendarMatch) {
    return {
      userId: calendarMatch[1],
      calendarId: calendarMatch[2],
    };
  }

  // Match: /caldav/{userId}/calendars
  const homeMatch = normalized.match(/^\/caldav\/([^/]+)\/calendars$/);
  if (homeMatch) {
    return { userId: homeMatch[1] };
  }

  // Match: /caldav/{userId}
  const rootMatch = normalized.match(/^\/caldav\/([^/]+)$/);
  if (rootMatch) {
    return { userId: rootMatch[1] };
  }

  return null;
}

/**
 * Build a DAV:error XML response body.
 */
function davError(element: string, message: string): string {
  return [
    XML_HEADER,
    `<D:error xmlns:D="${DAV_NAMESPACE}">`,
    `  <D:${element}/>`,
    `  <D:description>${escapeXml(message)}</D:description>`,
    `</D:error>`,
  ].join('\n');
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Middleware class ────────────────────────────────────────────────────────

/**
 * CalDavMiddleware acts as Express middleware for CalDAV protocol support.
 *
 * It routes incoming WebDAV requests to the appropriate handler based on
 * the HTTP method, parses CalDAV URLs, enforces authentication, and
 * handles ETag-based conditional requests.
 *
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10
 */
export class CalDavMiddleware {
  private readonly calDavService: ICalDavService;
  constructor(calDavService: ICalDavService) {
    this.calDavService = calDavService;
  }

  /**
   * Main middleware entry point.
   * Routes to the appropriate handler based on the HTTP method.
   */
  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const method = req.method.toUpperCase();

      // Handle OPTIONS for WebDAV method discovery
      if (method === 'OPTIONS') {
        res.setHeader('Allow', SUPPORTED_METHODS.join(', '));
        res.setHeader('DAV', '1, 2, calendar-access, calendar-schedule');
        res.status(200).end();
        return;
      }

      // Authenticate: extract userId from Authorization header or URL
      // For now, extract userId from the URL path (actual token validation wired later)
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        res.status(401);
        res.setHeader('WWW-Authenticate', 'Bearer realm="BrightCal CalDAV"');
        res.send(davError('need-privileges', 'Authentication required'));
        return;
      }

      // Parse the CalDAV URL
      const params = parseCalDavUrl(req.path);
      if (!params) {
        res
          .status(404)
          .send(davError('resource-not-found', 'Invalid CalDAV URL'));
        return;
      }

      // Route to the appropriate handler
      const handler = this.getHandler(method);
      if (!handler) {
        res.status(405);
        res.setHeader('Allow', SUPPORTED_METHODS.join(', '));
        res.send(
          davError('method-not-allowed', `Method ${method} not supported`),
        );
        return;
      }

      // Attach parsed params to the request for handler use
      (req as CalDavRequest).calDavParams = params;

      handler.call(this, req as CalDavRequest, res).catch((err: unknown) => {
        if (err instanceof Error && err.message === 'FORBIDDEN') {
          res
            .status(403)
            .send(
              davError(
                'need-privileges',
                'Insufficient permissions for this resource',
              ),
            );
        } else {
          next(err);
        }
      });
    };
  }

  /**
   * Map HTTP method to the corresponding handler.
   */
  private getHandler(
    method: string,
  ): ((req: CalDavRequest, res: Response) => Promise<void>) | null {
    switch (method) {
      case 'PROPFIND':
        return this.handlePropfind;
      case 'REPORT':
        return this.handleReport;
      case 'GET':
        return this.handleGet;
      case 'PUT':
        return this.handlePut;
      case 'DELETE':
        return this.handleDelete;
      case 'MKCALENDAR':
        return this.handleMkcalendar;
      case 'POST':
        return this.handlePost;
      default:
        return null;
    }
  }

  // ─── PROPFIND ────────────────────────────────────────────────────────

  /**
   * Handle PROPFIND requests for CalDAV resource discovery.
   *
   * Returns calendar home set, calendar collections, or event resources
   * depending on the URL depth.
   *
   * @requirements 2.1
   */
  async handlePropfind(req: CalDavRequest, res: Response): Promise<void> {
    const { userId, calendarId, eventUid } = req.calDavParams;

    if (eventUid && calendarId) {
      // PROPFIND on a single event resource
      const event = await this.calDavService.getEvent(
        userId,
        calendarId,
        eventUid,
      );
      if (!event) {
        res.status(404).send(davError('resource-not-found', 'Event not found'));
        return;
      }

      const eventPath = `/caldav/${userId}/calendars/${calendarId}/${eventUid}.ics`;
      const body = buildMultistatusResponse([
        buildPropfindEventResponse(eventPath, event),
      ]);
      res
        .status(207)
        .setHeader('Content-Type', 'application/xml; charset=utf-8')
        .send(body);
      return;
    }

    if (calendarId) {
      // PROPFIND on a calendar collection — list events
      const events = await this.calDavService.getCalendarEvents(
        userId,
        calendarId,
      );
      const basePath = `/caldav/${userId}/calendars/${calendarId}`;

      const responses = [
        buildPropfindCollectionResponse(basePath + '/', calendarId),
        ...events.map((e) =>
          buildPropfindEventResponse(`${basePath}/${e.uid}.ics`, e),
        ),
      ];

      const body = buildMultistatusResponse(responses);
      res
        .status(207)
        .setHeader('Content-Type', 'application/xml; charset=utf-8')
        .send(body);
      return;
    }

    // PROPFIND on user root or calendar home set — list calendars
    const calendars = await this.calDavService.discoverCalendars(userId);
    const basePath = `/caldav/${userId}/calendars`;

    const responses = [
      buildPropfindHomeSetResponse(`/caldav/${userId}/`, userId),
      ...calendars.map((cal) =>
        buildPropfindCalendarResponse(`${basePath}/${cal.calendarId}/`, cal),
      ),
    ];

    const body = buildMultistatusResponse(responses);
    res
      .status(207)
      .setHeader('Content-Type', 'application/xml; charset=utf-8')
      .send(body);
  }

  // ─── REPORT ──────────────────────────────────────────────────────────

  /**
   * Handle REPORT requests for calendar-query and calendar-multiget.
   *
   * @requirements 2.2
   */
  async handleReport(req: CalDavRequest, res: Response): Promise<void> {
    const { userId, calendarId } = req.calDavParams;

    if (!calendarId) {
      res
        .status(400)
        .send(
          davError('valid-calendar', 'REPORT requires a calendar collection'),
        );
      return;
    }

    // Parse the request body for filter criteria
    const filter = parseReportFilter(req.body);

    const events = await this.calDavService.getCalendarEvents(
      userId,
      calendarId,
      filter,
    );

    const basePath = `/caldav/${userId}/calendars/${calendarId}`;
    const responses = events.map((e) => {
      const href = `${basePath}/${e.uid}.ics`;
      return [
        '  <D:response>',
        `    <D:href>${escapeXml(href)}</D:href>`,
        '    <D:propstat>',
        '      <D:prop>',
        `        <D:getetag>${escapeXml(e.etag)}</D:getetag>`,
        `        <C:calendar-data>${escapeXml(e.icalData)}</C:calendar-data>`,
        '      </D:prop>',
        '      <D:status>HTTP/1.1 200 OK</D:status>',
        '    </D:propstat>',
        '  </D:response>',
      ].join('\n');
    });

    const body = [
      XML_HEADER,
      `<D:multistatus xmlns:D="${DAV_NAMESPACE}" xmlns:C="${CALDAV_NAMESPACE}">`,
      ...responses,
      '</D:multistatus>',
    ].join('\n');

    res
      .status(207)
      .setHeader('Content-Type', 'application/xml; charset=utf-8')
      .send(body);
  }

  // ─── GET ─────────────────────────────────────────────────────────────

  /**
   * Handle GET requests to retrieve individual .ics resources.
   *
   * Supports If-None-Match for conditional retrieval (304 Not Modified).
   *
   * @requirements 2.5, 2.6
   */
  async handleGet(req: CalDavRequest, res: Response): Promise<void> {
    const { userId, calendarId, eventUid } = req.calDavParams;

    if (!calendarId || !eventUid) {
      res
        .status(400)
        .send(
          davError('valid-calendar', 'GET requires a specific event resource'),
        );
      return;
    }

    const event = await this.calDavService.getEvent(
      userId,
      calendarId,
      eventUid,
    );
    if (!event) {
      res.status(404).send(davError('resource-not-found', 'Event not found'));
      return;
    }

    // If-None-Match: return 304 if ETag matches
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && matchesETag(ifNoneMatch, event.etag)) {
      res.status(304).end();
      return;
    }

    res
      .status(200)
      .setHeader('Content-Type', 'text/calendar; charset=utf-8')
      .setHeader('ETag', event.etag)
      .send(event.icalData);
  }

  // ─── PUT ─────────────────────────────────────────────────────────────

  /**
   * Handle PUT requests to create or update calendar objects.
   *
   * Supports If-Match for conditional updates (412 Precondition Failed).
   *
   * @requirements 2.3, 2.6
   */
  async handlePut(req: CalDavRequest, res: Response): Promise<void> {
    const { userId, calendarId, eventUid } = req.calDavParams;

    if (!calendarId || !eventUid) {
      res
        .status(400)
        .send(
          davError('valid-calendar', 'PUT requires a specific event resource'),
        );
      return;
    }

    // Read the iCalendar body
    const icalData =
      typeof req.body === 'string' ? req.body : String(req.body ?? '');
    if (!icalData.trim()) {
      res
        .status(400)
        .send(
          davError(
            'valid-calendar-data',
            'Request body must contain iCalendar data',
          ),
        );
      return;
    }

    // If-Match: conditional update — only proceed if ETag matches
    const ifMatch = req.headers['if-match'];
    const etag = ifMatch ? normalizeETag(ifMatch) : undefined;

    try {
      const result = await this.calDavService.putEvent(
        userId,
        calendarId,
        eventUid,
        icalData,
        etag,
      );

      res
        .status(result.created ? 201 : 204)
        .setHeader('ETag', result.etag)
        .end();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'PRECONDITION_FAILED') {
        res
          .status(412)
          .send(
            davError(
              'no-conflict',
              'ETag mismatch — resource has been modified',
            ),
          );
        return;
      }
      throw err;
    }
  }

  // ─── DELETE ──────────────────────────────────────────────────────────

  /**
   * Handle DELETE requests to remove calendar objects.
   *
   * Supports If-Match for conditional deletion (412 Precondition Failed).
   *
   * @requirements 2.4, 2.6
   */
  async handleDelete(req: CalDavRequest, res: Response): Promise<void> {
    const { userId, calendarId, eventUid } = req.calDavParams;

    if (!calendarId || !eventUid) {
      res
        .status(400)
        .send(
          davError(
            'valid-calendar',
            'DELETE requires a specific event resource',
          ),
        );
      return;
    }

    // If-Match: conditional deletion
    const ifMatch = req.headers['if-match'];
    const etag = ifMatch ? normalizeETag(ifMatch) : undefined;

    try {
      const deleted = await this.calDavService.deleteEvent(
        userId,
        calendarId,
        eventUid,
        etag,
      );

      if (!deleted) {
        res.status(404).send(davError('resource-not-found', 'Event not found'));
        return;
      }

      res.status(204).end();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'PRECONDITION_FAILED') {
        res
          .status(412)
          .send(
            davError(
              'no-conflict',
              'ETag mismatch — resource has been modified',
            ),
          );
        return;
      }
      throw err;
    }
  }

  // ─── MKCALENDAR ─────────────────────────────────────────────────────

  /**
   * Handle MKCALENDAR requests to create a new calendar collection.
   *
   * @requirements 2.1
   */
  async handleMkcalendar(req: CalDavRequest, res: Response): Promise<void> {
    const { userId, calendarId } = req.calDavParams;

    // MKCALENDAR should target a new calendar path (calendarId is the desired name)
    if (!calendarId) {
      res
        .status(400)
        .send(
          davError(
            'valid-calendar',
            'MKCALENDAR requires a calendar collection path',
          ),
        );
      return;
    }

    // Extract display name from request body or use calendarId
    const displayName = parseMkcalendarDisplayName(req.body) || calendarId;

    const calendar = await this.calDavService.createCalendar(
      userId,
      displayName,
    );

    res
      .status(201)
      .setHeader(
        'Location',
        `/caldav/${userId}/calendars/${calendar.calendarId}/`,
      )
      .end();
  }

  // ─── POST (Scheduling Outbox) ───────────────────────────────────────

  /**
   * Handle POST requests for RFC 6638 scheduling outbox operations.
   *
   * Used for free-busy queries and invitation delivery via the scheduling outbox.
   *
   * @requirements 2.7 (RFC 6638)
   */
  async handlePost(req: CalDavRequest, res: Response): Promise<void> {
    const { userId } = req.calDavParams;

    // POST to the scheduling outbox is used for iTIP message delivery
    // For now, return a basic schedule-response indicating the feature is available
    const body = [
      XML_HEADER,
      `<C:schedule-response xmlns:D="${DAV_NAMESPACE}" xmlns:C="${CALDAV_NAMESPACE}">`,
      '  <C:response>',
      `    <C:recipient><D:href>mailto:${escapeXml(userId)}</D:href></C:recipient>`,
      '    <C:request-status>2.0;Success</C:request-status>',
      '  </C:response>',
      '</C:schedule-response>',
    ].join('\n');

    res
      .status(200)
      .setHeader('Content-Type', 'application/xml; charset=utf-8')
      .send(body);
  }
}

// ─── CalDavRequest extension ─────────────────────────────────────────────────

/**
 * Extended Express Request with parsed CalDAV URL parameters.
 */
export interface CalDavRequest extends Request {
  calDavParams: CalDavUrlParams;
}

// ─── ETag helpers ────────────────────────────────────────────────────────────

/**
 * Normalize an ETag value by removing surrounding quotes if present.
 */
function normalizeETag(value: string): string {
  const trimmed = value.trim();
  // Handle weak ETags (W/"...")
  if (trimmed.startsWith('W/')) {
    return trimmed.substring(2).replace(/^"|"$/g, '');
  }
  return trimmed.replace(/^"|"$/g, '');
}

/**
 * Check if an If-None-Match header value matches a given ETag.
 * Supports wildcard (*) and comma-separated lists.
 */
function matchesETag(headerValue: string, etag: string): boolean {
  const trimmed = headerValue.trim();
  if (trimmed === '*') return true;

  const normalizedEtag = normalizeETag(etag);
  const candidates = trimmed.split(',').map((v) => normalizeETag(v));
  return candidates.includes(normalizedEtag);
}

// ─── XML response builders ──────────────────────────────────────────────────

function buildMultistatusResponse(responses: string[]): string {
  return [
    XML_HEADER,
    `<D:multistatus xmlns:D="${DAV_NAMESPACE}" xmlns:C="${CALDAV_NAMESPACE}" xmlns:CS="http://calendarserver.org/ns/">`,
    ...responses,
    '</D:multistatus>',
  ].join('\n');
}

function buildPropfindHomeSetResponse(href: string, userId: string): string {
  return [
    '  <D:response>',
    `    <D:href>${escapeXml(href)}</D:href>`,
    '    <D:propstat>',
    '      <D:prop>',
    '        <D:resourcetype><D:collection/></D:resourcetype>',
    `        <D:displayname>${escapeXml(userId)}</D:displayname>`,
    `        <C:calendar-home-set><D:href>/caldav/${escapeXml(userId)}/calendars/</D:href></C:calendar-home-set>`,
    '      </D:prop>',
    '      <D:status>HTTP/1.1 200 OK</D:status>',
    '    </D:propstat>',
    '  </D:response>',
  ].join('\n');
}

function buildPropfindCalendarResponse(
  href: string,
  cal: CalDavCalendarInfo,
): string {
  return [
    '  <D:response>',
    `    <D:href>${escapeXml(href)}</D:href>`,
    '    <D:propstat>',
    '      <D:prop>',
    '        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>',
    `        <D:displayname>${escapeXml(cal.displayName)}</D:displayname>`,
    `        <CS:getctag>${escapeXml(cal.ctag)}</CS:getctag>`,
    `        <calendar-color xmlns="http://apple.com/ns/ical/">${escapeXml(cal.color)}</calendar-color>`,
    `        <C:calendar-description>${escapeXml(cal.description)}</C:calendar-description>`,
    '      </D:prop>',
    '      <D:status>HTTP/1.1 200 OK</D:status>',
    '    </D:propstat>',
    '  </D:response>',
  ].join('\n');
}

function buildPropfindCollectionResponse(
  href: string,
  calendarId: string,
): string {
  return [
    '  <D:response>',
    `    <D:href>${escapeXml(href)}</D:href>`,
    '    <D:propstat>',
    '      <D:prop>',
    '        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>',
    `        <D:displayname>${escapeXml(calendarId)}</D:displayname>`,
    '      </D:prop>',
    '      <D:status>HTTP/1.1 200 OK</D:status>',
    '    </D:propstat>',
    '  </D:response>',
  ].join('\n');
}

function buildPropfindEventResponse(
  href: string,
  event: CalDavEventResource,
): string {
  return [
    '  <D:response>',
    `    <D:href>${escapeXml(href)}</D:href>`,
    '    <D:propstat>',
    '      <D:prop>',
    `        <D:getetag>${escapeXml(event.etag)}</D:getetag>`,
    `        <D:getcontenttype>text/calendar; charset=utf-8</D:getcontenttype>`,
    '      </D:prop>',
    '      <D:status>HTTP/1.1 200 OK</D:status>',
    '    </D:propstat>',
    '  </D:response>',
  ].join('\n');
}

// ─── Request body parsers ────────────────────────────────────────────────────

/**
 * Parse REPORT request body for filter criteria.
 * Handles both calendar-query (time-range filter) and calendar-multiget (UID list).
 *
 * This is a simplified parser that extracts key filter elements from the XML body.
 * A full XML parser would be used in production.
 */
function parseReportFilter(body: unknown): CalDavFilter | undefined {
  if (!body || typeof body !== 'string') return undefined;

  const filter: CalDavFilter = {};

  // Extract time-range start/end
  const timeRangeMatch = body.match(
    /<C:time-range\s+start="([^"]*)"(?:\s+end="([^"]*)")?/,
  );
  if (timeRangeMatch) {
    filter.timeRangeStart = timeRangeMatch[1];
    if (timeRangeMatch[2]) {
      filter.timeRangeEnd = timeRangeMatch[2];
    }
  }

  // Extract UIDs from calendar-multiget href elements
  const hrefMatches = body.matchAll(/<D:href>([^<]*)<\/D:href>/g);
  const uids: string[] = [];
  for (const match of hrefMatches) {
    const href = match[1];
    const uidMatch = href.match(/\/([^/]+)\.ics$/);
    if (uidMatch) {
      uids.push(uidMatch[1]);
    }
  }
  if (uids.length > 0) {
    filter.uids = uids;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Parse MKCALENDAR request body for the display name.
 */
function parseMkcalendarDisplayName(body: unknown): string | null {
  if (!body || typeof body !== 'string') return null;

  const match = body.match(/<D:displayname>([^<]*)<\/D:displayname>/);
  return match ? match[1] : null;
}
