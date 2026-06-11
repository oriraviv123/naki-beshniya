/**
 * LegalLayout — מעטפת משותפת לעמודים המשפטיים (RTL, תואם מותג "נקי בשנייה").
 * שרת-קומפוננטה (ללא JS בצד לקוח) — קריא, נגיש ו-SEO-friendly.
 */

const LEGAL_LINKS = [
  { href: '/terms', label: 'תקנון ותנאי שימוש' },
  { href: '/shipping', label: 'מדיניות משלוחים' },
  { href: '/returns', label: 'ביטולים והחזרות' },
  { href: '/privacy', label: 'מדיניות פרטיות' },
];

export default function LegalLayout({ title, subtitle, current, children }) {
  return (
    <main className="lg">
      <style>{css}</style>

      <header className="lg-top">
        <a href="/" className="lg-back" aria-label="חזרה לאתר">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
          חזרה לאתר
        </a>
        <a href="/" className="lg-brand">
          <span className="lg-mark">
            <img src="/assets/logo.png" alt="נקי בשנייה" width="34" height="34" />
          </span>
          נקי בשנייה
        </a>
      </header>

      <article className="lg-doc" dir="rtl">
        <h1>{title}</h1>
        {subtitle && <p className="lg-sub">{subtitle}</p>}
        {children}
      </article>

      <nav className="lg-links" aria-label="מסמכים משפטיים">
        {LEGAL_LINKS.map((l) => (
          <a key={l.href} href={l.href} className={current === l.href ? 'on' : ''}>
            {l.label}
          </a>
        ))}
      </nav>

      <footer className="lg-foot">
        <span>© 2026 נקי בשנייה · כל הזכויות שמורות</span>
        <a href="/">חזרה לדף הבית</a>
      </footer>
    </main>
  );
}

const css = `
  .lg { max-width: 840px; margin: 0 auto; padding: 0 22px 90px; }

  .lg-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 22px 0 24px; border-bottom: 1px solid var(--line); margin-bottom: 44px;
  }
  .lg-back {
    display: inline-flex; align-items: center; gap: 6px;
    color: var(--muted); font-size: 15px; font-weight: 600; transition: color .2s;
  }
  .lg-back:hover { color: var(--ink); }
  .lg-brand { display: inline-flex; align-items: center; gap: 9px; font-weight: 900; font-size: 18px; letter-spacing: -.02em; }
  .lg-mark { width: 38px; height: 38px; border-radius: 11px; overflow: hidden; display: grid; place-items: center; }
  .lg-mark img { width: 100%; height: 100%; object-fit: cover; border-radius: 11px; display: block; }

  .lg-doc h1 {
    font-family: var(--font-serif); font-weight: 900;
    font-size: clamp(30px, 5vw, 48px); line-height: 1.1; letter-spacing: -.02em;
    margin-bottom: 10px;
  }
  .lg-sub { color: var(--muted); font-size: 16px; margin-bottom: 34px; }

  .lg-doc h2 {
    font-size: 21px; font-weight: 800; color: var(--ink);
    margin: 40px 0 14px; padding-top: 26px; border-top: 1px solid var(--line);
    letter-spacing: -.01em;
  }
  .lg-doc h2:first-of-type { border-top: 0; padding-top: 0; margin-top: 12px; }
  .lg-doc h3 { font-size: 16.5px; font-weight: 800; color: var(--ink); margin: 22px 0 8px; }

  .lg-doc p { color: #d9d4c9; font-size: 16.5px; line-height: 1.9; margin: 0 0 14px; }
  .lg-doc ul { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .lg-doc li {
    color: #d9d4c9; font-size: 16.5px; line-height: 1.85;
    padding: 12px 16px 12px 14px; background: #141416;
    border: 1px solid var(--line); border-radius: 12px;
    border-right: 3px solid var(--yellow);
  }
  .lg-doc li b, .lg-doc p b { color: var(--ink); font-weight: 800; }
  .lg-doc a { color: var(--yellow); font-weight: 700; word-break: break-word; }
  .lg-doc a:hover { text-decoration: underline; }
  .lg-note {
    margin-top: 30px; padding: 16px 18px; border-radius: 12px;
    background: rgba(255,210,59,.07); border: 1px solid rgba(255,210,59,.22);
    color: var(--muted); font-size: 14.5px; line-height: 1.7;
  }

  .lg-links {
    display: flex; flex-wrap: wrap; gap: 10px;
    margin-top: 56px; padding-top: 26px; border-top: 1px solid var(--line);
  }
  .lg-links a {
    font-size: 14px; font-weight: 700; color: var(--muted);
    padding: 9px 16px; border: 1px solid var(--line-2); border-radius: 999px;
    transition: color .2s, border-color .2s, background .2s;
  }
  .lg-links a:hover { color: var(--ink); border-color: var(--ink); }
  .lg-links a.on { background: var(--yellow); color: #0c0c0e; border-color: var(--yellow); }

  .lg-foot {
    display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between;
    margin-top: 40px; color: var(--faint); font-size: 13.5px;
  }
  .lg-foot a { color: var(--muted); font-weight: 600; }
  .lg-foot a:hover { color: var(--yellow); }

  @media (max-width: 600px) {
    .lg-doc h1 { font-size: 28px; }
    .lg-doc p, .lg-doc li { font-size: 16px; }
  }
`;
