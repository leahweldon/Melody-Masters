import { GENRES, TRACKS, genreById } from './catalog.js';
import { beginGame, answerGame, nextRound, replayGame, DIFFICULTIES, ROUNDS } from './game.js';
import { readScores, addScore, clearScores } from './storage.js';
import { AudioEngine } from './audio.js';
import { icon } from './icons.js';

const app = document.querySelector('#app');
const announcement = document.querySelector('#announcements');
const audio = new AudioEngine();
let screen = 'home';
let game = null;
let deadline = 0;
let pausedAt = 0;
let tickId = null;
let soundEnd = null;
let audioError = '';
let isAudioPlaying = false;
let lastPlayer = 'Guest DJ';
let difficulty = 'warmup';

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatScore = value => Number(value).toLocaleString('en-IE');
const announce = message => { announcement.textContent = ''; requestAnimationFrame(() => announcement.textContent = message); };
const remaining = () => Math.max(0, (deadline - (pausedAt || Date.now())) / 1000);
const shortDate = date => { const d = new Date(date);return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'}); };

function clearPlayback() {
  audio.stop(); isAudioPlaying=false;
  if (soundEnd) clearTimeout(soundEnd);
  soundEnd = null;
}
function stopClock() {if(tickId)clearInterval(tickId);tickId=null;pausedAt=0;}
function navigate(to) {
  stopClock();clearPlayback();audioError='';
  screen=to;render();window.scrollTo({top:0,behavior:'instant'});
}
function firePlayback(track) {
  clearPlayback();audioError='';
  const id=audio.generation;
  audio.play(track).then(duration=>{
    if(!duration||id+1!==audio.generation)return;
    isAudioPlaying=true;updatePlaybackUI();
    soundEnd=setTimeout(()=>{isAudioPlaying=false;updatePlaybackUI();},duration*1000+160);
  }).catch(error=>{
    audioError=error.message || 'Audio could not start. Try another browser.';
    updatePlaybackUI();announce(audioError);
  });
}
function updatePlaybackUI(){
  for(const el of document.querySelectorAll('[data-playback-state]'))el.textContent=isAudioPlaying?'NOW PLAYING':'READY TO LISTEN';
  for(const el of document.querySelectorAll('.sound-visual'))el.classList.toggle('is-playing',isAudioPlaying);
  for(const el of document.querySelectorAll('[data-audio-error]')){el.textContent=audioError;el.hidden=!audioError;}
}
function startTimer() {
  stopClock();
  deadline=Date.now()+DIFFICULTIES[game.difficulty].seconds*1000;
  tickId=setInterval(()=>{
    if(document.hidden||screen!=='game'||!game||game.answered)return;
    const time=remaining();
    for(const el of document.querySelectorAll('[data-time]'))el.textContent=Math.ceil(time);
    const bar=document.querySelector('[data-timer-bar]');
    if(bar){bar.style.width=`${time / DIFFICULTIES[game.difficulty].seconds * 100}%`;bar.classList.toggle('urgent',time<=6)}
    if(time<=0)submitAnswer(null);
  },100);
}
function startRound() {
  screen='game';render();startTimer();firePlayback(game.rounds[game.index].track);
}
function submitAnswer(selected) {
  if(!game || game.answered || game.finished)return;
  const secondsLeft=remaining();
  game=answerGame(game,selected,secondsLeft);
  stopClock();clearPlayback();render();
  const correct=game.history.at(-1).correct;
  announce(correct?`Correct! ${game.awarded} points.`:`The answer was ${genreById(game.rounds[game.index].track.genre).label}.`);
  const next=document.querySelector('[data-action="next"]');
  if(next)next.focus();
}
function finishGame() {
  const entry={name:game.name,score:game.score,correct:game.correctCount,difficulty:game.difficulty,bestStreak:game.bestStreak,date:new Date().toISOString()};
  const stored=addScore(entry);
  screen='results';render();
  if(!stored)announce('Result complete. Browser storage is disabled, so the local score was not saved.');
}
const menuLink=(target,label) => `<button class="nav-link ${screen===target?'active':''}" data-action="navigate" data-to="${target}" ${screen===target?'aria-current="page"':''}>${label}</button>`;

function shell(inner) {
  app.innerHTML=`
    <div class="site-shell">
      <header class="site-header wrap">
        <button class="brand" data-action="navigate" data-to="home" aria-label="Melody Masters — home"><span class="brand-mark">${icon('record',19)}</span><span>MELODY<span class="brand-pink">.</span>MASTERS</span></button>
        <nav class="desktop-nav" aria-label="Main navigation">${menuLink('home','THE GAME')}${menuLink('discover','THE SOUND LIBRARY')}${menuLink('leaderboard','LEADERBOARD')}</nav>
        <button class="sound-toggle" data-action="mute" aria-label="${audio.muted?'Unmute audio':'Mute audio'}" title="${audio.muted?'Unmute':'Mute'} audio">${icon(audio.muted?'muted':'sound',18)} <span>${audio.muted?'SOUND OFF':'SOUND ON'}</span></button>
      </header>
      <main id="main" class="wrap">${inner}</main>
      <footer class="site-footer wrap"><span>© MELODY MASTERS <span class="small-muted">/ REIMAGINED 2026</span></span><span>ORIGINAL PROJECT BY <strong>GROUP 30</strong> · TRINITY COLLEGE DUBLIN</span></footer>
      <nav class="mobile-nav" aria-label="Mobile navigation">${menuLink('home','PLAY')}${menuLink('discover','SOUNDS')}${menuLink('leaderboard','SCORES')}</nav>
    </div>`;
}

function waveform(classes='') {
  return `<div class="sound-visual ${classes}" aria-hidden="true">${Array.from({length:38},(_,i)=>`<span style="--i:${i};--h:${Math.round(20+Math.abs(Math.sin(i*1.13)*Math.cos(i*.31))*75)}%"></span>`).join('')}</div>`;
}
function feature(iconName,number,title,desc){return `<div class="feature-card"><span class="feature-number">${number}</span><span class="feature-icon">${icon(iconName,23)}</span><h3>${title}</h3><p>${desc}</p></div>`;}
function homeView(){
  const best=readScores()[0];
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="eyebrow-dot"></span> AN INTERACTIVE LISTENING GAME <span class="eyebrow-line"></span> VOL. 02</div>
    <h1>GOT AN <em>EAR</em><br/>FOR MUSIC<span class="hero-q">?</span></h1>
    <p class="hero-intro">Six rounds. Six sounds. One question: <strong>can you name the genre?</strong> Listen closely, trust your ears and chase your high score.</p>
    <div class="hero-actions"><button class="button primary" data-action="navigate" data-to="setup">LET'S PLAY ${icon('arrow',20)}</button><button class="button secondary" data-action="navigate" data-to="discover">EXPLORE THE SOUNDS ${icon('play',16)}</button></div>
    <div class="hero-meta"><div><strong>06</strong><span>ROUNDS</span></div><i></i><div><strong>12</strong><span>ORIGINAL TRACKS</span></div><i></i><div><strong>0</strong><span>DOWNLOADS NEEDED</span></div></div>
    </div><div class="hero-art" aria-label="Illustration of a bright pink vinyl record"><div class="hero-art-grid"></div><span class="orbit-label orbit-top">PRESS PLAY ↗</span><div class="record-halo"><div class="vinyl"><div class="vinyl-grooves"></div><div class="vinyl-label"><span>MELODY</span><b>MM</b><span>STEREO · 33⅓</span></div><div class="vinyl-hole"></div></div></div><div class="art-sticker">THE<br/>SOUND<br/>IS ON <span>✳</span></div><span class="orbit-label orbit-bottom">MADE TO BE HEARD · MM/26</span></div></section>
    <section class="ticker" aria-label="Game genres"><div class="ticker-track">${[...GENRES,...GENRES].map(g=>`<span>✳ &nbsp;${g.label.toUpperCase()}</span>`).join('')}</div></section>
    <section class="below-hero"><div class="section-heading"><div><span class="kicker">THE RULES ARE SIMPLE</span><h2>Listen. Guess.<br/><em>Get loud.</em></h2></div><p>No account. No downloads. Just your ears and a little competitive spirit.</p></div>
    <div class="feature-grid">${feature('headphones','01','HEAR THE CLIP','An original mini track plays right in your browser. Replay it as often as you need.')}${feature('sparkles','02','PICK THE GENRE','From disco to chiptune, choose the sound you hear before the clock runs out.')}${feature('trophy','03','CLIMB THE CHARTS','Earn more for speed and streaks. See your personal bests on this device.')}</div></section>
    <section class="cta-strip"><div><span class="kicker">THE CHARTS ARE CALLING</span><h2>${best?`HIGH SCORE TO BEAT: <em>${formatScore(best.score)}</em>`:'YOUR FIRST HIGH SCORE STARTS HERE.'}</h2><p>${best?`Currently held by ${escapeHtml(best.name)} on this browser.`:'Every legend starts with one round.'}</p></div><button class="button light" data-action="navigate" data-to="setup">START YOUR SET ${icon('arrow',18)}</button></section>`;
}
function setupView(){return `<div class="narrow-page"><div class="page-top"><span class="kicker">01 / YOUR SETLIST</span><h1>SET THE <em>MOOD.</em></h1><p>Tell us who's playing and choose your level. Your scores stay in this browser.</p></div><form class="setup-card" id="setup-form"><label class="form-label" for="player-name">YOUR DJ NAME</label><input id="player-name" name="name" maxlength="18" autocomplete="nickname" placeholder="e.g. DJ Stardust" value="${escapeHtml(lastPlayer==='Guest DJ'?'':lastPlayer)}"/><span class="input-hint">Optional · up to 18 characters</span><fieldset class="difficulty-set"><legend class="form-label">CHOOSE YOUR MIX</legend><div class="difficulty-grid"><label class="difficulty-option ${difficulty==='warmup'?'selected':''}"><input type="radio" name="difficulty" value="warmup" ${difficulty==='warmup'?'checked':''}/><span class="option-top">THE CLASSIC <span>01</span></span><strong>WARM-UP</strong><small>4 choices · 25 sec / round</small><span class="difficulty-tag">FIND YOUR GROOVE</span></label><label class="difficulty-option ${difficulty==='expert'?'selected':''}"><input type="radio" name="difficulty" value="expert" ${difficulty==='expert'?'checked':''}/><span class="option-top">THE DEEP CUT <span>02</span></span><strong>EXPERT</strong><small>6 choices · 18 sec / round</small><span class="difficulty-tag">1.5× POINTS</span></label></div></fieldset><button class="button primary full" type="submit">DROP THE NEEDLE ${icon('arrow',19)}</button><p class="card-footnote">${icon('info',14)} Headphones recommended. Sound starts when you begin.</p></form></div>`;}
function gameView(){
  const round=game.rounds[game.index], genre=genreById(round.track.genre);
  const questionNumber=game.index+1;
  const answered=game.answered;
  const correct=game.history.at(-1)?.correct;
  return `<section class="game-page"><div class="game-top"><div><span class="kicker">NOW SPINNING / ${String(questionNumber).padStart(2,'0')} OF ${String(ROUNDS).padStart(2,'0')}</span><h1>${answered?'THE REVEAL.':'NAME THAT <em>SOUND.</em>'}</h1></div><div class="game-score"><span>CURRENT SCORE</span><strong>${formatScore(game.score)}</strong><small>${game.streak?`✳ ${game.streak} IN A ROW`:'THE STREAK STARTS HERE'}</small></div></div>
    <div class="round-progress" aria-label="Round ${questionNumber} of ${ROUNDS}">${Array.from({length:ROUNDS},(_,i)=>`<span class="${i<game.index?'done':i===game.index?'current':''}"></span>`).join('')}</div>
    <div class="game-columns"><div class="listening-panel"><div class="panel-head"><span>TRACK ${String(questionNumber).padStart(2,'0')} / UNKNOWN ARTIST</span><span class="panel-live"><b></b><span data-playback-state>READY TO LISTEN</span></span></div><div class="mini-record"><div class="mini-disc"><div class="mini-label">MM<span>♪</span></div></div><span class="mini-record-glow"></span></div><div class="soundbar-row">${waveform()}</div><span class="clip-hint">AN ORIGINAL SOUND, MADE FOR THIS GAME</span><button class="button listen-button" data-action="replay" ${answered?'disabled':''}>${icon('replay',17)} ${answered?'ROUND COMPLETE':'REPLAY THE CLIP'} <span class="replay-count">${!answered?`−50 PTS / REPLAY · ${game.replays} USED`: '↗'}</span></button><p class="audio-error" data-audio-error hidden></p></div>
    <div class="answer-panel"><div class="answer-top"><div><span class="kicker">YOUR MISSION</span><h2>${answered?'YOU HEARD…':'WHICH GENRE<br/>IS THIS?'}</h2></div>${!answered?`<div class="timer" aria-label="Time remaining">${icon('clock',18)} <strong data-time>${Math.ceil(remaining())||DIFFICULTIES[game.difficulty].seconds}</strong><span>SEC</span></div>`:''}</div>${!answered?`<div class="timer-track"><span data-timer-bar></span></div><p class="answer-caption">Make your pick. The faster you answer, the more you score.</p><div class="answer-options">${round.options.map((option,i)=>`<button class="answer-option" data-action="answer" data-genre="${option.id}"><span class="option-key">${i+1}</span><span class="option-emoji">${option.emoji}</span><strong>${option.label}</strong>${icon('arrow',19)}</button>`).join('')}</div><div class="answer-bottom"><span>TIP: USE KEYS 1–${round.options.length} TO ANSWER</span><button data-action="answer" data-genre="" class="text-button">SKIP ROUND ${icon('skip',15)}</button></div>`: `<div class="reveal ${correct?'correct':'wrong'}"><div class="reveal-icon">${icon(correct?'check':'x',28)}</div><span class="kicker">${correct?'THAT\'S THE ONE!':game.answer===null?'TIME OR SKIP — NO POINTS':'NOT THIS TIME'}</span><h3>${genre.emoji} ${genre.label.toUpperCase()}</h3><p>${escapeHtml(genre.hint)}</p><div class="reveal-track">ORIGINAL CLIP: <strong>${escapeHtml(round.track.title)}</strong></div><div class="reveal-points">${correct?`+${formatScore(game.awarded)} POINTS`:'0 POINTS'} <span>${game.streak?`· ${game.streak} ROUND STREAK`:''}</span></div></div><button class="button primary full" data-action="next">${questionNumber===ROUNDS?'SEE YOUR RESULTS':'NEXT TRACK'} ${icon('arrow',19)}</button>`}</div></div>
    <div class="game-footer"><span>NOW PLAYING: ${escapeHtml(game.name.toUpperCase())}</span><span>${DIFFICULTIES[game.difficulty].label.toUpperCase()} MODE · SOUND GENERATED LIVE</span><button class="text-button" data-action="quit">EXIT GAME ${icon('x',13)}</button></div></section>`;
}
function resultsView(){
  const perfect=game.correctCount===ROUNDS;
  const grade=perfect?'PERFECT PITCH.':game.correctCount>=4?'YOU KNOW YOUR STUFF.':game.correctCount>=2?'GOOD EAR, DJ.':'THE REMIX AWAITS.';
  return `<section class="results-page"><div class="results-heading"><span class="kicker">YOUR SET IS COMPLETE / THE FINAL SCORE</span><h1>${grade.split(' ').slice(0,-1).join(' ')} <em>${grade.split(' ').at(-1)}</em></h1><p>Nice set, ${escapeHtml(game.name)}. Here's how you did.</p></div><div class="results-grid"><div class="final-score"><span>YOUR SCORE</span><strong>${formatScore(game.score)}</strong><small>POINTS · ${DIFFICULTIES[game.difficulty].label.toUpperCase()} MIX</small><div class="score-disc">${icon('trophy',53)}</div></div><div class="stats-column"><div><span>RIGHT ANSWERS</span><strong>${game.correctCount}<small>/${ROUNDS}</small></strong></div><div><span>BEST STREAK</span><strong>${game.bestStreak}<small>IN A ROW</small></strong></div></div></div><div class="round-recap"><div class="recap-title"><h2>YOUR TRACK RECORD</h2><span>01 — 06</span></div>${game.history.map((h,i)=>{const genre=genreById(h.genre);return `<div class="recap-row"><span class="recap-index">${String(i+1).padStart(2,'0')}</span><span class="recap-status ${h.correct?'good':'bad'}">${icon(h.correct?'check':'x',14)}</span><span class="recap-name"><strong>${escapeHtml(TRACKS.find(t=>t.id===h.trackId)?.title || '')}</strong><small>${genre.label.toUpperCase()}</small></span><strong class="recap-points">+${formatScore(h.awarded)}</strong></div>`}).join('')}</div><div class="results-actions"><button class="button primary" data-action="again">PLAY AGAIN ${icon('replay',18)}</button><button class="button secondary" data-action="navigate" data-to="leaderboard">LOCAL LEADERBOARD ${icon('trophy',18)}</button></div><p class="results-footnote">Your result is stored only in this browser. It is not uploaded to a server or shared online.</p></section>`;
}
function leaderboardView(){const scores=readScores();return `<section class="leaderboard-page"><div class="page-top leaderboard-intro"><span class="kicker">THE LOCAL HALL OF FAME</span><h1>TOP OF THE <em>CHARTS.</em></h1><p>Only your browser can see these scores. Challenge a friend on the same device to claim the top spot.</p></div><div class="leaderboard-card"><div class="leaderboard-head"><span>THE TOP 10 / THIS DEVICE</span><span>ALL-TIME SCORES</span></div>${scores.length?scores.map((s,i)=>`<div class="leader-row"><span class="leader-rank ${i<3?'top':''}">${String(i+1).padStart(2,'0')}</span><span class="leader-person"><strong>${escapeHtml(s.name)}</strong><small>${shortDate(s.date)} · ${s.difficulty==='expert'?'EXPERT':'WARM-UP'} · ${s.correct}/${ROUNDS} RIGHT</small></span><strong class="leader-score">${formatScore(s.score)}</strong></div>`).join(''):`<div class="empty-board"><span>★</span><h2>NO CHART-TOPPERS YET.</h2><p>Play your first six-round set and be the first name on the board.</p><button class="button primary" data-action="navigate" data-to="setup">TAKE THE STAGE ${icon('arrow',17)}</button></div>`}</div><div class="leader-actions"><button class="button secondary" data-action="navigate" data-to="setup">PLAY ANOTHER SET ${icon('arrow',17)}</button>${scores.length?`<button class="text-button" data-action="clear-scores">CLEAR LOCAL SCORES ${icon('x',14)}</button>`:''}</div></section>`;}
function discoverView(){return `<section class="discover-page"><div class="page-top"><span class="kicker">THE SOUND LIBRARY / A LITTLE EAR TRAINING</span><h1>KNOW YOUR <em>GENRES.</em></h1><p>New to the game? Try these six original sound bites before you play. Each style has its own musical fingerprints.</p></div><div class="genre-grid">${GENRES.map((g,i)=>`<article class="genre-card" style="--genre-color:${g.color}"><div class="genre-card-top"><span>GENRE / ${String(i+1).padStart(2,'0')}</span><button class="genre-play" data-action="preview" data-genre="${g.id}" aria-label="Play a sample of ${g.label}">${icon('play',19)}</button></div><div class="genre-symbol" aria-hidden="true">${g.emoji}</div><h2>${g.label}</h2><strong>${g.tagline}</strong><p>${g.hint}</p><span class="genre-wave" aria-hidden="true">▂ ▄ ▆ ▃ ▇ ▅ ▂ ▆ ▄ ▅ ▂</span></article>`).join('')}</div><div class="discover-bottom"><div><span class="kicker">READY FOR THE REAL THING?</span><h2>LET YOUR EARS<br/>DO THE TALKING.</h2></div><button class="button primary" data-action="navigate" data-to="setup">TAKE THE CHALLENGE ${icon('arrow',19)}</button></div><p class="discover-note">${icon('info',16)} These are original, browser-synthesised musical examples, not commercial songs or third-party audio clips.</p></section>`;}
function render(){const pages={home:homeView,setup:setupView,game:gameView,results:resultsView,leaderboard:leaderboardView,discover:discoverView};shell((pages[screen]||homeView)());updatePlaybackUI();}

app.addEventListener('change',event=>{
  if(event.target.name==='difficulty'){
    difficulty=event.target.value;
    document.querySelectorAll('.difficulty-option').forEach(e=>e.classList.toggle('selected',e.querySelector('input').checked));
  }
});
app.addEventListener('submit',event=>{
  if(event.target.id!=='setup-form')return;
  event.preventDefault();
  const data=new FormData(event.target);
  game=beginGame({name:data.get('name'),difficulty:data.get('difficulty')||'warmup'});
  lastPlayer=game.name;difficulty=game.difficulty;
  startRound();
});
app.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(action==='navigate'){navigate(button.dataset.to);return;}
  if(action==='mute'){audio.setMuted(!audio.muted);render();return;}
  if(action==='answer'){submitAnswer(button.dataset.genre||null);return;}
  if(action==='next'){
    game=nextRound(game);
    if(game.finished)finishGame();else startRound();return;
  }
  if(action==='replay'){
    if(screen!=='game'||game.answered)return;
    game=replayGame(game);render();firePlayback(game.rounds[game.index].track);return;
  }
  if(action==='preview'){
    const track=TRACKS.find(t=>t.genre===button.dataset.genre);
    firePlayback(track);announce(`Playing an original ${genreById(track.genre).label} example.`);return;
  }
  if(action==='again'){navigate('setup');return;}
  if(action==='quit'){
    if(globalThis.confirm('Leave this set? Your unfinished score will not be saved.')){game=null;navigate('home')}return;
  }
  if(action==='clear-scores'){
    if(globalThis.confirm('Clear all local Melody Masters scores from this browser?')){
      clearScores();render();announce('Local leaderboard cleared.');
    }
  }
});
window.addEventListener('keydown',event=>{
  if(event.metaKey||event.ctrlKey||event.altKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(screen==='game' && game && !game.answered){
    const n=Number(event.key);
    const options=game.rounds[game.index].options;
    if(Number.isInteger(n)&&n>=1&&n<=options.length){event.preventDefault();submitAnswer(options[n-1].id);}
    else if(event.key.toLowerCase()==='r'){event.preventDefault();game=replayGame(game);render();firePlayback(game.rounds[game.index].track);}
  }
  if(event.key.toLowerCase()==='m'){audio.setMuted(!audio.muted);render();}
});
document.addEventListener('visibilitychange',()=>{
  if(screen!=='game'||!game||game.answered)return;
  if(document.hidden){pausedAt=Date.now();clearPlayback();}
  else if(pausedAt){deadline+=Date.now()-pausedAt;pausedAt=0;updatePlaybackUI();}
});
render();
