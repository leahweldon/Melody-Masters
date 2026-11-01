import test from 'node:test';
import assert from 'node:assert/strict';
import {GENRES,TRACKS,makeRounds,seededShuffle,genreById} from '../src/catalog.js';
import {beginGame,answerGame,replayGame,nextRound,pointsForAnswer,cleanPlayerName,ROUNDS,DIFFICULTIES} from '../src/game.js';
const rand=()=>.42;

test('catalog contains exactly six genre labels and two authored tracks per genre',()=>{
 assert.equal(GENRES.length,6);assert.equal(TRACKS.length,12);
 for(const genre of GENRES){assert.equal(TRACKS.filter(t=>t.genre===genre.id).length,2);assert.ok(genreById(genre.id));}
});
test('all tracks have valid MIDI data and 16-step compositions',()=>{
 const ids=new Set();
 for(const track of TRACKS){assert.ok(!ids.has(track.id));ids.add(track.id);assert.equal(track.notes.length,16);assert.equal(track.bass.length,4);assert.ok(track.bpm>60&&track.bpm<190);assert.ok(track.notes.every(n=>n===null||Number.isInteger(n)));}
});
test('shuffle does not mutate original array',()=>{const a=[1,2,3,4];assert.deepEqual(seededShuffle(a,rand).sort(),a);assert.deepEqual(a,[1,2,3,4]);});
test('warm-up rounds cover each genre once with four distinct choices',()=>{
 const rounds=makeRounds('warmup',rand);assert.equal(rounds.length,6);
 assert.equal(new Set(rounds.map(r=>r.track.genre)).size,6);
 for(const r of rounds){assert.equal(r.options.length,4);assert.ok(r.options.some(o=>o.id===r.track.genre));assert.equal(new Set(r.options.map(o=>o.id)).size,4);}
});
test('expert rounds offer all six genres',()=>{for(const round of makeRounds('expert',rand))assert.equal(new Set(round.options.map(o=>o.id)).size,6);});
test('name sanitisation trims whitespace and limits length',()=>{assert.equal(cleanPlayerName('  DJ   Star    Light  '),'DJ Star Light');assert.equal(cleanPlayerName('  '),'Guest DJ');assert.equal(cleanPlayerName('a'.repeat(60)).length,18);});
test('invalid difficulties are rejected',()=>assert.throws(()=>beginGame({difficulty:'impossible'}),/difficulty/));
test('correct answer scores points and updates streak',()=>{
 const g=beginGame({name:'Leah',random:rand});const a=answerGame(g,g.rounds[0].track.genre,12);
 assert.equal(a.correctCount,1);assert.equal(a.streak,1);assert.equal(a.bestStreak,1);assert.equal(a.history.length,1);assert.ok(a.score>0);assert.equal(g.score,0);
});
test('wrong answer resets streak and scores zero',()=>{
 let g=beginGame({random:rand});g=answerGame(g,g.rounds[0].track.genre,20);g=nextRound(g);
 g=answerGame(g,'not-a-genre',10);
 assert.equal(g.streak,0);assert.equal(g.correctCount,1);assert.equal(g.history.at(-1).awarded,0);
});
test('skipped/timed-out round produces zero points',()=>{const g=beginGame({random:rand});const a=answerGame(g,null,0);assert.equal(a.awarded,0);assert.equal(a.answer,null);});
test('an answered round cannot be answered a second time',()=>{const g=beginGame({random:rand});const a=answerGame(g,null,0);assert.equal(answerGame(a,a.rounds[0].track.genre,24),a);});
test('cannot advance until answering and replay only before answer',()=>{const g=beginGame({random:rand});assert.equal(nextRound(g),g);assert.equal(replayGame(g).replays,1);const a=answerGame(g,null,0);assert.equal(replayGame(a),a);});
test('nextRound progresses and final round terminates without creating round seven',()=>{
 let g=beginGame({random:rand});for(let i=0;i<ROUNDS;i++){g=answerGame(g,g.rounds[g.index].track.genre,15);g=nextRound(g);}
 assert.equal(g.index,ROUNDS-1);assert.equal(g.finished,true);assert.equal(g.correctCount,ROUNDS);assert.equal(g.history.length,ROUNDS);
});
test('score is monotonic with speed, streak and replays',()=>{
 const base={correct:true,secondsLeft:10,replays:0,streak:0,difficulty:'warmup'};
 assert.ok(pointsForAnswer({...base,secondsLeft:20})>pointsForAnswer(base));
 assert.ok(pointsForAnswer({...base,streak:3})>pointsForAnswer(base));
 assert.ok(pointsForAnswer({...base,replays:2})<pointsForAnswer(base));
 assert.ok(pointsForAnswer({...base,difficulty:'expert'})>pointsForAnswer(base));
 assert.equal(pointsForAnswer({...base,correct:false}),0);
});
test('extreme replay penalties never produce negative awarded points',()=>assert.ok(pointsForAnswer({correct:true,secondsLeft:0,replays:100,streak:0})>=100));
