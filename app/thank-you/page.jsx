'use client';

import { useEffect, useState } from 'react';

export default function ThankYouPage() {
  const [info, setInfo] = useState({ tx: '', amount: '' });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setInfo({ tx: p.get('tx') || '', amount: p.get('amount') || '' });
  }, []);

  return (
    <main className="ty">
      <style>{css}</style>
      <div className="ty-card">
        <div className="ty-brand">
          <img src="/assets/logo.png" alt="נקי בשנייה" width="44" height="44" />
          <span>נקי בשנייה</span>
        </div>
        <div className="ty-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h1>תודה על ההזמנה!</h1>
        <p>התשלום התקבל בהצלחה{info.amount ? ` · ₪${Number(info.amount).toLocaleString('he-IL')}` : ''}.</p>
        <p className="ty-sub">שלחנו לך אישור במייל. המשלוח יוצא אליך בקרוב.</p>
        {info.tx && <div className="ty-tx">מספר עסקה: <b>{info.tx}</b></div>}
        <a href="/" className="ty-btn">חזרה לאתר</a>
      </div>
    </main>
  );
}

const css = `
  .ty { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
  .ty-card {
    background: #141416; border: 1px solid var(--line); border-radius: 24px;
    padding: 48px 40px; max-width: 460px; width: 100%; text-align: center;
    box-shadow: 0 40px 90px rgba(0,0,0,.5);
  }
  .ty-brand {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    margin-bottom: 26px; font-family: 'Frank Ruhl Libre', Georgia, serif;
    font-weight: 900; font-size: 20px; letter-spacing: -.01em; color: var(--ink);
  }
  .ty-brand img { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; display: block; }
  .ty-check {
    width: 76px; height: 76px; margin: 0 auto 22px; border-radius: 50%;
    background: var(--yellow); color: #0c0c0e; display: grid; place-items: center;
  }
  .ty-check svg { width: 40px; height: 40px; }
  .ty-card h1 { font-size: 28px; font-weight: 900; letter-spacing: -.02em; margin-bottom: 10px; }
  .ty-card p { color: var(--ink); font-size: 16px; }
  .ty-sub { color: var(--muted) !important; font-size: 14.5px !important; margin-top: 6px; }
  .ty-tx {
    margin: 22px 0; padding: 12px; border-radius: 12px;
    background: #0d0d0f; border: 1px solid var(--line); color: var(--muted); font-size: 14px;
  }
  .ty-tx b { color: var(--ink); }
  .ty-btn {
    display: inline-block; margin-top: 18px; padding: 14px 34px;
    background: var(--yellow); color: #0c0c0e; border-radius: 999px;
    font-weight: 800; font-size: 16px; transition: transform .15s;
  }
  .ty-btn:hover { transform: translateY(-2px); }
`;
