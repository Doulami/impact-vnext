// engine/meals_aggregate.ts
export type Meal = {
  name: string;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  kcal?: number;
};

export function sumMeals(meals: Meal[]) {
  let proteinG = 0, carbsG = 0, fatsG = 0, kcalFromMacros = 0, kcalProvided = 0;
  const rows = meals.map(m => {
    const p = Math.max(0, +m.proteinG || 0);
    const c = Math.max(0, +m.carbsG || 0);
    const f = Math.max(0, +m.fatsG || 0);
    const kcalMac = 4*p + 4*c + 9*f;
    const kcalRow = m.kcal ?? kcalMac;
    proteinG += p; carbsG += c; fatsG += f;
    kcalFromMacros += kcalMac; kcalProvided += kcalRow;
    return {
      name: m.name,
      proteinG: p, carbsG: c, fatsG: f,
      kcalFromMacros: Math.round(kcalMac),
      kcalProvided: Math.round(kcalRow),
      kcalDelta: Math.round(kcalRow - kcalMac),
    };
  });

  return {
    total: {
      proteinG: Math.round(proteinG),
      carbsG: Math.round(carbsG),
      fatsG: Math.round(fatsG),
      kcalFromMacros: Math.round(kcalFromMacros),
      kcalProvided: Math.round(kcalProvided),
      kcalDelta: Math.round(kcalProvided - kcalFromMacros),
    },
    rows,
  };
}
