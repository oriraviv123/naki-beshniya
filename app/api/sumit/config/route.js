/**
 * /app/api/sumit/config/route.js  (Next.js App Router)
 *
 * מחזיר ללקוח את פרטי SUMIT ה*ציבוריים* בלבד (CompanyID + Public API Key),
 * הדרושים לטוקניזציה של הכרטיס בדפדפן. ערכים אלה אינם סודיים.
 *
 * למה endpoint ולא NEXT_PUBLIC_*?
 *   המשתנים ב-Vercel נקראים COMPANY_ID / SUMIT_PUBLIC_KEY (ללא הקידומת
 *   NEXT_PUBLIC_), ולכן אינם נחשפים לדפדפן אוטומטית. שליפה דרך השרת
 *   עובדת עם השמות הקיימים וללא צורך ב-rebuild בכל שינוי ערך.
 *
 * משתני סביבה נדרשים (Vercel / .env.local):
 *   SUMIT_COMPANY_ID=...  ← מזהה החברה (לא סודי)
 *   SUMIT_PUBLIC_KEY=...  ← מפתח Public לטוקניזציה (לא סודי)
 *
 * הערה: SUMIT_PRIVATE_KEY נשאר בצד-שרת בלבד ולעולם לא מוחזר מכאן.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const companyId = process.env.SUMIT_COMPANY_ID || '';
  const publicKey = process.env.SUMIT_PUBLIC_KEY || '';

  if (!companyId || !publicKey) {
    console.error('Missing env: SUMIT_COMPANY_ID / SUMIT_PUBLIC_KEY');
    return NextResponse.json(
      { error: 'תצורת סליקה חסרה' },
      { status: 500 },
    );
  }

  return NextResponse.json({ companyId, publicKey });
}
