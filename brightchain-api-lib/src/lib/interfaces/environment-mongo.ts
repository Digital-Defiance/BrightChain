// Mongo-specific environment definition removed; this remains for backward compatibility
// without importing mongodb types.
type ReadConcernLike = string | { level?: string };
type WriteConcern = { w?: string | number; j?: boolean; wtimeoutMS?: number };

export interface IMongoEnvironment {
  /**
   * The URI of the MongoDB database
   */
  uri: string;
  /**
   * The maximum number of connections in the connection pool (default: 10)
   */
  maxPoolSize: number;
  /**
   * The minimum number of connections in the connection pool (default: 2)
   */
  minPoolSize: number;
  /**
   * The maximum number of milliseconds that a connection can remain idle in the connection pool (default: 30000)
   */
  maxIdleTimeMS: number;
  /**
   * The maximum time in milliseconds to wait for a connection to be established (default: 5000)
   */
  serverSelectionTimeoutMS: number;
  /**
   * The maximum time in milliseconds to wait for a socket to be established (default: 30000)
   */
  socketTimeoutMS: number;
  /**
   * Whether to retry writes (default: true)
   */
  retryWrites: boolean;
  /**
   * Whether to retry reads (default: true)
   */
  retryReads: boolean;
  /**
   * The read concern for the MongoDB database
   */
  readConcern: ReadConcernLike;
  /**
   * The write concern for the MongoDB database (default: { w: 'majority', j: true })
   */
  writeConcern: WriteConcern;
  /**
   * Whether the MongoDB server supports the setParameter command (MongoDB 4.4+)
   */
  setParameterSupported: boolean;
  /**
   * Whether the MongoDB server supports setting transactionLifetimeLimitSeconds (MongoDB 4.2+)
   */
  transactionLifetimeLimitSecondsSupported: boolean;
  /**
   * Whether the MongoDB server supports setting maxTransactionLockRequestTimeoutMillis (MongoDB 4.4+)
   */
  maxTransactionLockRequestTimeoutMillisSupported: boolean;
  /**
   * How long for transactions to timeout
   */
  transactionTimeout: number;
  /**
   * The maximum time to wait for a lock when using transactions (MongoDB 4.4+)
   */
  transactionLockRequestTimeout: number;
  /**
   * Use transactions
   */
  useTransactions: boolean;
}
