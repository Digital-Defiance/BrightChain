---
title: "BrightMail API Reference"
parent: "API Reference"
nav_order: 10
permalink: /api-reference/brightmail-api/
---

# BrightMail API Reference

Complete HTTP API reference for the BrightMail decentralized email system. All endpoints are prefixed with `/api/emails`. BrightMail provides RFC 5322-compliant email built on BrightChain's encrypted block storage and gossip-based delivery network.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Send a new email |
| GET | `/inbox` | Query inbox with filters and pagination |
| GET | `/inbox/unread-count` | Get unread email count |
| GET | `/:messageId` | Get email metadata by ID |
| GET | `/:messageId/content` | Get full email content (body + attachments) |
| GET | `/:messageId/thread` | Get all emails in a thread |
| GET | `/:messageId/delivery-status` | Get per-recipient delivery status |
| POST | `/:messageId/reply` | Reply to an email |
| POST | `/:messageId/forward` | Forward an email |
| POST | `/:messageId/read` | Mark email as read |
| DELETE | `/:messageId` | Delete an email |

---

## POST /

Send a new email. The email is composed as an RFC 5322-compliant message, stored as an encrypted CBL (Content Block List) in the block store, and propagated to recipients via gossip-based delivery.

**Request:**
```json
{
  "from": {
    "localPart": "alice",
    "domain": "brightchain.net",
    "displayName": "Alice Smith"
  },
  "to": [
    {
      "localPart": "bob",
      "domain": "brightchain.net",
      "displayName": "Bob Jones"
    }
  ],
  "cc": [],
  "bcc": [],
  "subject": "Project Update",
  "textBody": "Hi Bob, here's the latest update...",
  "htmlBody": "<p>Hi Bob, here's the latest update...</p>"
}
```

The `from` and at least one recipient (`to`, `cc`, or `bcc`) are required. Each mailbox object requires `localPart` and `domain`; `displayName` is optional.

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "messageId": "msg-uuid",
    "from": {
      "localPart": "alice",
      "domain": "brightchain.net",
      "displayName": "Alice Smith"
    },
    "to": [
      {
        "localPart": "bob",
        "domain": "brightchain.net",
        "displayName": "Bob Jones"
      }
    ],
    "subject": "Project Update",
    "date": "2026-03-13T10:00:00.000Z",
    "deliveryStatus": {
      "bob@brightchain.net": "PENDING"
    }
  }
}
```

The email content is encrypted and stored as blocks in the block store. Delivery is initiated via the gossip protocol, with the `deliveryStatus` map tracking per-recipient progress.

**Errors:**
- `400` — Validation failure (missing `from`, no recipients, invalid mailbox format, invalid headers, message too large)
- `503` — Email service unavailable

---

## GET /inbox

Query the authenticated member's inbox with filtering, sorting, and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `memberId` | string | Member ID (from auth or query param) |
| `readStatus` | string | Filter: `read`, `unread`, or `all` (default: `all`) |
| `senderAddress` | string | Filter by sender email address |
| `dateFrom` | string (ISO 8601) | Filter emails after this date |
| `dateTo` | string (ISO 8601) | Filter emails before this date |
| `hasAttachments` | string | Filter: `true` or `false` |
| `subjectContains` | string | Filter by subject substring |
| `searchText` | string | Full-text search across subject and body |
| `sortBy` | string | Sort field: `date`, `sender`, `subject`, `size` |
| `sortDirection` | string | Sort order: `asc` or `desc` (default: `desc`) |
| `page` | number | Page number (1-based) |
| `pageSize` | number | Results per page |

**Example:** `GET /api/emails/inbox?readStatus=unread&sortBy=date&sortDirection=desc&page=1&pageSize=25`

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "emails": [
      {
        "messageId": "msg-uuid",
        "from": {
          "localPart": "bob",
          "domain": "brightchain.net",
          "displayName": "Bob Jones"
        },
        "subject": "Re: Project Update",
        "date": "2026-03-13T11:00:00.000Z",
        "read": false,
        "hasAttachments": false,
        "threadId": "thread-uuid",
        "preview": "Thanks Alice, looks good..."
      }
    ],
    "total": 142,
    "page": 1,
    "pageSize": 25
  }
}
```

**Errors:**
- `401` — Not authenticated
- `503` — Email service unavailable

---

## GET /inbox/unread-count

Get the total number of unread emails for the authenticated member.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "unreadCount": 7
  }
}
```

**Errors:**
- `401` — Not authenticated

---

## GET /:messageId

Get email metadata by message ID. Returns headers and routing information without the full body content.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "messageId": "msg-uuid",
    "from": {
      "localPart": "alice",
      "domain": "brightchain.net",
      "displayName": "Alice Smith"
    },
    "to": [
      {
        "localPart": "bob",
        "domain": "brightchain.net"
      }
    ],
    "cc": [],
    "subject": "Project Update",
    "date": "2026-03-13T10:00:00.000Z",
    "inReplyTo": null,
    "references": [],
    "threadId": "thread-uuid",
    "read": true,
    "hasAttachments": false
  }
}
```

**Errors:**
- `404` — Email not found
- `503` — Email service unavailable

---

## GET /:messageId/content

Get the full email content including body text, HTML, and attachment metadata. This endpoint decrypts the email's CBL blocks to reconstruct the full message.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "messageId": "msg-uuid",
    "textBody": "Hi Bob, here's the latest update...",
    "htmlBody": "<p>Hi Bob, here's the latest update...</p>",
    "attachments": [
      {
        "filename": "report.pdf",
        "contentType": "application/pdf",
        "size": 245760,
        "blockId": "attachment-block-uuid"
      }
    ]
  }
}
```

**Errors:**
- `404` — Email not found
- `503` — Email service unavailable

---

## GET /:messageId/thread

Get all emails in a conversation thread. Threads are linked via RFC 5322 `In-Reply-To` and `References` headers.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "threadId": "thread-uuid",
    "messages": [
      {
        "messageId": "msg-uuid-1",
        "from": { "localPart": "alice", "domain": "brightchain.net" },
        "subject": "Project Update",
        "date": "2026-03-13T10:00:00.000Z"
      },
      {
        "messageId": "msg-uuid-2",
        "from": { "localPart": "bob", "domain": "brightchain.net" },
        "subject": "Re: Project Update",
        "date": "2026-03-13T11:00:00.000Z",
        "inReplyTo": "msg-uuid-1"
      }
    ]
  }
}
```

**Errors:**
- `404` — Email not found
- `503` — Email service unavailable

---

## GET /:messageId/delivery-status

Get per-recipient delivery status for an email. Delivery is tracked through the gossip protocol with cryptographic acknowledgments.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "bob@brightchain.net": "DELIVERED",
    "carol@brightchain.net": "IN_TRANSIT"
  }
}
```

**Delivery status values:**

| Status | Description |
|--------|-------------|
| `PENDING` | Email queued for delivery |
| `IN_TRANSIT` | Propagating through gossip network |
| `DELIVERED` | Recipient node acknowledged receipt |
| `FAILED` | Delivery failed after retry exhaustion |

The gossip retry service (`GossipRetryService`) handles automatic retransmission for unacknowledged deliveries.

**Errors:**
- `404` — Email not found
- `503` — Email service unavailable

---

## POST /:messageId/reply

Reply to an existing email. The reply is threaded via `In-Reply-To` and `References` headers per RFC 5322. When `replyAll` is true, all original recipients (To + CC) are included.

**Request:**
```json
{
  "from": {
    "localPart": "bob",
    "domain": "brightchain.net",
    "displayName": "Bob Jones"
  },
  "replyAll": false,
  "subject": "Re: Project Update",
  "textBody": "Thanks Alice, looks good!",
  "htmlBody": "<p>Thanks Alice, looks good!</p>"
}
```

The `subject` is optional; if omitted, the original subject is prefixed with "Re: ".

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "messageId": "reply-msg-uuid",
    "from": { "localPart": "bob", "domain": "brightchain.net" },
    "to": [{ "localPart": "alice", "domain": "brightchain.net" }],
    "subject": "Re: Project Update",
    "date": "2026-03-13T11:00:00.000Z",
    "inReplyTo": "msg-uuid",
    "deliveryStatus": {
      "alice@brightchain.net": "PENDING"
    }
  }
}
```

**Errors:**
- `400` — Validation failure (missing `from`)
- `404` — Original email not found
- `503` — Email service unavailable

---

## POST /:messageId/forward

Forward an email to new recipients. The original email content is included in the forwarded message.

**Request:**
```json
{
  "forwardTo": [
    {
      "localPart": "carol",
      "domain": "brightchain.net",
      "displayName": "Carol White"
    }
  ]
}
```

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "messageId": "fwd-msg-uuid",
    "subject": "Fwd: Project Update",
    "date": "2026-03-13T12:00:00.000Z",
    "deliveryStatus": {
      "carol@brightchain.net": "PENDING"
    }
  }
}
```

**Errors:**
- `400` — Validation failure (missing or empty `forwardTo`)
- `404` — Original email not found
- `503` — Email service unavailable

---

## POST /:messageId/read

Mark an email as read for the authenticated member.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "markedAsRead": true
  }
}
```

**Errors:**
- `404` — Email not found
- `503` — Email service unavailable

---

## DELETE /:messageId

Delete an email. Removes the email metadata and associated block references.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "deleted": true
  }
}
```

**Errors:**
- `404` — Email not found
- `503` — Email service unavailable

---

## Architecture Overview

BrightMail is organized into four layers:

1. **HTTP API Layer** — `EmailController` handles request validation, parameter extraction, and response wrapping
2. **Service Layer** — `MessagePassingService` orchestrates email composition, delivery, and querying
3. **Storage Layer** — `EmailMessageService` manages RFC 5322 metadata; `MessageCBLService` stores email content as encrypted blocks
4. **Delivery Layer** — `IGossipService` propagates emails via epidemic gossip; `GossipRetryService` handles retransmission

### Block Storage

Email content is stored as encrypted Content Block Lists (CBLs) in BrightChain's block store:

| Content Size | Block Type |
|-------------|------------|
| < 1 KB | Small block |
| < 64 KB | Medium block |
| < 1 MB | Large block |
| < 16 MB | Huge block |
| > 16 MB | Multi-block CBL |

### Gossip Delivery

Emails are propagated across the BrightChain network using epidemic gossip:

1. Sender node stores email blocks locally
2. Gossip service propagates block references to recipient nodes
3. Recipient nodes pull and decrypt email blocks
4. Delivery receipts are cryptographically signed and returned
5. Failed deliveries are retried with exponential backoff

---

## Mailbox Format

All mailbox fields use a structured object rather than a raw email string:

```json
{
  "localPart": "alice",
  "domain": "brightchain.net",
  "displayName": "Alice Smith"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `localPart` | Yes | The part before the `@` |
| `domain` | Yes | The part after the `@` |
| `displayName` | No | Human-readable name |

The server constructs RFC 5322 mailbox format internally: `"Alice Smith" <alice@brightchain.net>`.

---

## Standard Response Format

All BrightMail responses use the `IApiEnvelope<T>` wrapper:

```json
{
  "status": "success",
  "data": { ... }
}
```

Error responses:

```json
{
  "status": "error",
  "error": {
    "code": "EMAIL_NOT_FOUND",
    "message": "Email not found: <messageId>"
  }
}
```

| HTTP Status | Code | Condition |
|-------------|------|-----------|
| `201` | — | Email sent, reply created, or forward created |
| `200` | — | Successful read operation |
| `400` | `VALIDATION_ERROR` | Invalid mailbox, missing headers, no recipients, message too large |
| `404` | `EMAIL_NOT_FOUND` | Message ID not found |
| `503` | `SERVICE_UNAVAILABLE` | MessagePassingService not initialized |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

---

## Related Documentation

- [Email System Architecture](../messaging/email-system-architecture.md)
- [Messaging System Architecture](../messaging/messaging-system-architecture.md)
- [Authentication API Reference](./authentication-api.md)
