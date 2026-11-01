/** Browser-side musical synthesis. All sound is generated at playback time. */
import { genreById } from './catalog.js';
const noteHz = midi => 440 * 2 ** ((midi - 69) / 12);

export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.sources = [];
    this.muted = false;
    this.playing = false;
    this.generation = 0;
  }

  async ensureAudio() {
    if (!this.context) {
      const AudioContextType = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextType) throw new Error('Web Audio is unavailable in this browser.');
      this.context = new AudioContextType();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : .55;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : .55, this.context.currentTime, .025);
  }

  stop() {
    this.generation++;
    for (const source of this.sources) {
      try { source.stop(); } catch { /* source has already finished */ }
      try { source.disconnect(); } catch { /* already disconnected */ }
    }
    this.sources = [];
    this.playing = false;
  }

  voice(midi, start, length, { shape='sine', gain=.11, detune=0, attack=.02, release=.15, filter=0 } = {}) {
    const ctx=this.context;
    const osc=ctx.createOscillator();
    const vol=ctx.createGain();
    osc.type=shape;
    osc.frequency.setValueAtTime(noteHz(midi),start);
    osc.detune.value=detune;
    let output=osc;
    if (filter) {
      const f=ctx.createBiquadFilter(); f.type='lowpass';f.frequency.value=filter;
      output.connect(f);output=f;
    }
    output.connect(vol);vol.connect(this.master);
    const a=Math.min(attack, length/3), end=start+length;
    vol.gain.setValueAtTime(.0001, start);
    vol.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+a);
    vol.gain.setTargetAtTime(.0001,Math.max(start+a,end-release),Math.max(.025,release/4));
    osc.start(start);osc.stop(end+.08);
    this.sources.push(osc);
  }

  percussion(start, kind='kick', gain=.09) {
    const ctx=this.context;
    const osc=ctx.createOscillator(), vol=ctx.createGain();
    osc.type=kind==='kick'?'sine':'triangle';
    osc.frequency.setValueAtTime(kind==='kick'?135:275,start);
    osc.frequency.exponentialRampToValueAtTime(kind==='kick'?47:82,start+(kind==='kick'?.13:.06));
    vol.gain.setValueAtTime(gain,start);
    vol.gain.exponentialRampToValueAtTime(.0001,start+(kind==='kick'?.18:.09));
    osc.connect(vol);vol.connect(this.master);
    osc.start(start);osc.stop(start+.2);this.sources.push(osc);
  }

  async play(track) {
    this.stop();
    const serial=this.generation;
    await this.ensureAudio();
    if(serial!==this.generation)return 0;
    const genre=genreById(track.genre);
    const ctx=this.context;
    const beat=60/track.bpm;
    const start=ctx.currentTime+.07;
    const swing=track.genre==='jazz';
    const mellow=track.genre==='lofi';
    const chip=track.genre==='chiptune';
    const dance=track.genre==='disco'||track.genre==='house';
    const tone=genre.wave;

    for(let bar=0;bar<2;bar++) {
      const offset=bar*8*beat;
      for(let step=0;step<16;step++){
        const pitch=track.notes[step];
        const t=start+offset+step*beat/2 + (swing&&step%2?beat*.12:0);
        if(pitch!==null){
          const length=chip?beat*.27:mellow?beat*.55:beat*.38;
          this.voice(track.root+pitch,t,length,{shape:tone,gain:chip?.075:mellow?.115:.072,attack:chip?.004:.014,release:chip?.03:.13,filter:mellow?850:track.genre==='synthwave'?1900:0});
          if(track.genre==='synthwave'||track.genre==='house')this.voice(track.root+pitch-12,t,length*.95,{shape:'sine',gain:.03,attack:.035,release:.08});
        }
      }
      for(let b=0;b<8;b++){
        const t=start+offset+b*beat;
        const bass=track.bass[b%4];
        this.voice(track.root-12+bass,t,beat*(dance?.48:.75),{shape:track.genre==='jazz'?'triangle':'sine',gain:dance?.135:.1,attack:.012,release:.1});
        if(dance)this.percussion(t,'kick',.16);
        else if(chip && b%2===0)this.percussion(t,'kick',.06);
        else if(mellow&&b%2===0)this.percussion(t,'kick',.055);
        else if(swing&&b%2===1)this.percussion(t+beat*.08,'tap',.035);
      }
      if(dance){
        for(let h=0;h<16;h++)if(h%2===1)this.percussion(start+offset+h*beat/2,'tap',.025);
      }
      if(track.genre==='synthwave'){
        for(let c=0;c<2;c++){
          const chord=start+offset+c*4*beat;
          for(const interval of [0,7,12])this.voice(track.root-5+interval,chord,beat*3.6,{shape:'sawtooth',gain:.012,attack:.28,release:.9,filter:450});
        }
      }
      if(mellow||swing){
        for(let c=0;c<2;c++){
          const chord=start+offset+c*4*beat;
          for(const interval of mellow?[0,4,7,11]:[0,4,10,14]){
            this.voice(track.root+interval-12,chord,beat*2.9,{shape:'sine',gain:.022,attack:.13,release:.5});
          }
        }
      }
    }
    this.playing=true;
    return 16*beat;
  }
}
