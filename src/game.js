import { makeRounds } from './catalog.js';

export const ROUNDS = 6;
export const DIFFICULTIES = Object.freeze({
  warmup: { label: 'Warm-up', seconds: 25, multiplier: 1 },
  expert: { label: 'Expert', seconds: 18, multiplier: 1.5 },
});

export function cleanPlayerName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 18) || 'Guest DJ';
}

export function pointsForAnswer({ correct, secondsLeft, replays = 0, streak = 0, difficulty = 'warmup' }) {
  if (!correct) return 0;
  const config = DIFFICULTIES[difficulty] ?? DIFFICULTIES.warmup;
  const timeBonus = Math.round(Math.max(0, Math.min(config.seconds, secondsLeft)) * 12);
  const streakBonus = Math.max(0, streak) * 70;
  const replayPenalty = Math.min(250, Math.max(0, replays) * 50);
  return Math.max(100, Math.round((600 + timeBonus + streakBonus - replayPenalty) * config.multiplier));
}

export function beginGame({ name = '', difficulty = 'warmup', random = Math.random } = {}) {
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) throw new Error('Unknown difficulty');
  return {
    name: cleanPlayerName(name), difficulty, rounds: makeRounds(difficulty, random), index: 0,
    score: 0, streak: 0, bestStreak: 0, replays: 0, answered: false, answer: null, awarded: 0,
    correctCount: 0, history: [], finished: false,
  };
}

export function answerGame(game, selectedGenre, secondsLeft) {
  if (game.answered || game.finished) return game;
  const round = game.rounds[game.index];
  const correct = selectedGenre === round.track.genre;
  const nextStreak = correct ? game.streak + 1 : 0;
  const awarded = pointsForAnswer({ correct, secondsLeft, replays: game.replays, streak: game.streak, difficulty: game.difficulty });
  return {
    ...game, answered: true, answer: selectedGenre, awarded,
    score: game.score + awarded, streak: nextStreak, bestStreak: Math.max(game.bestStreak, nextStreak),
    correctCount: game.correctCount + Number(correct),
    history: [...game.history, { trackId: round.track.id, genre: round.track.genre, selected: selectedGenre, correct, awarded }],
  };
}

export function replayGame(game) {
  if (game.answered || game.finished) return game;
  return { ...game, replays: game.replays + 1 };
}

export function nextRound(game) {
  if (!game.answered || game.finished) return game;
  if (game.index === game.rounds.length - 1) return { ...game, finished: true };
  return { ...game, index: game.index + 1, answered: false, answer: null, awarded: 0, replays: 0 };
}
