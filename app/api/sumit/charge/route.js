/**
 * /app/api/sumit/charge/route.js  (Next.js App Router)
 *
 * מבצע חיוב מול SUMIT באמצעות טוקן חד-פעמי (SingleUseToken) שמגיע מהטופס.
 *
 * משתני סביבה נדרשים (Vercel / .env.local):
 *   SUMIT_COMPANY_ID=...     ← מזהה החברה בסאמיט
 *   SUMIT_API_KEY=...        ← מפתח API פרטי (לא Public!)
 *
 * גוף הבקשה (JSON) מהקליינט:
 *   token       {string}  - og-token / SingleUseToken מהטופס
 *   amount      {number}  - סכום כולל בש"ח
 *   description {string}  - תיאור העסקה
 *
 * פורמט הבקשה תואם ל-Swagger הרשמי:
 *   POST https://api.sumit.co.il/billing/payments/charge/
 *   { Credentials:{CompanyID,APIKey}, Items:[{Item:{Name},Quantity,UnitPrice}],
 *     SingleUseToken, VATIncluded }
 */

import { NextResponse } from 'next/server';

const SUMIT_CHARGE_URL = 'https://api.sumit.co.il/billing/payments/charge/';

export async function POST(request) {
  try {
    const { token, amount, description, customer } = await request.json();

    // ולידציה בסיסית
    if (!token)  return NextResponse.json({ error: 'חסר טוקן אשראי' }, { status: 400 });
    if (!amount) return NextResponse.json({ error: 'חסר סכום' },        { status: 400 });

    const c = customer || {};
    const customerEmail = (c.email || '').trim();

    const companyId = process.env.SUMIT_COMPANY_ID;
    const apiKey    = process.env.SUMIT_API_KEY;

    if (!companyId || !apiKey) {
      console.error('חסרים משתני סביבה: SUMIT_COMPANY_ID / SUMIT_API_KEY');
      return NextResponse.json({ error: 'תצורת שרת שגויה' }, { status: 500 });
    }

    const itemName = description || 'רכישה באתר נקי בשנייה';

    // ─── קריאה ל-Sumit Charge API ───────────────────────────────────────
    const sumitRes = await fetch(SUMIT_CHARGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Language': 'he',
      },
      body: JSON.stringify({
        Credentials: {
          CompanyID: Number(companyId),
          APIKey: apiKey,
        },
        // פרטי הלקoח — נשמרים בכרטיס הלקוח בסאמיט ומופיעים בחשבונית
        Customer: {
          Name: (c.fullName || '').trim() || 'לקוח נקי בשנייה',
          EmailAddress: customerEmail || null,
          Phone: (c.phone || '').trim() || null,
          Address: (c.address || '').trim() || null,
          City: (c.city || '').trim() || null,
          ZipCode: (c.zip || '').trim() || null,
          SearchMode: 0,
        },
        Items: [
          {
            Item: { Name: itemName },
            Quantity: 1,
            UnitPrice: Number(amount),
          },
        ],
        SingleUseToken: token,
        VATIncluded: true,
        // שליחת חשבונית/קבלה במייל ללקוח (אם נמסר אימייל) + עותק לעסק
        SendDocumentByEmail: Boolean(customerEmail),
        SendCopyToOrganization: true,
      }),
    });

    // התגובה אמורה להיות JSON; אם לא — נחשוף את הטקסט הגולמי לצורך אבחון
    const raw = await sumitRes.text();
    let sumitData;
    try {
      sumitData = JSON.parse(raw);
    } catch {
      console.error('[sumit/charge] non-JSON response:', sumitRes.status, raw.slice(0, 300));
      return NextResponse.json({ error: 'תגובה לא תקינה משירות הסליקה' }, { status: 502 });
    }

    // סאמיט מחזיר Status=0 להצלחה (Success)
    const ok =
      sumitData?.Status === 0 ||
      sumitData?.Status === 'Success' ||
      String(sumitData?.Status).startsWith('Success');

    if (!ok) {
      const errorMsg =
        sumitData?.UserErrorMessage ||
        sumitData?.TechnicalErrorDetails ||
        'החיוב נכשל. אנא בדוק את פרטי הכרטיס ונסה שנית.';
      console.error('[sumit/charge] declined:', sumitData?.Status, errorMsg);
      return NextResponse.json({ error: errorMsg }, { status: 402 });
    }

    // ─── הצלחה ─────────────────────────────────────────────────────────
    const data = sumitData?.Data || {};
    return NextResponse.json({
      success: true,
      transactionId: data?.Payment?.ID || data?.DocumentNumber || data?.DocumentID || null,
      documentUrl: data?.DocumentDownloadURL || null,
    });

  } catch (err) {
    console.error('[sumit/charge]', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
