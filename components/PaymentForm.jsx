'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * SumitPaymentForm
 * ─────────────────────────────────────────────
 * Props:
 *   amount       {number}  - סכום לחיוב בש"ח (חובה)
 *   description  {string}  - תיאור המוצר/הזמנה
 *   onSuccess    {fn}      - callback(transactionId) בהצלחה
 *   onError      {fn}      - callback(errorMessage) בכישלון
 *
 * הגדרות סביבה נדרשות (Vercel / .env.local):
 *   SUMIT_COMPANY_ID=...   ← מזהה החברה (לא סודי)
 *   SUMIT_PUBLIC_KEY=...   ← מפתח Public לטוקניזציה (לא סודי)
 *   SUMIT_PRIVATE_KEY=...  ← מפתח Private (בצד שרת בלבד!)
 *
 * הקרדנציאלס הציבוריים (CompanyID + PublicKey) נשלפים בעת הטעינה מ-
 * /api/sumit/config, כי המשתנים אינם בקידומת NEXT_PUBLIC_ ולכן לא
 * נחשפים לדפדפן ישירות.
 */

export default function SumitPaymentForm({ amount, quantity = 1, shipping = 'pickup', description = '', onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);

  // פרטי הלקוח (נשמרים בסאמיט ומשמשים לשליחת החשבונית/אישור במייל)
  const [customer, setCustomer] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
  });
  const setField = (k) => (e) =>
    setCustomer((c) => ({ ...c, [k]: e.target.value }));

  // ref כדי שה-callback של סאמיט (שנקשר פעם אחת) תמיד יראה את הערכים העדכניים
  const liveRef = useRef({ quantity, shipping, onSuccess, onError, customer });
  liveRef.current = { quantity, shipping, onSuccess, onError, customer };

  // ─── הגנה מפני "תקיעה" במצב טעינה ───────────────────────────────────
  // סאמיט לא תמיד מחזירה ResponseCallback (למשל כשהוולידציה הפנימית של
  // פרטי הכרטיס נכשלת) — ואז loading נשאר true והכפתור תקוע עד ריענון.
  // watchdog מבטיח שחרור, ו-chargingRef מבדיל בין "תקוע לפני חיוב" (בטוח
  // לשחרר מיד) לבין "חיוב אמיתי בתהליך" (אסור להפריע).
  const watchdogRef = useRef(null);
  const chargingRef = useRef(false);
  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  // ─── ניקוי הטוקן הישן של סאמיט ──────────────────────────────────────
  // ה-SDK של סאמיט שומר את הטוקן בשדה נסתר (input[name=og-token]) ומדלג על
  // טוקניזציה מחדש כל עוד יש בו ערך (בקוד שלהם: `0 < l.val().length || Tokenize(...)`).
  // לכן אחרי כרטיס שגוי, הטוקן הישן "תוקע" — ניסיון חוזר (גם עם כרטיס תקין)
  // לא מטוקֵן מחדש ולא קורה כלום. מחיקת השדה מאלצת טוקניזציה טרייה.
  const resetSumitToken = () => {
    try {
      const form = document.querySelector("form[data-og='form']");
      if (!form) return;
      const tok = form.querySelector("input[name='og-token']");
      if (tok) tok.value = '';
      if (window.jQuery) window.jQuery(form).data('og-ignoreevents', '0');
    } catch {
      /* no-op */
    }
  };

  // ביצוע החיוב מול השרת אחרי שסאמיט החזיר טוקן חד-פעמי.
  // שולחים רק qty — המחיר נקבע בצד-השרת (אנטי-זיוף מחיר).
  const chargeRef = useRef(null);
  chargeRef.current = async (token) => {
    const { quantity, shipping, onSuccess, onError, customer } = liveRef.current;
    chargingRef.current = true; // מכאן ועד finally — חיוב אמיתי בתהליך
    try {
      const res = await fetch('/api/sumit/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, qty: quantity, shipping, customer }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'שגיאה בביצוע החיוב');
      }

      // אימות נוסף: חייב להיות transactionId ו-success flag
      // בלי אלה, אנחנו לא משוכנעים שהחיוב בוצע באמת
      if (!data.success || !data.transactionId) {
        console.error('[PaymentForm] Invalid charge response: missing success flag or transactionId', data);
        throw new Error('לא התקבל אישור חיוב מהשרת. אנא בדוק את פרטיך ונסה שוב.');
      }

      setSuccess(true);
      onSuccess?.(data.transactionId, data.amount);
    } catch (err) {
      const msg = err.message || 'שגיאה לא צפויה';
      setErrors([msg]);
      onError?.(msg);
      setLoading(false);
      resetSumitToken(); // לאפשר ניסיון חוזר עם טוקן טרי
    } finally {
      chargingRef.current = false;
      clearWatchdog();
    }
  };

  // טעינת ספריית סאמיט + קישור הטופס
  useEffect(() => {
    // סאמיט דורש jQuery
    const loadJQuery = () =>
      new Promise((resolve) => {
        if (window.jQuery) return resolve();
        const s = document.createElement('script');
        s.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });

    const loadSumit = () =>
      new Promise((resolve) => {
        if (document.getElementById('sumit-payments-sdk')) return resolve();
        const s = document.createElement('script');
        s.id = 'sumit-payments-sdk';
        s.src = 'https://app.sumit.co.il/scripts/payments.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });

    // שליפת הקרדנציאלס הציבוריים מהשרת (COMPANY_ID / SUMIT_PUBLIC_KEY)
    const loadConfig = () =>
      fetch('/api/sumit/config')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('config'))))
        .then((cfg) => {
          if (!cfg?.companyId || !cfg?.publicKey) throw new Error('config');
          return cfg;
        });

    let cfgData = null;
    loadConfig()
      .then((cfg) => { cfgData = cfg; })
      .then(loadJQuery)
      .then(loadSumit)
      .then(() => {
        window.jQuery(function () {
          window.OfficeGuy.Payments.BindFormSubmit({
            CompanyID: cfgData.companyId,
            APIPublicKey: cfgData.publicKey,
            ResponseLanguage: 'he',
            // עם ResponseCallback סאמיט לא מבצע submit נייטיב — הוא מעביר לנו את התגובה.
            ResponseCallback: function (resp) {
              if (!resp || resp.Status !== 0) {
                const msg =
                  resp?.UserErrorMessage ||
                  resp?.TechnicalErrorDetails ||
                  'פרטי האשראי לא אומתו. אנא בדוק את הפרטים ונסה שנית.';
                clearWatchdog();
                setErrors([msg]);
                setLoading(false);
                resetSumitToken();
                liveRef.current.onError?.(msg);
                return;
              }
              const token = resp.Data?.SingleUseToken;
              if (!token) {
                clearWatchdog();
                setErrors(['לא התקבל אישור אשראי. נסה שנית.']);
                setLoading(false);
                return;
              }
              chargeRef.current(token);
            },
          });
        });
        setSdkReady(true);
      })
      .catch(() => {
        setErrors(['שירות הסליקה אינו זמין כרגע. נסה שוב מאוחר יותר.']);
      });
  }, []);

  // ניקוי ה-watchdog כשהקומפוננטה יורדת מהמסך
  useEffect(() => () => clearWatchdog(), []);

  // לחיצה על "שלם": מנקה שגיאות ומדליק טעינה. הטוקניזציה והחיוב קורים ב-ResponseCallback.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return; // מניעת שליחה כפולה בזמן עיבוד
    setErrors([]);
    setLoading(true);
    // watchdog: אם לא חזרה תשובה סופית תוך 15 שניות — משחררים את הכפתור
    // ומציגים שגיאה, כדי שלא להישאר תקועים עד ריענון הדף.
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      chargingRef.current = false;
      setLoading(false);
      resetSumitToken();
      setErrors(['התשלום לא הושלם. בדוק את הפרטים ונסה שוב.']);
    }, 15000);
  };

  // אם נתקענו במצב טעינה *לפני* שלב החיוב בפועל (למשל ולידציית כרטיס נכשלה
  // וסאמיט לא החזירה callback) — ברגע שהמשתמש מתקן שדה כלשהו משחררים מיד.
  // לא מפריעים לחיוב אמיתי שכבר בתהליך (chargingRef).
  const handleFormInput = () => {
    // כל עריכה של הטופס מנקה את הטוקן הישן של סאמיט, כדי שהשליחה הבאה
    // תיצור טוקן חדש מהפרטים המעודכנים (ולא תידחה/תיתקע על טוקן ישן).
    resetSumitToken();
    if (loading && !chargingRef.current) {
      clearWatchdog();
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="sp-success">
        <div className="sp-success-icon">✓</div>
        <p>התשלום בוצע בהצלחה!</p>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="sp-wrapper">
        <div className="sp-header">
          <span className="sp-lock">🔒</span>
          <span>תשלום מאובטח</span>
          {amount && (
            <span className="sp-amount">
              ₪{Number(amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {errors.length > 0 && (
          <div className="sp-errors og-errors">
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        <form data-og="form" onSubmit={handleSubmit} onInput={handleFormInput} className="sp-form" dir="rtl">
          {/* ───── פרטי הלקוח והמשלוח ───── */}
          <div className="sp-section">פרטים אישיים ומשלוח</div>

          <div className="sp-field">
            <label>
              <span className="sp-label">שם מלא</span>
              <input
                type="text"
                value={customer.fullName}
                onChange={setField('fullName')}
                placeholder="שם פרטי ומשפחה"
                className="sp-input"
                autoComplete="name"
                required
              />
            </label>
          </div>

          <div className="sp-row">
            <div className="sp-field sp-field--half">
              <label>
                <span className="sp-label">אימייל</span>
                <input
                  type="email"
                  value={customer.email}
                  onChange={setField('email')}
                  placeholder="name@email.com"
                  className="sp-input"
                  autoComplete="email"
                  dir="ltr"
                  required
                />
              </label>
            </div>
            <div className="sp-field sp-field--half">
              <label>
                <span className="sp-label">טלפון</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={customer.phone}
                  onChange={setField('phone')}
                  placeholder="050-0000000"
                  className="sp-input"
                  autoComplete="tel"
                  dir="ltr"
                  required
                />
              </label>
            </div>
          </div>

          <div className="sp-field">
            <label>
              <span className="sp-label">כתובת למשלוח</span>
              <input
                type="text"
                value={customer.address}
                onChange={setField('address')}
                placeholder="רחוב ומספר בית"
                className="sp-input"
                autoComplete="street-address"
                required
              />
            </label>
          </div>

          <div className="sp-row">
            <div className="sp-field sp-field--half">
              <label>
                <span className="sp-label">עיר</span>
                <input
                  type="text"
                  value={customer.city}
                  onChange={setField('city')}
                  placeholder="עיר"
                  className="sp-input"
                  autoComplete="address-level2"
                  required
                />
              </label>
            </div>
            <div className="sp-field sp-field--half">
              <label>
                <span className="sp-label">מיקוד</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customer.zip}
                  onChange={setField('zip')}
                  placeholder="0000000"
                  className="sp-input"
                  autoComplete="postal-code"
                  dir="ltr"
                />
              </label>
            </div>
          </div>

          {/* ───── פרטי תשלום ───── */}
          <div className="sp-section">פרטי תשלום</div>

          {/* שדה מספר כרטיס */}
          <div className="sp-field">
            <label>
              <span className="sp-label">מספר כרטיס</span>
              <input
                type="text"
                inputMode="numeric"
                size="20"
                maxLength="20"
                data-og="cardnumber"
                placeholder="0000 0000 0000 0000"
                className="sp-input"
                required
              />
            </label>
          </div>

          {/* תפוגה + CVV */}
          <div className="sp-row">
            <div className="sp-field sp-field--half">
              <label>
                <span className="sp-label">חודש / שנה</span>
                <div className="sp-expiry">
                  <input
                    type="text"
                    inputMode="numeric"
                    size="2"
                    maxLength="2"
                    data-og="expirationmonth"
                    placeholder="MM"
                    className="sp-input sp-input--sm"
                    required
                  />
                  <span className="sp-slash">/</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    size="4"
                    maxLength="4"
                    data-og="expirationyear"
                    placeholder="YYYY"
                    className="sp-input sp-input--sm"
                    required
                  />
                </div>
              </label>
            </div>

            <div className="sp-field sp-field--half">
              <label>
                <span className="sp-label">CVV</span>
                <input
                  type="text"
                  inputMode="numeric"
                  size="4"
                  maxLength="4"
                  data-og="cvv"
                  placeholder="123"
                  className="sp-input"
                  required
                />
              </label>
            </div>
          </div>

          {/* תעודת זהות */}
          <div className="sp-field">
            <label>
              <span className="sp-label">תעודת זהות של בעל הכרטיס</span>
              <input
                type="text"
                inputMode="numeric"
                data-og="citizenid"
                placeholder="000000000"
                className="sp-input"
                required
              />
            </label>
          </div>

          <button type="submit" className="sp-btn" disabled={!sdkReady || loading}>
            {loading ? (
              <span className="sp-spinner" />
            ) : (
              `שלם ${amount ? `₪${Number(amount).toLocaleString('he-IL')}` : ''}`
            )}
          </button>

          <p className="sp-powered">מאובטח ומופעל על ידי SUMIT</p>
        </form>
      </div>
    </>
  );
}

const styles = `
  .sp-wrapper {
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 30px 70px rgba(0,0,0,0.45);
    padding: 32px;
    max-width: 420px;
    margin: 0 auto;
    font-family: 'Heebo', 'Segoe UI', Arial, sans-serif;
  }
  .sp-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #666;
    margin-bottom: 24px;
    font-weight: 500;
  }
  .sp-amount {
    margin-right: auto;
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
  }
  .sp-errors {
    background: #fff0f0;
    border: 1px solid #ffcccc;
    border-radius: 8px;
    padding: 12px 16px;
    color: #c0392b;
    font-size: 14px;
    margin-bottom: 16px;
  }
  .sp-errors p { margin: 0; }
  .sp-form { display: flex; flex-direction: column; gap: 16px; }
  .sp-section {
    font-size: 13px; font-weight: 800; color: #0c0c0e;
    letter-spacing: -0.01em; margin: 4px 0 -4px;
    padding-bottom: 8px; border-bottom: 1px solid #eee;
  }
  .sp-section:not(:first-child) { margin-top: 12px; }
  .sp-field { display: flex; flex-direction: column; }
  .sp-label {
    font-size: 13px;
    font-weight: 600;
    color: #444;
    margin-bottom: 6px;
    display: block;
  }
  .sp-input {
    border: 1.5px solid #ddd;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 16px;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s;
    outline: none;
    direction: ltr;
  }
  .sp-input:focus { border-color: #0c0c0e; box-shadow: 0 0 0 3px rgba(255,210,59,0.35); }
  .sp-input--sm { width: auto; flex: 1; min-width: 0; }
  .sp-row { display: flex; gap: 16px; }
  .sp-field--half { flex: 1; }
  .sp-expiry { display: flex; align-items: center; gap: 6px; }
  .sp-slash { color: #aaa; font-size: 18px; }
  .sp-btn {
    background: #0c0c0e;
    color: #ffd23b;
    border: none;
    border-radius: 12px;
    padding: 14px;
    font-size: 17px;
    font-weight: 800;
    cursor: pointer;
    margin-top: 8px;
    transition: background 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 54px;
  }
  .sp-btn:hover:not(:disabled) { background: #000; }
  .sp-btn:active:not(:disabled) { transform: scale(0.98); }
  .sp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .sp-spinner {
    width: 20px; height: 20px;
    border: 3px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: sp-spin 0.7s linear infinite;
  }
  @keyframes sp-spin { to { transform: rotate(360deg); } }
  .sp-powered { text-align: center; font-size: 12px; color: #bbb; margin: 4px 0 0; }
  .sp-success {
    text-align: center;
    padding: 48px 32px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
    max-width: 420px;
    margin: 0 auto;
  }
  .sp-success-icon {
    width: 64px; height: 64px;
    background: #22c55e;
    color: #fff;
    border-radius: 50%;
    font-size: 32px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }
  .sp-success p { font-size: 18px; font-weight: 600; color: #1a1a1a; }
`;
