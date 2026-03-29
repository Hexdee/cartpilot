"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AppState,
  Order,
  RankingMode,
  SavedAddress,
  SearchIntent,
  ThemeName,
  UserProfile,
  WalletAccount,
} from "@/lib/types";
import {
  buildSearchIntent,
  calculatePlatformFee,
  createOrderId,
  getDefaultSearchIntent,
  getOfferById,
  getOffersForIntent,
  getProductEntry,
  getSeedHistory,
  getSeedOrder,
} from "@/lib/catalog";

const storageKey = "cartpilot-next-state";

interface CheckoutPayload {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  deliveryPreference: string;
  orderNote: string;
}

interface AppStoreValue {
  state: AppState;
  submitSearch: (prompt: string, rankingMode: RankingMode) => SearchIntent;
  setTheme: (theme: ThemeName) => void;
  setRankingMode: (rankingMode: RankingMode) => void;
  selectOffer: (offerId: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  addSavedAddress: (address: SavedAddress) => void;
  placeOrder: (payload: CheckoutPayload) => Order | null;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function createDefaultWallet(): WalletAccount {
  return {
    id: "wallet-local",
    assetSymbol: "USDT",
    network: "Base",
    walletAddress: "0x5b07b5e6f9b861d97ce2d7b1a7c180f4dcf8b52f",
    availableBalance: 950000,
    pendingBalance: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

function createDefaultAddresses(profile: UserProfile): SavedAddress[] {
  return [
    {
      id: "address-home",
      label: "Home",
      fullName: profile.fullName,
      phone: profile.phone,
      addressLine: profile.address,
      city: profile.city,
      note: "Call before arrival.",
      isDefault: true,
    },
  ];
}

function createDefaultState(): AppState {
  const currentSearch = getDefaultSearchIntent();
  const searchHistory = getSeedHistory();
  const deliveredSearch = searchHistory[1] ?? currentSearch;
  const profile = {
    fullName: "Amina Yusuf",
    email: "amina.yusuf@example.com",
    phone: "+234 801 234 5678",
    city: "Lagos",
    address: "14 Admiralty Way, Lekki Phase 1",
  };

  return {
    theme: "midnight",
    profile,
    paymentMethods: [
      { id: "card-1", brand: "Visa", last4: "4839", expiry: "09/28", isDefault: true },
      { id: "card-2", brand: "Mastercard", last4: "1124", expiry: "02/27", isDefault: false },
    ],
    savedAddresses: createDefaultAddresses(profile),
    wallet: createDefaultWallet(),
    walletTransactions: [],
    searchHistory,
    orders: [getSeedOrder(deliveredSearch.id)],
    currentSearch,
    selectedOfferId: getOffersForIntent(currentSearch)[0]?.id ?? null,
    currentOrderId: null,
  };
}

function loadState(): AppState {
  if (typeof window === "undefined") {
    return createDefaultState();
  }

  const fallback = createDefaultState();
  const saved = window.localStorage.getItem(storageKey);

  if (!saved) return fallback;

  try {
    const parsed = JSON.parse(saved) as Partial<AppState>;
    return {
      ...fallback,
      ...parsed,
      profile: { ...fallback.profile, ...parsed.profile },
      paymentMethods: parsed.paymentMethods?.length ? parsed.paymentMethods : fallback.paymentMethods,
      savedAddresses: parsed.savedAddresses?.length ? parsed.savedAddresses : fallback.savedAddresses,
      wallet: parsed.wallet ?? fallback.wallet,
      walletTransactions: parsed.walletTransactions ?? fallback.walletTransactions,
      searchHistory: parsed.searchHistory?.length ? parsed.searchHistory : fallback.searchHistory,
      orders: parsed.orders?.length ? parsed.orders : fallback.orders,
      currentSearch: parsed.currentSearch ?? fallback.currentSearch,
    };
  } catch {
    return fallback;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createDefaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setState(loadState());
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    document.body.dataset.theme = state.theme;
  }, [hydrated, state]);

  const value: AppStoreValue = {
    state,
    submitSearch(prompt, rankingMode) {
      const intent = buildSearchIntent(prompt, rankingMode);

      setState((currentState) => ({
        ...currentState,
        currentSearch: intent,
        selectedOfferId: null,
        searchHistory: [intent, ...currentState.searchHistory].slice(0, 12),
      }));

      return intent;
    },
    setTheme(theme) {
      setState((currentState) => ({
        ...currentState,
        theme,
      }));
    },
    setRankingMode(rankingMode) {
      setState((currentState) => ({
        ...currentState,
        currentSearch: {
          ...currentState.currentSearch,
          rankingMode,
        },
      }));
    },
    selectOffer(offerId) {
      setState((currentState) => ({
        ...currentState,
        selectedOfferId: offerId,
      }));
    },
    updateProfile(profile) {
      setState((currentState) => ({
        ...currentState,
        profile: {
          ...currentState.profile,
          ...profile,
        },
      }));
    },
    addSavedAddress(address) {
      setState((currentState) => ({
        ...currentState,
        savedAddresses: [
          { ...address, isDefault: currentState.savedAddresses.length === 0 || address.isDefault },
          ...currentState.savedAddresses.map((entry) =>
            address.isDefault ? { ...entry, isDefault: false } : entry,
          ),
        ],
      }));
    },
    placeOrder(payload) {
      const currentOffer = getOfferById(state.currentSearch, state.selectedOfferId) ?? getOffersForIntent(state.currentSearch)[0];

      if (!currentOffer) return null;

      const now = new Date().toISOString();
      const platformFee = calculatePlatformFee(currentOffer.totalCost);
      const order: Order = {
        id: createOrderId(state.orders.length),
        searchId: state.currentSearch.id,
        offerId: currentOffer.id,
        productKey: currentOffer.productKey,
        statusLabel: "In progress",
        statusTone: "active",
        createdAt: now,
        etaLabel: currentOffer.etaLabel,
        address: payload.address,
        city: payload.city,
        orderNote: payload.orderNote,
        platformFee,
        total: currentOffer.totalCost + platformFee,
        timeline: [
          {
            title: "Payment received",
            detail: `Today, ${new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(now))}`,
            state: "done",
          },
          {
            title: "Awaiting admin purchase",
            detail: "Assigned to CartPilot Ops",
            state: "done",
          },
          {
            title: "Ordering on merchant site",
            detail: `In progress now with the selected ${currentOffer.merchant} listing`,
            state: "active",
          },
          {
            title: "Merchant shipment",
            detail: "Tracking number will appear here after dispatch.",
            state: "pending",
          },
          {
            title: "Delivered",
            detail: `Expected ${currentOffer.etaLabel}`,
            state: "pending",
          },
        ],
      };

      setState((currentState) => ({
        ...currentState,
        profile: {
          ...currentState.profile,
          fullName: payload.fullName,
          phone: payload.phone,
          address: payload.address,
          city: payload.city,
        },
        orders: [order, ...currentState.orders],
        currentOrderId: order.id,
      }));

      return order;
    },
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error("useAppStore must be used inside AppStoreProvider.");
  }

  return context;
}

export function useResolvedOffer() {
  const { state } = useAppStore();

  return (
    getOfferById(state.currentSearch, state.selectedOfferId) ??
    getOffersForIntent(state.currentSearch)[0] ??
    null
  );
}

export function useResolvedOrder() {
  const { state } = useAppStore();

  const order =
    state.orders.find((entry) => entry.id === state.currentOrderId) ?? state.orders[0] ?? null;

  if (!order) return null;

  const matchingSearch =
    state.searchHistory.find((entry) => entry.id === order.searchId) ?? state.currentSearch;
  const matchingOffer =
    getOfferById(matchingSearch, order.offerId) ??
    getOffersForIntent(matchingSearch).find((entry) => entry.id === order.offerId) ??
    null;
  const product = getProductEntry(order.productKey);

  return {
    order,
    product,
    offer: matchingOffer,
  };
}
