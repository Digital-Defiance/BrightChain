/**
 * Documentation Module Barrel Export
 *
 * Re-exports all documentation sub-modules: enumerations, backbone elements,
 * resource models, templates, signing, store, search, serializer, access,
 * audit, ccda, specialty, and portability.
 *
 * @module documentation
 */

export * from './access/index';
export * from './audit/index';
export * from './ccda/index';
export * from './compositionBackboneElements';
export * from './compositionResource';
export * from './documentReferenceBackboneElements';
export * from './documentReferenceResource';
export * from './enumerations';
export * from './portability/index';
export * from './search/index';
export * from './serializer/index';
export * from './signing/index';
export * from './specialty/index';
export * from './store/index';
export * from './templates/index';
