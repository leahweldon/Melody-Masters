const KEY = 'melody-masters:leaderboard:v2';
const MAX_ENTRIES = 10;

export function rankEntries(entries) {
  return [...entries].sort((a,b) => b.score - a.score || b.correct - a.correct || a.date.localeCompare(b.date)).slice(0, MAX_ENTRIES);
}

export function readScores(storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY) || '[]');
    return Array.isArray(value) ? rankEntries(value.filter(v => v && typeof v.name === 'string' && Number.isFinite(v.score) && v.score >= 0 && Number.isFinite(v.correct) && typeof v.date === 'string')) : [];
  } catch { return []; }
}

export function addScore(entry, storage) {
  const scores = rankEntries([...readScores(storage), entry]);
  try { (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(scores)); return true; }
  catch { return false; }
}

export function clearScores(storage) {
  try { (storage ?? globalThis.localStorage).removeItem(KEY); return true; }
  catch { return false; }
}
