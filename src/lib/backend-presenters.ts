import {
  BackendMerchantOffer,
  BackendOrder,
  BackendSearchSession,
  BackendTrackingEvent,
} from "@/lib/api";
import {
  MerchantOffer,
  OrderStatus,
  RankedOffer,
  SearchIntent,
} from "@/lib/types";
import { getProductEntry, rankMerchantOffers } from "@/lib/catalog";

const statusSequence: OrderStatus[] = [
  "pending_payment",
  "paid",
  "awaiting_admin_order",
  "ordered_on_merchant",
  "merchant_processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const terminalStatuses = new Set<OrderStatus>(["delivered", "cancelled", "refunded"]);

export function toSearchIntent(searchSession: BackendSearchSession): SearchIntent {
  return {
    id: searchSession.id,
    query: searchSession.intent.query,
    productKey: searchSession.intent.productKey,
    rankingMode: searchSession.intent.rankingMode,
    budget: searchSession.intent.budget,
    color: searchSession.intent.color,
    createdAt: searchSession.createdAt,
  };
}

function stripBackendOffer(offer: BackendMerchantOffer): MerchantOffer {
  return {
    id: offer.id,
    productKey: offer.productKey,
    merchant: offer.merchant,
    title: offer.title,
    summary: offer.summary,
    price: offer.price,
    shippingCost: offer.shippingCost,
    rating: offer.rating,
    etaHours: offer.etaHours,
    etaLabel: offer.etaLabel,
    availability: offer.availability,
    sourceUrl: offer.sourceUrl,
    officialStore: offer.officialStore,
    color: offer.color,
  };
}

export function getRankedOffers(
  searchSession: BackendSearchSession,
  rankingMode = searchSession.intent.rankingMode,
): RankedOffer[] {
  const intent = {
    ...toSearchIntent(searchSession),
    rankingMode,
  };

  return rankMerchantOffers(
    intent,
    searchSession.offers.map(stripBackendOffer),
  );
}

export function findOffer(
  searchSession: BackendSearchSession,
  offerId: string,
  rankingMode = searchSession.intent.rankingMode,
) {
  return getRankedOffers(searchSession, rankingMode).find((offer) => offer.id === offerId) ?? null;
}

export function getOrderStatusMeta(status: OrderStatus) {
  switch (status) {
    case "paid":
      return { label: "Payment received", tone: "active" as const };
    case "awaiting_admin_order":
      return { label: "Awaiting admin order", tone: "active" as const };
    case "ordered_on_merchant":
      return { label: "Ordered on merchant", tone: "active" as const };
    case "merchant_processing":
      return { label: "Merchant processing", tone: "active" as const };
    case "shipped":
      return { label: "Shipped", tone: "active" as const };
    case "out_for_delivery":
      return { label: "Out for delivery", tone: "active" as const };
    case "delivered":
      return { label: "Delivered", tone: "complete" as const };
    case "issue_reported":
      return { label: "Issue reported", tone: "pending" as const };
    case "cancelled":
      return { label: "Cancelled", tone: "pending" as const };
    case "refunded":
      return { label: "Refunded", tone: "complete" as const };
    case "pending_payment":
    default:
      return { label: "Pending payment", tone: "pending" as const };
  }
}

export function getOrderProgress(status: OrderStatus) {
  if (terminalStatuses.has(status)) {
    return status === "delivered" ? 100 : 100;
  }

  const index = statusSequence.indexOf(status);
  if (index < 0) return 15;

  return Math.max(20, Math.round(((index + 1) / statusSequence.length) * 100));
}

export function toTimeline(trackingEvents: BackendTrackingEvent[], status: OrderStatus) {
  const lastIndex = trackingEvents.length - 1;

  return trackingEvents.map((event, index) => ({
    title: event.title,
    detail: event.detail,
    state:
      index < lastIndex || terminalStatuses.has(status)
        ? ("done" as const)
        : ("active" as const),
  }));
}

export function getProductDetails(searchSession: BackendSearchSession | null, offerId: string) {
  if (!searchSession) return null;
  const offer = findOffer(searchSession, offerId);
  if (!offer) return null;

  return {
    offer,
    product: getProductEntry(offer.productKey),
  };
}

export function buildTrackingSummary(
  order: BackendOrder,
  searchSession: BackendSearchSession | null,
  trackingEvents: BackendTrackingEvent[],
) {
  const status = getOrderStatusMeta(order.status);
  const productDetails = getProductDetails(searchSession, order.offerId);

  return {
    order,
    status,
    progress: getOrderProgress(order.status),
    timeline: toTimeline(trackingEvents, order.status),
    offer: productDetails?.offer ?? null,
    product: productDetails?.product ?? null,
  };
}
