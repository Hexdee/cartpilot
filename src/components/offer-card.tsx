import Link from "next/link";
import { RankedOffer, RankingMode } from "@/lib/types";
import { formatCurrency, rankingConfig } from "@/lib/catalog";

interface OfferCardProps {
  offer: RankedOffer;
  rankingMode: RankingMode;
  featured?: boolean;
  onSelect: (offerId: string) => void;
}

export function OfferCard({ offer, rankingMode, featured = false, onSelect }: OfferCardProps) {
  return (
    <article className={`offer-card${featured ? " featured-offer" : ""}`}>
      {featured ? <div className="offer-badge">{rankingConfig[rankingMode].badge}</div> : null}
      <div className="offer-topline">
        <div>
          <p className="merchant-name">{offer.merchant}</p>
          <h2>{offer.title}</h2>
        </div>
        <span className="rating-pill">{offer.rating.toFixed(1)} ★</span>
      </div>

      {featured ? (
        <div className="offer-grid">
          <div className="offer-visual">
            <div className="product-orb"></div>
          </div>
          <div className="offer-specs">
            <div className="price-row">
              <strong>{formatCurrency(offer.price)}</strong>
              <span>Item price</span>
            </div>
            <div className="spec-list">
              <span>Total with shipping: {formatCurrency(offer.totalCost)}</span>
              <span>ETA: {offer.etaLabel}</span>
              <span>Source: {offer.officialStore ? `${offer.merchant} official store` : `${offer.merchant} marketplace seller`}</span>
              <span>Availability: {offer.availability}</span>
            </div>
            <div className="cta-row">
              <button className="button button-primary" type="button" onClick={() => onSelect(offer.id)}>
                Choose this offer
              </button>
              <Link className="button button-ghost" href={offer.sourceUrl} target="_blank" rel="noreferrer">
                Open source link
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="offer-meta">
            <span>{formatCurrency(offer.price)} item price</span>
            <span>{formatCurrency(offer.totalCost)} total cost</span>
            <span>ETA: {offer.etaLabel}</span>
          </div>
          <p className="offer-copy">{offer.summary}</p>
          <div className="cta-row">
            <button className="button button-secondary" type="button" onClick={() => onSelect(offer.id)}>
              Select
            </button>
            <Link className="button button-ghost" href={offer.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </Link>
          </div>
        </>
      )}
    </article>
  );
}
