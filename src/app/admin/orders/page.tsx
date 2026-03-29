"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  backendApi,
  BackendOrder,
  BackendTrackingEvent,
  isBackendConfigured,
} from "@/lib/api";
import { getOrderStatusMeta } from "@/lib/backend-presenters";
import { formatCurrency, formatDateLabel } from "@/lib/catalog";
import { OrderStatus } from "@/lib/types";

const statusOptions: OrderStatus[] = [
  "merchant_processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "issue_reported",
  "cancelled",
  "refunded",
];

export default function AdminOrdersPage() {
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [tracking, setTracking] = useState<BackendTrackingEvent[]>([]);
  const [merchantReference, setMerchantReference] = useState("");
  const [status, setStatus] = useState<OrderStatus>("merchant_processing");
  const [detail, setDetail] = useState("Merchant checkout confirmed and awaiting the next fulfillment scan.");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedMeta = useMemo(
    () => (selectedOrder ? getOrderStatusMeta(selectedOrder.status) : null),
    [selectedOrder],
  );

  async function loadOrders(nextToken = token) {
    if (!nextToken) {
      setErrorMessage("Enter the admin API token to load orders.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextOrders = await backendApi.listAdminOrders(nextToken);
      setOrders(nextOrders);

      const nextSelectedId = selectedOrderId ?? nextOrders[0]?.publicOrderId ?? null;
      setSelectedOrderId(nextSelectedId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load admin orders.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !selectedOrderId) return;

    let isMounted = true;

    void backendApi
      .getAdminOrder(selectedOrderId, token)
      .then((payload) => {
        if (!isMounted) return;
        setSelectedOrder(payload.order);
        setTracking(payload.tracking);
        setMerchantReference(payload.order.merchantOrderReference ?? "");
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load the selected order.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedOrderId, token]);

  async function handlePlaceOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder || !merchantReference) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await backendApi.placeAdminOrder(selectedOrder.publicOrderId, token, merchantReference);
      await loadOrders(token);
      const payload = await backendApi.getAdminOrder(selectedOrder.publicOrderId, token);
      setSelectedOrder(payload.order);
      setTracking(payload.tracking);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to place the merchant order.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await backendApi.updateAdminOrderStatus(selectedOrder.publicOrderId, token, {
        status,
        detail,
      });
      await loadOrders(token);
      const payload = await backendApi.getAdminOrder(selectedOrder.publicOrderId, token);
      setSelectedOrder(payload.order);
      setTracking(payload.tracking);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the order status.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell>
      <main className="page profile-page">
        <section className="page-intro wide-intro">
          <div className="eyebrow">
            <span className="pulse-dot"></span>
            Ops queue
          </div>
          <h1>Admin order console for paid requests awaiting merchant-side action.</h1>
          <p className="lead">
            This screen is the manual fulfillment hub for CartPilot. Use it to load the paid queue, record the merchant order reference, and push tracking updates back to the customer flow.
          </p>
        </section>

        <section className="admin-auth-bar glass-card">
          <label className="admin-token-field">
            Admin API token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste backend ADMIN_API_TOKEN"
            />
          </label>
          <button className="button button-primary" type="button" onClick={() => void loadOrders()} disabled={!isBackendConfigured() || isLoading}>
            {isLoading ? "Loading..." : "Load queue"}
          </button>
          {!isBackendConfigured() ? (
            <p className="panel-copy">Set `NEXT_PUBLIC_API_BASE_URL` to enable the admin console.</p>
          ) : null}
          {errorMessage ? <p className="panel-copy">{errorMessage}</p> : null}
        </section>

        <section className="admin-layout">
          <aside className="glass-card admin-list">
            <div className="section-heading">
              <h2>Paid orders</h2>
              <p>Newest items appear first in the queue.</p>
            </div>

            <div className="history-list">
              {orders.length ? (
                orders.map((order) => {
                  const statusMeta = getOrderStatusMeta(order.status);

                  return (
                    <button
                      key={order.publicOrderId}
                      type="button"
                      className={`history-item history-button${selectedOrderId === order.publicOrderId ? " is-selected" : ""}`}
                      onClick={() => setSelectedOrderId(order.publicOrderId)}
                    >
                      <div>
                        <p className="merchant-name">{order.publicOrderId}</p>
                        <h3>{order.customer.fullName}</h3>
                        <p className="panel-copy">
                          {formatDateLabel(order.createdAt)} • {order.channel}
                        </p>
                      </div>
                      <span className={statusMeta.tone === "complete" ? "status-chip" : "tag"}>
                        {statusMeta.label}
                      </span>
                    </button>
                  );
                })
              ) : (
                <article className="history-item">
                  <div>
                    <h3>No orders loaded yet</h3>
                    <p className="panel-copy">Authenticate and load the queue to see actionable orders.</p>
                  </div>
                </article>
              )}
            </div>
          </aside>

          <section className="glass-card admin-detail">
            {selectedOrder ? (
              <>
                <div className="section-heading">
                  <h2>{selectedOrder.publicOrderId}</h2>
                  <p>
                    {selectedOrder.customer.fullName} • {selectedOrder.customer.phone}
                  </p>
                </div>

                <div className="admin-grid">
                  <article className="glass-subcard">
                    <h3>Order snapshot</h3>
                    <div className="stack-list condensed">
                      <span>Total paid: {formatCurrency(selectedOrder.totalAmount)}</span>
                      <span>Platform fee: {formatCurrency(selectedOrder.feeAmount)}</span>
                      <span>Address: {selectedOrder.customer.address}, {selectedOrder.customer.city}</span>
                      <span>Payment ref: {selectedOrder.paymentReference}</span>
                      {selectedOrder.customer.note ? <span>Note: {selectedOrder.customer.note}</span> : null}
                    </div>
                  </article>

                  <article className="glass-subcard">
                    <h3>Current status</h3>
                    <div className="stack-list condensed">
                      <span>{selectedMeta?.label}</span>
                      <span>Merchant ref: {selectedOrder.merchantOrderReference ?? "Not recorded yet"}</span>
                    </div>
                  </article>
                </div>

                <div className="admin-grid">
                  <form className="glass-subcard" onSubmit={handlePlaceOrder}>
                    <h3>Record merchant checkout</h3>
                    <label>
                      Merchant order reference
                      <input
                        type="text"
                        value={merchantReference}
                        onChange={(event) => setMerchantReference(event.target.value)}
                        placeholder="JUM-4839201"
                      />
                    </label>
                    <button className="button button-primary" type="submit" disabled={!merchantReference || isLoading}>
                      Save merchant reference
                    </button>
                  </form>

                  <form className="glass-subcard" onSubmit={handleStatusUpdate}>
                    <h3>Push status update</h3>
                    <label>
                      Status
                      <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Detail
                      <textarea rows={4} value={detail} onChange={(event) => setDetail(event.target.value)} />
                    </label>
                    <button className="button button-secondary" type="submit" disabled={!detail || isLoading}>
                      Update status
                    </button>
                  </form>
                </div>

                <article className="glass-subcard">
                  <h3>Tracking log</h3>
                  <div className="timeline">
                    {tracking.map((event) => (
                      <article className="timeline-item is-done" key={event.id}>
                        <span className="timeline-dot"></span>
                        <div>
                          <h3>{event.title}</h3>
                          <p>{event.detail}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              </>
            ) : (
              <div className="empty-panel">
                <h1>No admin order selected</h1>
                <p className="lead">Load the queue and choose an order to manage its fulfillment status.</p>
              </div>
            )}
          </section>
        </section>
      </main>
    </AppShell>
  );
}
