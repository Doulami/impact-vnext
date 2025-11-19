// ui/WizardProtein.tsx
'use client';
import { useMemo, useState } from 'react';
import activityIndex from '@/lib/calculator/config/activity_index.json';
import { computeMB, computeWeeklyMetHours, computeNAP, computeDET, type Sex, type WeeklySchedule } from '@/lib/calculator/engine/mb_nap';
import { sumMeals, type Meal } from '@/lib/calculator/engine/meals_aggregate';
import { suggestActivities } from '@/lib/calculator/engine/activity_match';
import MacroChart from './MacroChart';

type Day = 'Lundi'|'Mardi'|'Mercredi'|'Jeudi'|'Vendredi'|'Samedi'|'Dimanche';
const DAYS: Day[] = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

export default function WizardProtein() {
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex>('M');
  const [ageYears, setAgeYears] = useState<number>(0);
  const [heightCm, setHeightCm] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);

  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<{label:string;met:number;score:number}[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule>({});

  function addActivity(label: string) {
    if ((schedule as any)[label]) return;
    setSchedule(prev => ({
      ...prev,
      [label]: DAYS.reduce((acc, d) => (acc[d]=0, acc), {} as Record<Day, number>)
    }));
    setQuery(''); setMatches([]);
  }
  function setHour(label: string, day: Day, hours: number) {
    setSchedule(prev => ({ ...prev, [label]: { ...(prev as any)[label], [day]: Math.max(0, hours) }}));
  }
  function removeActivity(label: string) {
    setSchedule(prev => { const c = { ...(prev as any) }; delete c[label]; return c as any; });
  }

  const [meals, setMeals] = useState<Meal[]>([]);
  function setMeal(i: number, patch: Partial<Meal>) {
    setMeals(arr => arr.map((m, idx) => idx===i ? { ...m, ...patch } : m));
  }
  function addMeal() { setMeals(arr => [...arr, { name: 'Repas', proteinG: 0, carbsG: 0, fatsG: 0 }]); }
  function removeMeal(i: number) { setMeals(arr => arr.filter((_, idx) => idx !== i)); }

  const res = useMemo(() => {
    const mb = computeMB({ weightKg, heightCm, ageYears, sex });
    const weeklyMet = computeWeeklyMetHours(schedule as any, (activityIndex as any).activity || {});
    const nap = computeNAP(weeklyMet);
    const det = computeDET(mb, nap);
    const macro = sumMeals(meals);
    return { mb, weeklyMet: Math.round(weeklyMet*100)/100, nap: Math.round(nap*10000)/10000, det, macro };
  }, [sex, ageYears, heightCm, weightKg, schedule, meals]);

  return (
    <div className="fixed bottom-4 left-4 w-[min(94vw,1000px)] max-h-[85vh] overflow-auto rounded-2xl border shadow bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Plan rapide (MB, NAP, DET & Repas)</h3>
        <div className="text-sm">Step {step+1}/4</div>
      </div>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span>Sexe</span>
            <select value={sex} onChange={e=>setSex(e.target.value as Sex)}>
              <option value="M">M</option><option value="F">F</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span>Âge</span>
            <input type="number" value={ageYears} onChange={e=>setAgeYears(+e.target.value||0)} />
          </label>
          <label className="grid gap-1">
            <span>Taille (cm)</span>
            <input type="number" value={heightCm} onChange={e=>setHeightCm(+e.target.value||0)} />
          </label>
          <label className="grid gap-1">
            <span>Poids (kg)</span>
            <input type="number" value={weightKg} onChange={e=>setWeightKg(+e.target.value||0)} />
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="font-medium">Activités — chercher et ajouter (Eq MET)</div>
          <input
            value={query}
            onChange={e => { 
              const q = e.target.value; setQuery(q);
              const idx = (activityIndex as any).activity || {};
              setMatches(q ? suggestActivities(q, idx, 8) : []);
            }}
            placeholder="ex: marche, yoga, position assise…"
            className="w-full border rounded px-3 py-2"
          />
          {matches.length > 0 && (
            <div className="border rounded divide-y">
              {matches.map(m => (
                <button key={m.label} onClick={()=>addActivity(m.label)} className="w-full text-left px-3 py-2 hover:bg-black/5">
                  {m.label} <span className="opacity-60">— MET {m.met}</span>
                </button>
              ))}
            </div>
          )}

          {Object.keys(schedule).length > 0 && (
            <div className="overflow-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-black/5">
                    <th className="p-2 text-left">Activité</th>
                    {DAYS.map(d => <th key={d} className="p-2">{d}</th>)}
                    <th className="p-2">—</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(schedule).map(([label, dayMap]) => (
                    <tr key={label}>
                      <td className="p-2 font-medium">{label}</td>
                      {DAYS.map(d => (
                        <td key={d} className="p-1">
                          <input
                            type="number" step={0.25} min={0}
                            value={(dayMap as any)[d] ?? 0}
                            onChange={e=>setHour(label, d, +e.target.value || 0)}
                            className="w-20 border rounded px-2 py-1"
                          />
                        </td>
                      ))}
                      <td className="p-1">
                        <button onClick={()=>removeActivity(label)} className="text-xs opacity-70">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="font-medium">Prises alimentaires (par jour)</div>
          <div className="grid gap-2">
            {meals.map((m, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-center">
                <input className="border rounded px-2 py-1" value={m.name} onChange={e=>setMeal(i, { name: e.target.value })} />
                <input type="number" className="border rounded px-2 py-1" value={m.proteinG} onChange={e=>setMeal(i, { proteinG: +e.target.value || 0 })} placeholder="Prot (g)"/>
                <input type="number" className="border rounded px-2 py-1" value={m.carbsG}   onChange={e=>setMeal(i, { carbsG: +e.target.value || 0 })} placeholder="Gluc (g)"/>
                <input type="number" className="border rounded px-2 py-1" value={m.fatsG}    onChange={e=>setMeal(i, { fatsG: +e.target.value || 0 })} placeholder="Lip (g)"/>
                <input type="number" className="border rounded px-2 py-1" value={m.kcal ?? ''} onChange={e=>setMeal(i, { kcal: e.target.value === '' ? undefined : (+e.target.value || 0) })} placeholder="Kcal (opt)"/>
                <button className="text-xs opacity-70" onClick={()=>removeMeal(i)}>Remove</button>
              </div>
            ))}
          </div>
          <button className="text-sm" onClick={addMeal}>+ Ajouter un repas</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <div className="font-medium">Résultats</div>
          <ul className="text-sm grid gap-1">
            <li><strong>MB (Henry/Oxford):</strong> {res.mb} kcal/j</li>
            <li><strong>MET-heures hebdo (≈ K15):</strong> {res.weeklyMet}</li>
            <li><strong>NAP (K15/168):</strong> {res.nap}</li>
            <li><strong>DET (MB × NAP):</strong> {res.det} kcal/j</li>
            <li><strong>Protéines totales:</strong> {res.macro.total.proteinG} g/j</li>
            <li><strong>Glucides totaux:</strong> {res.macro.total.carbsG} g/j</li>
            <li><strong>Lipides totaux:</strong> {res.macro.total.fatsG} g/j</li>
            <li><strong>Kcal (déclarées):</strong> {res.macro.total.kcalProvided} — <strong>depuis macros:</strong> {res.macro.total.kcalFromMacros} (Δ {res.macro.total.kcalDelta})</li>
          </ul>
          <MacroChart rows={res.macro.rows} />
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <button disabled={step===0} onClick={()=>setStep(s=>s-1)} className="px-3 py-2 rounded border disabled:opacity-40">Back</button>
        <button disabled={step===3} onClick={()=>setStep(s=>s+1)} className="px-3 py-2 rounded border disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
