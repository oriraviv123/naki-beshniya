/**
 * /app/api/sumit/charge/route.js  (Next.js App Router)
 *
 * משתני סביבה נדרשים ב-.env.local:
 *   SUMIT_COMPANY_ID=...
 *   SUMIT_API_KEY=...       ← מפתח API פרטי מסאמיט (לא Public)
 *
 * גוף הבקשה (JSON):
 *   token       {string}  - og-token שהגיע מהטופס
 *   amount      {number}  - סכום בש"ח
 *   description {string}  - תיאור העסקה
 */

import { NextResponse } from 'next/server';

const SUMIT_API_BASE = 'https://api.sumit.co.il';

export async function POST(request) {
  try {
    const { token, amount, description } = await request.json();

    // ולידציה בסיסית
    if (!token)  return NextResponse.json({ error: 'חסר og-token' }, { status: 400 });
    if (!amount) return NextResponse.json({ error: 'חסר סכום' },    { status: 400 });

    const companyId = process.env.SUMIT_COMPANY_ID;
    const apiKey    = process.env.SUMIT_API_KEY;

    if (!companyId || !apiKey) {
      console.error('חסרים משתני סביבה: SUMIT_COMPANY_ID / SUMIT_API_KEY');
      return NextResponse.json({ error: 'תצורת שרת שגויה' }, { status: 500 });
    }

    // ─── קריאה ל-Sumit Charge API ───────────────────────────────────────
    // תיעוד מלא: https://app.sumit.co.il/developers/api/
    const sumitRes = await fetch(
      `${SUMIT_API_BASE}/creditcardpayments/charge/?id=${companyId}&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SingleUseToken: token,
          Amount:         Number(amount),
          Description:    description || 'רכישה באתר',
          // שדות נוספים אפשריים (הוסף לפי הצורך):
          // Currency: 'ILS',
          // CustomerName: '...',
          // CustomerEmail: '...',
          // Installments: 1,
        }),
      }
    );

    const sumitData = await sumitRes.json();

    // סאמיט מחזיר status: 0 להצלחה
    if (sumitData?.Status !== 0) {
      const errorMsg =
        sumitData?.UserErrorMessage ||
        sumitData?.ErrorMessage ||
        'החיוב נכשל. נסה שנית.';
      return NextResponse.json({ error: errorMsg }, { status: 402 });
    }

    // ─── הצלחה ─────────────────────────────────────────────────────────
    return NextResponse.json({
      success:       true,
      transactionId: sumitData?.ReturnValue || sumitData?.TransactionID,
    });

  } catch (err) {
    console.error('[sumit/charge]', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
