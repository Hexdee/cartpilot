"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  backendApi,
  BackendCheckoutSession,
  BackendCustomerState,
  BackendSearchSession,
  isBackendConfigured,
} from "@/lib/api";
import { findOffer } from "@/lib/backend-presenters";
import { formatCurrency, getOffersForIntent } from "@/lib/catalog";
import { SavedAddress } from "@/lib/types";
import { getOrCreateWebSessionId } from "@/lib/web-session";
import { useAppStore, useResolvedOffer } from "@/providers/app-store";

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, placeOrder } = useAppStore();
  const checkoutSessionId = searchParams.get("checkoutSession");
  const [backendCheckoutSession, setBackendCheckoutSession] = useState<BackendCheckoutSession | null>(null);
  const [backendSearchSession, setBackendSearchSession] = useState<BackendSearchSession | null>(null);
  const [customerState, setCustomerState] = useState<BackendCustomerState | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(checkoutSessionId && isBackendConfigured()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card">("wallet");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const fallbackOffer = useResolvedOffer() ?? getOffersForIntent(state.currentSearch)[0] ?? null;
  const selectedOffer = useMemo(() => {
    if (!backendCheckoutSession || !backendSearchSession) return fallbackOffer;
    return findOffer(backendSearchSession, backendCheckoutSession.offerId) ?? fallbackOffer;
  }, [backendCheckoutSession, backendSearchSession, fallbackOffer]);
  const [formData, setFormData] = useState({
    fullName: state.profile.fullName,
    phone: state.profile.phone,
    address: state.profile.address,
    city: state.profile.city,
    deliveryPreference: "Fastest available slot",
    orderNote: "Please call before arrival. Leave with building front desk if unavailable.",
  });

  function applyAddress(address: SavedAddress | null) {
    if (!address) return;

    setFormData((current) => ({
      ...current,
      fullName: address.fullName,
      phone: address.phone,
      address: address.addressLine,
      city: address.city,
      orderNote: address.note ?? current.orderNote,
    }));
  }

  useEffect(() => {
    if (!isBackendConfigured() || typeof window === "undefined") return;

    const sessionId = getOrCreateWebSessionId();

    void backendApi
      .getCustomerState("web", sessionId)
      .then((payload) => {
        setCustomerState(payload);
        const defaultAddress = payload.savedAddresses.find((address) => address.isDefault) ?? payload.savedAddresses[0] ?? null;
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          applyAddress(defaultAddress);
        } else {
          setUseNewAddress(true);
        }
        const requestedPayment = searchParams.get("payment");
        if (requestedPayment === "wallet" && payload.wallet.availableBalance > 0) {
          setPaymentMethod("wallet");
        } else {
          setPaymentMethod(payload.wallet.availableBalance > 0 ? "wallet" : "card");
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load your saved checkout details.");
      });
  }, [searchParams]);

  useEffect(() => {
    if (!checkoutSessionId || !isBackendConfigured()) return;

    let isMounted = true;

    void backendApi
      .getCheckoutSession(checkoutSessionId)
      .then(async (checkoutSession) => {
        const searchSession = await backendApi.getSearchSession(checkoutSession.searchSessionId);
        if (!isMounted) return;
        setBackendCheckoutSession(checkoutSession);
        setBackendSearchSession(searchSession);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load this checkout session.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [checkoutSessionId]);

  if (!selectedOffer) {
    return (
      <AppShell>
        <main className="page checkout-page">
          <section className="glass-card empty-panel">
            <h1>No offer selected yet</h1>
            <p className="lead">Choose an offer from the results page before checking out.</p>
          </section>
        </main>
      </AppShell>
    );
  }

  const platformFee = Math.max(3900, Math.round(selectedOffer.totalCost * 0.014));
  const totalAmount = selectedOffer.totalCost + platformFee;
  const savedAddresses = customerState?.savedAddresses ?? state.savedAddresses;
  const defaultCard = customerState?.paymentMethods.find((card) => card.isDefault)
    ?? customerState?.paymentMethods[0]
    ?? state.paymentMethods.find((card) => card.isDefault)
    ?? state.paymentMethods[0];
  const selectedSavedAddress =
    savedAddresses.find((address) => address.id === selectedAddressId)
    ?? savedAddresses.find((address) => address.isDefault)
    ?? null;
  const walletBalance = customerState?.wallet.availableBalance ?? state.wallet.availableBalance;
  const walletNetwork = customerState?.wallet.network ?? state.wallet.network;
  const walletAsset = customerState?.wallet.assetSymbol ?? state.wallet.assetSymbol;
  const canUseWallet = walletBalance >= totalAmount;

  function handleSelectAddress(address: SavedAddress) {
    setSelectedAddressId(address.id);
    setUseNewAddress(false);
    applyAddress(address);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const customerPayload = useNewAddress || !selectedSavedAddress
        ? {
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            note: formData.orderNote,
          }
        : {
            fullName: selectedSavedAddress.fullName,
            phone: selectedSavedAddress.phone,
            address: selectedSavedAddress.addressLine,
            city: selectedSavedAddress.city,
            note: formData.orderNote || selectedSavedAddress.note,
          };

      if (paymentMethod === "wallet" && !canUseWallet) {
        throw new Error("Your wallet balance is not enough for this order. Fund the wallet or use a saved card.");
      }

      if (backendCheckoutSession && isBackendConfigured()) {
        const response = await backendApi.createOrder({
          checkoutSessionId: backendCheckoutSession.id,
          paymentMethod,
          paymentReference:
            paymentMethod === "wallet" ? `WALLET-${Date.now()}` : `CARD-${Date.now()}`,
          customer: customerPayload,
        });

        const trackingUrl = response.webLinks?.tracking;
        if (trackingUrl) {
          try {
            const parsed = new URL(trackingUrl);
            router.push(`${parsed.pathname}${parsed.search}`);
            return;
          } catch {
            router.push(trackingUrl);
            return;
          }
        }

        router.push(`/tracking?orderId=${response.order.publicOrderId}`);
        return;
      }

      const order = placeOrder(formData);

      if (order) {
        router.push("/tracking");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create the order right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <main className="page checkout-page">
        {isLoading ? (
          <section className="glass-card empty-panel">
            <h1>Loading checkout session</h1>
            <p className="lead">Pulling the selected offer and signed checkout context from CartPilot.</p>
          </section>
        ) : null}

        <section className="page-intro">
          <div className="eyebrow">
            <span className="pulse-dot"></span>
            Confirm order details
          </div>
          <h1>Checkout stays transparent from merchant source to final total.</h1>
          <p className="lead">
            You pay CartPilot AI once. The platform then places the merchant order
            on your behalf and keeps the order timeline visible inside the app.
          </p>
          <div className="cta-row">
            <Link className="button button-secondary" href={backendSearchSession ? `/results?searchSession=${backendSearchSession.id}` : "/results"}>
              Back to results
            </Link>
            <Link className="button button-ghost" href="/assistant">
              Ask assistant again
            </Link>
          </div>
        </section>

        <section className="checkout-layout">
          <section className="checkout-main glass-card">
            <div className="section-heading">
              <h2>Delivery details</h2>
              <p>Select a saved address or enter a new one for the selected merchant offer.</p>
            </div>

            <form className="details-form" id="checkoutForm" onSubmit={handleSubmit}>
              {savedAddresses.length ? (
                <div className="saved-addresses">
                  {savedAddresses.map((address) => (
                    <label key={address.id} className={`payment-item address-option${selectedAddressId === address.id && !useNewAddress ? " is-selected" : ""}`}>
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === address.id && !useNewAddress}
                        onChange={() => handleSelectAddress(address)}
                      />
                      <span>
                        <strong>{address.label}</strong>
                        <small>{address.addressLine}, {address.city}</small>
                      </span>
                    </label>
                  ))}
                  <label className={`payment-item address-option${useNewAddress ? " is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={useNewAddress}
                      onChange={() => setUseNewAddress(true)}
                    />
                    <span>
                      <strong>Use a new address</strong>
                      <small>Override your saved addresses for this order.</small>
                    </span>
                  </label>
                </div>
              ) : null}

              <div className="field-grid">
                <label>
                  Full name
                  <input
                    type="text"
                    value={formData.fullName}
                    disabled={!useNewAddress && Boolean(selectedSavedAddress)}
                    onChange={(event) => setFormData((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    value={formData.phone}
                    disabled={!useNewAddress && Boolean(selectedSavedAddress)}
                    onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
                <label className="full-span">
                  Street address
                  <input
                    type="text"
                    value={formData.address}
                    disabled={!useNewAddress && Boolean(selectedSavedAddress)}
                    onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>
                <label>
                  City
                  <input
                    type="text"
                    value={formData.city}
                    disabled={!useNewAddress && Boolean(selectedSavedAddress)}
                    onChange={(event) => setFormData((current) => ({ ...current, city: event.target.value }))}
                  />
                </label>
                <label>
                  Delivery preference
                  <select
                    value={formData.deliveryPreference}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        deliveryPreference: event.target.value,
                      }))
                    }
                  >
                    <option>Fastest available slot</option>
                    <option>Evening delivery</option>
                    <option>Weekend delivery</option>
                  </select>
                </label>
                <label className="full-span">
                  Order note
                  <textarea
                    rows={4}
                    value={formData.orderNote}
                    onChange={(event) => setFormData((current) => ({ ...current, orderNote: event.target.value }))}
                  ></textarea>
                </label>
              </div>
            </form>

            <div className="payment-shell">
              <div className="section-heading subheading">
                <h3>Payment</h3>
                <p>Pay from your in-app blockchain-funded wallet or fall back to a saved card.</p>
              </div>
              <div className="payment-method-grid">
                <label className={`payment-item payment-choice${paymentMethod === "wallet" ? " is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "wallet"}
                    onChange={() => setPaymentMethod("wallet")}
                  />
                  <span>
                    <strong>CartPilot Wallet</strong>
                    <small>
                      {formatCurrency(walletBalance)} available via {walletAsset} on {walletNetwork}
                    </small>
                  </span>
                </label>

                <label className={`payment-item payment-choice${paymentMethod === "card" ? " is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  <span>
                    <strong>{defaultCard?.brand ?? "Card"} ending {defaultCard?.last4 ?? "0000"}</strong>
                    <small>Fallback payment method for low wallet balance.</small>
                  </span>
                </label>
              </div>

              <div className="payment-card">
                <div className="card-chip"></div>
                <div className="mock-card-number">
                  {paymentMethod === "wallet"
                    ? `${walletAsset} wallet`
                    : `•••• ${defaultCard?.last4 ?? "0000"}`}
                </div>
                <div className="mock-card-meta">
                  <span>
                    {paymentMethod === "wallet"
                      ? `Balance ${formatCurrency(walletBalance)}`
                      : `${defaultCard?.brand ?? "Card"} ending in ${defaultCard?.last4 ?? "0000"}`}
                  </span>
                  <span>
                    {paymentMethod === "wallet"
                      ? "Blockchain-funded in-app wallet"
                      : "Secured by CartPilot Pay"}
                  </span>
                </div>
              </div>
              {!canUseWallet && paymentMethod === "wallet" ? (
                <p className="panel-copy">
                  Wallet funds are below the order total. Fund the wallet from the profile page or switch to a saved card.
                </p>
              ) : null}
              {backendCheckoutSession ? (
                <p className="panel-copy">
                  This checkout session originated from the {backendCheckoutSession.channel} flow and expires at{" "}
                  {new Intl.DateTimeFormat("en-NG", {
                    hour: "numeric",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  }).format(new Date(backendCheckoutSession.expiresAt))}
                  .
                </p>
              ) : null}
            </div>
          </section>

          <aside className="checkout-sidebar">
            <article className="glass-card summary-card">
              <div className="offer-badge">Selected offer</div>
              <div className="summary-product">
                <div className="mini-orb"></div>
                <div>
                  <p className="merchant-name">
                    {selectedOffer.officialStore ? `${selectedOffer.merchant} official store` : selectedOffer.merchant}
                  </p>
                  <h2>{selectedOffer.title}</h2>
                  <span>
                    {selectedOffer.color ? `${selectedOffer.color} • ` : ""}
                    {selectedOffer.availability} • ETA {selectedOffer.etaLabel}
                  </span>
                </div>
              </div>

              <div className="price-breakdown">
                <div className="price-line">
                  <span>Item price</span>
                  <strong>{formatCurrency(selectedOffer.price)}</strong>
                </div>
                <div className="price-line">
                  <span>Shipping</span>
                  <strong>{formatCurrency(selectedOffer.shippingCost)}</strong>
                </div>
                <div className="price-line">
                  <span>Platform fee</span>
                  <strong>{formatCurrency(platformFee)}</strong>
                </div>
                <div className="price-line total-line">
                  <span>Total</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </div>

              <div className="notice-card">
                <p className="assistant-kicker">Fulfillment note</p>
                <p>
                  After payment, CartPilot confirms the order internally and places the purchase on {selectedOffer.merchant} for you.
                </p>
              </div>

              <button
                className="button button-primary full-width"
                type="submit"
                form="checkoutForm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting order..." : "Confirm and place order"}
              </button>
              {errorMessage ? <p className="panel-copy">{errorMessage}</p> : null}
            </article>

            <article className="glass-card security-card">
              <div className="section-heading">
                <h2>What you will always see</h2>
              </div>
              <ul className="stack-list condensed">
                <li>Merchant source and expected ETA</li>
                <li>Final landed total before confirmation</li>
                <li>Status updates after internal order placement</li>
                <li>Support path if stock or pricing changes</li>
              </ul>
            </article>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <main className="page checkout-page">
            <section className="glass-card empty-panel">
              <h1>Loading checkout</h1>
              <p className="lead">Preparing the selected offer and order form.</p>
            </section>
          </main>
        </AppShell>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
