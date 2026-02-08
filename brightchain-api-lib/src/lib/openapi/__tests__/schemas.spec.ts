/**
 * @fileoverview Unit tests for BrightChain OpenAPI schemas
 */

import { OpenAPISchemaRegistry } from '@digitaldefiance/node-express-suite';
import {
  BrightChainSchemas,
  BrightChainSecuritySchemes,
  registerBrightChainSchemas,
} from '../schemas';

describe('BrightChain OpenAPI Schemas', () => {
  beforeEach(() => {
    OpenAPISchemaRegistry.clear();
  });

  describe('BrightChainSchemas', () => {
    it('should have ErrorResponse schema', () => {
      expect(BrightChainSchemas['ErrorResponse']).toBeDefined();
      expect(BrightChainSchemas['ErrorResponse'].type).toBe('object');
      expect(
        BrightChainSchemas['ErrorResponse'].properties.error,
      ).toBeDefined();
    });

    describe('Health schemas', () => {
      it('should have HealthResponse schema', () => {
        expect(BrightChainSchemas['HealthResponse']).toBeDefined();
        expect(
          BrightChainSchemas['HealthResponse'].properties.status,
        ).toBeDefined();
        expect(
          BrightChainSchemas['HealthResponse'].properties.status.enum,
        ).toContain('healthy');
        expect(
          BrightChainSchemas['HealthResponse'].properties.uptime,
        ).toBeDefined();
        expect(
          BrightChainSchemas['HealthResponse'].properties.version,
        ).toBeDefined();
      });

      it('should have DetailedHealthResponse schema', () => {
        expect(BrightChainSchemas['DetailedHealthResponse']).toBeDefined();
        expect(
          BrightChainSchemas['DetailedHealthResponse'].allOf,
        ).toBeDefined();
      });

      it('should have DependencyStatus schema', () => {
        expect(BrightChainSchemas['DependencyStatus']).toBeDefined();
        expect(
          BrightChainSchemas['DependencyStatus'].properties.name,
        ).toBeDefined();
        expect(
          BrightChainSchemas['DependencyStatus'].properties.status,
        ).toBeDefined();
      });
    });

    describe('Block schemas', () => {
      it('should have StoreBlockRequest schema', () => {
        expect(BrightChainSchemas['StoreBlockRequest']).toBeDefined();
        expect(BrightChainSchemas['StoreBlockRequest'].required).toContain(
          'data',
        );
        expect(
          BrightChainSchemas['StoreBlockRequest'].properties.data,
        ).toBeDefined();
      });

      it('should have StoreBlockResponse schema', () => {
        expect(BrightChainSchemas['StoreBlockResponse']).toBeDefined();
        expect(
          BrightChainSchemas['StoreBlockResponse'].properties.blockId,
        ).toBeDefined();
        expect(
          BrightChainSchemas['StoreBlockResponse'].properties.success,
        ).toBeDefined();
      });

      it('should have GetBlockResponse schema', () => {
        expect(BrightChainSchemas['GetBlockResponse']).toBeDefined();
        expect(
          BrightChainSchemas['GetBlockResponse'].properties.data,
        ).toBeDefined();
      });

      it('should have BrightenBlockRequest schema', () => {
        expect(BrightChainSchemas['BrightenBlockRequest']).toBeDefined();
        expect(BrightChainSchemas['BrightenBlockRequest'].required).toContain(
          'blockId',
        );
        expect(BrightChainSchemas['BrightenBlockRequest'].required).toContain(
          'randomBlockCount',
        );
      });

      it('should have BrightenBlockResponse schema', () => {
        expect(BrightChainSchemas['BrightenBlockResponse']).toBeDefined();
        expect(
          BrightChainSchemas['BrightenBlockResponse'].properties
            .brightenedBlockId,
        ).toBeDefined();
        expect(
          BrightChainSchemas['BrightenBlockResponse'].properties.randomBlockIds,
        ).toBeDefined();
      });
    });

    describe('Message schemas', () => {
      it('should have SendMessageRequest schema', () => {
        expect(BrightChainSchemas['SendMessageRequest']).toBeDefined();
        expect(BrightChainSchemas['SendMessageRequest'].required).toContain(
          'content',
        );
        expect(BrightChainSchemas['SendMessageRequest'].required).toContain(
          'senderId',
        );
      });

      it('should have SendMessageResponse schema', () => {
        expect(BrightChainSchemas['SendMessageResponse']).toBeDefined();
        expect(
          BrightChainSchemas['SendMessageResponse'].properties.messageId,
        ).toBeDefined();
      });

      it('should have QueryMessagesResponse schema', () => {
        expect(BrightChainSchemas['QueryMessagesResponse']).toBeDefined();
        expect(
          BrightChainSchemas['QueryMessagesResponse'].properties.messages,
        ).toBeDefined();
        expect(
          BrightChainSchemas['QueryMessagesResponse'].properties.total,
        ).toBeDefined();
      });
    });

    describe('CBL schemas', () => {
      it('should have StoreCBLRequest schema', () => {
        expect(BrightChainSchemas['StoreCBLRequest']).toBeDefined();
        expect(BrightChainSchemas['StoreCBLRequest'].required).toContain(
          'cblData',
        );
      });

      it('should have StoreCBLResponse schema', () => {
        expect(BrightChainSchemas['StoreCBLResponse']).toBeDefined();
        expect(
          BrightChainSchemas['StoreCBLResponse'].properties.success,
        ).toBeDefined();
      });

      it('should have RetrieveCBLResponse schema', () => {
        expect(BrightChainSchemas['RetrieveCBLResponse']).toBeDefined();
        expect(
          BrightChainSchemas['RetrieveCBLResponse'].properties.data,
        ).toBeDefined();
      });
    });

    describe('Super CBL schemas', () => {
      it('should have StoreSCBLRequest schema', () => {
        expect(BrightChainSchemas['StoreSCBLRequest']).toBeDefined();
        expect(BrightChainSchemas['StoreSCBLRequest'].required).toContain(
          'data',
        );
      });

      it('should have StoreSCBLResponse schema', () => {
        expect(BrightChainSchemas['StoreSCBLResponse']).toBeDefined();
        expect(
          BrightChainSchemas['StoreSCBLResponse'].properties.magnetUrl,
        ).toBeDefined();
        expect(
          BrightChainSchemas['StoreSCBLResponse'].properties.metadata,
        ).toBeDefined();
      });
    });

    describe('Node schemas', () => {
      it('should have NodeInfo schema', () => {
        expect(BrightChainSchemas['NodeInfo']).toBeDefined();
        expect(BrightChainSchemas['NodeInfo'].properties.nodeId).toBeDefined();
        expect(BrightChainSchemas['NodeInfo'].properties.status).toBeDefined();
      });

      it('should have ListNodesResponse schema', () => {
        expect(BrightChainSchemas['ListNodesResponse']).toBeDefined();
        expect(
          BrightChainSchemas['ListNodesResponse'].properties.nodes,
        ).toBeDefined();
      });

      it('should have DiscoverBlockRequest schema', () => {
        expect(BrightChainSchemas['DiscoverBlockRequest']).toBeDefined();
        expect(BrightChainSchemas['DiscoverBlockRequest'].required).toContain(
          'blockId',
        );
      });

      it('should have RegisterNodeRequest schema', () => {
        expect(BrightChainSchemas['RegisterNodeRequest']).toBeDefined();
        expect(BrightChainSchemas['RegisterNodeRequest'].required).toContain(
          'nodeId',
        );
        expect(BrightChainSchemas['RegisterNodeRequest'].required).toContain(
          'publicKey',
        );
      });
    });

    describe('Sync schemas', () => {
      it('should have ReplicateBlockRequest schema', () => {
        expect(BrightChainSchemas['ReplicateBlockRequest']).toBeDefined();
        expect(BrightChainSchemas['ReplicateBlockRequest'].required).toContain(
          'targetNodeIds',
        );
      });

      it('should have SyncRequestBody schema', () => {
        expect(BrightChainSchemas['SyncRequestBody']).toBeDefined();
        expect(BrightChainSchemas['SyncRequestBody'].required).toContain(
          'blockIds',
        );
      });

      it('should have SyncRequestResponse schema', () => {
        expect(BrightChainSchemas['SyncRequestResponse']).toBeDefined();
        expect(
          BrightChainSchemas['SyncRequestResponse'].properties.available,
        ).toBeDefined();
        expect(
          BrightChainSchemas['SyncRequestResponse'].properties.missing,
        ).toBeDefined();
      });
    });

    describe('User schemas', () => {
      it('should have RegisterRequest schema', () => {
        expect(BrightChainSchemas['RegisterRequest']).toBeDefined();
        expect(BrightChainSchemas['RegisterRequest'].required).toContain(
          'username',
        );
        expect(BrightChainSchemas['RegisterRequest'].required).toContain(
          'email',
        );
        expect(BrightChainSchemas['RegisterRequest'].required).toContain(
          'password',
        );
      });

      it('should have LoginRequest schema', () => {
        expect(BrightChainSchemas['LoginRequest']).toBeDefined();
        expect(BrightChainSchemas['LoginRequest'].required).toContain(
          'username',
        );
        expect(BrightChainSchemas['LoginRequest'].required).toContain(
          'password',
        );
      });

      it('should have AuthResponse schema', () => {
        expect(BrightChainSchemas['AuthResponse']).toBeDefined();
        expect(
          BrightChainSchemas['AuthResponse'].properties.token,
        ).toBeDefined();
      });

      it('should have ProfileResponse schema', () => {
        expect(BrightChainSchemas['ProfileResponse']).toBeDefined();
        expect(
          BrightChainSchemas['ProfileResponse'].properties.memberId,
        ).toBeDefined();
        expect(
          BrightChainSchemas['ProfileResponse'].properties.energyBalance,
        ).toBeDefined();
      });
    });

    describe('Energy schemas', () => {
      it('should have EnergyBalanceResponse schema', () => {
        expect(BrightChainSchemas['EnergyBalanceResponse']).toBeDefined();
        expect(
          BrightChainSchemas['EnergyBalanceResponse'].properties.balance,
        ).toBeDefined();
      });

      it('should have TransactionsResponse schema', () => {
        expect(BrightChainSchemas['TransactionsResponse']).toBeDefined();
        expect(
          BrightChainSchemas['TransactionsResponse'].properties.transactions,
        ).toBeDefined();
      });
    });

    describe('Quorum schemas', () => {
      it('should have AddMemberRequest schema', () => {
        expect(BrightChainSchemas['AddMemberRequest']).toBeDefined();
        expect(BrightChainSchemas['AddMemberRequest'].required).toContain(
          'name',
        );
      });

      it('should have QuorumMember schema', () => {
        expect(BrightChainSchemas['QuorumMember']).toBeDefined();
        expect(BrightChainSchemas['QuorumMember'].properties.id).toBeDefined();
        expect(
          BrightChainSchemas['QuorumMember'].properties.publicKey,
        ).toBeDefined();
      });

      it('should have SealDocumentRequest schema', () => {
        expect(BrightChainSchemas['SealDocumentRequest']).toBeDefined();
        expect(BrightChainSchemas['SealDocumentRequest'].required).toContain(
          'document',
        );
        expect(BrightChainSchemas['SealDocumentRequest'].required).toContain(
          'memberIds',
        );
      });

      it('should have UnsealDocumentRequest schema', () => {
        expect(BrightChainSchemas['UnsealDocumentRequest']).toBeDefined();
        expect(BrightChainSchemas['UnsealDocumentRequest'].required).toContain(
          'memberCredentials',
        );
      });

      it('should have CanUnlockResponse schema', () => {
        expect(BrightChainSchemas['CanUnlockResponse']).toBeDefined();
        expect(
          BrightChainSchemas['CanUnlockResponse'].properties.canUnlock,
        ).toBeDefined();
        expect(
          BrightChainSchemas['CanUnlockResponse'].properties.sharesRequired,
        ).toBeDefined();
      });
    });

    it('should have OpenAPISpec schema', () => {
      expect(BrightChainSchemas['OpenAPISpec']).toBeDefined();
      expect(
        BrightChainSchemas['OpenAPISpec'].properties.openapi,
      ).toBeDefined();
      expect(BrightChainSchemas['OpenAPISpec'].properties.paths).toBeDefined();
    });
  });

  describe('BrightChainSecuritySchemes', () => {
    it('should have bearerAuth scheme', () => {
      expect(BrightChainSecuritySchemes['bearerAuth']).toBeDefined();
      expect(BrightChainSecuritySchemes['bearerAuth'].type).toBe('http');
      expect(BrightChainSecuritySchemes['bearerAuth'].scheme).toBe('bearer');
      expect(BrightChainSecuritySchemes['bearerAuth'].bearerFormat).toBe('JWT');
    });
  });

  describe('registerBrightChainSchemas', () => {
    it('should register all schemas with the registry', () => {
      registerBrightChainSchemas();

      const allSchemas = OpenAPISchemaRegistry.getAllSchemas();
      const schemaNames = Object.keys(allSchemas);

      // Check that key schemas are registered
      expect(schemaNames).toContain('ErrorResponse');
      expect(schemaNames).toContain('HealthResponse');
      expect(schemaNames).toContain('StoreBlockRequest');
      expect(schemaNames).toContain('SendMessageRequest');
    });

    it('should register security schemes with the registry', () => {
      registerBrightChainSchemas();

      const securitySchemes = OpenAPISchemaRegistry.getAllSecuritySchemes();

      expect(securitySchemes['bearerAuth']).toBeDefined();
    });

    it('should be idempotent (can be called multiple times)', () => {
      registerBrightChainSchemas();
      const count1 = OpenAPISchemaRegistry.schemaCount;

      registerBrightChainSchemas();
      const count2 = OpenAPISchemaRegistry.schemaCount;

      expect(count1).toBe(count2);
    });
  });

  describe('Schema validation', () => {
    it('all schemas should have a type property', () => {
      for (const [_name, schema] of Object.entries(BrightChainSchemas)) {
        // Skip schemas that use allOf (like DetailedHealthResponse)
        if (schema.allOf) {
          continue;
        }
        expect(schema.type).toBeDefined();
      }
    });

    it('all object schemas should have properties', () => {
      for (const [_name, schema] of Object.entries(BrightChainSchemas)) {
        if (schema.type === 'object' && !schema.allOf) {
          expect(schema.properties).toBeDefined();
        }
      }
    });

    it('required fields should exist in properties', () => {
      for (const [_name, schema] of Object.entries(BrightChainSchemas)) {
        if (schema.required && schema.properties) {
          for (const requiredField of schema.required) {
            expect(schema.properties[requiredField]).toBeDefined();
          }
        }
      }
    });
  });
});
