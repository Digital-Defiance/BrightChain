import { describe, expect, it } from '@jest/globals';
import {
  ContentTransferEncoding,
  createContentType,
  IContentDisposition,
  IMimePart,
} from './mimePart';

describe('IContentType Interface', () => {
  describe('createContentType utility', () => {
    it('should create a content type with type and subtype', () => {
      const ct = createContentType('text', 'plain');
      expect(ct.type).toBe('text');
      expect(ct.subtype).toBe('plain');
      expect(ct.parameters.size).toBe(0);
    });

    it('should compute mediaType as type/subtype', () => {
      const ct = createContentType('text', 'plain');
      expect(ct.mediaType).toBe('text/plain');
    });

    it('should accept optional parameters', () => {
      const params = new Map([['charset', 'utf-8']]);
      const ct = createContentType('text', 'plain', params);
      expect(ct.parameters.get('charset')).toBe('utf-8');
    });

    it('should default parameters to empty Map when not provided', () => {
      const ct = createContentType('image', 'jpeg');
      expect(ct.parameters).toBeInstanceOf(Map);
      expect(ct.parameters.size).toBe(0);
    });

    it('should support multipart types with boundary parameter', () => {
      const params = new Map([['boundary', '----=_Part_123']]);
      const ct = createContentType('multipart', 'mixed', params);
      expect(ct.mediaType).toBe('multipart/mixed');
      expect(ct.parameters.get('boundary')).toBe('----=_Part_123');
    });

    it('should support multiple parameters', () => {
      const params = new Map([
        ['charset', 'utf-8'],
        ['name', 'document.txt'],
        ['format', 'flowed'],
      ]);
      const ct = createContentType('text', 'plain', params);
      expect(ct.parameters.size).toBe(3);
      expect(ct.parameters.get('charset')).toBe('utf-8');
      expect(ct.parameters.get('name')).toBe('document.txt');
      expect(ct.parameters.get('format')).toBe('flowed');
    });

    it('should reflect mutations to type/subtype in mediaType', () => {
      const ct = createContentType('text', 'plain');
      expect(ct.mediaType).toBe('text/plain');
      // mediaType is a getter, so mutating type/subtype should update it
      ct.type = 'application';
      ct.subtype = 'json';
      expect(ct.mediaType).toBe('application/json');
    });
  });

  describe('all discrete media types', () => {
    const discreteTypes = [
      ['text', 'plain'],
      ['text', 'html'],
      ['image', 'jpeg'],
      ['image', 'png'],
      ['audio', 'mpeg'],
      ['video', 'mp4'],
      ['application', 'pdf'],
      ['application', 'octet-stream'],
    ] as const;

    it.each(discreteTypes)('should support %s/%s', (type, subtype) => {
      const ct = createContentType(type, subtype);
      expect(ct.type).toBe(type);
      expect(ct.subtype).toBe(subtype);
      expect(ct.mediaType).toBe(`${type}/${subtype}`);
    });
  });

  describe('all composite media types', () => {
    const compositeTypes = [
      ['multipart', 'mixed'],
      ['multipart', 'alternative'],
      ['multipart', 'related'],
      ['multipart', 'digest'],
      ['message', 'rfc822'],
    ] as const;

    it.each(compositeTypes)('should support %s/%s', (type, subtype) => {
      const ct = createContentType(type, subtype);
      expect(ct.mediaType).toBe(`${type}/${subtype}`);
    });
  });
});

describe('ContentTransferEncoding Enum', () => {
  it('should define SevenBit as "7bit"', () => {
    expect(ContentTransferEncoding.SevenBit).toBe('7bit');
  });

  it('should define EightBit as "8bit"', () => {
    expect(ContentTransferEncoding.EightBit).toBe('8bit');
  });

  it('should define Binary as "binary"', () => {
    expect(ContentTransferEncoding.Binary).toBe('binary');
  });

  it('should define QuotedPrintable as "quoted-printable"', () => {
    expect(ContentTransferEncoding.QuotedPrintable).toBe('quoted-printable');
  });

  it('should define Base64 as "base64"', () => {
    expect(ContentTransferEncoding.Base64).toBe('base64');
  });

  it('should have exactly 5 encoding values', () => {
    const values = Object.values(ContentTransferEncoding);
    expect(values).toHaveLength(5);
    expect(values).toEqual(
      expect.arrayContaining([
        '7bit',
        '8bit',
        'binary',
        'quoted-printable',
        'base64',
      ]),
    );
  });
});

describe('IContentDisposition Interface', () => {
  it('should support inline disposition', () => {
    const disposition: IContentDisposition = {
      type: 'inline',
    };
    expect(disposition.type).toBe('inline');
    expect(disposition.filename).toBeUndefined();
  });

  it('should support attachment disposition with filename', () => {
    const disposition: IContentDisposition = {
      type: 'attachment',
      filename: 'document.pdf',
    };
    expect(disposition.type).toBe('attachment');
    expect(disposition.filename).toBe('document.pdf');
  });

  it('should support all optional date fields', () => {
    const now = new Date();
    const disposition: IContentDisposition = {
      type: 'attachment',
      filename: 'report.xlsx',
      creationDate: now,
      modificationDate: now,
      readDate: now,
      size: 2048,
    };
    expect(disposition.creationDate).toBe(now);
    expect(disposition.modificationDate).toBe(now);
    expect(disposition.readDate).toBe(now);
    expect(disposition.size).toBe(2048);
  });

  it('should allow all optional fields to be undefined', () => {
    const disposition: IContentDisposition = {
      type: 'inline',
    };
    expect(disposition.filename).toBeUndefined();
    expect(disposition.creationDate).toBeUndefined();
    expect(disposition.modificationDate).toBeUndefined();
    expect(disposition.readDate).toBeUndefined();
    expect(disposition.size).toBeUndefined();
  });
});

describe('IMimePart Interface', () => {
  it('should create a simple text part', () => {
    const part: IMimePart = {
      contentType: createContentType(
        'text',
        'plain',
        new Map([['charset', 'utf-8']]),
      ),
      body: new TextEncoder().encode('Hello, World!'),
      size: 13,
    };
    expect(part.contentType.mediaType).toBe('text/plain');
    expect(part.body).toBeInstanceOf(Uint8Array);
    expect(part.size).toBe(13);
  });

  it('should support Content-Transfer-Encoding', () => {
    const part: IMimePart = {
      contentType: createContentType('application', 'pdf'),
      contentTransferEncoding: ContentTransferEncoding.Base64,
      bodyBlockIds: ['block-1', 'block-2'],
      size: 50000,
    };
    expect(part.contentTransferEncoding).toBe('base64');
  });

  it('should support Content-Disposition for attachments', () => {
    const part: IMimePart = {
      contentType: createContentType('application', 'pdf'),
      contentTransferEncoding: ContentTransferEncoding.Base64,
      contentDisposition: {
        type: 'attachment',
        filename: 'document.pdf',
        size: 50000,
      },
      bodyBlockIds: ['block-1'],
      size: 50000,
    };
    expect(part.contentDisposition?.type).toBe('attachment');
    expect(part.contentDisposition?.filename).toBe('document.pdf');
  });

  it('should support Content-ID for inline references', () => {
    const part: IMimePart = {
      contentType: createContentType('image', 'png'),
      contentId: '<image001@example.com>',
      contentDisposition: { type: 'inline' },
      body: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      size: 4,
    };
    expect(part.contentId).toBe('<image001@example.com>');
  });

  it('should support Content-Description', () => {
    const part: IMimePart = {
      contentType: createContentType('image', 'jpeg'),
      contentDescription: 'Company logo',
      body: new Uint8Array([0xff, 0xd8]),
      size: 2,
    };
    expect(part.contentDescription).toBe('Company logo');
  });

  it('should support body as Uint8Array for inline content', () => {
    const content = new TextEncoder().encode('Inline content');
    const part: IMimePart = {
      contentType: createContentType('text', 'plain'),
      body: content,
      size: content.length,
    };
    expect(part.body).toBe(content);
    expect(part.bodyBlockIds).toBeUndefined();
  });

  it('should support bodyBlockIds for large content', () => {
    const part: IMimePart = {
      contentType: createContentType('video', 'mp4'),
      contentTransferEncoding: ContentTransferEncoding.Base64,
      bodyBlockIds: ['block-a', 'block-b', 'block-c'],
      size: 10_000_000,
    };
    expect(part.bodyBlockIds).toEqual(['block-a', 'block-b', 'block-c']);
    expect(part.body).toBeUndefined();
  });

  it('should support nested parts for multipart types', () => {
    const textPart: IMimePart = {
      contentType: createContentType('text', 'plain'),
      body: new TextEncoder().encode('Plain text'),
      size: 10,
    };
    const htmlPart: IMimePart = {
      contentType: createContentType('text', 'html'),
      body: new TextEncoder().encode('<p>HTML</p>'),
      size: 11,
    };
    const multipart: IMimePart = {
      contentType: createContentType(
        'multipart',
        'alternative',
        new Map([['boundary', '----=_Alt']]),
      ),
      parts: [textPart, htmlPart],
      size: 21,
    };
    expect(multipart.parts).toHaveLength(2);
    expect(multipart.parts?.[0].contentType.mediaType).toBe('text/plain');
    expect(multipart.parts?.[1].contentType.mediaType).toBe('text/html');
  });

  it('should support deeply nested multipart structures', () => {
    // multipart/mixed
    //   ├── multipart/alternative
    //   │   ├── text/plain
    //   │   └── text/html
    //   └── application/pdf (attachment)
    const textPart: IMimePart = {
      contentType: createContentType('text', 'plain'),
      body: new TextEncoder().encode('Hello'),
      size: 5,
    };
    const htmlPart: IMimePart = {
      contentType: createContentType('text', 'html'),
      body: new TextEncoder().encode('<p>Hello</p>'),
      size: 12,
    };
    const alternativePart: IMimePart = {
      contentType: createContentType(
        'multipart',
        'alternative',
        new Map([['boundary', '----=_Alt']]),
      ),
      parts: [textPart, htmlPart],
      size: 17,
    };
    const attachmentPart: IMimePart = {
      contentType: createContentType('application', 'pdf'),
      contentTransferEncoding: ContentTransferEncoding.Base64,
      contentDisposition: { type: 'attachment', filename: 'doc.pdf' },
      bodyBlockIds: ['block-1'],
      size: 50000,
    };
    const mixedPart: IMimePart = {
      contentType: createContentType(
        'multipart',
        'mixed',
        new Map([['boundary', '----=_Mixed']]),
      ),
      parts: [alternativePart, attachmentPart],
      size: 50017,
    };

    expect(mixedPart.parts).toHaveLength(2);
    expect(mixedPart.parts?.[0].parts).toHaveLength(2);
    expect(mixedPart.parts?.[0].parts?.[0].contentType.mediaType).toBe(
      'text/plain',
    );
    expect(mixedPart.parts?.[0].parts?.[1].contentType.mediaType).toBe(
      'text/html',
    );
    expect(mixedPart.parts?.[1].contentDisposition?.type).toBe('attachment');
  });

  it('should allow all optional fields to be undefined', () => {
    const part: IMimePart = {
      contentType: createContentType('text', 'plain'),
      size: 0,
    };
    expect(part.contentTransferEncoding).toBeUndefined();
    expect(part.contentDisposition).toBeUndefined();
    expect(part.contentId).toBeUndefined();
    expect(part.contentDescription).toBeUndefined();
    expect(part.body).toBeUndefined();
    expect(part.bodyBlockIds).toBeUndefined();
    expect(part.parts).toBeUndefined();
  });
});

describe('Re-export compatibility', () => {
  it('should be importable from mimePart directly', () => {
    // This test verifies the module exports are correct
    expect(createContentType).toBeDefined();
    expect(typeof createContentType).toBe('function');
    expect(ContentTransferEncoding).toBeDefined();
    expect(typeof ContentTransferEncoding).toBe('object');
  });
});
