import {
  ChannelType,
  MerchantOffer,
  OrderStatus,
  ProductKey,
  RankingMode,
  SavedAddress,
  WalletAccount,
  WalletTransaction,
} from "@/lib/types";

export interface BackendMerchantOffer extends MerchantOffer {
  totalCost: number;
  merchantCategory?: "live" | "demo";
}

export interface BackendSearchSession {
  id: string;
  channel: ChannelType;
  createdAt: string;
  explanation: string;
  intent: {
    query: string;
    productKey: ProductKey;
    rankingMode: RankingMode;
    budget: number | null;
    color: string | null;
  };
  offers: BackendMerchantOffer[];
}

export interface BackendCheckoutSession {
  id: string;
  searchSessionId: string;
  offerId: string;
  channel: ChannelType;
  expiresAt: string;
}

export interface BackendOrder {
  id: string;
  publicOrderId: string;
  checkoutSessionId: string;
  searchSessionId: string;
  offerId: string;
  channel: ChannelType;
  status: OrderStatus;
  paymentMethod: "wallet" | "card";
  feeAmount: number;
  totalAmount: number;
  paymentReference: string;
  merchantOrderReference?: string;
  customer: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    note?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BackendTrackingEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  title: string;
  detail: string;
  createdAt: string;
}

export interface BackendCustomerProfile {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
}

export interface BackendPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

export interface BackendCustomerState {
  profile: BackendCustomerProfile;
  paymentMethods: BackendPaymentMethod[];
  savedAddresses: SavedAddress[];
  wallet: WalletAccount;
  walletTransactions: WalletTransaction[];
  searchHistory: BackendSearchSession[];
  orders: BackendOrder[];
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
}

export function isBackendConfigured() {
  return Boolean(getApiBaseUrl());
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "API request failed.");
  }

  return response.json() as Promise<T>;
}

export const backendApi = {
  async sendConversationMessage(
    channel: ChannelType,
    sessionId: string,
    payload: { message: string; displayName?: string },
  ) {
    return fetchJson<{
      conversationSession: {
        id: string;
        channel: ChannelType;
      };
      searchSession: BackendSearchSession;
      reply: {
        summary: string;
        clarifyingQuestion?: string;
        topOffers: Array<{
          merchant: string;
          title: string;
          totalCost: number;
          etaLabel: string;
          rating: number;
        }>;
        webLinks: {
          results: string;
          checkout?: string;
        };
      };
    }>(`/api/conversations/${channel}/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async getSearchSession(id: string) {
    return fetchJson<BackendSearchSession>(`/api/search-sessions/${id}`);
  },
  async selectOffer(searchSessionId: string, offerId: string) {
    return fetchJson<{ checkoutSession: BackendCheckoutSession; webLinks?: { checkout?: string } }>(
      `/api/search-sessions/${searchSessionId}/select-offer`,
      {
        method: "POST",
        body: JSON.stringify({ offerId }),
      },
    );
  },
  async getCheckoutSession(id: string) {
    return fetchJson<BackendCheckoutSession>(`/api/checkout-sessions/${id}`);
  },
  async createOrder(payload: {
    checkoutSessionId: string;
    paymentReference?: string;
    paymentMethod: "wallet" | "card";
    customer: {
      fullName: string;
      phone: string;
      address: string;
      city: string;
      note?: string;
    };
  }) {
    return fetchJson<{ order: BackendOrder; webLinks?: { tracking?: string } }>(`/api/orders`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async createWalletTopup(
    channel: ChannelType,
    externalUserId: string,
    payload: { amount: number; assetSymbol: string; network: string },
  ) {
    return fetchJson<{
      wallet: WalletAccount;
      transaction: WalletTransaction;
      instructions: {
        network: string;
        assetSymbol: string;
        walletAddress: string;
        reference: string;
        message: string;
      };
    }>(`/api/wallets/${channel}/${externalUserId}/topups`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async sandboxCreditWalletTopup(
    channel: ChannelType,
    externalUserId: string,
    transactionId: string,
  ) {
    return fetchJson<{ wallet: WalletAccount; transaction: WalletTransaction }>(
      `/api/wallets/${channel}/${externalUserId}/topups/${transactionId}/sandbox-credit`,
      {
        method: "POST",
      },
    );
  },
  async getOrderTracking(orderId: string) {
    return fetchJson<{ order: BackendOrder; tracking: BackendTrackingEvent[] }>(
      `/api/orders/${orderId}/tracking`,
    );
  },
  async getCustomerState(channel: ChannelType, externalUserId: string) {
    return fetchJson<BackendCustomerState>(`/api/customers/${channel}/${externalUserId}`);
  },
  async updateCustomerState(
    channel: ChannelType,
    externalUserId: string,
    payload: {
      profile?: Partial<BackendCustomerProfile>;
      paymentMethods?: BackendPaymentMethod[];
      savedAddresses?: SavedAddress[];
    },
  ) {
    return fetchJson<BackendCustomerState>(`/api/customers/${channel}/${externalUserId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async listAdminOrders(token: string) {
    return fetchJson<BackendOrder[]>(`/api/admin/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  async getAdminOrder(orderId: string, token: string) {
    return fetchJson<{ order: BackendOrder; tracking: BackendTrackingEvent[] }>(
      `/api/admin/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },
  async placeAdminOrder(orderId: string, token: string, merchantOrderReference: string) {
    return fetchJson<BackendOrder>(`/api/admin/orders/${orderId}/place`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ merchantOrderReference }),
    });
  },
  async updateAdminOrderStatus(
    orderId: string,
    token: string,
    payload: { status: OrderStatus; detail: string },
  ) {
    return fetchJson<BackendOrder>(`/api/admin/orders/${orderId}/status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
};
