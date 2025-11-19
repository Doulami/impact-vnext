export type MacroTotals = {
  proteinG: number; carbsG: number; fatsG: number;
  kcalP: number; kcalC: number; kcalF: number; kcalTotal: number;
};

export function macroTotalsFromMeals(meals: { proteinG:number; carbsG:number; fatsG:number; kcal?:number }[]): MacroTotals {
  const proteinG = meals.reduce((s,m)=>s+(+m.proteinG||0),0);
  const carbsG   = meals.reduce((s,m)=>s+(+m.carbsG  ||0),0);
  const fatsG    = meals.reduce((s,m)=>s+(+m.fatsG   ||0),0);
  const kcalP = 4*proteinG, kcalC = 4*carbsG, kcalF = 9*fatsG;
  const kcalTotal = kcalP + kcalC + kcalF;
  return { proteinG, carbsG, fatsG, kcalP, kcalC, kcalF, kcalTotal };
}

export function thermogenesisKcal(t: MacroTotals, tef:{protein:number;carbs:number;fat:number}) {
  return {
    etaP: t.kcalP * tef.protein,
    etaC: t.kcalC * tef.carbs,
    etaF: t.kcalF * tef.fat,
    etaTotal: t.kcalP * tef.protein + t.kcalC * tef.carbs + t.kcalF * tef.fat
  };
}

export function macroPercents(t: MacroTotals) {
  const d = t.kcalTotal || 1;
  return {
    pctP: t.kcalP / d, pctC: t.kcalC / d, pctF: t.kcalF / d
  };
}

export function gramsPerKg(t: MacroTotals, weightKg:number) {
  const d = Math.max(1, weightKg || 0);
  return {
    pPerKg: t.proteinG / d, cPerKg: t.carbsG / d, fPerKg: t.fatsG / d
  };
}

export function energyBalance(intakeKcal:number, outKcal:number, days:number) {
  const daily = intakeKcal - outKcal;
  const period = daily * Math.max(1, Math.floor(days||1));
  return { daily, period };
}
