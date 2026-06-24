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

// קטלוג תצוגה — תואם למחירים בצד-השרת (route.js). כל מה שמוצג נגזר מ-qty בלבד,
// כך שאי אפשר לזייף מחיר/תיאור דרך פרמטרים ב-URL, והסכום המוצג תמיד שווה לחיוב בפועל.
const CATALOG = {
  1: { price: 99,  old: 179, desc: 'כפפה אחת' },
  2: { price: 178, old: 358, desc: 'זוג כפפות' },
  3: { price: 237, old: 537, desc: 'שלישיית כפפות' },
};
const DEFAULT = { qty: 1, ...CATALOG[1] };

// עלות משלוח — חייב להיות זהה לצד-השרת (route.js). ברירת מחדל: איסוף עצמי (חינם).
const SHIPPING = { pickup: 0, delivery: 10 };

export default function CheckoutPage() {
  const [order, setOrder] = useState(DEFAULT);
  const [ready, setReady] = useState(false);
  const [shipping, setShipping] = useState('pickup'); // ברירת מחדל: נקודת איסוף (חינם)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const q = Number(p.get('qty'));
    const item = CATALOG[q];
    const qty = item ? q : 1;
    const { price, old, desc } = item || CATALOG[1];
    setOrder({ qty, price, old, desc });
    setReady(true);
  }, []);

  const handleSuccess = (transactionId, chargedAmount) => {
    const amt = chargedAmount != null ? chargedAmount : order.price;
    const url = `/thank-you?tx=${encodeURIComponent(transactionId || '')}&amount=${encodeURIComponent(amt)}`;
    setTimeout(() => {
      window.location.href = url;
    }, 1200);
  };

  const fmt = (n) => '₪' + Number(n).toLocaleString('he-IL');
  const savings = order.old && order.old > order.price ? order.old - order.price : 0;
  const shippingCost = SHIPPING[shipping] || 0;
  const total = order.price + shippingCost;

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
            <img src="/assets/logo.png" alt="נקי בשנייה" width="32" height="32" />
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
              <small>{order.qty} {order.qty > 1 ? 'יחידות' : 'יחידה'}</small>
            </div>
            <div className="co-item-price">{fmt(order.price)}</div>
          </div>

          {/* ───── בחירת אופן משלוח ───── */}
          <div className="co-ship">
            <div className="co-ship-title">אופן קבלת ההזמנה</div>

            <label className={'co-ship-opt' + (shipping === 'pickup' ? ' is-active' : '')}>
              <input
                type="radio"
                name="shipping"
                value="pickup"
                checked={shipping === 'pickup'}
                onChange={() => setShipping('pickup')}
              />
              <span className="co-ship-radio" aria-hidden="true" />
              <span className="co-ship-txt">
                <b>איסוף מנקודת איסוף</b>
                <small>איסוף מנקודת האיסוף הקרובה אליכם</small>
              </span>
              <span className="co-ship-price co-free">חינם</span>
            </label>

            <label className={'co-ship-opt' + (shipping === 'delivery' ? ' is-active' : '')}>
              <input
                type="radio"
                name="shipping"
                value="delivery"
                checked={shipping === 'delivery'}
                onChange={() => setShipping('delivery')}
              />
              <span className="co-ship-radio" aria-hidden="true" />
              <span className="co-ship-txt">
                <b>משלוח עד הבית</b>
                <small>משלוח עד לכתובת שלכם</small>
              </span>
              <span className="co-ship-price">+{fmt(SHIPPING.delivery)}</span>
            </label>
          </div>

          <div className="co-lines">
            <div className="co-line"><span>סכום ביניים</span><span>{order.old ? fmt(order.old) : fmt(order.price)}</span></div>
            {savings > 0 && (
              <div className="co-line co-line--save"><span>הנחת מבצע ההשקה</span><span>−{fmt(savings)}</span></div>
            )}
            <div className="co-line">
              <span>משלוח</span>
              {shippingCost > 0
                ? <span>+{fmt(shippingCost)}</span>
                : <span className="co-free">חינם</span>}
            </div>
          </div>

          <div className="co-total">
            <span>סה״כ לתשלום</span>
            <span className="co-total-num">{ready ? fmt(total) : '—'}</span>
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
            amount={total}
            quantity={order.qty}
            shipping={shipping}
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
    width: 76px; height: 76px; border-radius: 18px; overflow: hidden;
    display: grid; place-items: center;
  }
  .co-mark img { width: 100%; height: 100%; object-fit: cover; border-radius: 18px; display: block; }

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

  .co-ship { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
  .co-ship-title { font-size: 13.5px; font-weight: 800; color: var(--ink); margin-bottom: 2px; }
  .co-ship-opt {
    display: flex; align-items: center; gap: 12px;
    background: #141416; border: 1.5px solid var(--line);
    border-radius: 14px; padding: 14px 16px; cursor: pointer;
    transition: border-color .18s, background .18s;
  }
  .co-ship-opt:hover { border-color: rgba(255,210,59,.5); }
  .co-ship-opt.is-active { border-color: var(--yellow); background: rgba(255,210,59,.06); }
  .co-ship-opt input { position: absolute; opacity: 0; pointer-events: none; }
  .co-ship-radio {
    flex: 0 0 auto; width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid var(--line); display: grid; place-items: center;
    transition: border-color .18s;
  }
  .co-ship-opt.is-active .co-ship-radio { border-color: var(--yellow); }
  .co-ship-opt.is-active .co-ship-radio::after {
    content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--yellow);
  }
  .co-ship-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .co-ship-txt b { font-size: 15px; font-weight: 800; }
  .co-ship-txt small { color: var(--muted); font-size: 13px; }
  .co-ship-price { font-size: 15px; font-weight: 800; flex: 0 0 auto; }

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
