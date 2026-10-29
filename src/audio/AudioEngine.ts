import { SOUND_LIBRARY, BASS_FREQS, SYNTH_FREQS } from '../constants/sounds';
import { Track, FxSettings } from '../types';

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterFilterNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Scheduler state
  private isPlaying = false;
  private currentStep = 0;
  private bpm = 120;
  private swingPercent = 0;
  private masterVolume = 0.85;

  private fxSettings: FxSettings = {
    cutoff: 20000,
    decay: 100,
    drive: 15,
    pitch: 0
  };

  private tracks: Track[] = [];
  private grid: number[][] = [];

  private nextNoteTime = 0.0;
  private timerID: number | null = null;
  private readonly scheduleAheadTime = 0.1; // seconds
  private readonly lookaheadMs = 25.0; // milliseconds
  private visualQueue: Array<{ step: number; time: number }> = [];

  private customBuffers: Map<string, AudioBuffer> = new Map();

  // Callbacks
  private onStepChange?: (step: number) => void;
  private onTrackTrigger?: (trackIndex: number) => void;

  constructor() {}

  public setCustomSample(id: string, buffer: AudioBuffer) {
    this.customBuffers.set(id, buffer);
  }

  public removeCustomSample(id: string) {
    this.customBuffers.delete(id);
  }

  public getCustomBuffers(): Map<string, AudioBuffer> {
    return this.customBuffers;
  }

  public async decodeAudioFile(file: File): Promise<AudioBuffer> {
    this.init();
    if (!this.audioCtx) {
      throw new Error('Không thể khởi tạo Web Audio Context');
    }
    const arrayBuffer = await file.arrayBuffer();
    return await this.audioCtx.decodeAudioData(arrayBuffer);
  }

  public init() {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    this.masterFilterNode = this.audioCtx.createBiquadFilter();
    this.masterFilterNode.type = 'lowpass';
    this.masterFilterNode.frequency.setValueAtTime(this.fxSettings.cutoff, this.audioCtx.currentTime);
    this.masterFilterNode.Q.setValueAtTime(1.2, this.audioCtx.currentTime);

    this.compressorNode = this.audioCtx.createDynamicsCompressor();
    this.compressorNode.threshold.setValueAtTime(-14, this.audioCtx.currentTime);
    this.compressorNode.knee.setValueAtTime(20, this.audioCtx.currentTime);
    this.compressorNode.ratio.setValueAtTime(6, this.audioCtx.currentTime);
    this.compressorNode.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
    this.compressorNode.release.setValueAtTime(0.18, this.audioCtx.currentTime);

    this.masterGainNode = this.audioCtx.createGain();
    this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);

    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 128;
    this.analyserNode.smoothingTimeConstant = 0.78;

    this.masterFilterNode.connect(this.compressorNode);
    this.compressorNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioCtx.destination);

    // Pre-generate 2 seconds of white noise buffer
    const bufferSize = this.audioCtx.sampleRate * 2;
    this.noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public setCallbacks(callbacks: {
    onStepChange?: (step: number) => void;
    onTrackTrigger?: (trackIndex: number) => void;
  }) {
    this.onStepChange = callbacks.onStepChange;
    this.onTrackTrigger = callbacks.onTrackTrigger;
  }

  public updateConfig(
    tracks: Track[],
    grid: number[][],
    bpm: number,
    swing: number,
    masterVolume: number,
    fx: FxSettings
  ) {
    this.tracks = tracks;
    this.grid = grid;
    this.bpm = bpm;
    this.swingPercent = swing;
    this.masterVolume = masterVolume;
    this.fxSettings = fx;

    if (this.masterGainNode && this.audioCtx) {
      this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);
    }
    if (this.masterFilterNode && this.audioCtx) {
      this.masterFilterNode.frequency.setTargetAtTime(this.fxSettings.cutoff, this.audioCtx.currentTime, 0.015);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getCurrentTime(): number {
    return this.audioCtx ? this.audioCtx.currentTime : 0;
  }

  public getVisualQueue(): Array<{ step: number; time: number }> {
    return this.visualQueue;
  }

  public popVisualQueueItem(): { step: number; time: number } | undefined {
    return this.visualQueue.shift();
  }

  private semitoneMultiplier(semitones: number): number {
    return Math.pow(2, semitones / 12);
  }

  private isTrackAudible(trackIndex: number): boolean {
    const anySolo = this.tracks.some((t) => t.solo);
    const track = this.tracks[trackIndex];
    if (!track) return false;
    if (anySolo) {
      return track.solo;
    }
    return !track.muted;
  }

  public triggerInstrument(trackIndex: number, modeValue = 1, time: number | null = null) {
    this.init();
    if (!this.audioCtx || !this.masterFilterNode) return;

    const now = time !== null ? time : this.audioCtx.currentTime;
    if (!this.isTrackAudible(trackIndex)) return;

    const track = this.tracks[trackIndex];
    if (!track) return;

    const soundId = track.soundId;
    const vol = track.volume * (1 + (this.fxSettings.drive / 100) * 0.35);

    let stepSemitoneOffset = 0;
    const soundMeta = SOUND_LIBRARY[soundId];
    if (soundMeta && !soundMeta.pitched) {
      if (modeValue === 3) stepSemitoneOffset = 4;  // HI
      if (modeValue === 4) stepSemitoneOffset = -4; // LOW
    }

    const pitchMult = this.semitoneMultiplier(this.fxSettings.pitch + (track.tune || 0) + stepSemitoneOffset);
    const decayMult = this.fxSettings.decay / 100;

    // Check if soundId is a custom uploaded sample
    if (this.customBuffers.has(soundId)) {
      const buf = this.customBuffers.get(soundId)!;
      const src = this.audioCtx.createBufferSource();
      src.buffer = buf;

      let samplePitchSemitones = this.fxSettings.pitch + (track.tune || 0);
      if (modeValue > 1) {
        samplePitchSemitones += (modeValue - 1) * 2;
      }
      const rate = this.semitoneMultiplier(samplePitchSemitones);
      src.playbackRate.setValueAtTime(rate, now);

      const gain = this.audioCtx.createGain();
      const sampleDur = (buf.duration * decayMult) / rate;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol * 0.95, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + sampleDur);

      src.connect(gain);
      gain.connect(this.masterFilterNode);
      src.start(now);
      src.stop(now + sampleDur + 0.02);

      if (time === null && this.onTrackTrigger) {
        this.onTrackTrigger(trackIndex);
      }
      return;
    }

    switch (soundId) {
      // Kicks
      case 'kick808':   this.playKick(now, vol, modeValue, pitchMult, decayMult, '808'); break;
      case 'kick909':   this.playKick(now, vol, modeValue, pitchMult, decayMult, '909'); break;
      case 'kickDry':   this.playKick(now, vol, modeValue, pitchMult, decayMult, 'dry'); break;
      case 'kickHard':  this.playKick(now, vol, modeValue, pitchMult, decayMult, 'hard'); break;

      // Snares & Claps
      case 'snareCrisp':
      case 'snare909':  this.playSnare(now, vol, modeValue, pitchMult, decayMult, 'crisp'); break;
      case 'snare808':  this.playSnare(now, vol, modeValue, pitchMult, decayMult, '808'); break;
      case 'rimshot':   this.playSnare(now, vol, modeValue, pitchMult, decayMult, 'rim'); break;
      case 'clapStudio':this.playClap(now, vol, modeValue, pitchMult, decayMult, false); break;
      case 'clapFat':   this.playClap(now, vol, modeValue, pitchMult, decayMult, true); break;

      // Hats & Cymbals
      case 'hatClosed': this.playHiHat(now, vol, false, modeValue, pitchMult, decayMult); break;
      case 'hatOpen':   this.playHiHat(now, vol, true, modeValue, pitchMult, decayMult); break;
      case 'shaker':    this.playShaker(now, vol, modeValue, pitchMult, decayMult); break;
      case 'rideCym':   this.playCymbal(now, vol, modeValue, pitchMult, decayMult, false); break;
      case 'crashCym':  this.playCymbal(now, vol, modeValue, pitchMult, decayMult, true); break;

      // Percussion & FX
      case 'tomLow':    this.playTom(now, vol, modeValue, pitchMult * 0.85, decayMult); break;
      case 'tomHi':     this.playTom(now, vol, modeValue, pitchMult * 1.45, decayMult); break;
      case 'cowbell':   this.playCowbell(now, vol, modeValue, pitchMult, decayMult); break;
      case 'clave':     this.playClave(now, vol, modeValue, pitchMult, decayMult); break;
      case 'laserZap':  this.playLaser(now, vol, modeValue, pitchMult, decayMult); break;
      case 'vinylHit':  this.playVinyl(now, vol, modeValue, pitchMult, decayMult); break;

      // Basses (Pitched)
      case 'bassSub':   this.playSubBass(now, vol, modeValue, pitchMult, decayMult, 'sub'); break;
      case 'bassAcid':  this.playSubBass(now, vol, modeValue, pitchMult, decayMult, 'acid'); break;
      case 'bassReese': this.playSubBass(now, vol, modeValue, pitchMult, decayMult, 'reese'); break;
      case 'bassSlap':  this.playSubBass(now, vol, modeValue, pitchMult, decayMult, 'slap'); break;

      // Melodic Synths (Pitched)
      case 'synthPluck':this.playSynth(now, vol, modeValue, pitchMult, decayMult, 'pluck'); break;
      case 'synthChord':this.playSynth(now, vol, modeValue, pitchMult, decayMult, 'chord'); break;
      case 'synthLead': this.playSynth(now, vol, modeValue, pitchMult, decayMult, 'lead'); break;
      case 'synthBell': this.playSynth(now, vol, modeValue, pitchMult, decayMult, 'bell'); break;
      case 'synthArp':  this.playSynth(now, vol, modeValue, pitchMult, decayMult, 'arp'); break;

      default:          this.playKick(now, vol, modeValue, pitchMult, decayMult, '808');
    }

    if (time === null && this.onTrackTrigger) {
      this.onTrackTrigger(trackIndex);
    }
  }

  // --- 1. Multi-model Kick ---
  private playKick(time: number, volume: number, mode: number, pitchMult: number, decayMult: number, style: '808' | '909' | 'dry' | 'hard') {
    if (!this.audioCtx || !this.masterFilterNode) return;
    const osc = this.audioCtx.createOscillator();
    const clickOsc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const clickGain = this.audioCtx.createGain();

    const isAccent = mode === 2;
    let dur = 0.42 * decayMult;
    let startFreq = 150 * pitchMult;
    let endFreq = 42 * pitchMult;

    if (style === '909') {
      dur = 0.32 * decayMult;
      startFreq = 195 * pitchMult;
      endFreq = 48 * pitchMult;
    } else if (style === 'dry') {
      dur = 0.20 * decayMult;
      startFreq = 130 * pitchMult;
      endFreq = 52 * pitchMult;
    } else if (style === 'hard') {
      dur = 0.36 * decayMult;
      startFreq = 220 * pitchMult;
      endFreq = 45 * pitchMult;
    }

    const level = volume * (isAccent ? 1.2 : 1.0);
    osc.type = style === 'hard' ? 'sawtooth' : 'sine';

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(65 * pitchMult, time + 0.04);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(360 * pitchMult, time);
    clickOsc.frequency.exponentialRampToValueAtTime(45, time + 0.025);

    clickGain.gain.setValueAtTime(level * (style === '909' ? 0.65 : 0.4), time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

    if (style === 'hard') {
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, time);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    clickOsc.connect(clickGain);
    gain.connect(this.masterFilterNode);
    clickGain.connect(this.masterFilterNode);

    osc.start(time);
    osc.stop(time + dur + 0.02);
    clickOsc.start(time);
    clickOsc.stop(time + 0.03);
  }

  // --- 2. Snare & Rimshot ---
  private playSnare(time: number, volume: number, mode: number, pitchMult: number, decayMult: number, style: 'crisp' | '808' | 'rim') {
    if (!this.audioCtx || !this.masterFilterNode || !this.noiseBuffer) return;
    const isRim = style === 'rim' || mode === 3;
    const level = volume * (mode === 2 ? 1.18 : 0.95);

    const osc = this.audioCtx.createOscillator();
    const oscGain = this.audioCtx.createGain();
    osc.type = 'triangle';
    const bodyFreq = isRim ? 420 : (style === '808' ? 185 : 220);
    osc.frequency.setValueAtTime(bodyFreq * pitchMult, time);
    osc.frequency.exponentialRampToValueAtTime((isRim ? 290 : 110) * pitchMult, time + 0.09);

    oscGain.gain.setValueAtTime(level * 0.75, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + (isRim ? 0.055 : 0.13));

    osc.connect(oscGain);
    oscGain.connect(this.masterFilterNode);
    osc.start(time);
    osc.stop(time + 0.14);

    if (isRim) return;

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(style === '808' ? 1500 : 1000, time);

    const noiseGain = this.audioCtx.createGain();
    const noiseDur = (style === '808' ? 0.16 : 0.24) * decayMult;
    noiseGain.gain.setValueAtTime(level * 0.85, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterFilterNode);

    noise.start(time);
    noise.stop(time + noiseDur + 0.02);
  }

  // --- 3 & 4. Hi-Hat ---
  private playHiHat(time: number, volume: number, isOpen: boolean, mode: number, pitchMult: number, decayMult: number) {
    if (!this.audioCtx || !this.masterFilterNode || !this.noiseBuffer) return;
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const bandpass = this.audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(9200 * pitchMult, time);
    bandpass.Q.setValueAtTime(1.4, time);

    const highpass = this.audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(6800, time);

    const gain = this.audioCtx.createGain();
    let dur = isOpen ? 0.36 : 0.055;
    dur *= decayMult;
    const level = volume * (mode === 2 ? 1.15 : 0.85);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.masterFilterNode);

    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  // --- 5. Hand Clap ---
  private playClap(time: number, volume: number, mode: number, pitchMult: number, decayMult: number, isFat = false) {
    if (!this.audioCtx || !this.masterFilterNode || !this.noiseBuffer) return;
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((isFat ? 1150 : 1400) * pitchMult, time);
    filter.Q.setValueAtTime(isFat ? 1.2 : 1.8, time);

    const gain = this.audioCtx.createGain();
    const tailDur = (isFat ? 0.36 : 0.21) * decayMult;
    const level = volume * (mode === 2 ? 1.15 : 0.9);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.010);

    gain.gain.setValueAtTime(level, time + 0.011);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.020);

    gain.gain.setValueAtTime(level, time + 0.021);
    gain.gain.exponentialRampToValueAtTime(0.001, time + tailDur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilterNode);

    noise.start(time);
    noise.stop(time + tailDur + 0.02);
  }

  // --- 6. Shaker & Cymbals ---
  private playShaker(time: number, volume: number, _mode: number, pitchMult: number, decayMult: number) {
    if (!this.audioCtx || !this.masterFilterNode || !this.noiseBuffer) return;
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7500 * pitchMult, time);
    filter.Q.setValueAtTime(2.5, time);

    const gain = this.audioCtx.createGain();
    const dur = 0.08 * decayMult;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume * 0.75, time + 0.022);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilterNode);
    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  private playCymbal(time: number, volume: number, _mode: number, pitchMult: number, decayMult: number, isCrash = false) {
    if (!this.audioCtx || !this.masterFilterNode || !this.noiseBuffer) return;
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const hp = this.audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime((isCrash ? 3800 : 5800) * pitchMult, time);

    const gain = this.audioCtx.createGain();
    const dur = (isCrash ? 0.95 : 0.48) * decayMult;
    gain.gain.setValueAtTime(volume * 0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    if (!isCrash) {
      const bellOsc = this.audioCtx.createOscillator();
      const bellGain = this.audioCtx.createGain();
      bellOsc.type = 'square';
      bellOsc.frequency.setValueAtTime(980 * pitchMult, time);
      bellGain.gain.setValueAtTime(volume * 0.15, time);
      bellGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      bellOsc.connect(bellGain);
      bellGain.connect(this.masterFilterNode);
      bellOsc.start(time);
      bellOsc.stop(time + 0.2);
    }

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterFilterNode);
    noise.start(time);
    noise.stop(time + dur + 0.03);
  }

  // --- 7. Percussion: Tom, Cowbell, Clave, Laser, Vinyl ---
  private playTom(time: number, volume: number, _mode: number, pitchMult: number, decayMult: number) {
    if (!this.audioCtx || !this.masterFilterNode) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const baseFreq = 130 * pitchMult;
    const dur = 0.24 * decayMult;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.6, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, time + dur);

    gain.gain.setValueAtTime(volume * 0.95, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.masterFilterNode);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private playCowbell(time: number, volume: number, _mode: number, pitchMult: number, decayMult: number) {
    if (!this.audioCtx || !this.masterFilterNode) return;
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(540 * pitchMult, time);
    osc2.frequency.setValueAtTime(800 * pitchMult, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700 * pitchMult, time);
    filter.Q.setValueAtTime(2.6, time);

    const dur = 0.22 * decayMult;
    gain.gain.setValueAtTime(volume * 0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilterNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  private playClave(time: number, volume: number, _mode: number, pitchMult: number, decayMult: number) {
    if (!this.audioCtx || !this.masterFilterNode) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2150 * pitchMult, time);
    const dur = 0.045 * decayMult;
    gain.gain.setValueAtTime(volume * 0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.masterFilterNode);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  private playLaser(time: number, volume: number, _mode: number, pitchMult: number, decayMult: number) {
    if (!this.audioCtx || !this.masterFilterNode) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const dur = 0.22 * decayMult;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600 * pitchMult, time);
    osc.frequency.exponentialRampToValueAtTime(75 * pitchMult, time + dur);

    gain.gain.setValueAtTime(volume * 0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.masterFilterNode);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private playVinyl(time: number, volume: number, _mode: number, pitchMult: number, decayMult: number) {
    if (!this.audioCtx || !this.masterFilterNode || !this.noiseBuffer) return;
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200 * pitchMult, time);
    filter.Q.setValueAtTime(0.9, time);

    const gain = this.audioCtx.createGain();
    const dur = 0.35 * decayMult;
    gain.gain.setValueAtTime(volume * 0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilterNode);
    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  // --- 8. Bass Synths ---
  private playSubBass(time: number, volume: number, mode: number, pitchMult: number, decayMult: number, style: 'sub' | 'acid' | 'reese' | 'slap') {
    if (!this.audioCtx || !this.masterFilterNode) return;
    const freqIndex = Math.min(Math.max(mode, 1), BASS_FREQS.length - 1);
    const freq = BASS_FREQS[freqIndex] * pitchMult;
    const dur = (style === 'reese' ? 0.38 : 0.26) * decayMult;

    const osc = this.audioCtx.createOscillator();
    const subOsc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    osc.type = style === 'slap' ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = style === 'reese' ? 'sawtooth' : 'sine';
    subOsc.frequency.setValueAtTime(style === 'reese' ? freq * 1.008 : freq, time);

    filter.type = 'lowpass';
    if (style === 'acid') {
      filter.frequency.setValueAtTime(freq * 11, time);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.4, time + dur * 0.75);
      filter.Q.setValueAtTime(10.5, time);
    } else if (style === 'slap') {
      filter.frequency.setValueAtTime(freq * 9, time);
      filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.09);
      filter.Q.setValueAtTime(4.5, time);
    } else {
      filter.frequency.setValueAtTime(freq * 5.5, time);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + dur * 0.85);
      filter.Q.setValueAtTime(2.8, time);
    }

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume * 0.75, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilterNode);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + dur + 0.02);
    subOsc.stop(time + dur + 0.02);
  }

  // --- 9. Melodic Synths ---
  private playSynth(time: number, volume: number, mode: number, pitchMult: number, decayMult: number, style: 'pluck' | 'chord' | 'lead' | 'bell' | 'arp') {
    if (!this.audioCtx || !this.masterFilterNode) return;
    const freqIndex = Math.min(Math.max(mode, 1), SYNTH_FREQS.length - 1);
    const rootFreq = SYNTH_FREQS[freqIndex] * pitchMult;
    const dur = (style === 'chord' ? 0.42 : (style === 'arp' ? 0.16 : 0.30)) * decayMult;

    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(style === 'bell' ? 5200 : 3800, time);
    filter.frequency.exponentialRampToValueAtTime(style === 'lead' ? 1400 : 520, time + dur);
    filter.Q.setValueAtTime(style === 'lead' ? 3.5 : 1.8, time);

    let intervals = [1, 1.006, 1.498];
    if (style === 'chord') intervals = [1, 1.189, 1.498, 1.782];
    if (style === 'lead')  intervals = [1, 1.008, 0.5];
    if (style === 'bell')  intervals = [1, 2.0, 3.01];
    if (style === 'arp')   intervals = [1];

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume * (style === 'arp' ? 0.55 : 0.36), time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    intervals.forEach((ratio, idx) => {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      if (style === 'arp') osc.type = 'square';
      else if (style === 'bell') osc.type = 'sine';
      else osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';

      osc.frequency.setValueAtTime(rootFreq * ratio, time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    });

    filter.connect(gain);
    gain.connect(this.masterFilterNode);
  }

  // --- Scheduler ---
  private nextStep() {
    const secondsPerBeat = 60.0 / this.bpm;
    const sixteenthTime = 0.25 * secondsPerBeat;

    const swingOffset = (this.swingPercent / 100) * (sixteenthTime * 0.66);
    if (this.currentStep % 2 === 0) {
      this.nextNoteTime += sixteenthTime + swingOffset;
    } else {
      this.nextNoteTime += sixteenthTime - swingOffset;
    }

    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(stepNumber: number, time: number) {
    this.visualQueue.push({ step: stepNumber, time });

    for (let t = 0; t < this.tracks.length; t++) {
      const stepVal = this.grid[t] ? this.grid[t][stepNumber] : 0;
      if (stepVal > 0) {
        this.triggerInstrument(t, stepVal, time);
      }
    }
  }

  private scheduler = () => {
    if (!this.audioCtx) return;
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextStep();
    }
    this.timerID = window.setTimeout(this.scheduler, this.lookaheadMs);
  };

  public togglePlay(): boolean {
    this.init();
    if (!this.audioCtx) return false;

    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.currentStep = 0;
      this.nextNoteTime = this.audioCtx.currentTime + 0.04;
      this.scheduler();
    } else {
      if (this.timerID !== null) {
        clearTimeout(this.timerID);
        this.timerID = null;
      }
      this.visualQueue = [];
      if (this.onStepChange) {
        this.onStepChange(-1);
      }
    }

    return this.isPlaying;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioEngine = new AudioEngine();
