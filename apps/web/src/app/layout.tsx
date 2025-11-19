import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { ApolloProvider } from "@/components/providers/ApolloProvider";
import { CartProvider } from "@/lib/hooks/useCart";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import CartDrawer from "@/components/CartDrawer";
import dynamic from "next/dynamic";

const WizardProtein = dynamic(() => import("@/components/calculator/WizardProtein"), { ssr: false });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <ApolloProvider>
            <AuthProvider>
              <CartProvider>
                {children}
                <CartDrawer />
                <WizardProtein />
              </CartProvider>
            </AuthProvider>
          </ApolloProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
