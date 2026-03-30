export type ThemeName = "midnight" | "light" | "grove";

export type ChannelType = "whatsapp" | "telegram" | "web";

export type RankingMode =
  | "fastest_delivery"
  | "lowest_total_price"
  | "highest_rating"
  | "balanced";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "awaiting_admin_order"
  | "ordered_on_merchant"
  | "merchant_processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "issue_reported"
  | "cancelled"
  | "refunded";

export type ProductKey =
  | "custom"
  | "sony_wh1000xm5"
  | "ipad_10th_gen"
  | "air_fryer"
  | "running_shoes"
  | "office_chair"
  | "ps5_controller"
  | "portable_blender"
  | "headphone_case"
  | "bluetooth_transmitter";

export interface ProductSuggestion {
  key: ProductKey;
  title: string;
  subtitle: string;
  prompt: string;
}

export interface ProductCatalogEntry {
  key: ProductKey;
  displayName: string;
  shortName: string;
  aliases: string[];
  followUp: string;
  relatedSuggestions: ProductSuggestion[];
}

export interface MerchantOffer {
  id: string;
  productKey: ProductKey;
  merchant: string;
  title: string;
  summary: string;
  price: number;
  shippingCost: number;
  rating: number;
  etaHours: number;
  etaLabel: string;
  availability: string;
  sourceUrl: string;
  officialStore: boolean;
  color?: string;
}

export interface RankedOffer extends MerchantOffer {
  totalCost: number;
  withinBudget: boolean;
  rankingScore: number;
}

export interface SearchIntent {
  id: string;
  query: string;
  productKey: ProductKey;
  rankingMode: RankingMode;
  budget: number | null;
  color: string | null;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  note?: string;
  isDefault: boolean;
}

export interface WalletAccount {
  id: string;
  assetSymbol: string;
  network: string;
  walletAddress: string;
  availableBalance: number;
  pendingBalance: number;
  lastUpdatedAt: string;
}

export interface WalletTransaction {
  id: string;
  type: "topup" | "order_payment" | "refund";
  status: "pending" | "completed" | "failed";
  amount: number;
  assetSymbol: string;
  network: string;
  reference: string;
  walletAddress: string;
  note: string;
  createdAt: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
}

export interface OrderTimelineEvent {
  title: string;
  detail: string;
  state: "done" | "active" | "pending";
}

export interface Order {
  id: string;
  searchId: string;
  offerId: string;
  productKey: ProductKey;
  statusLabel: string;
  statusTone: "pending" | "active" | "complete";
  createdAt: string;
  etaLabel: string;
  address: string;
  city: string;
  orderNote: string;
  platformFee: number;
  total: number;
  timeline: OrderTimelineEvent[];
}

export interface AppState {
  theme: ThemeName;
  profile: UserProfile;
  paymentMethods: PaymentMethod[];
  savedAddresses: SavedAddress[];
  wallet: WalletAccount;
  walletTransactions: WalletTransaction[];
  searchHistory: SearchIntent[];
  orders: Order[];
  currentSearch: SearchIntent;
  selectedOfferId: string | null;
  currentOrderId: string | null;
}
