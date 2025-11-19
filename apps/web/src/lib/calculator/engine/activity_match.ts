// engine/activity_match.ts
export type ActivityDB = Record<string, number>;

export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string) {
  const A = norm(a), B = norm(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const aTokens = new Set(A.split(' '));
  const bTokens = new Set(B.split(' '));
  let overlap = 0;
  for (const t of aTokens) if (bTokens.has(t)) overlap++;
  const denom = (aTokens.size + bTokens.size - overlap) || 1;
  const jaccard = overlap / denom;
  const substr = (B.includes(A) || A.includes(B)) ? 0.25 : 0;
  return Math.min(1, jaccard + substr);
}

export function suggestActivities(userText: string, db: ActivityDB, k = 6) {
  const entries = Object.entries(db).map(([label, met]) => ({
    label, met, score: similarity(userText, label),
  }));
  return entries
    .filter(e => e.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, k);
}
