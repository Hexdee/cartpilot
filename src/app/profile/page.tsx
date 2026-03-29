"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ThemePicker } from "@/components/theme-picker";
import { backendApi, BackendCustomerState, isBackendConfigured } from "@/lib/api";
import {
  formatCurrency,
  formatDateLabel,
  getProductEntry,
  rankingConfig,
} from "@/lib/catalog";
import { getOrderStatusMeta } from "@/lib/backend-presenters";
import { getOrCreateWebSessionId } from "@/lib/web-session";
import { useAppStore, useResolvedOrder } from "@/providers/app-store";

type ProfileTab = "account" | "billing" | "history";

export default function ProfilePage() {
  const { state, updateProfile, addSavedAddress } = useAppStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const [backendState, setBackendState] = useState<BackendCustomerState | null>(null);
  const [webSessionId, setWebSessionId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState("150000");
  const [topupMessage, setTopupMessage] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "New address",
    fullName: state.profile.fullName,
    phone: state.profile.phone,
    addressLine: "",
    city: state.profile.city,
    note: "",
  });
  const latestOrder = useResolvedOrder()?.order ?? null;

  useEffect(() => {
    if (!isBackendConfigured() || typeof window === "undefined") return;

    const sessionId = getOrCreateWebSessionId();
    setWebSessionId(sessionId);

    void backendApi
      .getCustomerState("web", sessionId)
      .then((payload) => {
        setBackendState(payload);
      })
      .catch((error) => {
        setStatusMessage(error instanceof Error ? error.message : "Unable to load your profile.");
      });
  }, []);

  const activeProfile = backendState?.profile ?? state.profile;
  const activePaymentMethods = backendState?.paymentMethods ?? state.paymentMethods;
  const activeSavedAddresses = backendState?.savedAddresses ?? state.savedAddresses;
  const activeWallet = backendState?.wallet ?? state.wallet;
  const walletTransactions = backendState?.walletTransactions ?? state.walletTransactions;
  const activeSearchHistory = useMemo(
    () =>
      backendState?.searchHistory.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        productKey: entry.intent.productKey,
        rankingMode: entry.intent.rankingMode,
      })) ?? state.searchHistory,
    [backendState, state.searchHistory],
  );

  const searchEntries = activeSearchHistory.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt,
    title: getProductEntry(entry.productKey).displayName,
    subtitle: `${rankingConfig[entry.rankingMode].label} ranking`,
    badge: "Search",
  }));

  const orderEntries = backendState?.orders.length
    ? backendState.orders.map((entry) => {
        const matchingSearch = backendState.searchHistory.find(
          (searchEntry) => searchEntry.id === entry.searchSessionId,
        );
        const status = getOrderStatusMeta(entry.status);

        return {
          id: entry.publicOrderId,
          createdAt: entry.createdAt,
          title: getProductEntry(matchingSearch?.intent.productKey ?? "sony_wh1000xm5").displayName,
          subtitle: status.label,
          badge: status.tone === "complete" ? "Delivered" : "Active order",
        };
      })
    : state.orders.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        title: getProductEntry(entry.productKey).displayName,
        subtitle: latestOrder?.id === entry.id ? "Most recent tracked order" : entry.statusLabel,
        badge: entry.statusTone === "complete" ? "Delivered" : "Active order",
      }));

  const historyItems = [...orderEntries, ...searchEntries]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);

  function handleProfileChange(field: keyof typeof state.profile) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      updateProfile({ [field]: value });
      setBackendState((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                [field]: value,
              },
            }
          : current,
      );
    };
  }

  async function persistCustomerState(nextSavedAddresses = activeSavedAddresses) {
    if (!backendState || !webSessionId || !isBackendConfigured()) return null;

    const payload = await backendApi.updateCustomerState("web", webSessionId, {
      profile: backendState.profile,
      savedAddresses: nextSavedAddresses,
    });
    setBackendState(payload);
    return payload;
  }

  async function handleSaveProfile() {
    if (!backendState || !webSessionId || !isBackendConfigured()) {
      setStatusMessage("Profile changes are stored locally until the backend is configured.");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      await persistCustomerState();
      setStatusMessage("Profile saved to CartPilot backend.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddAddress() {
    const address = {
      id: `address-${Date.now()}`,
      label: newAddress.label,
      fullName: newAddress.fullName,
      phone: newAddress.phone,
      addressLine: newAddress.addressLine,
      city: newAddress.city,
      note: newAddress.note,
      isDefault: activeSavedAddresses.length === 0,
    };

    addSavedAddress(address);
    const nextAddresses = [address, ...activeSavedAddresses.map((entry) => ({ ...entry, isDefault: false }))];
    setBackendState((current) =>
      current
        ? {
            ...current,
            savedAddresses: nextAddresses,
          }
        : current,
    );

    try {
      if (backendState && webSessionId && isBackendConfigured()) {
        await persistCustomerState(nextAddresses);
      }
      setStatusMessage("Saved address added.");
      setNewAddress((current) => ({
        ...current,
        label: "New address",
        addressLine: "",
        note: "",
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save the new address.");
    }
  }

  async function handleCreateTopup() {
    if (!webSessionId || !isBackendConfigured()) {
      setTopupMessage("Configure the backend API before creating wallet funding instructions.");
      return;
    }

    try {
      const amount = Number.parseInt(topupAmount, 10);
      const topup = await backendApi.createWalletTopup("web", webSessionId, {
        amount,
        assetSymbol: activeWallet.assetSymbol,
        network: activeWallet.network,
      });
      setBackendState((current) =>
        current
          ? {
              ...current,
              wallet: topup.wallet,
              walletTransactions: [topup.transaction, ...current.walletTransactions],
            }
          : current,
      );
      setTopupMessage(
        `Send ${formatCurrency(amount)} worth of ${topup.instructions.assetSymbol} on ${topup.instructions.network} to ${topup.instructions.walletAddress}. Reference: ${topup.instructions.reference}`,
      );
    } catch (error) {
      setTopupMessage(error instanceof Error ? error.message : "Unable to generate wallet funding instructions.");
    }
  }

  return (
    <AppShell>
      <main className="page profile-page">
        <section className="page-intro wide-intro">
          <div className="eyebrow">
            <span className="pulse-dot"></span>
            Account and preferences
          </div>
          <h1>Profile settings now live in a dedicated account hub with three tabs.</h1>
          <p className="lead">
            Users can manage personal details, saved payment information, app
            theme preferences, and request history without leaving the product.
          </p>
        </section>

        <section className="profile-layout">
          <aside className="glass-card profile-summary">
            <div className="profile-badge">
              {activeProfile.fullName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <p className="assistant-kicker">Primary account</p>
              <h2>{activeProfile.fullName}</h2>
              <p className="profile-copy">Frequent electronics shopper • {activeProfile.city}, Nigeria</p>
            </div>
            <div className="mini-stat-grid">
              <article className="metric-card compact-card">
                <strong>{activeSearchHistory.length}</strong>
                <span>Total requests</span>
              </article>
              <article className="metric-card compact-card">
                <strong>{activePaymentMethods.length}</strong>
                <span>Saved cards</span>
              </article>
            </div>
          </aside>

          <section className="glass-card profile-main">
            <div className="tab-row" role="tablist" aria-label="Profile tabs">
              {(
                [
                  ["account", "Account"],
                  ["billing", "Payments & Theme"],
                  ["history", "History"],
                ] as Array<[ProfileTab, string]>
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  className={`tab-link${activeTab === tab ? " is-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="tab-panels">
              {activeTab === "account" ? (
                <section className="tab-panel is-active">
                  <div className="section-heading">
                    <h2>Account information</h2>
                    <p>Personal details, delivery defaults, and notification preferences.</p>
                  </div>
                  <form className="details-form">
                    <div className="field-grid">
                      <label>
                        Full name
                        <input type="text" value={activeProfile.fullName} onChange={handleProfileChange("fullName")} />
                      </label>
                      <label>
                        Email address
                        <input type="email" value={activeProfile.email} onChange={handleProfileChange("email")} />
                      </label>
                      <label>
                        Phone number
                        <input type="tel" value={activeProfile.phone} onChange={handleProfileChange("phone")} />
                      </label>
                      <label>
                        Default city
                        <input type="text" value={activeProfile.city} onChange={handleProfileChange("city")} />
                      </label>
                      <label className="full-span">
                        Default delivery address
                        <input type="text" value={activeProfile.address} onChange={handleProfileChange("address")} />
                      </label>
                    </div>
                  </form>
                  <div className="support-actions">
                    <button className="button button-secondary" type="button" onClick={() => void handleSaveProfile()} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save profile changes"}
                    </button>
                    {statusMessage ? <span className="panel-copy">{statusMessage}</span> : null}
                  </div>
                  <div className="preference-list">
                    <article className="preference-item">
                      <strong>Order updates</strong>
                      <span>Push + email notifications enabled</span>
                    </article>
                    <article className="preference-item">
                      <strong>Preferred fulfillment speed</strong>
                      <span>Fastest available delivery slot</span>
                    </article>
                    <article className="preference-item">
                      <strong>Trusted merchant filter</strong>
                      <span>Prefer official stores when available</span>
                    </article>
                  </div>
                  <article className="glass-subcard">
                    <h3>Saved delivery addresses</h3>
                    <div className="payment-list">
                      {activeSavedAddresses.map((address) => (
                        <div className="payment-item" key={address.id}>
                          <strong>{address.label}</strong>
                          <span>{address.addressLine}, {address.city}</span>
                        </div>
                      ))}
                    </div>
                    <div className="field-grid">
                      <label>
                        Label
                        <input type="text" value={newAddress.label} onChange={(event) => setNewAddress((current) => ({ ...current, label: event.target.value }))} />
                      </label>
                      <label>
                        Recipient
                        <input type="text" value={newAddress.fullName} onChange={(event) => setNewAddress((current) => ({ ...current, fullName: event.target.value }))} />
                      </label>
                      <label>
                        Phone
                        <input type="tel" value={newAddress.phone} onChange={(event) => setNewAddress((current) => ({ ...current, phone: event.target.value }))} />
                      </label>
                      <label>
                        City
                        <input type="text" value={newAddress.city} onChange={(event) => setNewAddress((current) => ({ ...current, city: event.target.value }))} />
                      </label>
                      <label className="full-span">
                        Address line
                        <input type="text" value={newAddress.addressLine} onChange={(event) => setNewAddress((current) => ({ ...current, addressLine: event.target.value }))} />
                      </label>
                    </div>
                    <button className="button button-secondary" type="button" onClick={() => void handleAddAddress()} disabled={!newAddress.addressLine}>
                      Save new address
                    </button>
                  </article>
                </section>
              ) : null}

              {activeTab === "billing" ? (
                <section className="tab-panel is-active">
                  <div className="section-heading">
                    <h2>Saved payments and theme</h2>
                    <p>Fund the in-app wallet on-chain, review saved cards, and change the app theme.</p>
                  </div>
                  <div className="profile-section-grid">
                    <article className="glass-subcard">
                      <h3>In-app wallet</h3>
                      <div className="payment-card">
                        <div className="card-chip"></div>
                        <div className="mock-card-number">{activeWallet.assetSymbol} wallet</div>
                        <div className="mock-card-meta">
                          <span>{formatCurrency(activeWallet.availableBalance)} available</span>
                          <span>{activeWallet.network} • {activeWallet.walletAddress}</span>
                        </div>
                      </div>
                      <div className="field-grid">
                        <label>
                          Top-up amount
                          <input type="number" value={topupAmount} onChange={(event) => setTopupAmount(event.target.value)} />
                        </label>
                      </div>
                      <div className="support-actions">
                        <button className="button button-secondary" type="button" onClick={() => void handleCreateTopup()}>
                          Generate blockchain funding instructions
                        </button>
                      </div>
                      {topupMessage ? <p className="panel-copy">{topupMessage}</p> : null}
                      {walletTransactions.length ? (
                        <div className="payment-list">
                          {walletTransactions.slice(0, 3).map((transaction) => (
                            <div className="payment-item" key={transaction.id}>
                              <strong>{transaction.type.replace(/_/g, " ")} • {transaction.status}</strong>
                              <span>{formatCurrency(transaction.amount)} • {transaction.reference}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>

                    <article className="glass-subcard">
                      <h3>Saved cards</h3>
                      <div className="payment-list">
                        {activePaymentMethods.map((card) => (
                          <div className="payment-item" key={card.id}>
                            <strong>
                              {card.brand} ending {card.last4}
                            </strong>
                            <span>
                              {card.isDefault ? "Default card" : "Saved card"} • Expires {card.expiry}
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="glass-subcard">
                      <h3>App theme</h3>
                      <p className="panel-copy">Try a different visual direction across every page.</p>
                      <ThemePicker />
                    </article>
                  </div>
                </section>
              ) : null}

              {activeTab === "history" ? (
                <section className="tab-panel is-active">
                  <div className="section-heading">
                    <h2>Request and order history</h2>
                    <p>Past searches, selected offers, and fulfillment state in one place.</p>
                  </div>
                  <div className="history-list">
                    {historyItems.map((item) => (
                      <article className="history-item" key={item.id}>
                        <div>
                          <p className="merchant-name">{formatDateLabel(item.createdAt)}</p>
                          <h3>{item.title}</h3>
                          <p className="panel-copy">{item.subtitle}</p>
                        </div>
                        <span className={item.badge === "Active order" ? "status-chip" : "tag"}>
                          {item.badge}
                        </span>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </section>
        </section>
      </main>
    </AppShell>
  );
}
