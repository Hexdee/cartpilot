import Link from 'next/link';
import { AppShell } from '@/components/app-shell';

export default function HomePage() {
  return (
    <AppShell>
      <main className='page home-page'>
        <section className='hero-panel home-hero'>
          <h1>
            WhatsApp and Telegram first, with a richer web workspace when you need more detail.
          </h1>
          <p className='lead'>
            CartPilot turns a chat message into ranked offers across supported
            stores, pushes a signed web link when you want full comparison or
            checkout, and keeps the order journey visible after payment.
          </p>

          <div className='hero-actions'>
            <Link className='button button-primary' href='/assistant'>
              Open assistant workspace
            </Link>
            <Link className='button button-ghost' href='/profile'>
              Preview profile hub
            </Link>
          </div>

          <div className='metrics-grid'>
            <article className='metric-card'>
              <strong>Chat-first</strong>
              <span>
                Natural-language shopping through WhatsApp, Telegram, and the web assistant.
              </span>
            </article>
            <article className='metric-card'>
              <strong>Cross-store</strong>
              <span>
                Compare supported merchants with normalized pricing and ETA.
              </span>
            </article>
            <article className='metric-card'>
              <strong>Tracked</strong>
              <span>
                Bot and web updates stay in sync from payment through delivery.
              </span>
            </article>
          </div>
        </section>

        <section className='home-grid'>
          <article className='glass-card home-highlight'>
            <div className='section-heading'>
              <h2>What the product does</h2>
              <p>
                The first implementation pass includes a bot-first backend and a
                companion web app.
              </p>
            </div>
            <div className='journey-grid'>
              <div className='journey-step'>
                <span className='journey-count'>01</span>
                <strong>Describe the product</strong>
                <p>
                  Send a request in WhatsApp, Telegram, or the web assistant with
                  budget, brand, and delivery preferences.
                </p>
              </div>
              <div className='journey-step'>
                <span className='journey-count'>02</span>
                <strong>Review ranked offers</strong>
                <p>
                  Open the deep-linked results page and switch between fastest
                  delivery, best deal, best rating, or balanced ranking.
                </p>
              </div>
              <div className='journey-step'>
                <span className='journey-count'>03</span>
                <strong>Checkout once</strong>
                <p>
                  Pay on the hosted web flow with merchant source, shipping,
                  platform fee, and final landed total visible before
                  confirmation.
                </p>
              </div>
              <div className='journey-step'>
                <span className='journey-count'>04</span>
                <strong>Track the order</strong>
                <p>
                  Stay inside CartPilot AI while the platform handles the
                  merchant-side purchase flow.
                </p>
              </div>
            </div>
          </article>

          <article className='glass-card home-highlight'>
            <div className='section-heading'>
              <h2>Supported stores</h2>
              <p>
                Jumia and Konga are live in the backend-ready MVP. Other stores
                remain design-only references.
              </p>
            </div>
            <div className='store-strip'>
              <span>Jumia</span>
              <span>Konga</span>
              <span>Amazon</span>
              <span>Best Buy</span>
            </div>
            <div className='mini-stat-grid'>
              <article className='metric-card compact-card'>
                <strong>Transparent totals</strong>
                <span>
                  Every quote shows item price, shipping, and the platform fee
                  before confirmation.
                </span>
              </article>
              <article className='metric-card compact-card'>
                <strong>Human-backed ops</strong>
                <span>
                  The admin flow is still manual later in the product, but the
                  frontend keeps the user informed throughout.
                </span>
              </article>
            </div>
          </article>

          <article className='glass-card home-highlight'>
            <div className='section-heading'>
              <h2>Trust signals</h2>
            </div>
            <ul className='stack-list'>
              <li>Merchant badges and source visibility on every offer.</li>
              <li>
                Delivery ETA stays visible during comparison and tracking.
              </li>
              <li>
                Saved profile, payment, and theme preferences persist locally in
                the app.
              </li>
              <li>
                The theme system now includes a proper neutral light mode.
              </li>
            </ul>
          </article>
        </section>
      </main>
    </AppShell>
  );
}
