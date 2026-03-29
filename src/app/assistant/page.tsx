"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { backendApi, isBackendConfigured } from "@/lib/api";
import {
  assistantPromptSuggestions,
  getProductEntry,
  rankingConfig,
} from "@/lib/catalog";
import { getOrCreateWebSessionId } from "@/lib/web-session";
import { ProductKey, RankingMode } from "@/lib/types";
import { useAppStore } from "@/providers/app-store";

function buildAssistantMessages(query: string, rankingMode: RankingMode) {
  const product = getProductEntry(query ? getProductEntryKey(query) : "sony_wh1000xm5");
  const rankingLabel = rankingConfig[rankingMode].label.toLowerCase();

  return [
    {
      role: "assistant",
      text: "I can compare offers by total price, rating, or fastest delivery across the stores you support.",
    },
    {
      role: "user",
      text: query,
    },
    {
      role: "assistant",
      text: `Understood. I’ll search for ${product.shortName} and prioritize ${rankingLabel} before I rank the shortlist.`,
    },
    {
      role: "assistant",
      text: product.followUp,
    },
  ];
}

function getProductEntryKey(prompt: string): ProductKey {
  const lower = prompt.toLowerCase();

  if (lower.includes("ipad")) return "ipad_10th_gen";
  if (lower.includes("air fryer")) return "air_fryer";
  if (lower.includes("running shoes") || lower.includes("size 43")) return "running_shoes";
  if (lower.includes("office chair")) return "office_chair";
  if (lower.includes("controller")) return "ps5_controller";
  if (lower.includes("blender")) return "portable_blender";

  return "sony_wh1000xm5";
}

export default function AssistantPage() {
  const router = useRouter();
  const { state, submitSearch } = useAppStore();
  const [prompt, setPrompt] = useState(state.currentSearch.query);
  const [rankingMode, setRankingMode] = useState<RankingMode>(state.currentSearch.rankingMode);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [webSessionId, setWebSessionId] = useState("");
  const messages = buildAssistantMessages(prompt || state.currentSearch.query, rankingMode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setWebSessionId(getOrCreateWebSessionId());
  }, []);

  function toRelativeUrl(url: string) {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolvedPrompt = prompt.trim();
    if (!resolvedPrompt) return;

    setIsPending(true);
    setErrorMessage(null);

    try {
      if (isBackendConfigured() && webSessionId) {
        const response = await backendApi.sendConversationMessage("web", webSessionId, {
          message: resolvedPrompt,
          displayName: state.profile.fullName,
        });
        router.push(toRelativeUrl(response.reply.webLinks.results));
        return;
      }

      submitSearch(resolvedPrompt, rankingMode);
      router.push("/results");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send your request right now.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AppShell>
      <main className="page assistant-page assistant-page-screen">
        <section className="assistant-shell assistant-workspace">
          <div className="assistant-header">
            <div>
              <p className="assistant-kicker">Assistant Session</p>
              <h2>Nexa is ready to shop</h2>
            </div>
            <span className="live-badge">{isPending ? "Searching..." : "Live session"}</span>
          </div>

          <div className="chat-feed assistant-chat-feed">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`message ${message.role === "assistant" ? "assistant-message" : "user-message"}`}
              >
                <span className="avatar">{message.role === "assistant" ? "AI" : "You"}</span>
                <div>
                  <p>{message.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="prompt-cluster prompt-cluster-compact">
            {assistantPromptSuggestions.map((suggestion) => (
              <button
                key={suggestion.title}
                className="chip prompt-chip"
                type="button"
                onClick={() => setPrompt(suggestion.prompt)}
              >
                {suggestion.prompt}
              </button>
            ))}
          </div>

          <form className="composer assistant-composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="assistantPrompt">
              Ask the shopping assistant
            </label>
            <div className="micro-preferences" aria-label="Ranking shortcuts">
              {(
                [
                  ["fastest_delivery", "Fast delivery"],
                  ["lowest_total_price", "Cheapest"],
                  ["highest_rating", "Best rating"],
                ] as Array<[RankingMode, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={`micro-chip${rankingMode === value ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setRankingMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="composer-layout">
              <textarea
                id="assistantPrompt"
                name="prompt"
                rows={3}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Tell CartPilot AI what you want, budget, preferred stores, or delivery speed..."
              ></textarea>
              <button className="button button-primary send-button" type="submit" disabled={isPending}>
                {isPending ? "Searching" : "Send"}
              </button>
            </div>
            {errorMessage ? <p className="panel-copy">{errorMessage}</p> : null}
          </form>
        </section>
      </main>
    </AppShell>
  );
}
