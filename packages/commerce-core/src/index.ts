export {
  isRecord,
} from "./domain/guards.js";
export {
  isPublishedProduct,
  isPublishedVariant,
  validateInventoryInput,
  validateProductInput,
  validateVariantInput,
  type InventoryDocument,
  type InventoryStatus,
  type ProductDocument,
  type ProductImage,
  type ProductStatus,
  type VariantDocument,
  type VariantStatus,
} from "./domain/products.js";
export {
  calculateSubtotalMinor,
  calculateTotals,
  type OrderTotals,
  type TotalsInput,
  type TotalsLine,
} from "./domain/totals.js";
export {
  validateCheckout,
  type CheckoutInput,
  type ValidationError,
  type ValidationErrorCode,
  type ValidationResult,
} from "./domain/validation.js";
export {
  assertCurrency,
  assertSafeNonNegativeMinorUnit,
  assertSafeQuantity,
  checkedAdd,
  checkedMultiply,
  checkedSubtract,
  isSafeNonNegativeMinorUnit,
  isSafeQuantity,
  type Money,
} from "./domain/money.js";
export {
  createOrderSnapshot,
  type CreateOrderSnapshotInput,
  type OrderSnapshot,
  type OrderSnapshotLine,
  type OrderSnapshotLineInput,
} from "./domain/orders.js";
export {
  COMMERCE_COLLECTIONS,
  COMMERCE_COLLECTION_INDEXES,
  COMMERCE_STORAGE_DECLARATION,
  type CommerceCollectionName,
} from "./storage/collections.js";
export {
  createCommerceRepositories,
  createEmDashRepositories,
  createMemoryRepositories,
  hasCommerceCollection,
  type CommerceRepositories,
  type CommerceStorage,
  type DocumentRepository,
  type EmDashCommerceStorage,
  type EmDashStorageCollection,
  type InFilter,
  type JsonDocument,
  type JsonPrimitive,
  type JsonValue,
  type QueryOptions,
  StorageQueryError,
  type QueryOrder,
  type QueryResult,
  type QueryWhere,
  type RangeFilter,
  type StartsWithFilter,
  type StorageCollection,
  type WhereValue,
} from "./storage/repositories.js";
export {
  seedDemoCatalog,
  type DemoCatalogInventorySeed,
  type DemoCatalogProductSeed,
  type DemoCatalogSeed,
  type DemoCatalogSeedResult,
  type DemoCatalogVariantSeed,
} from "./storage/demo-catalog.js";
export {
  addCartLine,
  removeCartLine,
  replaceCartLineQuantity,
  type AddCartLineInput,
  type Cart,
  type CartLine,
  type CartStatus,
} from "./domain/cart.js";
export {
  confirmReservation,
  expireReservation,
  releaseReservation,
  reserveInventory,
  type InventoryReservation,
  type ReservationFailureCode,
  type ReservationResult,
  type ReservationStatus,
  type ReserveInventoryInput,
} from "./domain/inventory.js";
export {
  transitionOrder,
  type FulfillmentStatus,
  type OrderCommand,
  type OrderState,
  type OrderStatus,
  type PaymentStatus,
} from "./domain/order-state.js";
export {
  sendBridgeCommand,
  type BridgeConnection,
  type UnsignedBridgeRequest,
} from "./bridge/client.js";
export {
  BRIDGE_REPLAY_WINDOW,
  createMemoryReplayStore,
  signBridgePayload,
  verifyBridgeSignature,
  type BridgeReplayStore,
} from "./bridge/signature.js";
export {
  MAX_BRIDGE_DELIVERY_ATTEMPTS,
  createMemoryOutbox,
  recordEventDelivery,
  retryPendingDeliveries,
  type BridgeOutbox,
  type DeliveryAttemptResult,
  type DeliveryStatus,
  type EventDelivery,
  type EventDeliveryInput,
  type RetrySummary,
} from "./bridge/outbox.js";
export { runBridgeMaintenance, type BridgeMaintenanceDependencies } from "./bridge/scheduler.js";
export {
  createProviderRegistry,
  type ProviderConnection,
  type ProviderRegistry,
} from "./bridge/provider-registry.js";
export {
  commercePlugin,
  createPlugin,
  type CommercePaymentProvider,
  type CommercePluginDescriptorOptions,
  type CommercePluginOptions,
} from "./plugin.js";
export {
  CommerceApiError,
  createCommerceClient,
  type CommerceFetcher,
} from "./storefront/client.js";
export {
  toPaymentMethods,
  toStoreAvailability,
  toStoreCart,
  toStoreTotals,
  type StoreCartOptions,
} from "./storefront/resources.js";
export {
  CART_SESSION_COOKIE,
  CART_SESSION_TTL_MS,
  expireCartSessions,
  readCartCookie,
  readCartToken,
  resolveCartSession,
  type CartSession,
  type CartSessionRecord,
  type CartSessionResolution,
  type CartSessionTransport,
} from "./storefront/session.js";
export type {
  CartCreateInput,
  CartItemInput,
  CartItemUpdateInput,
  CartLineInput,
  CartResultLine,
  CartResult,
  CatalogResult,
  CheckoutResource,
  CheckoutResult,
  CheckoutStartInput,
  CheckoutUpdateInput,
  CommerceClient,
  CommerceClientOptions,
  PaymentMethod,
  StoreApiNotice,
  StoreAvailability,
  StoreCart,
  StoreCartLine,
  StoreTotals,
} from "./storefront/types.js";
