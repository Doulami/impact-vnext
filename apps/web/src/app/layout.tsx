import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { ApolloProvider } from "@/components/providers/ApolloProvider";
import { CartProvider } from "@/lib/hooks/useCart";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import CartDrawer from "@/components/CartDrawer";
import WizardProteinWrapper from "@/components/calculator/WizardProteinWrapper";

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

export const metadata: Metadata = {
  title: "Impact Nutrition - Premium Sports Supplements",
  description: "Premium sports nutrition trusted by athletes worldwide. Science-backed formulations for maximum results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontHeading.variable} ${fontBody.variable}`}
    >
      <body className="font-body antialiased">
        <LanguageProvider>
          <ApolloProvider>
            <AuthProvider>
              <CartProvider>
                {children}
                <CartDrawer />
                <WizardProteinWrapper />
              </CartProvider>
            </AuthProvider>
          </ApolloProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
