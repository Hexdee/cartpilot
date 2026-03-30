"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  backendApi,
  BackendOrder,
  BackendSearchSession,
  BackendTrackingEvent,
  isBackendConfigured,
} from "@/lib/api";
import { buildTrackingSummary } from "@/lib/backend-presenters";
import { formatCurrency, formatDateLabel, getRelatedSuggestions } from "@/lib/catalog";
import { useResolvedOrder } from "@/providers/app-store";

function TrackingPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const resolvedOrder = useResolvedOrder();
  const [backendOrder, setBackendOrder] = useState<BackendOrder | null>(null);
  const [backendTracking, setBackendTracking] = useState<BackendTrackingEvent[]>([]);
  const [backendSearchSession, setBackendSearchSession] = useState<BackendSearchSession | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(orderId && isBackendConfigured()));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !isBackendConfigured()) return;

    let isMounted = true;

    void backendApi
      .getOrderTracking(orderId)
      .then(async (payload) => {
        const searchSession = await backendApi.getSearchSession(payload.order.searchSessionId);
        if (!isMounted) return;
        setBackendOrder(payload.order);
        setBackendTracking(payload.tracking);
        setBackendSearchSession(searchSession);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load this order.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const backendSummary = backendOrder
    ? buildTrackingSummary(backendOrder, backendSearchSession, backendTracking)
    : null;

  if (!resolvedOrder && !backendSummary && !isLoading) {
    return (
      <AppShell>
        <main className="page tracking-page">
          <section className="glass-card empty-panel">
            <h1>No tracked orders yet</h1>
            <p className="lead">Place an order from the results and checkout flow to see tracking updates here.</p>
          </section>
        </main>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell>
        <main className="page tracking-page">
          <section className="glass-card empty-panel">
            <h1>Loading tracking details</h1>
            <p className="lead">Fetching the latest CartPilot fulfillment status.</p>
          </section>
        </main>
      </AppShell>
    );
  }

  if (errorMessage && !backendSummary) {
    return (
      <AppShell>
        <main className="page tracking-page">
          <section className="glass-card empty-panel">
            <h1>Tracking unavailable</h1>
            <p className="lead">{errorMessage}</p>
          </section>
        </main>
      </AppShell>
    );
  }

  const backendOrderDetails = backendSummary?.order ?? null;
  const localOrderDetails = resolvedOrder?.order ?? null;
  const order = backendOrderDetails ?? localOrderDetails;
  const offer = backendSummary?.offer ?? resolvedOrder?.offer;
  const product = backendSummary?.product ?? resolvedOrder?.product ?? null;
  const recommendations = product ? getRelatedSuggestions(product.key) : [];
  const timeline = backendSummary?.timeline ?? resolvedOrder?.order.timeline ?? [];
  const progress =
    backendSummary?.progress ??
    Math.max(
      20,
      Math.round(
        (((resolvedOrder?.order.timeline.findIndex((item) => item.state === "active") ?? 0) + 1) /
          Math.max(1, resolvedOrder?.order.timeline.length ?? 1)) *
          100,
      ),
    );
  const statusLabel = backendSummary?.status.label ?? localOrderDetails?.statusLabel ?? "In progress";
  const statusTone = backendSummary?.status.tone ?? localOrderDetails?.statusTone ?? "active";
  const displayOrderId = backendOrderDetails?.publicOrderId ?? localOrderDetails?.id ?? "";

  if (!order) {
    return null;
  }

  return (
    <AppShell>
      <main className="page tracking-page">
        <section className="page-intro tracking-intro">
          <div className="eyebrow">
            <span className="pulse-dot"></span>
            <span>Order {displayOrderId}</span>
          </div>
          <h1>Your order is confirmed and moving through CartPilot fulfillment.</h1>
          <p className="lead">
            Created on {formatDateLabel(order.createdAt)}. CartPilot AI is keeping the full purchase timeline visible while the team completes the merchant-side order flow.
          </p>
          <div className="cta-row">
            <Link className="button button-secondary" href="/assistant">
              Continue shopping
            </Link>
            <Link className="button button-ghost" href="/profile">
              View profile hub
            </Link>
          </div>
        </section>

        <section className="tracking-layout">
          <section className="timeline-panel glass-card">
            <div className="section-heading">
              <h2>Status timeline</h2>
              <p>Every step stays visible inside the platform.</p>
            </div>

            <div className="timeline">
              {timeline.map((event) => (
                <article
                  key={event.title}
                  className={`timeline-item${event.state === "done" ? " is-done" : ""}${event.state === "active" ? " is-active" : ""}`}
                >
                  <span className="timeline-dot"></span>
                  <div>
                    <h3>{event.title}</h3>
                    <p>{event.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="tracking-sidebar">
            <article className="glass-card status-card">
              <div className="status-head">
                <div>
                  <p className="assistant-kicker">Current status</p>
                  <h2>{statusLabel}</h2>
                </div>
                <span className="status-chip">{statusTone === "complete" ? "Complete" : "In progress"}</span>
              </div>
              <div className="status-meta">
                <span>Merchant: {offer?.merchant ?? "Assigned merchant"}</span>
                <span>
                  Estimated delivery: {backendSummary?.offer?.etaLabel ?? resolvedOrder?.order.etaLabel ?? "Pending merchant confirmation"}
                </span>
                <span>
                  Delivery address: {backendOrderDetails?.customer.address ?? localOrderDetails?.address},{" "}
                  {backendOrderDetails?.customer.city ?? localOrderDetails?.city}
                </span>
                <span>Total paid: {formatCurrency(backendOrderDetails?.totalAmount ?? localOrderDetails?.total ?? 0)}</span>
              </div>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${progress}%` }}></span>
              </div>
            </article>

            <article className="glass-card support-card">
              <div className="section-heading">
                <h2>Need help?</h2>
              </div>
              <div className="support-actions">
                <button className="button button-secondary" type="button">
                  Report an issue
                </button>
                <button className="button button-ghost" type="button">
                  Contact support
                </button>
              </div>
            </article>

            <article className="glass-card related-card">
              <div className="section-heading">
                <h2>Recommended next searches</h2>
              </div>
              <div className="recent-list">
                {recommendations.map((suggestion) => (
                  <Link className="recent-item" href="/assistant" key={suggestion.title}>
                    <strong>{suggestion.title}</strong>
                    <span>{suggestion.subtitle}</span>
                  </Link>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <main className="page tracking-page">
            <section className="glass-card empty-panel">
              <h1>Loading tracking</h1>
              <p className="lead">Preparing the latest fulfillment timeline.</p>
            </section>
          </main>
        </AppShell>
      }
    >
      <TrackingPageContent />
    </Suspense>
  );
}
