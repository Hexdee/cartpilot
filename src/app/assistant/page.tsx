"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { backendApi, isBackendConfigured } from "@/lib/api";
import {
  assistantPromptSuggestions,
  formatCurrency,
  rankingConfig,
} from "@/lib/catalog";
import { getRankedOffers } from "@/lib/backend-presenters";
import { getOrCreateWebSessionId } from "@/lib/web-session";
import { RankedOffer, RankingMode } from "@/lib/types";
import { useAppStore } from "@/providers/app-store";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type AssistantPreview = {
  source: "backend";
  query: string;
  summary: string;
  explanation?: string;
  searchSessionId?: string;
  resultsHref: string;
  checkoutHref?: string;
  offers: RankedOffer[];
};

type AssistantChat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  preview: AssistantPreview | null;
  rankingMode: RankingMode;
};

type AssistantChatState = {
  activeChatId: string;
  chats: AssistantChat[];
};

const assistantChatStorageKey = "cartpilot-assistant-chats";
const maxAssistantChats = 20;
const rankingModes: RankingMode[] = [
  "fastest_delivery",
  "lowest_total_price",
  "highest_rating",
  "balanced",
];

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Tell me what you want to buy and what matters most, like best deal, fastest delivery, preferred store, brand, or budget. I’ll return a ranked shortlist and you can continue to results or checkout from here.",
};

const historyTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function createMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    text,
  };
}

function isRankingMode(value: unknown): value is RankingMode {
  return typeof value === "string" && rankingModes.includes(value as RankingMode);
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ChatMessage>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.text === "string" &&
    (candidate.role === "assistant" || candidate.role === "user")
  );
}

function isAssistantPreview(value: unknown): value is AssistantPreview {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AssistantPreview>;
  return (
    candidate.source === "backend" &&
    typeof candidate.query === "string" &&
    typeof candidate.summary === "string" &&
    typeof candidate.resultsHref === "string" &&
    Array.isArray(candidate.offers)
  );
}

function createChatTitle(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return "New chat";
  return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized;
}

function createAssistantChat(
  rankingMode: RankingMode,
  visitorSessionId: string,
): AssistantChat {
  const timestamp = new Date().toISOString();

  return {
    id: `${visitorSessionId}-${crypto.randomUUID()}`,
    title: "New chat",
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [welcomeMessage],
    preview: null,
    rankingMode,
  };
}

function normalizeAssistantChat(value: unknown): AssistantChat | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<AssistantChat>;
  if (typeof candidate.id !== "string") return null;

  const messages = Array.isArray(candidate.messages)
    ? candidate.messages.filter(isChatMessage)
    : [];
  const normalizedMessages = messages.length ? messages : [welcomeMessage];
  const derivedTitle = normalizedMessages.find((message) => message.role === "user")?.text;

  return {
    id: candidate.id,
    title:
      typeof candidate.title === "string" && candidate.title.trim()
        ? candidate.title
        : createChatTitle(derivedTitle ?? ""),
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : typeof candidate.createdAt === "string"
          ? candidate.createdAt
          : new Date().toISOString(),
    messages: normalizedMessages,
    preview: isAssistantPreview(candidate.preview) ? candidate.preview : null,
    rankingMode: isRankingMode(candidate.rankingMode)
      ? candidate.rankingMode
      : "balanced",
  };
}

function loadAssistantChatState(
  rankingMode: RankingMode,
  visitorSessionId: string,
): AssistantChatState {
  const fallbackChat = createAssistantChat(rankingMode, visitorSessionId);

  if (typeof window === "undefined") {
    return {
      activeChatId: fallbackChat.id,
      chats: [fallbackChat],
    };
  }

  const saved = window.localStorage.getItem(assistantChatStorageKey);
  if (!saved) {
    return {
      activeChatId: fallbackChat.id,
      chats: [fallbackChat],
    };
  }

  try {
    const parsed = JSON.parse(saved) as Partial<AssistantChatState>;
    const chats = Array.isArray(parsed.chats)
      ? parsed.chats
          .map(normalizeAssistantChat)
          .filter((chat): chat is AssistantChat => Boolean(chat))
          .slice(0, maxAssistantChats)
      : [];

    if (!chats.length) {
      return {
        activeChatId: fallbackChat.id,
        chats: [fallbackChat],
      };
    }

    const activeChatId =
      typeof parsed.activeChatId === "string" &&
      chats.some((chat) => chat.id === parsed.activeChatId)
        ? parsed.activeChatId
        : chats[0].id;

    return {
      activeChatId,
      chats,
    };
  } catch {
    return {
      activeChatId: fallbackChat.id,
      chats: [fallbackChat],
    };
  }
}

function getChatSnippet(chat: AssistantChat) {
  for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
    const message = chat.messages[index];
    if (message.id === welcomeMessage.id) continue;
    return message.text;
  }

  if (chat.preview?.query) {
    return chat.preview.query;
  }

  return "Start a new shopping request";
}

function formatHistoryTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Saved chat";
  return historyTimestampFormatter.format(parsed);
}

function upsertChat(
  chats: AssistantChat[],
  chatId: string,
  updater: (chat: AssistantChat) => AssistantChat,
) {
  const existing = chats.find((chat) => chat.id === chatId);
  if (!existing) return chats;

  const updated = updater(existing);
  return [updated, ...chats.filter((chat) => chat.id !== chatId)].slice(
    0,
    maxAssistantChats,
  );
}

export default function AssistantPage() {
  const router = useRouter();
  const chatFeedRef = useRef<HTMLDivElement | null>(null);
  const { state } = useAppStore();
  const initialSearchQueryRef = useRef(state.currentSearch.query);
  const initialRankingModeRef = useRef(state.currentSearch.rankingMode);
  const [prompt, setPrompt] = useState("");
  const [chatState, setChatState] = useState<AssistantChatState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isChoosingOffer, setIsChoosingOffer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visitorSessionId, setVisitorSessionId] = useState("");
  const [hiddenMerchants, setHiddenMerchants] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPending) {
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPending]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sessionId = getOrCreateWebSessionId();
    const hasSavedChats = Boolean(
      window.localStorage.getItem(assistantChatStorageKey),
    );
    setVisitorSessionId(sessionId);
    setChatState(
      loadAssistantChatState(initialRankingModeRef.current, sessionId),
    );
    setPrompt(hasSavedChats ? "" : initialSearchQueryRef.current);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !chatState) return;
    window.localStorage.setItem(assistantChatStorageKey, JSON.stringify(chatState));
  }, [chatState]);

  const activeChat = useMemo(() => {
    if (!chatState) return null;

    return (
      chatState.chats.find((chat) => chat.id === chatState.activeChatId) ??
      chatState.chats[0] ??
      null
    );
  }, [chatState]);

  const messages = useMemo(
    () => activeChat?.messages ?? [welcomeMessage],
    [activeChat],
  );
  const preview = activeChat?.preview ?? null;
  const activeRankingMode = activeChat?.rankingMode ?? state.currentSearch.rankingMode;

  useEffect(() => {
    const feed = chatFeedRef.current;
    if (!feed) return;
    feed.scrollTo({
      top: feed.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, preview]);

  const contextualActions = useMemo(() => {
    if (!preview) return null;

    return {
      resultsHref: preview.resultsHref,
      checkoutHref: preview.checkoutHref,
      hasOffers: preview.offers.length > 0,
    };
  }, [preview]);

  const availableMerchants = useMemo(() => {
    if (!preview) return [];
    return Array.from(new Set(preview.offers.map((offer) => offer.merchant))).sort();
  }, [preview]);

  const filteredOffers = useMemo(() => {
    if (!preview) return [];
    return preview.offers.filter((offer) => !hiddenMerchants.includes(offer.merchant));
  }, [preview, hiddenMerchants]);

  const chatHistory = chatState?.chats ?? [];
  const canSwitchChats = Boolean(visitorSessionId) && !isPending && !isChoosingOffer;

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedSeconds = secs.toString().padStart(2, "0");

    if (mins === 0) return `${secs} secs`;
    return `${mins} mins ${paddedSeconds} secs`;
  };

  const updateChatById = (
    chatId: string,
    updater: (chat: AssistantChat) => AssistantChat,
  ) => {
    setChatState((current) => {
      if (!current) return current;

      return {
        ...current,
        chats: upsertChat(current.chats, chatId, updater),
      };
    });
  };

  const toggleMerchant = (merchant: string) => {
    setHiddenMerchants((current) =>
      current.includes(merchant)
        ? current.filter((entry) => entry !== merchant)
        : [...current, merchant],
    );
  };

  function toRelativeUrl(url: string) {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }

  function handleCreateNewChat() {
    if (!visitorSessionId) return;

    const nextChat = createAssistantChat(activeRankingMode, visitorSessionId);
    setChatState((current) => ({
      activeChatId: nextChat.id,
      chats: [nextChat, ...(current?.chats ?? [])].slice(0, maxAssistantChats),
    }));
    setPrompt("");
    setErrorMessage(null);
    setHiddenMerchants([]);
  }

  function handleSelectChat(chatId: string) {
    setChatState((current) =>
      current
        ? {
            ...current,
            activeChatId: chatId,
          }
        : current,
    );
    setPrompt("");
    setErrorMessage(null);
    setHiddenMerchants([]);
  }

  function handleRankingModeChange(nextMode: RankingMode) {
    if (!activeChat) return;

    updateChatById(activeChat.id, (chat) => ({
      ...chat,
      rankingMode: nextMode,
      updatedAt: new Date().toISOString(),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolvedPrompt = prompt.trim();
    if (!resolvedPrompt || !activeChat) return;

    const chatId = activeChat.id;
    const userMessage = createMessage("user", resolvedPrompt);
    const nextTitle = createChatTitle(resolvedPrompt);

    setPrompt("");
    updateChatById(chatId, (chat) => ({
      ...chat,
      title: chat.messages.some((message) => message.role === "user")
        ? chat.title
        : nextTitle,
      messages: [...chat.messages, userMessage],
      updatedAt: new Date().toISOString(),
    }));
    setIsPending(true);
    setErrorMessage(null);

    try {
      if (!isBackendConfigured()) {
        throw new Error(
          "Live search is disabled. Set NEXT_PUBLIC_API_BASE_URL to your backend URL.",
        );
      }

      const response = await backendApi.sendConversationMessage("web", chatId, {
        message: resolvedPrompt,
        displayName: state.profile.fullName,
        rankingMode: activeRankingMode,
      });

      const assistantText = [
        response.reply.summary,
        response.reply.clarifyingQuestion,
      ]
        .filter(Boolean)
        .join("\n\n");

      updateChatById(chatId, (chat) => ({
        ...chat,
        messages: [...chat.messages, createMessage("assistant", assistantText)],
        preview: {
          source: "backend",
          query: response.searchSession.intent.query,
          summary: response.reply.summary,
          explanation: response.searchSession.explanation,
          searchSessionId: response.searchSession.id,
          resultsHref: toRelativeUrl(response.reply.webLinks.results),
          checkoutHref: response.reply.webLinks.checkout
            ? toRelativeUrl(response.reply.webLinks.checkout)
            : undefined,
          offers: getRankedOffers(response.searchSession).slice(0, 3),
        },
        rankingMode: activeRankingMode,
        updatedAt: new Date().toISOString(),
      }));

      setHiddenMerchants([]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send your request right now.",
      );
      updateChatById(chatId, (chat) => ({
        ...chat,
        messages: [
          ...chat.messages,
          createMessage(
            "assistant",
            "I ran into a problem while preparing the shortlist. Please try again in a moment.",
          ),
        ],
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setIsPending(false);
    }
  }

  async function handleChooseOffer(offerId: string) {
    if (!preview) return;

    setIsChoosingOffer(true);
    setErrorMessage(null);

    try {
      if (!preview.searchSessionId || !isBackendConfigured()) {
        throw new Error(
          "Live checkout is unavailable. Make sure NEXT_PUBLIC_API_BASE_URL is configured.",
        );
      }

      const response = await backendApi.selectOffer(
        preview.searchSessionId,
        offerId,
      );
      const checkoutUrl = response.webLinks?.checkout;

      if (checkoutUrl) {
        router.push(toRelativeUrl(checkoutUrl));
        return;
      }

      router.push(`/checkout?checkoutSession=${response.checkoutSession.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to continue with this offer right now.",
      );
    } finally {
      setIsChoosingOffer(false);
    }
  }

  return (
    <AppShell>
      <main className="page assistant-page assistant-page-screen">
        <section className="assistant-shell assistant-workspace">
          <div className="assistant-session-layout">
            <aside className="assistant-history-panel" aria-label="Previous chats">
              <div className="assistant-history-header">
                <div className="assistant-history-heading">
                  <p className="assistant-kicker">Assistant Chats</p>
                  <div className="assistant-history-toolbar">
                    <div>
                      <h3>Previous chats</h3>
                      <p className="assistant-history-count">
                        {chatHistory.length} saved
                      </p>
                    </div>
                    <button
                      className="button button-secondary assistant-history-new"
                      type="button"
                      onClick={handleCreateNewChat}
                      disabled={!canSwitchChats}
                    >
                      New chat
                    </button>
                  </div>
                </div>
              </div>

              <div className="assistant-history-list">
                {chatHistory.map((chat) => (
                  <button
                    key={chat.id}
                    className={`history-item history-button assistant-history-button${chat.id === activeChat?.id ? " is-selected" : ""}`}
                    type="button"
                    onClick={() => handleSelectChat(chat.id)}
                    disabled={!canSwitchChats}
                  >
                    <span className="assistant-history-time">
                      {formatHistoryTimestamp(chat.updatedAt)}
                    </span>
                    <h3>{chat.title}</h3>
                    <p>{getChatSnippet(chat)}</p>
                  </button>
                ))}
              </div>
            </aside>

            <div className="assistant-main-panel">
              <div className="assistant-header">
                <div>
                  <p className="assistant-kicker">Assistant Session</p>
                  <h2>
                    {activeChat && activeChat.title !== "New chat"
                      ? activeChat.title
                      : "CartPilot is ready to shop"}
                  </h2>
                </div>
                <span className="live-badge">
                  {isPending || isChoosingOffer ? "Working..." : "Live session"}
                </span>
              </div>

              <div className="chat-feed assistant-chat-feed" ref={chatFeedRef}>
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message ${message.role === "assistant" ? "assistant-message" : "user-message"}`}
                  >
                    <span className="avatar">
                      {message.role === "assistant" ? "AI" : "You"}
                    </span>
                    <div>
                      <p>{message.text}</p>
                    </div>
                  </article>
                ))}

                {preview ? (
                  <section className="assistant-result-panel">
                    <div className="assistant-result-header">
                      <div>
                        <p className="assistant-kicker">Current shortlist</p>
                        <h3>{preview.query}</h3>
                      </div>
                      <span className="tag">
                        {rankingConfig[activeRankingMode].label}
                      </span>
                    </div>

                    <p className="assistant-result-copy">
                      {preview.explanation ?? preview.summary}
                    </p>

                    {availableMerchants.length > 1 ? (
                      <div className="micro-preferences">
                        <button
                          className={`micro-chip${hiddenMerchants.length === 0 ? " is-active" : ""}`}
                          type="button"
                          onClick={() => setHiddenMerchants([])}
                        >
                          All Stores
                        </button>
                        {availableMerchants.map((merchant) => (
                          <button
                            key={merchant}
                            className={`micro-chip${!hiddenMerchants.includes(merchant) ? " is-active" : ""}`}
                            type="button"
                            onClick={() => toggleMerchant(merchant)}
                          >
                            {merchant}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {filteredOffers.length ? (
                      <div className="assistant-result-list">
                        {filteredOffers.map((offer, index) => (
                          <article className="assistant-result-item" key={offer.id}>
                            <div className="assistant-result-meta">
                              <span className="assistant-result-rank">
                                #{index + 1}
                              </span>
                              <div>
                                <strong>{offer.merchant}</strong>
                                <h4>{offer.title}</h4>
                              </div>
                            </div>
                            <div className="assistant-result-stats">
                              <span>{formatCurrency(offer.totalCost)}</span>
                              <span>{offer.etaLabel}</span>
                              <span>{offer.rating.toFixed(1)}★</span>
                            </div>
                            <p>{offer.summary}</p>
                            <div className="assistant-result-actions">
                              <button
                                className="button button-primary"
                                type="button"
                                onClick={() => handleChooseOffer(offer.id)}
                                disabled={isChoosingOffer}
                              >
                                {isChoosingOffer ? "Opening" : "Choose this offer"}
                              </button>
                              <a
                                className="button button-ghost"
                                href={offer.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View merchant
                              </a>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="assistant-result-copy">
                        No confident matches yet. Try adding a clearer model,
                        brand, size, or budget.
                      </p>
                    )}

                    <div className="assistant-journey-actions">
                      <Link
                        className="button button-secondary"
                        href={preview.resultsHref}
                      >
                        Open full results
                      </Link>
                      {contextualActions?.checkoutHref ? (
                        <Link
                          className="button button-ghost"
                          href={contextualActions.checkoutHref}
                        >
                          Checkout top offer
                        </Link>
                      ) : null}
                    </div>
                  </section>
                ) : null}
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
                      className={`micro-chip${activeRankingMode === value ? " is-active" : ""}`}
                      type="button"
                      onClick={() => handleRankingModeChange(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="composer-layout">
                  <textarea
                    id="assistantPrompt"
                    rows={3}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Tell CartPilot what you want, your budget, preferred store, or delivery speed..."
                  ></textarea>
                  <button
                    className="button button-primary send-button"
                    type="submit"
                    disabled={isPending || !activeChat}
                  >
                    {isPending ? `Searching ${formatElapsed(elapsed)}` : "Send"}
                  </button>
                </div>
                {errorMessage ? <p className="panel-copy">{errorMessage}</p> : null}
              </form>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
