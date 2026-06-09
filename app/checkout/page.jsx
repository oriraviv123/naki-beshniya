'use client';

import { useEffect, useState } from 'react';
import SumitPaymentForm from '@/components/PaymentForm';

/**
 * דף קופה — נקי בשנייה
 * ─────────────────────────────────────────────
 * קורא את פרטי ההזמנה מה-URL שמגיע מכפתורי "הוספה לסל" באתר:
 *   /checkout?qty=3&price=237&old=537&desc=...
 * ומעביר אותם אל SumitPaymentForm (הקובץ המקורי, ללא שינוי).
 */

const DEFAULT = { qty: 1, price: 99, old: 179, desc: 'כפפת נקי בשנייה' };

export default function CheckoutPage() {
  const [order, setOrder] = useState(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const qty = Number(p.get('qty')) || DEFAULT.qty;
    const price = Number(p.get('price')) || DEFAULT.price;
    const old = Number(p.get('old')) || 0;
    const desc = p.get('desc') || DEFAULT.desc;
    setOrder({ qty, price, old, desc });
    setReady(true);
  }, []);

  const handleSuccess = (transactionId) => {
    const url = `/thank-you?tx=${encodeURIComponent(transactionId || '')}&amount=${order.price}`;
    setTimeout(() => {
      window.location.href = url;
    }, 1200);
  };

  const fmt = (n) => '₪' + Number(n).toLocaleString('he-IL');
  const savings = order.old && order.old > order.price ? order.old - order.price : 0;

  return (
    <main className="co">
      <style>{css}</style>

      <header className="co-top">
        <a href="/" className="co-back" aria-label="חזרה לאתר">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
          חזרה
        </a>
        <a href="/" className="co-brand">
          <span className="co-mark">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="6" cy="11" r="2.1" /><circle cx="10" cy="7" r="2.1" />
              <circle cx="14" cy="7" r="2.1" /><circle cx="18" cy="11" r="2.1" />
              <path d="M12 13c-2.6 0-4.7 1.9-5.2 4.2C6.4 19.1 7.8 20.3 9.4 20.3c1 0 1.7-.5 2.6-.5s1.6.5 2.6.5c1.6 0 3-1.2 2.6-3.1C16.7 14.9 14.6 13 12 13z" />
            </svg>
          </span>
          נקי בשנייה
        </a>
      </header>

      <div className="co-grid">
        {/* ───── סיכום הזמנה ───── */}
        <section className="co-summary">
          <h1>סיום הזמנה</h1>
          <p className="co-sub">עוד צעד אחד והפרווה נעלמת מהבית.</p>

          <div className="co-item">
            <div className="co-thumb">
              <img src="/assets/thumb.webp" alt="נקי בשנייה" width="72" height="72" />
              <span className="co-qty">{order.qty}</span>
            </div>
            <div className="co-item-txt">
              <b>{order.desc}</b>
              <small>{order.qty} {order.qty > 1 ? 'יחידות' : 'יחידה'} · משלוח חינם</small>
            </div>
            <div className="co-item-price">{fmt(order.price)}</div>
          </div>

          <div className="co-lines">
            <div className="co-line"><span>סכום ביניים</span><span>{order.old ? fmt(order.old) : fmt(order.price)}</span></div>
            {savings > 0 && (
              <div className="co-line co-line--save"><span>הנחת מבצע ההשקה</span><span>−{fmt(savings)}</span></div>
            )}
            <div className="co-line"><span>משלוח</span><span className="co-free">חינם</span></div>
          </div>

          <div className="co-total">
            <span>סה״כ לתשלום</span>
            <span className="co-total-num">{ready ? fmt(order.price) : '—'}</span>
          </div>

          <ul className="co-trust">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5z" /></svg>
              אחריות 30 יום — לא התאים, מקבלים החזר
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>
              משלוח חינם עד הבית
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
              תשלום מאובטח SSL · סליקת SUMIT
            </li>
          </ul>
        </section>

        {/* ───── טופס תשלום (הקובץ המקורי) ───── */}
        <section className="co-pay">
          <SumitPaymentForm
            amount={order.price}
            description={order.desc}
            onSuccess={handleSuccess}
            onError={(msg) => console.error('שגיאת תשלום:', msg)}
          />
        </section>
      </div>
    </main>
  );
}

const css = `
  .co { max-width: 1040px; margin: 0 auto; padding: 24px 20px 64px; }
  .co-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 0 28px; border-bottom: 1px solid var(--line); margin-bottom: 36px;
  }
  .co-back {
    display: inline-flex; align-items: center; gap: 6px;
    color: var(--muted); font-size: 15px; font-weight: 600;
    transition: color .2s;
  }
  .co-back:hover { color: var(--ink); }
  .co-brand { display: inline-flex; align-items: center; gap: 9px; font-weight: 900; font-size: 19px; letter-spacing: -.02em; }
  .co-mark {
    width: 32px; height: 32px; border-radius: 9px; background: var(--yellow);
    color: #0c0c0e; display: grid; place-items: center;
  }
  .co-mark svg { width: 20px; height: 20px; }

  .co-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 40px; align-items: start; }

  .co-summary h1 { font-size: 30px; font-weight: 900; letter-spacing: -.02em; }
  .co-sub { color: var(--muted); margin: 6px 0 26px; font-size: 15.5px; }

  .co-item {
    display: flex; align-items: center; gap: 14px;
    background: #141416; border: 1px solid var(--line);
    border-radius: 16px; padding: 16px; margin-bottom: 18px;
  }
  .co-thumb { position: relative; flex: 0 0 auto; }
  .co-thumb img { width: 72px; height: 72px; border-radius: 12px; object-fit: cover; background: #0d0d0f; }
  .co-qty {
    position: absolute; top: -8px; left: -8px;
    min-width: 24px; height: 24px; padding: 0 6px;
    background: var(--yellow); color: #0c0c0e; border-radius: 999px;
    font-size: 13px; font-weight: 900; display: grid; place-items: center;
    border: 2px solid var(--bg);
  }
  .co-item-txt { flex: 1; min-width: 0; }
  .co-item-txt b { display: block; font-size: 16px; font-weight: 800; }
  .co-item-txt small { color: var(--muted); font-size: 13.5px; }
  .co-item-price { font-size: 18px; font-weight: 900; font-family: 'Frank Ruhl Libre', Georgia, serif; }

  .co-lines { display: flex; flex-direction: column; gap: 10px; padding: 4px 2px 18px; }
  .co-line { display: flex; justify-content: space-between; font-size: 15px; color: var(--muted); }
  .co-line--save { color: var(--yellow); font-weight: 700; }
  .co-free { color: var(--yellow); font-weight: 700; }

  .co-total {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 18px 2px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    margin-bottom: 22px;
  }
  .co-total > span:first-child { font-size: 16px; font-weight: 700; }
  .co-total-num { font-size: 30px; font-weight: 900; font-family: 'Frank Ruhl Libre', Georgia, serif; color: var(--yellow); }

  .co-trust { list-style: none; display: flex; flex-direction: column; gap: 13px; }
  .co-trust li { display: flex; align-items: center; gap: 11px; font-size: 14px; color: var(--muted); }
  .co-trust svg { width: 20px; height: 20px; color: var(--yellow); flex: 0 0 auto; }

  .co-pay { position: sticky; top: 24px; }

  @media (max-width: 860px) {
    .co-grid { grid-template-columns: 1fr; gap: 30px; }
    .co-pay { position: static; }
    .co-summary h1 { font-size: 26px; }
  }
`;
