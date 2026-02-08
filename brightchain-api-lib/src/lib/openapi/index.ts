/**
 * OpenAPI module for BrightChain API.
 * Re-exports from node-express-suite and adds BrightChain-specific schemas.
 */

// Re-export from node-express-suite
export {
  CommonSchemas,
  CommonSecuritySchemes,
  ControllerRegistry,
  OpenAPIBuilder,
  OpenAPIController,
  OpenAPISchemaRegistry,
} from '@digitaldefiance/node-express-suite';

export type {
  OpenAPIBuilderConfig,
  OpenAPIResponseDef,
  OpenAPISpec,
  RegisteredController,
} from '@digitaldefiance/node-express-suite';

// Export BrightChain-specific schemas (auto-registers on import)
export {
  BrightChainSchemas,
  BrightChainSecuritySchemes,
  registerBrightChainSchemas,
} from './schemas';
