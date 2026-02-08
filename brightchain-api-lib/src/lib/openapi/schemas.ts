/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * OpenAPI component schemas for the BrightChain API.
 * These are referenced by controllers via schema name strings.
 */

import { OpenAPISchemaRegistry } from '@digitaldefiance/node-express-suite';

export const BrightChainSchemas: Record<string, any> = {
  // Error response
  ErrorResponse: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' },
          requestId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['code', 'message', 'requestId'],
      },
    },
  },

  // Health schemas
  HealthResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      status: {
        type: 'string',
        enum: ['healthy', 'degraded', 'unhealthy', 'starting'],
      },
      uptime: { type: 'number' },
      timestamp: { type: 'string', format: 'date-time' },
      version: { type: 'string' },
    },
    required: ['status', 'uptime', 'timestamp', 'version'],
  },
  DetailedHealthResponse: {
    allOf: [
      { $ref: '#/components/schemas/HealthResponse' },
      {
        type: 'object',
        properties: {
          dependencies: {
            type: 'object',
            properties: {
              blockStore: { $ref: '#/components/schemas/DependencyStatus' },
              messageService: { $ref: '#/components/schemas/DependencyStatus' },
              webSocketServer: {
                $ref: '#/components/schemas/DependencyStatus',
              },
            },
          },
        },
      },
    ],
  },
  DependencyStatus: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      status: {
        type: 'string',
        enum: ['healthy', 'degraded', 'unhealthy', 'starting'],
      },
      latencyMs: { type: 'number' },
      message: { type: 'string' },
    },
    required: ['name', 'status'],
  },

  // Message schemas
  SendMessageRequest: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Base64 encoded content' },
      senderId: { type: 'string' },
      recipients: { type: 'array', items: { type: 'string' } },
      messageType: { type: 'string' },
      priority: { type: 'integer', enum: [0, 1, 2, 3] },
      encryptionScheme: { type: 'integer' },
    },
    required: ['content', 'senderId', 'messageType'],
  },
  SendMessageResponse: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      magnetUrl: { type: 'string' },
    },
  },
  GetMessageResponse: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Base64 encoded content' },
    },
  },
  QueryMessagesResponse: {
    type: 'object',
    properties: {
      messages: { type: 'array', items: { type: 'object' } },
      total: { type: 'integer' },
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
    },
  },

  // Block schemas
  StoreBlockRequest: {
    type: 'object',
    properties: {
      data: { type: 'string', description: 'Base64 encoded block data' },
      canRead: { type: 'boolean', default: true },
      canPersist: { type: 'boolean', default: true },
      options: {
        type: 'object',
        properties: {
          expiresAt: { type: 'string', format: 'date-time' },
          durabilityLevel: {
            type: 'string',
            enum: ['ephemeral', 'standard', 'high_durability'],
          },
        },
      },
    },
    required: ['data'],
  },
  StoreBlockResponse: {
    type: 'object',
    properties: {
      blockId: { type: 'string' },
      success: { type: 'boolean' },
      metadata: { type: 'object' },
    },
  },
  GetBlockResponse: {
    type: 'object',
    properties: {
      blockId: { type: 'string' },
      data: { type: 'string' },
      canRead: { type: 'boolean' },
      canPersist: { type: 'boolean' },
      metadata: { type: 'object' },
    },
  },
  GetBlockMetadataResponse: {
    type: 'object',
    properties: {
      blockId: { type: 'string' },
      metadata: { type: 'object' },
    },
  },
  BrightenBlockRequest: {
    type: 'object',
    properties: {
      blockId: { type: 'string' },
      randomBlockCount: { type: 'integer', minimum: 1 },
    },
    required: ['blockId', 'randomBlockCount'],
  },
  BrightenBlockResponse: {
    type: 'object',
    properties: {
      brightenedBlockId: { type: 'string' },
      randomBlockIds: { type: 'array', items: { type: 'string' } },
      originalBlockId: { type: 'string' },
    },
  },

  // CBL schemas
  StoreCBLRequest: {
    type: 'object',
    properties: {
      cblData: { type: 'string', description: 'Base64 encoded CBL' },
      durabilityLevel: {
        type: 'string',
        enum: ['ephemeral', 'standard', 'enhanced', 'maximum'],
      },
      isEncrypted: { type: 'boolean' },
    },
    required: ['cblData'],
  },
  StoreCBLResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: { type: 'object' },
    },
  },
  RetrieveCBLResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: {
        type: 'object',
        properties: {
          cblData: { type: 'string' },
          isEncrypted: { type: 'boolean' },
        },
      },
    },
  },

  // Super CBL schemas
  StoreSCBLRequest: {
    type: 'object',
    properties: {
      data: { type: 'string', description: 'Base64 encoded file data' },
      durabilityLevel: {
        type: 'string',
        enum: ['ephemeral', 'standard', 'enhanced', 'maximum'],
      },
      isEncrypted: { type: 'boolean' },
    },
    required: ['data'],
  },
  StoreSCBLResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      magnetUrl: { type: 'string' },
      metadata: {
        type: 'object',
        properties: {
          hierarchyDepth: { type: 'integer' },
          subCblCount: { type: 'integer' },
          totalSize: { type: 'integer' },
          rootBlockIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  RetrieveSCBLResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: { type: 'string' },
      isEncrypted: { type: 'boolean' },
    },
  },

  // Node schemas
  NodeInfo: {
    type: 'object',
    properties: {
      nodeId: { type: 'string' },
      publicKey: { type: 'string' },
      status: { type: 'string', enum: ['online', 'offline', 'unreachable'] },
      capabilities: { type: 'array', items: { type: 'string' } },
      lastSeen: { type: 'string', format: 'date-time' },
      latencyMs: { type: 'number' },
    },
  },
  ListNodesResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      nodes: {
        type: 'array',
        items: { $ref: '#/components/schemas/NodeInfo' },
      },
      total: { type: 'integer' },
    },
  },
  GetNodeResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      node: { $ref: '#/components/schemas/NodeInfo' },
    },
  },
  DiscoverBlockRequest: {
    type: 'object',
    properties: { blockId: { type: 'string' } },
    required: ['blockId'],
  },
  DiscoverBlockResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      blockId: { type: 'string' },
      found: { type: 'boolean' },
      locations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nodeId: { type: 'string' },
            latencyMs: { type: 'number' },
            lastSeen: { type: 'string', format: 'date-time' },
          },
        },
      },
      queriedPeers: { type: 'integer' },
      duration: { type: 'number' },
    },
  },
  RegisterNodeRequest: {
    type: 'object',
    properties: {
      nodeId: { type: 'string' },
      publicKey: { type: 'string' },
    },
    required: ['nodeId', 'publicKey'],
  },
  RegisterNodeResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      success: { type: 'boolean' },
      nodeId: { type: 'string' },
    },
  },

  // Sync schemas
  ReplicateBlockRequest: {
    type: 'object',
    properties: {
      targetNodeIds: { type: 'array', items: { type: 'string' } },
    },
    required: ['targetNodeIds'],
  },
  ReplicateBlockResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      blockId: { type: 'string' },
      replicationResults: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nodeId: { type: 'string' },
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  },
  BlockLocationsResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      blockId: { type: 'string' },
      locations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nodeId: { type: 'string' },
            lastSeen: { type: 'string', format: 'date-time' },
            latencyMs: { type: 'number' },
            isAuthoritative: { type: 'boolean' },
          },
        },
      },
    },
  },
  SyncRequestBody: {
    type: 'object',
    properties: {
      blockIds: { type: 'array', items: { type: 'string' } },
    },
    required: ['blockIds'],
  },
  SyncRequestResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      available: { type: 'array', items: { type: 'string' } },
      missing: { type: 'array', items: { type: 'string' } },
      unknown: { type: 'array', items: { type: 'string' } },
    },
  },
  ReconcileResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      result: { type: 'object' },
    },
  },

  // User schemas
  RegisterRequest: {
    type: 'object',
    properties: {
      username: { type: 'string' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' },
    },
    required: ['username', 'email', 'password'],
  },
  LoginRequest: {
    type: 'object',
    properties: {
      username: { type: 'string' },
      password: { type: 'string', format: 'password' },
    },
    required: ['username', 'password'],
  },
  AuthResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      token: { type: 'string' },
      memberId: { type: 'string' },
      energyBalance: { type: 'number' },
    },
  },
  ProfileResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      memberId: { type: 'string' },
      energyBalance: { type: 'number' },
      availableBalance: { type: 'number' },
      earned: { type: 'number' },
      spent: { type: 'number' },
      reserved: { type: 'number' },
      reputation: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' },
      lastUpdated: { type: 'string', format: 'date-time' },
    },
  },
  UpdateProfileRequest: {
    type: 'object',
    properties: {
      displayName: { type: 'string' },
      settings: {
        type: 'object',
        properties: {
          autoReplication: { type: 'boolean' },
          minRedundancy: { type: 'integer' },
          preferredRegions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },

  // Energy schemas
  EnergyBalanceResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      balance: { type: 'number' },
      earned: { type: 'number' },
      spent: { type: 'number' },
      reserved: { type: 'number' },
      reputation: { type: 'number' },
    },
  },
  TransactionsResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      transactions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            source: { type: 'string' },
            destination: { type: 'string' },
            amount: { type: 'number' },
            operationType: { type: 'string' },
            blockId: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
      },
      count: { type: 'integer' },
    },
  },

  // Quorum schemas
  AddMemberRequest: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string' },
    },
    required: ['name'],
  },
  AddMemberResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      member: { $ref: '#/components/schemas/QuorumMember' },
      mnemonic: { type: 'string' },
    },
  },
  QuorumMember: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      publicKey: { type: 'string' },
      metadata: { type: 'object' },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  ListMembersResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      members: {
        type: 'array',
        items: { $ref: '#/components/schemas/QuorumMember' },
      },
    },
  },
  SealDocumentRequest: {
    type: 'object',
    properties: {
      document: { type: 'object' },
      memberIds: { type: 'array', items: { type: 'string' }, minItems: 2 },
      sharesRequired: { type: 'integer', minimum: 2 },
    },
    required: ['document', 'memberIds'],
  },
  SealDocumentResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      documentId: { type: 'string' },
      memberIds: { type: 'array', items: { type: 'string' } },
      sharesRequired: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  UnsealDocumentRequest: {
    type: 'object',
    properties: {
      memberCredentials: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            memberId: { type: 'string' },
            mnemonic: { type: 'string' },
          },
          required: ['memberId', 'mnemonic'],
        },
      },
    },
    required: ['memberCredentials'],
  },
  UnsealDocumentResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      document: { type: 'object' },
    },
  },
  GetDocumentResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      document: { type: 'object' },
    },
  },
  CanUnlockResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      canUnlock: { type: 'boolean' },
      sharesProvided: { type: 'integer' },
      sharesRequired: { type: 'integer' },
      missingMembers: { type: 'array', items: { type: 'string' } },
    },
  },

  // OpenAPI spec schema (for the docs endpoint itself)
  OpenAPISpec: {
    type: 'object',
    properties: {
      openapi: { type: 'string' },
      info: { type: 'object' },
      servers: { type: 'array' },
      paths: { type: 'object' },
      components: { type: 'object' },
    },
  },
};

/**
 * Security schemes for the API
 */
export const BrightChainSecuritySchemes: Record<string, any> = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT authentication token. Obtain via POST /user/login.',
  },
};

/**
 * Register all BrightChain schemas with the OpenAPI registry.
 * Call this during application initialization.
 */
export function registerBrightChainSchemas(): void {
  OpenAPISchemaRegistry.registerSchemas(BrightChainSchemas);
  OpenAPISchemaRegistry.registerSecuritySchemes(BrightChainSecuritySchemes);
}

// Auto-register on import
registerBrightChainSchemas();
