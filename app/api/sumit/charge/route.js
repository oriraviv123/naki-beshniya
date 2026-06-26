/**
 * /app/api/sumit/charge/route.js  (Next.js App Router)
 *
 * מבצע חיוב מול SUMIT באמצעות טוקן חד-פעמי (SingleUseToken) שמגיע מהטופס.
 *
 * משתני סביבה נדרשים (Vercel / .env.local):
 *   SUMIT_COMPANY_ID=...     ← מזהה החברה בסאמיט
 *   SUMIT_API_KEY=...        ← מפתח API פרטי (לא Public!)
 *
 * אבטחה:
 *   • המחיר נקבע בצד-השרת בלבד (CATALOG) — הלקוח לא יכול לקבוע סכום.
 *   • בדיקת Origin (אנטי-CSRF), הגבלת קצב, ולידציית קלט.
 *   • הודעות שגיאה טכניות לא נחשפות ללקוח.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SUMIT_CHARGE_URL = 'https://api.sumit.co.il/billing/payments/charge/';

// ─── מקור האמת היחיד למחירים (צד-שרת) ────────────────────────────────
// הלקוח שולח רק qty; המחיר והתיאור נקבעים כאן ולא ניתנים לזיוף מהדפדפן.
const CATALOG = {
  1: { price: 99,  name: 'נקי בשנייה — כפפה אחת' },
  2: { price: 178, name: 'נקי בשנייה — זוג כפפות' },
  3: { price: 237, name: 'נקי בשנייה — שלישיית כפפות' },
};

// ─── עלות משלוח (צד-שרת בלבד) ─────────────────────────────────────────
// הלקוח שולח רק את שם השיטה; הסכום נקבע כאן ולא ניתן לזיוף מהדפדפן.
// משלוח חינם עד הבית לכולם — ללא תוספת תשלום.
const SHIPPING = { pickup: 0, delivery: 0 };

// ─── הגבלת קצב בסיסית (defense-in-depth) ─────────────────────────────
// הערה: בענן serverless הזיכרון הוא per-instance. לפרודקשן אמיתי מומלץ
// Upstash Redis / Vercel WAF. זה חוסם ניצול סקריפטי טריוויאלי.
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

    // ── 5) משתני סביבה ──
    const companyId = process.env.SUMIT_COMPANY_ID;
    const apiKey    = process.env.SUMIT_API_KEY;
    if (!companyId || !apiKey) {
      console.error('Missing env: SUMIT_COMPANY_ID / SUMIT_API_KEY');
      return NextResponse.json({ error: 'תצורת שרת שגויה' }, { status: 500 });
    }

    // ── 6) ניקוי וסניטציה של פרטי הלקוח ──
    const c = customer || {};
    const customerEmail = clean(c.email, 160);
    const emailValid = EMAIL_RE.test(customerEmail);

    // ── 7) קריאה ל-SUMIT Charge API ──
    const sumitRes = await fetch(SUMIT_CHARGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Language': 'he' },
      body: JSON.stringify({
        Credentials: { CompanyID: Number(companyId), APIKey: apiKey },
        Customer: {
          Name: clean(c.fullName, 120) || 'לקוח נקי בשנייה',
          EmailAddress: emailValid ? customerEmail : null,
          Phone: clean(c.phone, 40) || null,
          Address: clean(c.address, 160) || null,
          City: clean(c.city, 80) || null,
          ZipCode: clean(c.zip, 20) || null,
          SearchMode: 0,
        },
        Items: [
          { Item: { Name: itemName }, Quantity: 1, UnitPrice: productPrice },
          ...(shippingCost > 0
            ? [{ Item: { Name: 'משלוח עד הבית' }, Quantity: 1, UnitPrice: shippingCost }]
            : []),
        ],
        SingleUseToken: token,
        VATIncluded: true,
        SendDocumentByEmail: emailValid,
        SendCopyToOrganization: true,
      }),
    });

    const raw = await sumitRes.text();
    let sumitData;
    try { sumitData = JSON.parse(raw); } catch {
      console.error('[sumit/charge] non-JSON response:', sumitRes.status, raw.slice(0, 300));
      return NextResponse.json({ error: 'שגיאה זמנית בשירות הסליקה. נסה שוב.' }, { status: 502 });
    }

    // ─────────────────────────────────────────────────────────────────
    //  אימות קשוח של תוצאת הסליקה — אסור "הצלחה משתמעת".
    //  שלוש בדיקות *מצטברות*; כשלון של אחת = דחייה והישארות בדף התשלום.
    // ─────────────────────────────────────────────────────────────────
    const data = sumitData?.Data || {};

    // (1) Status רשמי של סאמיט חייב להיות הצלחה (0 / "Success").
    const statusOk =
      sumitData?.Status === 0 ||
      sumitData?.Status === 'Success' ||
      String(sumitData?.Status).startsWith('Success');

    // (2) חייבת להיות רשומת *תשלום* אמיתית (Payment.ID) — לא מספר מסמך!
    //     זו הייתה התקלה הקודמת: סאמיט מנפיקה DocumentNumber/DocumentID
    //     גם כשהכרטיס לא אושר בפועל (מסמך לא-משולם). לכן מספר מסמך אינו
    //     הוכחה לחיוב. רק Payment.ID מעיד על עסקה שאושרה ע"י חברת האשראי.
    const payment =
      data?.Payment ||
      (Array.isArray(data?.Payments) ? data.Payments[0] : null) ||
      null;
    const paymentId = payment?.ID ?? data?.PaymentID ?? null;

    // (3) אם סאמיט מחזירה שדה תקפות תשלום — הוא לא יכול להיות false.
    const paymentValid = payment ? payment.ValidPayment !== false : false;

    const charged = statusOk && Boolean(paymentId) && paymentValid;

    if (!charged) {
      // לוג מפורט לאבחון (נשאר בשרת בלבד) — חושף את המבנה האמיתי של התשובה.
      console.error('[sumit/charge] NOT CHARGED — refusing success', JSON.stringify({
        status: sumitData?.Status,
        userMsg: sumitData?.UserErrorMessage,
        technical: sumitData?.TechnicalErrorDetails,
        statusOk,
        hasPayment: Boolean(payment),
        paymentId,
        validPayment: payment?.ValidPayment,
        documentId: data?.DocumentID ?? data?.DocumentNumber ?? null,
        dataKeys: Object.keys(data || {}),
      }));

      const userMsg =
        sumitData?.UserErrorMessage ||
        'העסקה נדחתה על ידי חברת האשראי. אנא בדוק את פרטי הכרטיס ונסה שנית.';
      return NextResponse.json({ error: userMsg }, { status: 402 });
    }

    return NextResponse.json({
      success: true,
      amount,
      transactionId: paymentId,
    });

  } catch (err) {
    console.error('[sumit/charge]', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
