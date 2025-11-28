import { defineConfig } from '@lingui/cli';

export default defineConfig({
    sourceLocale: 'en',
    locales: ['en', 'fr', 'ar'],
    catalogs: [
        {
            path: '<rootDir>/src/plugins/bundle-plugin/dashboard/i18n/{locale}',
            include: ['<rootDir>/src/plugins/bundle-plugin/dashboard/**'],
        },
        {
            path: '<rootDir>/src/plugins/frequently-bought-together/dashboard/i18n/{locale}',
            include: ['<rootDir>/src/plugins/frequently-bought-together/dashboard/**'],
        },
    ],
});
