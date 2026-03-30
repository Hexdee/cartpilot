"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OfferCard } from "@/components/offer-card";
import { backendApi, BackendSearchSession, isBackendConfigured } from "@/lib/api";
import { getRankedOffers, toSearchIntent } from "@/lib/backend-presenters";
import {
  formatCurrency,
  getConstraintSummary,
  getRecommendation,
  getSearchLead,
  getSearchTitle,
  rankingConfig,
  getOffersForIntent,
} from "@/lib/catalog";
import { RankingMode } from "@/lib/types";
import { useAppStore } from "@/providers/app-store";

function ResultsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setRankingMode, selectOffer } = useAppStore();
  const searchSessionId = searchParams.get("searchSession");
  const [backendSession, setBackendSession] = useState<BackendSearchSession | null>(null);
  const [backendRankingMode, setBackendRankingMode] = useState<RankingMode | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(searchSessionId && isBackendConfigured()));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!searchSessionId || !isBackendConfigured()) return;

    let isMounted = true;

    void backendApi
      .getSearchSession(searchSessionId)
      .then((session) => {
        if (!isMounted) return;
        setBackendSession(session);
        setBackendRankingMode(session.intent.rankingMode);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load this search session.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchSessionId]);

  const effectiveRankingMode = backendSession
    ? backendRankingMode ?? backendSession.intent.rankingMode
    : state.currentSearch.rankingMode;
  const activeSearch = backendSession
    ? {
        ...toSearchIntent(backendSession),
        rankingMode: effectiveRankingMode,
      }
    : state.currentSearch;
  const offers = backendSession
    ? getRankedOffers(
        {
          ...backendSession,
          intent: {
            ...backendSession.intent,
            rankingMode: effectiveRankingMode,
          },
        },
        effectiveRankingMode,
      )
    : getOffersForIntent(activeSearch);

  async function handleSelectOffer(offerId: string) {
    if (backendSession && isBackendConfigured()) {
      const response = await backendApi.selectOffer(backendSession.id, offerId);
      const checkoutUrl = response.webLinks?.checkout;

      if (checkoutUrl) {
        try {
          const parsed = new URL(checkoutUrl);
          router.push(`${parsed.pathname}${parsed.search}`);
          return;
        } catch {
          router.push(checkoutUrl);
          return;
        }
      }

      router.push(`/checkout?checkoutSession=${response.checkoutSession.id}`);
      return;
    }

    selectOffer(offerId);
    router.push("/checkout");
  }

  return (
    <AppShell>
      <main className="page comparison-page">
        {isLoading ? (
          <section className="glass-card empty-panel">
            <h1>Loading search session</h1>
            <p className="lead">Fetching the assistant shortlist and ranking explanation.</p>
          </section>
        ) : null}

        {errorMessage && !backendSession ? (
          <section className="glass-card empty-panel">
            <h1>Search session unavailable</h1>
            <p className="lead">{errorMessage}</p>
          </section>
        ) : null}

        <section className="page-intro wide-intro">
          <div className="eyebrow">
            <span className="pulse-dot"></span>
            Search intent extracted
          </div>
          <h1>{getSearchTitle(activeSearch)}</h1>
          <p className="lead">{getSearchLead(activeSearch)}</p>
          <div className="intent-bar">
            <span className="tag">Query: {activeSearch.query}</span>
            {activeSearch.budget ? (
              <span className="tag">Budget: {formatCurrency(activeSearch.budget)}</span>
            ) : null}
            {activeSearch.color ? (
              <span className="tag">Color: {activeSearch.color}</span>
            ) : null}
            <span className="tag">Ranking: {rankingConfig[effectiveRankingMode].label}</span>
            {backendSession ? <span className="tag">Origin: {backendSession.channel}</span> : null}
          </div>
          <div className="cta-row">
            <Link className="button button-secondary" href="/assistant">
              Refine in assistant
            </Link>
            {offers[0] ? (
              <button
                className="button button-ghost"
                type="button"
                onClick={() => handleSelectOffer(offers[0].id)}
              >
                Checkout top offer
              </button>
            ) : null}
          </div>
        </section>

        <section className="comparison-layout">
          <aside className="filters-panel glass-card">
            <div className="section-heading">
              <h2>Ranking</h2>
              <p>Switch how the assistant scores top offers.</p>
            </div>
            <div className="rank-toggle">
              {(Object.entries(rankingConfig) as Array<[RankingMode, (typeof rankingConfig)[RankingMode]]>).map(
                ([mode, config]) => (
                  <button
                    key={mode}
                    className={`rank-pill${effectiveRankingMode === mode ? " is-active" : ""}`}
                    type="button"
                    onClick={() => {
                      if (backendSession) {
                        setBackendRankingMode(mode);
                        return;
                      }

                      setRankingMode(mode);
                    }}
                  >
                    {config.label}
                  </button>
                ),
              )}
            </div>

            <div className="section-heading subheading">
              <h3>Supported merchants</h3>
            </div>
            <div className="filter-pills">
              {offers.map((offer) => (
                <span key={offer.id} className="chip active-chip">
                  {offer.merchant}
                </span>
              ))}
            </div>

            <div className="section-heading subheading">
              <h3>Constraint summary</h3>
            </div>
            <ul className="stack-list condensed">
              {getConstraintSummary(activeSearch).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <article className="assistant-note">
              <p className="assistant-kicker">Why this recommendation</p>
              <p>{backendSession?.explanation ?? getRecommendation(activeSearch, offers)}</p>
            </article>
          </aside>

          <section className="results-panel">
            {offers.map((offer, index) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                rankingMode={effectiveRankingMode}
                featured={index === 0}
                onSelect={handleSelectOffer}
              />
            ))}
          </section>

          <aside className="compare-panel glass-card">
            <div className="section-heading">
              <h2>Compare at a glance</h2>
              <p>Top offers, normalized for total landed cost.</p>
            </div>
            <div className="compare-list">
              {offers.slice(0, 3).map((offer) => (
                <article className="compare-item" key={offer.id}>
                  <strong>{offer.merchant}</strong>
                  <span>{formatCurrency(offer.totalCost)} total</span>
                  <span>{offer.etaLabel}</span>
                </article>
              ))}
            </div>

            <div className="score-panel">
              {rankingConfig[effectiveRankingMode].weights.map((weight) => (
                <div className="score-row" key={weight.label}>
                  <span>{weight.label}</span>
                  <strong>{weight.value}</strong>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <main className="page comparison-page">
            <section className="glass-card empty-panel">
              <h1>Loading results</h1>
              <p className="lead">Preparing the assistant shortlist.</p>
            </section>
          </main>
        </AppShell>
      }
    >
      <ResultsPageContent />
    </Suspense>
  );
}
