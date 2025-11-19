// engine/mb_nap.ts
export type Sex = 'M'|'F';
export type Day = 'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday';

export type ActivityDB = Record<string, number>;
export type WeeklySchedule = Record<string, Record<Day, number>>;

// Henry/Oxford MB formula from your Excel
export function computeMB(args: { weightKg: number; heightCm: number; ageYears: number; sex: Sex }): number {
  const { weightKg, heightCm, ageYears, sex } = args;
  const heightM = heightCm / 100;
  const coef = sex === 'M' ? 1.083 : 0.963;
  const MJ_to_kcal = 1000 / 4.18;
  const mb =
    coef *
    Math.pow(weightKg, 0.48) *
    Math.pow(heightM, 0.50) *
    Math.pow(ageYears, -0.13) *
    MJ_to_kcal;
  return Math.round(mb);
}

export function computeWeeklyMetHours(schedule: WeeklySchedule, db: ActivityDB): number {
  const days: Day[] = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  let total = 0;
  for (const [label, dayMap] of Object.entries(schedule)) {
    const met = db[label];
    if (!met) continue;
    for (const d of days) {
      const h = Number((dayMap as any)[d] ?? 0);
      if (h > 0) total += met * h;
    }
  }
  return total;
}

export const computeNAP = (weeklyMetHours: number) => weeklyMetHours / 168;
export const computeDET = (mbKcal: number, nap: number) => Math.round(mbKcal * nap);
