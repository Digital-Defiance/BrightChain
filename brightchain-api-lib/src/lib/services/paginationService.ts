export interface IPaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface PaginationCursor {
  timestamp: number;
  id: string;
}

export class PaginationService {
  static encodeCursor(timestamp: number, id: string): string {
    return Buffer.from(JSON.stringify({ timestamp, id })).toString('base64');
  }

  static decodeCursor(cursor: string): PaginationCursor {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  }

  static paginate<T extends { timestamp: number; id: string }>(
    items: T[],
    limit: number,
    cursor?: string,
  ): IPaginatedResult<T> {
    const sortedItems = [...items].sort((a, b) => b.timestamp - a.timestamp);

    let startIndex = 0;
    if (cursor) {
      const { timestamp, id } = this.decodeCursor(cursor);
      startIndex =
        sortedItems.findIndex(
          (item) => item.timestamp === timestamp && item.id === id,
        ) + 1;
    }

    const pageItems = sortedItems.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < sortedItems.length;
    const nextCursor =
      hasMore && pageItems.length > 0
        ? this.encodeCursor(
            pageItems[pageItems.length - 1].timestamp,
            pageItems[pageItems.length - 1].id,
          )
        : undefined;

    return {
      items: pageItems,
      nextCursor,
      hasMore,
    };
  }
}
