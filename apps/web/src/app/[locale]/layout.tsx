import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "../globals.css";
import { ApolloProvider } from "@/components/providers/ApolloProvider";
import { CartProvider } from "@/lib/hooks/useCart";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import { VendureLanguageProvider } from "@/lib/contexts/VendureLanguageContext";
import CartDrawer from "@/components/CartDrawer";
import WizardProteinWrapper from "@/components/calculator/WizardProteinWrapper";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { getAvailableLocales, getStaticFallbackLocales } from '@/lib/config/dynamicI18n';

const fontHeading = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const fontBody = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Note: metadata is defined per-page for localization
// This static export is kept for pages without specific metadata

// Temporarily force dynamic rendering to avoid build errors
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  // For static generation, try to get languages from Vendure
  try {
    const dynamicLocales = await getAvailableLocales();
    console.log('[Layout] Using dynamic locales for static generation:', dynamicLocales);
    return dynamicLocales.map((locale) => ({ locale }));
  } catch (error) {
    // Fallback to static locales if Vendure is unavailable during build
    console.warn('[Layout] Falling back to static locales for static generation:', error);
    const fallbackLocales = getStaticFallbackLocales();
    return fallbackLocales.map((locale) => ({ locale }));
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  
  // Localized metadata
  const titles = {
    en: "Impact Nutrition - Premium Sports Supplements",
    ar: "إيمباكت نيوتريشن - مكملات غذائية رياضية فاخرة",
    fr: "Impact Nutrition - Compléments Sportifs Premium"
  };
  
  const descriptions = {
    en: "Premium sports nutrition trusted by athletes worldwide. Science-backed formulations for maximum results.",
    ar: "تغذية رياضية فاخرة يثق بها الرياضيون حول العالم. تركيبات مدعومة علمياً لأقصى النتائج.",
    fr: "Nutrition sportive premium approuvée par les athlètes du monde entier. Formulations scientifiques pour des résultats optimaux."
  };
  
  return {
    title: titles[locale as keyof typeof titles] || titles.en,
    description: descriptions[locale as keyof typeof descriptions] || descriptions.en,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'ar': '/ar',
        'fr': '/fr',
        'x-default': '/en'
      }
    },
    other: {
      'og:locale': locale,
      'og:locale:alternate': locales.filter(l => l !== locale).join(',')
    }
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate locale (dynamic validation is handled in i18n.ts)
  // Static validation as fallback
  if (!locales.includes(locale as any)) {
    console.warn(`[Layout] Locale '${locale}' not in static fallback list, but proceeding with dynamic validation`);
    // Don't call notFound() here as dynamic validation in i18n.ts will handle it
  }

  // Enable static rendering
  const messages = await getMessages();

  // Determine text direction based on locale
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontHeading.variable} ${fontBody.variable}`}
    >
      <body className="font-body antialiased">
        <NextIntlClientProvider messages={messages}>
          <LanguageProvider>
            <ApolloProvider>
              <VendureLanguageProvider>
                <AuthProvider>
                  <CartProvider>
                    {children}
                    <CartDrawer />
                    <WizardProteinWrapper />
                  </CartProvider>
                </AuthProvider>
              </VendureLanguageProvider>
            </ApolloProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
