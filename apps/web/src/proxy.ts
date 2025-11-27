import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export function proxy(request: NextRequest) {
  // First, apply i18n middleware
  const response = intlMiddleware(request);

  // Get the Strapi URL from environment or use default
  const strapiUrl = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:1337';
  
  // Allow the frontend to be embedded in an iframe from Strapi admin panel
  // This is necessary for the preview feature to work
  response.headers.set(
    'Content-Security-Policy',
    `frame-ancestors 'self' ${strapiUrl}`
  );

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all pathnames except API routes and static files
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
