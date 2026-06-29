/**
 * /app/api/sumit/charge/route.js  (Next.js App Router)
 *
 * מבצע חיוב מול SUMIT באמצעות טוקן חד-פעמי (SingleUseToken) שמגיע מהטופס.
 * משתמש ב-endpoint הרשמי /creditcardpayments/charge/ (חיוב כרטיס ישיר),
 * בהתאם לתדריך החיבור של סאמיט.
 *
 * משתני סביבה נדרשים (Vercel / .env.local):
 *   SUMIT_COMPANY_ID=...    ← מזהה החברה
 *   SUMIT_PRIVATE_KEY=...   ← מפתח Private/API (סודי – צד שרת בלבד)
 *
 * אבטחה (הקשחות שלנו — נשמרות):
 *   • המחיר נקבע בצד-השרת בלבד (CATALOG) — הלקוח לא יכול לקבוע סכום.
 *   • בדיקת Origin (אנטי-CSRF), הגבלת קצב, ולידציית קלט.
 *   • הצלחה דורשת Status:0 *וגם* מזהה עסקה אמיתי — אין "הצלחה משתמעת".
 *   • הודעות שגיאה טכניות לא נחשפות ללקוח.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SUMIT_API_BASE = 'https://api.sumit.co.il';

// ─── מקור האמת היחיד למחירים (צד-שרת) ────────────────────────────────
// הלקוח שולח רק qty; המחיר והתיאור נקבעים כאן ולא ניתנים לזיוף מהדפדפן.
const CATALOG = {
  1: { price: 99,  name: 'נקי בשנייה — כפפה אחת' },
  2: { price: 178, name: 'נקי בשנייה — זוג כפפות' },
  3: { price: 237, name: 'נקי בשנייה — שלישיית כפפות' },
};

// ─── עלות משלוח (צד-שרת בלבד) ─────────────────────────────────────────
// משלוח חינם עד הבית לכולם — ללא תוספת תשלום.
const SHIPPING = { pickup: 0, delivery: 0 };

// ─── הגבלת קצב בסיסית (defense-in-depth) ─────────────────────────────
const RL = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const WINDOW = 60_000; // דקה
  const MAX = 8;         // עד 8 ניסיונות חיוב לדקה לכל IP
  const e = RL.get(ip);
  if (!e || now - e.ts > WINDOW) {
    RL.set(ip, { count: 1, ts: now });
    return false;
  }
  e.count += 1;
  return e.count > MAX;
}

// מסיר תווי בקרה/שורות חדשות (הגנה מפני CRLF/header injection) ומגביל אורך
const CTRL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');
function clean(v, max = 120) {
  return String(v ?? '').replace(CTRL_CHARS, '').trim().slice(0, max);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// מחזיר את הערך הראשון הלא-ריק מבין שמות המשתנים שניתנו (סבלני לשמות ישנים/חדשים)
function pickEnv(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return '';
}

export async function POST(request) {
  try {
    // ── 1) אנטי-CSRF: דרוש Origin תואם לדומיין עצמו ──
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const extra = (process.env.ALLOWED_ORIGINS || '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    if (origin) {
      let originHost = '';
      try { originHost = new URL(origin).host; } catch { originHost = ''; }
      const sameSite = originHost && originHost === host;
      const allowed = extra.some((o) => {
        try { return new URL(o).host === originHost; } catch { return o === origin; }
      });
      if (!sameSite && !allowed) {
        return NextResponse.json({ error: 'מקור הבקשה אינו מורשה' }, { status: 403 });
      }
    }

    // ── 2) הגבלת קצב לפי IP ──
    const ip =
      (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    if (rateLimited(ip)) {
      return NextResponse.json({ error: 'יותר מדי ניסיונות. נסה שוב בעוד דקה.' }, { status: 429 });
    }

    // ── 3) קריאת גוף הבקשה ──
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }
    const { token, qty, shipping, customer } = body || {};

    // ── 4) ולידציה: טוקן + כמות מתוך הקטלוג בלבד ──
    if (!token || typeof token !== 'string' || token.length > 512) {
      return NextResponse.json({ error: 'חסר טוקן אשראי תקין' }, { status: 400 });
    }
    const quantity = Number(qty);
    const product = CATALOG[quantity];
    if (!product) {
      return NextResponse.json({ error: 'בחירת מוצר לא תקינה' }, { status: 400 });
    }
    const productPrice = product.price;   // ← מחיר מהשרת בלבד
    const itemName = product.name;        // ← תיאור מהשרת בלבד

    // אופן משלוח — רק ערך מוכר מתקבל; כל השאר → איסוף עצמי (חינם)
    const shipMethod = shipping === 'delivery' ? 'delivery' : 'pickup';
    const shippingCost = SHIPPING[shipMethod];
    const amount = productPrice + shippingCost;   // ← סכום סופי מהשרת בלבד

    // ── 5) משתני סביבה (סבלני לשמות ישנים/חדשים) ──
    const companyId = pickEnv(
      'SUMIT_COMPANY_ID',
      'COMPANY_ID',
      'NEXT_PUBLIC_SUMIT_COMPANY_ID',
      'NEXT_PUBLIC_COMPANY_ID',
    );
    const privateKey = pickEnv('SUMIT_PRIVATE_KEY', 'SUMIT_API_KEY');
    if (!companyId || !privateKey) {
      const present = Object.keys(process.env)
        .filter((k) => /SUMIT|COMPANY/i.test(k)).sort();
      console.error('[sumit/charge] Missing credentials. Present SUMIT/COMPANY keys:', present);
      return NextResponse.json({ error: 'תצורת שרת שגויה' }, { status: 500 });
    }

    // ── 6) ניקוי וסניטציה של פרטי הלקוח ──
    const c = customer || {};
    const customerName = clean(c.fullName, 120) || 'לקוח נקי בשנייה';
    const customerEmail = clean(c.email, 160);
    const emailValid = EMAIL_RE.test(customerEmail);

    // ── 7) קריאה ל-SUMIT Charge API (endpoint רשמי לחיוב כרטיס) ──
    // תיעוד: https://app.sumit.co.il/developers/api/
    const sumitRes = await fetch(
      `${SUMIT_API_BASE}/creditcardpayments/charge/?id=${encodeURIComponent(companyId)}&key=${encodeURIComponent(privateKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Language': 'he' },
        body: JSON.stringify({
          SingleUseToken: token,
          Amount: amount,
          Description: itemName,
          CustomerName: customerName,
          ...(emailValid ? { CustomerEmail: customerEmail } : {}),
        }),
      }
    );

    const raw = await sumitRes.text();
    let sumitData;
    try { sumitData = JSON.parse(raw); } catch {
      console.error('[sumit/charge] non-JSON response:', sumitRes.status, raw.slice(0, 300));
      return NextResponse.json({ error: 'שגיאה זמנית בשירות הסליקה. נסה שוב.' }, { status: 502 });
    }

    // ─────────────────────────────────────────────────────────────────
    //  אימות קשוח של תוצאת הסליקה — אסור "הצלחה משתמעת".
    //  שתי בדיקות *מצטברות*: Status רשמי + מזהה עסקה אמיתי.
    // ─────────────────────────────────────────────────────────────────

    // (1) Status רשמי של סאמיט חייב להיות הצלחה (0 / "Success").
    const statusOk =
      sumitData?.Status === 0 ||
      sumitData?.Status === 'Success' ||
      String(sumitData?.Status).startsWith('Success');

    // (2) חייב להיות מזהה עסקה אמיתי. אצל endpoint זה המזהה חוזר ב-
    //     ReturnValue / TransactionID (ובמבני תשובה מסוימים תחת Data).
    const data = sumitData?.Data || {};
    const transactionId =
      sumitData?.ReturnValue ??
      sumitData?.TransactionID ??
      data?.ReturnValue ??
      data?.TransactionID ??
      data?.Payment?.ID ??
      null;

    const charged = statusOk && Boolean(transactionId);

    if (!charged) {
      // לוג מפורט לאבחון (נשאר בשרת בלבד) — חושף את המבנה האמיתי של התשובה.
      console.error('[sumit/charge] NOT CHARGED — refusing success', JSON.stringify({
        httpStatus: sumitRes.status,
        status: sumitData?.Status,
        userMsg: sumitData?.UserErrorMessage,
        technical: sumitData?.TechnicalErrorDetails || sumitData?.ErrorMessage,
        statusOk,
        transactionId,
        keys: Object.keys(sumitData || {}),
        dataKeys: Object.keys(data || {}),
      }));

      const userMsg =
        sumitData?.UserErrorMessage ||
        sumitData?.ErrorMessage ||
        'העסקה נדחתה על ידי חברת האשראי. אנא בדוק את פרטי הכרטיס ונסה שנית.';
      return NextResponse.json({ error: userMsg }, { status: 402 });
    }

    return NextResponse.json({
      success: true,
      amount,
      transactionId,
    });

  } catch (err) {
    console.error('[sumit/charge]', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
