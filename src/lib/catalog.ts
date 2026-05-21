import {
  MerchantOffer,
  ProductCatalogEntry,
  ProductKey,
  ProductSuggestion,
  RankedOffer,
  RankingMode,
  SearchIntent,
} from "@/lib/types";

export const rankingConfig: Record<
  RankingMode,
  {
    label: string;
    badge: string;
    weights: Array<{ label: string; value: string }>;
  }
> = {
  fastest_delivery: {
    label: "Fastest delivery",
    badge: "Best for fast delivery",
    weights: [
      { label: "Delivery speed weight", value: "55%" },
      { label: "Total cost weight", value: "30%" },
      { label: "Rating weight", value: "15%" },
    ],
  },
  lowest_total_price: {
    label: "Best deal",
    badge: "Lowest total landed cost",
    weights: [
      { label: "Total cost weight", value: "60%" },
      { label: "Delivery speed weight", value: "25%" },
      { label: "Rating weight", value: "15%" },
    ],
  },
  highest_rating: {
    label: "Best rating",
    badge: "Highest customer rating",
    weights: [
      { label: "Rating weight", value: "60%" },
      { label: "Total cost weight", value: "20%" },
      { label: "Delivery speed weight", value: "20%" },
    ],
  },
  balanced: {
    label: "Balanced",
    badge: "Best overall balance",
    weights: [
      { label: "Delivery speed weight", value: "35%" },
      { label: "Total cost weight", value: "35%" },
      { label: "Rating weight", value: "30%" },
    ],
  },
};

export const productCatalog: Record<ProductKey, ProductCatalogEntry> = {
  custom: {
    key: "custom",
    displayName: "requested product",
    shortName: "Requested product",
    aliases: [],
    followUp: "Tell me the brand, model, budget, or delivery preference if you want a tighter shortlist.",
    relatedSuggestions: [],
  },
};

const catalogSuggestions: ProductSuggestion[] = [
  {
    key: "ipad_10th_gen",
    title: "Find the cheapest iPad 10th gen",
    subtitle: "Delivery this week across supported merchants",
    prompt: "Find the cheapest iPad 10th gen with delivery this week",
  },
  {
    key: "air_fryer",
    title: "Compare air fryers",
    subtitle: "Sort by rating and warranty",
    prompt: "Compare air fryers by rating and warranty",
  },
  {
    key: "running_shoes",
    title: "Running shoes under budget",
    subtitle: "Size 43, under ₦120,000",
    prompt: "I need running shoes under ₦120k in size 43",
  },
];

export const assistantPromptSuggestions = catalogSuggestions;

const offers: MerchantOffer[] = [];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateLabel(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoString));
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseMoneyToken(rawValue: string): number {
  const sanitized = rawValue.replace(/[^\d.]/g, "");
  if (!sanitized) return 0;
  const value = Number.parseFloat(sanitized);

  if (Number.isNaN(value)) return 0;
  if (/[kK]\b/.test(rawValue)) return value * 1000;
  if (/[mM]\b/.test(rawValue)) return value * 1_000_000;
  return value;
}

function detectBudget(prompt: string): number | null {
  const budgetPattern =
    /(?:under|below|budget(?:\s+of)?|less than)\s*[₦$]?\s*([\d.,]+(?:[kKmM])?)/i;
  const match = prompt.match(budgetPattern);
  return match ? parseMoneyToken(match[1]) : null;
}

function detectColor(prompt: string): string | null {
  const colors = ["black", "white", "silver", "blue", "red"];
  const lower = prompt.toLowerCase();
  return colors.find((color) => lower.includes(color)) ?? null;
}

export function inferRankingMode(prompt: string): RankingMode {
  const lower = prompt.toLowerCase();
  if (lower.includes("cheap") || lower.includes("cheapest") || lower.includes("deal")) {
    return "lowest_total_price";
  }
  if (lower.includes("rating") || lower.includes("best rated") || lower.includes("best-rated")) {
    return "highest_rating";
  }
  if (
    lower.includes("fast") ||
    lower.includes("delivery") ||
    lower.includes("same-day") ||
    lower.includes("today")
  ) {
    return "fastest_delivery";
  }
  return "balanced";
}

export function detectProductKey(prompt: string): ProductKey {
  return "custom";
}

export function buildSearchIntent(prompt: string, rankingMode?: RankingMode): SearchIntent {
  const productKey = detectProductKey(prompt);

  return {
    id: createId("search"),
    query: prompt.trim(),
    productKey,
    rankingMode: rankingMode ?? inferRankingMode(prompt),
    budget: detectBudget(prompt),
    color: detectColor(prompt),
    createdAt: new Date().toISOString(),
  };
}

function getRankingScore(offer: RankedOffer, rankingMode: RankingMode): number {
  const deliveryScore = 1 / offer.etaHours;
  const priceScore = 1 / offer.totalCost;
  const ratingScore = offer.rating / 5;

  switch (rankingMode) {
    case "fastest_delivery":
      return deliveryScore * 0.55 + priceScore * 0.3 + ratingScore * 0.15;
    case "lowest_total_price":
      return priceScore * 0.6 + deliveryScore * 0.25 + ratingScore * 0.15;
    case "highest_rating":
      return ratingScore * 0.6 + priceScore * 0.2 + deliveryScore * 0.2;
    case "balanced":
      return deliveryScore * 0.35 + priceScore * 0.35 + ratingScore * 0.3;
  }
}

export function rankMerchantOffers(intent: SearchIntent, merchantOffers: MerchantOffer[]): RankedOffer[] {
  const matchingOffers = merchantOffers
    .filter((offer) => intent.productKey === "custom" || offer.productKey === intent.productKey)
    .filter((offer) => !intent.color || !offer.color || offer.color === intent.color)
    .map((offer) => {
      const totalCost = offer.price + offer.shippingCost;
      return {
        ...offer,
        totalCost,
        withinBudget: intent.budget ? totalCost <= intent.budget : true,
        rankingScore: 0,
      };
    });

  const budgetSafeOffers = matchingOffers.some((offer) => offer.withinBudget)
    ? matchingOffers.filter((offer) => offer.withinBudget)
    : matchingOffers;

  return budgetSafeOffers
    .map((offer) => ({
      ...offer,
      rankingScore: getRankingScore(offer, intent.rankingMode),
    }))
    .sort((left, right) => {
      if (right.rankingScore !== left.rankingScore) {
        return right.rankingScore - left.rankingScore;
      }

      return left.totalCost - right.totalCost;
    });
}

export function getOffersForIntent(intent: SearchIntent): RankedOffer[] {
  return rankMerchantOffers(intent, offers);
}

export function getOfferById(intent: SearchIntent, offerId: string | null): RankedOffer | null {
  if (!offerId) return null;
  return getOffersForIntent(intent).find((offer) => offer.id === offerId) ?? null;
}

export function getConstraintSummary(intent: SearchIntent): string[] {
  const entries = [
    "Exclude unavailable sellers and normalize merchant titles before ranking.",
    "Show total landed cost, not just item price.",
    "Surface ETA confidence based on the merchant estimate and local fulfillment coverage.",
  ];

  if (intent.budget) {
    entries.unshift(`Keep the shortlist inside ${formatCurrency(intent.budget)} whenever possible.`);
  }

  if (intent.color) {
    entries.unshift(`Limit visible offers to ${intent.color} variants or neutral equivalents.`);
  }

  return entries;
}

export function getRecommendation(intent: SearchIntent, rankedOffers: RankedOffer[]): string {
  const [topOffer, secondOffer] = rankedOffers;

  if (!topOffer) {
    return "No offers matched the current constraints. Try relaxing the budget or broadening the product description.";
  }

  if (!secondOffer) {
    return `${topOffer.merchant} is the only strong match after applying the current constraints, so the assistant is surfacing it directly.`;
  }

  switch (intent.rankingMode) {
    case "fastest_delivery":
      return `${topOffer.merchant} ranks first because it arrives faster than ${secondOffer.merchant} while keeping the total cost within range.`;
    case "lowest_total_price":
      return `${topOffer.merchant} offers the lowest all-in cost once shipping is included, with a delivery window that still stays competitive.`;
    case "highest_rating":
      return `${topOffer.merchant} leads on customer rating and still avoids a major delivery or price penalty compared with the next option.`;
    case "balanced":
      return `${topOffer.merchant} is the strongest overall compromise between delivery speed, total landed cost, and buyer rating.`;
  }
}

export function getSearchTitle(intent: SearchIntent): string {
  const product = productCatalog[intent.productKey];
  const parts = [intent.productKey === "custom" ? intent.query : product.shortName];

  if (intent.color) parts.push(`in ${intent.color}`);
  if (intent.budget) parts.push(`under ${formatCurrency(intent.budget)}`);
  parts.push(`sorted by ${rankingConfig[intent.rankingMode].label.toLowerCase()}`);

  return parts.join(", ");
}

export function getSearchLead(intent: SearchIntent): string {
  const productLabel =
    intent.productKey === "custom" ? `"${intent.query}"` : productCatalog[intent.productKey].displayName;
  return `CartPilot searched supported merchants for ${productLabel}, normalized duplicate listings, and re-ranked results using ${rankingConfig[intent.rankingMode].label.toLowerCase()} as the primary signal.`;
}

export function getRelatedSuggestions(productKey: ProductKey): ProductSuggestion[] {
  return productCatalog[productKey]?.relatedSuggestions ?? [];
}

export function getDefaultSearchIntent(): SearchIntent {
  return buildSearchIntent(
    "I need Sony WH-1000XM5 headphones under ₦700,000, black, delivered fast.",
    "fastest_delivery",
  );
}

export function getSeedHistory(): SearchIntent[] {
  return [
    buildSearchIntent("Office chair with lumbar support under ₦250,000", "highest_rating"),
    buildSearchIntent("Portable blender", "balanced"),
  ];
}

export function getSeedOrder(searchId: string): {
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
  timeline: Array<{ title: string; detail: string; state: "done" | "active" | "pending" }>;
} {
  const createdAt = new Date("2026-03-21T10:15:00+01:00").toISOString();
  const deliveredOffer = offers[0] || {
    id: "seed-offer",
    productKey: "custom",
    merchant: "Jumia",
    price: 33500,
    shippingCost: 2500,
  };

  return {
    id: "CP-20392",
    searchId,
    offerId: deliveredOffer.id,
    productKey: deliveredOffer.productKey,
    statusLabel: "Delivered",
    statusTone: "complete",
    createdAt,
    etaLabel: "Delivered on March 21",
    address: "14 Admiralty Way, Lekki Phase 1",
    city: "Lagos",
    orderNote: "Leave with front desk if unavailable.",
    platformFee: 2500,
    total: deliveredOffer.price + deliveredOffer.shippingCost + 2500,
    timeline: [
      { title: "Payment received", detail: "March 21, 10:15 AM", state: "done" },
      { title: "Awaiting admin purchase", detail: "Assigned to CartPilot Ops", state: "done" },
      { title: "Ordering on merchant site", detail: "Merchant checkout completed successfully", state: "done" },
      { title: "Merchant shipment", detail: "Package dispatched and carrier handoff confirmed", state: "done" },
      { title: "Delivered", detail: "Completed successfully on March 21", state: "done" },
    ],
  };
}

export function createOrderId(orderCount: number): string {
  return `CP-${20400 + orderCount + 1}`;
}

export function calculatePlatformFee(totalCost: number): number {
  return Math.max(3900, Math.round(totalCost * 0.014));
}

export function getProductEntry(productKey: ProductKey): ProductCatalogEntry {
  return productCatalog[productKey] ?? productCatalog.custom;
}
