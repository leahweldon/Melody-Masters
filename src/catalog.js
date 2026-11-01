/**
 * Entirely original short-form musical cues, authored for the 2026 rebuild.
 * No copyrighted recordings, streaming APIs, audio downloads, or external assets.
 * Melody steps are semitone offsets from C4; null indicates a rest.
 */
export const GENRES = Object.freeze([
  { id: 'synthwave', label: 'Synthwave', emoji: '🌌', color: '#a5a2ff', tagline: 'Retro futures, neon nights', hint: 'Pulsing analog-style synths and a cinematic, driving bassline.', wave: 'sawtooth' },
  { id: 'disco', label: 'Disco', emoji: '🪩', color: '#ffb47f', tagline: 'The dancefloor is calling', hint: 'A four-on-the-floor beat, bright keys and an upbeat bass groove.', wave: 'triangle' },
  { id: 'lofi', label: 'Lo-fi', emoji: '📼', color: '#b5d7b2', tagline: 'A slow Sunday afternoon', hint: 'Soft, dusty keys and a laid-back, unhurried rhythm.', wave: 'sine' },
  { id: 'jazz', label: 'Jazz', emoji: '🎷', color: '#ffe0a3', tagline: 'The late-night corner booth', hint: 'Swinging notes, warm harmonies and a walking bass.', wave: 'triangle' },
  { id: 'chiptune', label: 'Chiptune', emoji: '👾', color: '#ff8cbe', tagline: 'Insert coin to continue', hint: 'Fast, playful bleeps in the style of classic video games.', wave: 'square' },
  { id: 'house', label: 'House', emoji: '🎛️', color: '#87e0dd', tagline: 'One more song, then home', hint: 'A steady club kick, repeating synth hook and danceable pulse.', wave: 'sawtooth' },
]);

// Positions are 8th notes within a two-bar loop. Roots are MIDI notes.
export const TRACKS = Object.freeze([
  { id:'satellite-hearts', genre:'synthwave', title:'Satellite Hearts', bpm:96, root:48, notes:[0,7,12,14,12,7,5,7,0,7,12,15,14,12,7,5], bass:[0,0,7,7], character:0 },
  { id:'afterglow-drive', genre:'synthwave', title:'Afterglow Drive', bpm:101, root:45, notes:[0,3,7,10,12,10,7,3,5,8,12,15,12,8,7,3], bass:[0,0,8,7], character:1 },
  { id:'mirrorball', genre:'disco', title:'Mirrorball Magic', bpm:122, root:50, notes:[12,9,7,9,12,14,12,7,9,7,5,7,9,12,9,5], bass:[0,12,5,12], character:0 },
  { id:'golden-hour', genre:'disco', title:'Golden Hour Groove', bpm:118, root:48, notes:[7,12,10,7,5,7,12,14,15,14,12,10,7,5,7,10], bass:[0,12,9,12], character:1 },
  { id:'rainy-window', genre:'lofi', title:'Rainy Window', bpm:76, root:48, notes:[7,null,5,3,null,7,10,null,12,null,10,7,5,null,3,null], bass:[0,7,5,3], character:0 },
  { id:'soft-focus', genre:'lofi', title:'Soft Focus', bpm:82, root:45, notes:[12,null,9,7,null,5,4,null,7,null,9,12,null,7,5,null], bass:[0,5,7,4], character:1 },
  { id:'blue-note', genre:'jazz', title:'Blue Note Boulevard', bpm:112, root:50, notes:[12,10,9,7,6,7,10,12,14,12,10,9,7,5,6,9], bass:[0,4,7,10], character:0 },
  { id:'midnight-cafe', genre:'jazz', title:'Midnight Café', bpm:108, root:48, notes:[7,9,10,12,10,9,7,4,5,7,9,10,12,10,7,5], bass:[0,3,7,10], character:1 },
  { id:'pixel-party', genre:'chiptune', title:'Pixel Party', bpm:164, root:60, notes:[0,4,7,12,7,4,12,7,5,9,12,17,12,9,7,5], bass:[0,7,5,7], character:0 },
  { id:'high-score', genre:'chiptune', title:'High Score Hero', bpm:158, root:60, notes:[12,7,5,4,7,12,16,19,17,12,9,7,5,7,12,9], bass:[0,5,7,0], character:1 },
  { id:'night-shift', genre:'house', title:'Night Shift', bpm:128, root:48, notes:[0,null,7,10,12,null,10,7,5,null,7,10,12,15,12,7], bass:[0,7,5,7], character:0 },
  { id:'daybreak', genre:'house', title:'Daybreak Frequencies', bpm:125, root:50, notes:[7,null,12,14,12,10,7,null,5,7,10,12,14,null,12,10], bass:[0,5,7,10], character:1 },
]);

export const genreById = id => GENRES.find(g => g.id === id);

export function seededShuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makeRounds(difficulty = 'warmup', random = Math.random) {
  const chosen = GENRES.map(genre => {
    const matching = TRACKS.filter(t => t.genre === genre.id);
    return matching[Math.floor(random() * matching.length)];
  });
  const tracks = seededShuffle(chosen, random);
  return tracks.map(track => {
    const wrongGenres = seededShuffle(GENRES.filter(g => g.id !== track.genre), random);
    const count = difficulty === 'expert' ? 6 : 4;
    const options = seededShuffle([genreById(track.genre), ...wrongGenres.slice(0, count - 1)], random);
    return { track, options };
  });
}
