// ui/WizardProtein.tsx
'use client';
import { useMemo, useState } from 'react';
import activityIndex from '@/lib/calculator/config/activity_index.json';
import params from '@/lib/calculator/config/params.json';
import { computeMB, computeWeeklyMetHours, computeNAP, computeDET, type Sex, type WeeklySchedule } from '@/lib/calculator/engine/mb_nap';
import { type Meal } from '@/lib/calculator/engine/meals_aggregate';
import { macroTotalsFromMeals, thermogenesisKcal, macroPercents, gramsPerKg, energyBalance } from '@/lib/calculator/engine/macro_stats';
import { suggestActivities } from '@/lib/calculator/engine/activity_match';
import MacroPie from './MacroPie';
import { Calculator, X } from 'lucide-react';

type Day = 'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday';
const DAYS: Day[] = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function WizardProtein() {
  const [isOpen, setIsOpen] = useState(false);
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
  function addMeal() { setMeals(arr => [...arr, { name: 'Meal', proteinG: 0, carbsG: 0, fatsG: 0 }]); }
  function removeMeal(i: number) { setMeals(arr => arr.filter((_, idx) => idx !== i)); }

  const res = useMemo(() => {
    const mb = computeMB({ weightKg, heightCm, ageYears, sex });
    const weeklyMet = computeWeeklyMetHours(schedule as any, (activityIndex as any).activity || {});
    const nap = computeNAP(weeklyMet);
    const det = computeDET(mb, nap);
    return { mb, weeklyMet: Math.round(weeklyMet*100)/100, nap: Math.round(nap*10000)/10000, det };
  }, [sex, ageYears, heightCm, weightKg, schedule]);

  const macroT = useMemo(()=> macroTotalsFromMeals(meals), [meals]);
  const eta = useMemo(()=> thermogenesisKcal(macroT, (params as any).tef), [macroT]);
  const pct = useMemo(()=> macroPercents(macroT), [macroT]);
  const gkg = useMemo(()=> gramsPerKg(macroT, weightKg), [macroT, weightKg]);
  const balanceDET = useMemo(()=> energyBalance(macroT.kcalTotal, res.det, (params as any).timeframeDays), [macroT, res.det]);
  const balanceMB  = useMemo(()=> energyBalance(macroT.kcalTotal, res.mb,  (params as any).timeframeDays), [macroT, res.mb]);

  const progress = ((step + 1) / 4) * 100;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40"
        style={{ backgroundColor: 'var(--brand-primary)' }}
        aria-label="Open Nutrition Calculator"
      >
        <Calculator className="w-6 h-6 text-white" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Nutrition Calculator</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: 'var(--brand-primary)'
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600">Step {step + 1}/4</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {step === 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-700">Sex</span>
                      <select 
                        value={sex} 
                        onChange={e=>setSex(e.target.value as Sex)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-700">Age (years)</span>
                      <input 
                        type="number" 
                        value={ageYears || ''} 
                        onChange={e=>setAgeYears(+e.target.value||0)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter age"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-700">Height (cm)</span>
                      <input 
                        type="number" 
                        value={heightCm || ''} 
                        onChange={e=>setHeightCm(+e.target.value||0)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter height"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-700">Weight (kg)</span>
                      <input 
                        type="number" 
                        value={weightKg || ''} 
                        onChange={e=>setWeightKg(+e.target.value||0)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter weight"
                      />
                    </label>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Weekly Activity Schedule</h3>
                    <p className="text-sm text-gray-600">Search and add your weekly activities</p>
                  </div>
                  
                  <div>
                    <input
                      value={query}
                      onChange={e => { 
                        const q = e.target.value; setQuery(q);
                        const idx = (activityIndex as any).activity || {};
                        setMatches(q ? suggestActivities(q, idx, 8) : []);
                      }}
                      placeholder="e.g., walking, yoga, sitting..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    {matches.length > 0 && (
                      <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-200 shadow-sm overflow-hidden">
                        {matches.map(m => (
                          <button 
                            key={m.label} 
                            onClick={()=>addActivity(m.label)} 
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium text-gray-900">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {Object.keys(schedule).length > 0 && (
                    <div className="overflow-x-auto -mx-6 px-6">
                      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="p-3 text-left font-semibold text-gray-700">Activity</th>
                            {DAYS.map(d => <th key={d} className="p-3 text-center font-semibold text-gray-700">{d.slice(0,3)}</th>)}
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(schedule).map(([label, dayMap]) => (
                            <tr key={label} className="hover:bg-gray-50">
                              <td className="p-3 font-medium text-gray-900">{label}</td>
                              {DAYS.map(d => (
                                <td key={d} className="p-2">
                                  <input
                                    type="number" step={0.25} min={0}
                                    value={(dayMap as any)[d] ?? 0}
                                    onChange={e=>setHour(label, d, +e.target.value || 0)}
                                    className="w-16 border border-gray-300 rounded px-2 py-1 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                  />
                                </td>
                              ))}
                              <td className="p-2">
                                <button 
                                  onClick={()=>removeActivity(label)} 
                                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                  Remove
                                </button>
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
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Daily Meal Plan</h3>
                    <p className="text-sm text-gray-600">Add your meals with macro breakdown</p>
                  </div>
                  
                  <div className="space-y-3">
                    {meals.map((m, i) => {
                      const autoKcal = Math.round((m.proteinG || 0) * 4 + (m.carbsG || 0) * 4 + (m.fatsG || 0) * 9);
                      return (
                        <div key={i} className="grid grid-cols-6 gap-2 items-center p-3 bg-gray-50 rounded-lg">
                          <input 
                            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                            value={m.name} 
                            onChange={e=>setMeal(i, { name: e.target.value })}
                            placeholder="Meal name"
                          />
                          <input 
                            type="number" 
                            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                            value={m.proteinG || ''} 
                            onChange={e=>setMeal(i, { proteinG: +e.target.value || 0 })} 
                            placeholder="Protein (g)"
                          />
                          <input 
                            type="number" 
                            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                            value={m.carbsG || ''} 
                            onChange={e=>setMeal(i, { carbsG: +e.target.value || 0 })} 
                            placeholder="Carbs (g)"
                          />
                          <input 
                            type="number" 
                            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                            value={m.fatsG || ''} 
                            onChange={e=>setMeal(i, { fatsG: +e.target.value || 0 })} 
                            placeholder="Fats (g)"
                          />
                          <div 
                            className="border border-gray-200 bg-gray-100 rounded px-3 py-2 text-gray-700 font-medium text-center" 
                            title="Auto-calculated: Protein×4 + Carbs×4 + Fats×9"
                          >
                            {autoKcal} kcal
                          </div>
                          <button 
                            className="text-sm text-red-600 hover:text-red-800 font-medium" 
                            onClick={()=>removeMeal(i)}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <button 
                    className="text-sm font-medium px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-colors w-full"
                    onClick={addMeal}
                  >
                    + Add Meal
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Your Results</h3>
                  
                  {/* Energy Expenditure Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="text-sm font-medium text-blue-800">BMR (Henry/Oxford)</div>
                      <div className="text-2xl font-bold text-blue-900 mt-1">{res.mb} <span className="text-base font-normal text-blue-700">kcal/day</span></div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <div className="text-sm font-medium text-green-800">Weekly MET-hours</div>
                      <div className="text-2xl font-bold text-green-900 mt-1">{res.weeklyMet}</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                      <div className="text-sm font-medium text-purple-800">NAP (Activity Level)</div>
                      <div className="text-2xl font-bold text-purple-900 mt-1">{res.nap}</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                      <div className="text-sm font-medium text-orange-800">TDEE (BMR × NAP)</div>
                      <div className="text-2xl font-bold text-orange-900 mt-1">{res.det} <span className="text-base font-normal text-orange-700">kcal/day</span></div>
                    </div>
                  </div>

                  {/* Macro Breakdown Table */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">Daily Macro Breakdown</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="p-3 text-left font-semibold text-gray-700"></th>
                            <th className="p-3 text-center font-semibold text-gray-700">Protein</th>
                            <th className="p-3 text-center font-semibold text-gray-700">Carbs</th>
                            <th className="p-3 text-center font-semibold text-gray-700">Fats</th>
                            <th className="p-3 text-center font-semibold text-gray-700">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-700">Grams (g)</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(macroT.proteinG)}</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(macroT.carbsG)}</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(macroT.fatsG)}</td>
                            <td className="p-3 text-center font-semibold text-gray-900">{Math.round(macroT.proteinG + macroT.carbsG + macroT.fatsG)}</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-700">Calories (kcal)</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(macroT.kcalP)}</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(macroT.kcalC)}</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(macroT.kcalF)}</td>
                            <td className="p-3 text-center font-semibold text-gray-900">{Math.round(macroT.kcalTotal)}</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-700">TEF (kcal)</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(eta.etaP)}</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(eta.etaC)}</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(eta.etaF)}</td>
                            <td className="p-3 text-center font-semibold text-gray-900">{Math.round(eta.etaTotal)}</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-700">Ratio (% of total kcal)</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(pct.pctP*100)}%</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(pct.pctC*100)}%</td>
                            <td className="p-3 text-center text-gray-900">{Math.round(pct.pctF*100)}%</td>
                            <td className="p-3 text-center font-semibold text-gray-900">100%</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-700">Per kg body weight</td>
                            <td className="p-3 text-center text-gray-900">{(gkg.pPerKg).toFixed(1)} g/kg</td>
                            <td className="p-3 text-center text-gray-900">{(gkg.cPerKg).toFixed(1)} g/kg</td>
                            <td className="p-3 text-center text-gray-900">{(gkg.fPerKg).toFixed(1)} g/kg</td>
                            <td className="p-3 text-center text-gray-500">—</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pie Chart and Energy Balance */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Calorie Distribution</h4>
                      <MacroPie data={[
                        { name: 'Protein', value: Math.max(0, Math.round(macroT.kcalP)) },
                        { name: 'Carbs',  value: Math.max(0, Math.round(macroT.kcalC)) },
                        { name: 'Fats',   value: Math.max(0, Math.round(macroT.kcalF)) },
                      ]}/>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Energy Balance</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xs font-medium text-blue-700 mb-1">Daily vs TDEE</div>
                          <div className="text-lg font-bold text-blue-900">
                            {Math.round(balanceDET.daily) > 0 ? '+' : ''}{Math.round(balanceDET.daily)} kcal
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            {balanceDET.daily < 0 ? '🔻 Calorie Deficit' : balanceDET.daily > 0 ? '🔺 Calorie Surplus' : '⚖️ Maintenance'}
                          </div>
                        </div>
                        
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-xs font-medium text-purple-700 mb-1">{(params as any).timeframeDays}-Day Total vs TDEE</div>
                          <div className="text-lg font-bold text-purple-900">
                            {Math.round(balanceDET.period) > 0 ? '+' : ''}{Math.round(balanceDET.period)} kcal
                          </div>
                        </div>

                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xs font-medium text-green-700 mb-1">Daily vs BMR</div>
                          <div className="text-lg font-bold text-green-900">
                            {Math.round(balanceMB.daily) > 0 ? '+' : ''}{Math.round(balanceMB.daily)} kcal
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {((macroT.kcalTotal/(res.mb||1))*100-100).toFixed(0)}% {balanceMB.daily < 0 ? 'below' : 'above'} BMR
                          </div>
                        </div>

                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-xs font-medium text-orange-700 mb-1">{(params as any).timeframeDays}-Day Total vs BMR</div>
                          <div className="text-lg font-bold text-orange-900">
                            {Math.round(balanceMB.period) > 0 ? '+' : ''}{Math.round(balanceMB.period)} kcal
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button 
                disabled={step===0} 
                onClick={()=>setStep(s=>s-1)} 
                className="px-6 py-2 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              <button 
                disabled={step===3} 
                onClick={()=>setStep(s=>s+1)} 
                className="px-6 py-2 rounded-lg font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: step === 3 ? '#d1d5db' : 'var(--brand-primary)' }}
              >
                {step === 3 ? 'Completed' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
