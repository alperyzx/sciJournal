import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from '@/components/ui/toaster';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SciJournal Digest',
  description: 'A modern, mobile-friendly, and accessible science journal digest web app.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function applySystemTheme() {
              try {
                var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                document.documentElement.classList.toggle('dark', mediaQuery.matches);
              } catch (e) {}
            }

            try {
              applySystemTheme();

              var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
              if (typeof mediaQuery.addEventListener === 'function') {
                mediaQuery.addEventListener('change', applySystemTheme);
              } else if (typeof mediaQuery.addListener === 'function') {
                mediaQuery.addListener(applySystemTheme);
              }

              window.addEventListener('focus', applySystemTheme);
              document.addEventListener('visibilitychange', function() {
                if (!document.hidden) applySystemTheme();
              });
            } catch (e) {}
          })();
        ` }} />
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-M5SM7RL7');
        ` }} />
        {/* End Google Tag Manager */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M5SM7RL7"
                  height="0" width="0" style={{display: 'none', visibility: 'hidden'}}></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
