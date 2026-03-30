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
  sony_wh1000xm5: {
    key: "sony_wh1000xm5",
    displayName: "Sony WH-1000XM5 headphones",
    shortName: "Sony WH-1000XM5",
    aliases: ["sony wh-1000xm5", "sony xm5", "xm5", "noise-cancelling headphones", "headphones"],
    followUp: "Would you like me to prioritize official stores only, or include trusted third-party sellers if they are cheaper?",
    relatedSuggestions: [
      {
        key: "headphone_case",
        title: "Headphone case",
        subtitle: "Best-rated accessories with next-day delivery",
        prompt: "Find a protective headphone case with next-day delivery",
      },
      {
        key: "bluetooth_transmitter",
        title: "Bluetooth transmitter",
        subtitle: "Lowest total cost across supported stores",
        prompt: "Compare bluetooth transmitters by lowest total cost",
      },
    ],
  },
  ipad_10th_gen: {
    key: "ipad_10th_gen",
    displayName: "Apple iPad 10th generation",
    shortName: "iPad 10th Gen",
    aliases: ["ipad 10th gen", "ipad 10th generation", "apple ipad"],
    followUp: "Should I prioritize official Apple-authorized sellers, or the cheapest reputable merchant overall?",
    relatedSuggestions: [],
  },
  air_fryer: {
    key: "air_fryer",
    displayName: "Digital air fryer",
    shortName: "Air Fryer",
    aliases: ["air fryer", "airfryer"],
    followUp: "Do you want me to emphasize customer ratings, warranty coverage, or the lowest all-in price?",
    relatedSuggestions: [],
  },
  running_shoes: {
    key: "running_shoes",
    displayName: "Running shoes",
    shortName: "Running Shoes",
    aliases: ["running shoes", "sneakers", "trainers"],
    followUp: "Should I keep the shortlist to neutral colors only, or include bright performance variants if they fit the budget?",
    relatedSuggestions: [],
  },
  office_chair: {
    key: "office_chair",
    displayName: "Office chair with lumbar support",
    shortName: "Office Chair",
    aliases: ["office chair", "lumbar support chair", "desk chair"],
    followUp: "Do you want ergonomic features weighted above delivery speed, or should I optimize for the best price within the budget?",
    relatedSuggestions: [],
  },
  ps5_controller: {
    key: "ps5_controller",
    displayName: "PS5 wireless controller",
    shortName: "PS5 Controller",
    aliases: ["ps5 controller", "dualsense", "playstation controller"],
    followUp: "Should I include color variants, or keep the shortlist to the standard white controller only?",
    relatedSuggestions: [],
  },
  portable_blender: {
    key: "portable_blender",
    displayName: "Portable blender",
    shortName: "Portable Blender",
    aliases: ["portable blender", "travel blender"],
    followUp: "Do you care more about battery life, cup capacity, or getting the lowest delivered price?",
    relatedSuggestions: [],
  },
  headphone_case: {
    key: "headphone_case",
    displayName: "Protective headphone case",
    shortName: "Headphone Case",
    aliases: ["headphone case", "headset case"],
    followUp: "Do you want a slim travel case or a heavier shell with extra cable storage?",
    relatedSuggestions: [],
  },
  bluetooth_transmitter: {
    key: "bluetooth_transmitter",
    displayName: "Bluetooth transmitter",
    shortName: "Bluetooth Transmitter",
    aliases: ["bluetooth transmitter", "wireless transmitter"],
    followUp: "Should I prioritize low latency for media use, or the cheapest option that still ships quickly?",
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

const offers: MerchantOffer[] = [
  {
    id: "sony-jumia",
    productKey: "sony_wh1000xm5",
    merchant: "Jumia",
    title: "Sony WH-1000XM5 Wireless Noise-Cancelling Headphones",
    summary: "Fastest local delivery slot with an official merchant listing and strong customer confidence.",
    price: 648000,
    shippingCost: 15500,
    rating: 4.8,
    etaHours: 6,
    etaLabel: "Today, 4:10 PM",
    availability: "In stock",
    sourceUrl: "https://www.jumia.com.ng/",
    officialStore: true,
    color: "black",
  },
  {
    id: "sony-konga",
    productKey: "sony_wh1000xm5",
    merchant: "Konga",
    title: "Sony WH-1000XM5 Bluetooth Headphones - Black",
    summary: "Slightly cheaper total than Jumia, but a later delivery window and lower seller confidence.",
    price: 639900,
    shippingCost: 22000,
    rating: 4.7,
    etaHours: 6.2,
    etaLabel: "Today, 4:22 PM",
    availability: "In stock",
    sourceUrl: "https://www.konga.com/",
    officialStore: false,
    color: "black",
  },
  {
    id: "sony-amazon",
    productKey: "sony_wh1000xm5",
    merchant: "Amazon",
    title: "Sony WH-1000XM5 Wireless ANC Headphones",
    summary: "Highest rating, but shipping pushes the total higher and delivery lands the next day.",
    price: 629000,
    shippingCost: 60000,
    rating: 4.9,
    etaHours: 24,
    etaLabel: "Tomorrow, 11:00 AM",
    availability: "In stock",
    sourceUrl: "https://www.amazon.com/",
    officialStore: true,
    color: "black",
  },
  {
    id: "ipad-jumia",
    productKey: "ipad_10th_gen",
    merchant: "Jumia",
    title: "Apple iPad 10th Gen 64GB Wi-Fi",
    summary: "Balanced local option with the fastest available delivery among authorized sellers.",
    price: 742000,
    shippingCost: 18000,
    rating: 4.7,
    etaHours: 20,
    etaLabel: "Tomorrow, 2:00 PM",
    availability: "In stock",
    sourceUrl: "https://www.jumia.com.ng/",
    officialStore: true,
  },
  {
    id: "ipad-amazon",
    productKey: "ipad_10th_gen",
    merchant: "Amazon",
    title: "Apple iPad 10th Generation 64GB",
    summary: "Lowest base price, though shipping and import timing make the final delivery slower.",
    price: 701000,
    shippingCost: 45000,
    rating: 4.8,
    etaHours: 48,
    etaLabel: "In 2 days",
    availability: "In stock",
    sourceUrl: "https://www.amazon.com/",
    officialStore: true,
  },
  {
    id: "airfryer-jumia",
    productKey: "air_fryer",
    merchant: "Jumia",
    title: "8L Digital Air Fryer with Touch Control",
    summary: "Strong local rating and fast dispatch with a moderate total cost.",
    price: 119000,
    shippingCost: 6500,
    rating: 4.6,
    etaHours: 10,
    etaLabel: "Today, 6:30 PM",
    availability: "In stock",
    sourceUrl: "https://www.jumia.com.ng/",
    officialStore: false,
  },
  {
    id: "airfryer-konga",
    productKey: "air_fryer",
    merchant: "Konga",
    title: "7L Rapid Air Fryer with 12-Month Warranty",
    summary: "Warranty coverage is strongest here, with a slightly lower rating than the top offer.",
    price: 113000,
    shippingCost: 9000,
    rating: 4.5,
    etaHours: 13,
    etaLabel: "Tomorrow, 10:00 AM",
    availability: "In stock",
    sourceUrl: "https://www.konga.com/",
    officialStore: true,
  },
  {
    id: "shoes-jumia",
    productKey: "running_shoes",
    merchant: "Jumia",
    title: "Lightweight Running Shoes Size 43",
    summary: "Fastest local pair under the target budget, with stock confirmed in size 43.",
    price: 98000,
    shippingCost: 5000,
    rating: 4.4,
    etaHours: 9,
    etaLabel: "Today, 7:00 PM",
    availability: "In stock",
    sourceUrl: "https://www.jumia.com.ng/",
    officialStore: false,
    color: "black",
  },
  {
    id: "shoes-amazon",
    productKey: "running_shoes",
    merchant: "Amazon",
    title: "Neutral Cushion Running Shoes Men Size 43",
    summary: "Best customer rating, but slower shipping than local merchants.",
    price: 92000,
    shippingCost: 18000,
    rating: 4.8,
    etaHours: 36,
    etaLabel: "Tomorrow, 8:00 PM",
    availability: "In stock",
    sourceUrl: "https://www.amazon.com/",
    officialStore: true,
    color: "black",
  },
  {
    id: "chair-jumia",
    productKey: "office_chair",
    merchant: "Jumia",
    title: "Ergonomic Office Chair with Adjustable Lumbar Support",
    summary: "Fastest delivery and the strongest review mix within the target budget.",
    price: 231000,
    shippingCost: 14500,
    rating: 4.7,
    etaHours: 14,
    etaLabel: "Tomorrow, 9:00 AM",
    availability: "In stock",
    sourceUrl: "https://www.jumia.com.ng/",
    officialStore: false,
  },
  {
    id: "chair-konga",
    productKey: "office_chair",
    merchant: "Konga",
    title: "Mesh Office Chair with Headrest and Lumbar Support",
    summary: "Lower total cost, though the delivery ETA slips a few hours behind the top option.",
    price: 224000,
    shippingCost: 12000,
    rating: 4.6,
    etaHours: 18,
    etaLabel: "Tomorrow, 1:00 PM",
    availability: "In stock",
    sourceUrl: "https://www.konga.com/",
    officialStore: true,
  },
  {
    id: "ps5-jumia",
    productKey: "ps5_controller",
    merchant: "Jumia",
    title: "Sony DualSense Wireless Controller for PS5",
    summary: "Fast local dispatch with the most reliable availability today.",
    price: 79000,
    shippingCost: 3500,
    rating: 4.8,
    etaHours: 5,
    etaLabel: "Today, 3:30 PM",
    availability: "In stock",
    sourceUrl: "https://www.jumia.com.ng/",
    officialStore: true,
  },
  {
    id: "ps5-konga",
    productKey: "ps5_controller",
    merchant: "Konga",
    title: "PS5 DualSense Controller Standard White",
    summary: "Cheapest total, but local seller confidence is slightly lower than the featured offer.",
    price: 76000,
    shippingCost: 5000,
    rating: 4.5,
    etaHours: 8,
    etaLabel: "Today, 6:00 PM",
    availability: "In stock",
    sourceUrl: "https://www.konga.com/",
    officialStore: false,
  },
  {
    id: "blender-konga",
    productKey: "portable_blender",
    merchant: "Konga",
    title: "Portable USB Blender Bottle",
    summary: "Portable blending bottle with strong local reviews and a delivered price below target.",
    price: 33500,
    shippingCost: 2500,
    rating: 4.5,
    etaHours: 7,
    etaLabel: "Today, 5:00 PM",
    availability: "In stock",
    sourceUrl: "https://www.konga.com/",
    officialStore: false,
  },
  {
    id: "case-amazon",
    productKey: "headphone_case",
    merchant: "Amazon",
    title: "Hard Travel Case for WH-1000XM5",
    summary: "Protective shell with internal accessory pouch and the highest customer score in this shortlist.",
    price: 28000,
    shippingCost: 6000,
    rating: 4.9,
    etaHours: 26,
    etaLabel: "Tomorrow, 1:00 PM",
    availability: "In stock",
    sourceUrl: "https://www.amazon.com/",
    officialStore: true,
  },
  {
    id: "transmitter-jumia",
    productKey: "bluetooth_transmitter",
    merchant: "Jumia",
    title: "Low-Latency Bluetooth Audio Transmitter",
    summary: "Cheapest local transmitter with same-day dispatch and stable ratings.",
    price: 25500,
    shippingCost: 2200,
    rating: 4.4,
    etaHours: 8,
    etaLabel: "Today, 7:30 PM",
    availability: "In stock",
    sourceUrl: "https://www.jumia.com.ng/",
    officialStore: false,
  },
];

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
  const lower = prompt.toLowerCase();

  for (const entry of Object.values(productCatalog)) {
    if (entry.aliases.some((alias) => lower.includes(alias))) {
      return entry.key;
    }
  }

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
  const deliveredOffer = offers.find((offer) => offer.id === "blender-konga");

  if (!deliveredOffer) {
    throw new Error("Seed order offer is missing.");
  }

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
