/**
 * /app/api/sumit/config/route.js  (Next.js App Router)
 *
 * מחזיר ללקוח את פרטי SUMIT ה*ציבוריים* בלבד (CompanyID + Public API Key),
 * הדרושים לטוקניזציה של הכרטיס בדפדפן. ערכים אלה אינם סודיים.
 *
 * סבלני לשמות משתנים: לאורך הפרויקט המפתחות נשמרו ב-Vercel תחת כמה
 * סטים של שמות (ישנים וחדשים). כאן בודקים את כל הווריאציות המוכרות
 * כדי שהסליקה תעבוד לא משנה לאיזה פרויקט Vercel מחוברים.
 *
 * מזהה חברה (לא סודי), לפי סדר עדיפות:
 *   SUMIT_COMPANY_ID | COMPANY_ID | NEXT_PUBLIC_SUMIT_COMPANY_ID | NEXT_PUBLIC_COMPANY_ID
 * מפתח Public לטוקניזציה (לא סודי):
 *   SUMIT_PUBLIC_KEY | NEXT_PUBLIC_SUMIT_API_PUBLIC_KEY | NEXT_PUBLIC_SUMIT_PUBLIC_KEY
 *
 * הערה: המפתח הפרטי (SUMIT_PRIVATE_KEY / SUMIT_API_KEY) נשאר בצד-שרת
 * בלבד ולעולם לא מוחזר מכאן.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// מחזיר את הערך הראשון הלא-ריק מבין שמות המשתנים שניתנו
function pickEnv(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return '';
}

export async function GET() {
  const companyId = pickEnv(
    'SUMIT_COMPANY_ID',
    'COMPANY_ID',
    'NEXT_PUBLIC_SUMIT_COMPANY_ID',
    'NEXT_PUBLIC_COMPANY_ID',
  );
  const publicKey = pickEnv(
    'SUMIT_PUBLIC_KEY',
    'NEXT_PUBLIC_SUMIT_API_PUBLIC_KEY',
    'NEXT_PUBLIC_SUMIT_PUBLIC_KEY',
  );

  if (!companyId || !publicKey) {
    // אבחון (בשרת בלבד): אילו מהשמות המוכרים בכלל קיימים בסביבה
    const present = Object.keys(process.env)
      .filter((k) => /SUMIT|COMPANY/i.test(k))
      .sort();
    console.error('[sumit/config] Missing credentials. SUMIT/COMPANY env keys present:', present);
    return NextResponse.json({ error: 'תצורת סליקה חסרה' }, { status: 500 });
  }

  return NextResponse.json({ companyId, publicKey });
}
