'use client';

import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';
import { apolloClient, setApolloLanguage } from '@/lib/apollo-client';
import { ReactNode, useEffect } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export function ApolloProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();

  // Sync Apollo language header with language context
  useEffect(() => {
    setApolloLanguage(language);
    // Refetch active queries when language changes
    apolloClient.refetchQueries({ include: 'active' });
  }, [language]);

  return <BaseApolloProvider client={apolloClient}>{children}</BaseApolloProvider>;
}
