/**
 * Knowledge Store — public API
 * @module foundations/knowledge-store
 */

export { KnowledgeStore } from "./store.ts";
export type { KnowledgeStoreOptions } from "./store.ts";
export { hybridSearch } from "./search.ts";
export type { SearchResult, SearchOptions } from "./search.ts";
export type { IEmbeddingProvider } from "./embeddings.ts";
export { StubEmbeddingProvider } from "./embeddings.ts";
export { VoyageEmbeddingProvider } from "./voyage-embeddings.ts";
export type { VoyageEmbeddingOptions } from "./voyage-embeddings.ts";
export type {
  IndexContentCommand,
  SearchKnowledgeQuery,
  StoreEntityCommand,
  CreateRelationshipCommand,
} from "./commands.ts";
export {
  IndexContentHandler,
  SearchKnowledgeHandler,
  StoreEntityHandler,
  CreateRelationshipHandler,
} from "./handlers.ts";
