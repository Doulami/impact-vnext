'use client';

import dynamic from 'next/dynamic';

const WizardProtein = dynamic(() => import('./WizardProtein'), { ssr: false });

export default function WizardProteinWrapper() {
  return <WizardProtein />;
}
