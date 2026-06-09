import './globals.css';

export const metadata = {
  title: 'נקי בשנייה — תשלום מאובטח',
  description: 'השלמת הזמנה מאובטחת · נקי בשנייה',
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800;900&family=Frank+Ruhl+Libre:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
