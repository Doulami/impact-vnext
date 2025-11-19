import dynamic from "next/dynamic";
import React from "react";

const WizardProtein = dynamic(() => import("@/components/calculator/WizardProtein"), { ssr: false });

export default function WizardProteinWrapper() {
  return <WizardProtein />;
}