import { defineConfig } from '@lingui/cli';

export default defineConfig({
    sourceLocale: 'en',
    locales: ['en', 'fr'],
    catalogs: [
        {
            path: '<rootDir>/src/plugins/bundle-plugin/dashboard/i18n/{locale}',
            include: ['<rootDir>/src/plugins/bundle-plugin/dashboard/**'],
        },
    ],
});
