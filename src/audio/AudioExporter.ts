import { Track, FxSettings } from '../types';
import { SOUND_LIBRARY, BASS_FREQS, SYNTH_FREQS } from '../constants/sounds';
// @ts-expect-error lamejs does not have official TypeScript declarations
import * as lamejsModule from 'lamejs';

// Resolve lamejs whether imported as default or namespace
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lamejs: any = (lamejsModule as any).default || lamejsModule;

export interface ExportOptions {
  format: 'wav' | 'mp3';
  loops: number; // 1, 2, 4, 8
  includeTail: boolean; // tail reverb/decay
  mp3Kbps?: number; // 128, 192, 320
}

export class AudioExporter {
  public static async renderPattern(
    tracks: Track[],
    grid: number[][],
    bpm: number,
    swingPercent: number,
    masterVolume: number,
    fx: FxSettings,
    customBuffers: Map<string, AudioBuffer>,
    options: ExportOptions,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<Blob> {
    onProgress?.(0.1, 'Đang chuẩn bị mô phỏng âm thanh...');

    const sampleRate = 44100;
    const secondsPerBeat = 60.0 / bpm;
    const sixteenthTime = 0.25 * secondsPerBeat;
    const tailSeconds = options.includeTail ? 1.2 : 0.2;
    const totalSteps = 16 * options.loops;
    const totalPatternSeconds = totalSteps * sixteenthTime;
    const totalDuration = totalPatternSeconds + tailSeconds;

    const totalSamples = Math.ceil(totalDuration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

    // Setup Master Processing Chain
    const masterFilter = offlineCtx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.setValueAtTime(fx.cutoff, 0);
    masterFilter.Q.setValueAtTime(1.2, 0);

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, 0);
    compressor.knee.setValueAtTime(20, 0);
    compressor.ratio.setValueAtTime(6, 0);
    compressor.attack.setValueAtTime(0.003, 0);
    compressor.release.setValueAtTime(0.18, 0);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, 0);

    masterFilter.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    // Generate White Noise Buffer for percussion
    const noiseBufferSize = sampleRate * 2;
    const noiseBuffer = offlineCtx.createBuffer(1, noiseBufferSize, sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const anySolo = tracks.some((t) => t.solo);
    const isAudible = (tIdx: number) => {
      const track = tracks[tIdx];
      if (!track) return false;
      return anySolo ? track.solo : !track.muted;
    };

    const semitoneMultiplier = (semitones: number) => Math.pow(2, semitones / 12);

    // Schedule all steps
    let currentTime = 0.02;
    for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
      const stepInBar = stepIndex % 16;

      // Trigger all tracks active on this step
      for (let t = 0; t < tracks.length; t++) {
        const stepVal = grid[t] ? grid[t][stepInBar] : 0;
        if (stepVal > 0 && isAudible(t)) {
          const track = tracks[t];
          const soundId = track.soundId;
          const vol = track.volume * (1 + (fx.drive / 100) * 0.35);

          let stepSemitoneOffset = 0;
          const soundMeta = SOUND_LIBRARY[soundId];
          if (soundMeta && !soundMeta.pitched) {
            if (stepVal === 3) stepSemitoneOffset = 4;
            if (stepVal === 4) stepSemitoneOffset = -4;
          }

          const pitchMult = semitoneMultiplier(fx.pitch + (track.tune || 0) + stepSemitoneOffset);
          const decayMult = fx.decay / 100;

          // Check if it's a custom uploaded sample
          if (customBuffers.has(soundId)) {
            const buf = customBuffers.get(soundId)!;
            const src = offlineCtx.createBufferSource();
            src.buffer = buf;

            // Pitch shifted playback rate
            let samplePitchSemitones = fx.pitch + (track.tune || 0);
            if (stepVal > 1) {
              samplePitchSemitones += (stepVal - 1) * 2; // pitch variation
            }
            src.playbackRate.setValueAtTime(semitoneMultiplier(samplePitchSemitones), currentTime);

            const sampleGain = offlineCtx.createGain();
            const sampleDur = (buf.duration * decayMult) / semitoneMultiplier(samplePitchSemitones);
            sampleGain.gain.setValueAtTime(0.001, currentTime);
            sampleGain.gain.linearRampToValueAtTime(vol * 0.95, currentTime + 0.003);
            sampleGain.gain.exponentialRampToValueAtTime(0.001, currentTime + sampleDur);

            src.connect(sampleGain);
            sampleGain.connect(masterFilter);
            src.start(currentTime);
            src.stop(currentTime + sampleDur + 0.02);
            continue;
          }

          // Procedural synthesis
          this.scheduleProceduralSound(
            offlineCtx,
            masterFilter,
            noiseBuffer,
            soundId,
            currentTime,
            vol,
            stepVal,
            pitchMult,
            decayMult
          );
        }
      }

      // Next step time with swing
      const swingOffset = (swingPercent / 100) * (sixteenthTime * 0.66);
      if (stepInBar % 2 === 0) {
        currentTime += sixteenthTime + swingOffset;
      } else {
        currentTime += sixteenthTime - swingOffset;
      }
    }

    onProgress?.(0.35, 'Đang tổng hợp các rãnh âm thanh đa tần (Offline Audio Context)...');
    const renderedBuffer = await offlineCtx.startRendering();

    if (options.format === 'wav') {
      onProgress?.(0.8, 'Đang mã hóa định dạng WAV Studio Lossless (44.1kHz, 16-bit PCM)...');
      const wavBlob = this.encodeWav(renderedBuffer);
      onProgress?.(1.0, 'Hoàn tất xuất file WAV!');
      return wavBlob;
    } else {
      onProgress?.(0.65, `Đang mã hóa định dạng MP3 (${options.mp3Kbps || 320} kbps)...`);
      const mp3Blob = await this.encodeMp3(renderedBuffer, options.mp3Kbps || 320, (p) => {
        onProgress?.(0.65 + p * 0.3, `Đang nén MP3: ${Math.round(p * 100)}%...`);
      });
      onProgress?.(1.0, 'Hoàn tất xuất file MP3!');
      return mp3Blob;
    }
  }

  // Pure TypeScript WAV Encoder (Lossless 16-bit 44.1kHz Stereo PCM)
  public static encodeWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const left = audioBuffer.getChannelData(0);
    const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;
    const numSamples = left.length;

    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length minus RIFF identifier & length itself
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, format, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate
    view.setUint32(28, byteRate, true);
    // block align
    view.setUint16(32, blockAlign, true);
    // bits per sample
    view.setUint16(34, bitDepth, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataSize, true);

    // Write interleaved 16-bit PCM samples with clipping protection
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      let sL = Math.max(-1, Math.min(1, left[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7fff, true);
      offset += 2;

      let sR = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // MP3 Encoder using lamejs
  public static async encodeMp3(
    audioBuffer: AudioBuffer,
    kbps = 320,
    onProgress?: (ratio: number) => void
  ): Promise<Blob> {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const left = audioBuffer.getChannelData(0);
    const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

    // Convert Float32Array [-1, 1] to Int16Array [-32768, 32767]
    const leftInt16 = new Int16Array(left.length);
    const rightInt16 = new Int16Array(right.length);

    for (let i = 0; i < left.length; i++) {
      const sL = Math.max(-1, Math.min(1, left[i]));
      leftInt16[i] = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
      const sR = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
    }

    // Initialize Mp3Encoder
    const Mp3Encoder = lamejs.Mp3Encoder || lamejsModule.Mp3Encoder;
    if (!Mp3Encoder) {
      throw new Error('Không tìm thấy thư viện lamejs Mp3Encoder');
    }

    const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data: Uint8Array[] = [];

    const sampleBlockSize = 1152;
    const totalBlocks = Math.ceil(leftInt16.length / sampleBlockSize);

    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }

      if (i % (sampleBlockSize * 25) === 0) {
        onProgress?.(i / (totalBlocks * sampleBlockSize));
        // Allow UI to breathe
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
  }

  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Procedural Sound Dispatcher for Offline Context
  private static scheduleProceduralSound(
    ctx: BaseAudioContext,
    destination: AudioNode,
    noiseBuffer: AudioBuffer,
    soundId: string,
    time: number,
    vol: number,
    mode: number,
    pitchMult: number,
    decayMult: number
  ) {
    switch (soundId) {
      case 'kick808':  this.kick(ctx, destination, time, vol, mode, pitchMult, decayMult, '808'); break;
      case 'kick909':  this.kick(ctx, destination, time, vol, mode, pitchMult, decayMult, '909'); break;
      case 'kickDry':  this.kick(ctx, destination, time, vol, mode, pitchMult, decayMult, 'dry'); break;
      case 'kickHard': this.kick(ctx, destination, time, vol, mode, pitchMult, decayMult, 'hard'); break;

      case 'snareCrisp':
      case 'snare909': this.snare(ctx, destination, noiseBuffer, time, vol, mode, pitchMult, decayMult, 'crisp'); break;
      case 'snare808': this.snare(ctx, destination, noiseBuffer, time, vol, mode, pitchMult, decayMult, '808'); break;
      case 'rimshot':  this.snare(ctx, destination, noiseBuffer, time, vol, mode, pitchMult, decayMult, 'rim'); break;
      case 'clapStudio':this.clap(ctx, destination, noiseBuffer, time, vol, mode, pitchMult, decayMult, false); break;
      case 'clapFat':  this.clap(ctx, destination, noiseBuffer, time, vol, mode, pitchMult, decayMult, true); break;

      case 'hatClosed':this.hihat(ctx, destination, noiseBuffer, time, vol, false, mode, pitchMult, decayMult); break;
      case 'hatOpen':  this.hihat(ctx, destination, noiseBuffer, time, vol, true, mode, pitchMult, decayMult); break;
      case 'shaker':   this.shaker(ctx, destination, noiseBuffer, time, vol, pitchMult, decayMult); break;
      case 'rideCym':  this.cymbal(ctx, destination, noiseBuffer, time, vol, pitchMult, decayMult, false); break;
      case 'crashCym': this.cymbal(ctx, destination, noiseBuffer, time, vol, pitchMult, decayMult, true); break;

      case 'tomLow':   this.tom(ctx, destination, time, vol, pitchMult * 0.85, decayMult); break;
      case 'tomHi':    this.tom(ctx, destination, time, vol, pitchMult * 1.45, decayMult); break;
      case 'cowbell':  this.cowbell(ctx, destination, time, vol, pitchMult, decayMult); break;
      case 'clave':    this.clave(ctx, destination, time, vol, pitchMult, decayMult); break;
      case 'laserZap': this.laser(ctx, destination, time, vol, pitchMult, decayMult); break;
      case 'vinylHit': this.vinyl(ctx, destination, noiseBuffer, time, vol, pitchMult, decayMult); break;

      case 'bassSub':  this.subBass(ctx, destination, time, vol, mode, pitchMult, decayMult, 'sub'); break;
      case 'bassAcid': this.subBass(ctx, destination, time, vol, mode, pitchMult, decayMult, 'acid'); break;
      case 'bassReese':this.subBass(ctx, destination, time, vol, mode, pitchMult, decayMult, 'reese'); break;
      case 'bassSlap': this.subBass(ctx, destination, time, vol, mode, pitchMult, decayMult, 'slap'); break;

      case 'synthPluck':this.synth(ctx, destination, time, vol, mode, pitchMult, decayMult, 'pluck'); break;
      case 'synthChord':this.synth(ctx, destination, time, vol, mode, pitchMult, decayMult, 'chord'); break;
      case 'synthLead': this.synth(ctx, destination, time, vol, mode, pitchMult, decayMult, 'lead'); break;
      case 'synthBell': this.synth(ctx, destination, time, vol, mode, pitchMult, decayMult, 'bell'); break;
      case 'synthArp':  this.synth(ctx, destination, time, vol, mode, pitchMult, decayMult, 'arp'); break;

      default:         this.kick(ctx, destination, time, vol, mode, pitchMult, decayMult, '808');
    }
  }

  private static kick(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    volume: number,
    mode: number,
    pitchMult: number,
    decayMult: number,
    style: string
  ) {
    const osc = ctx.createOscillator();
    const clickOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    const clickGain = ctx.createGain();

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
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, time);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    clickOsc.connect(clickGain);
    gain.connect(dest);
    clickGain.connect(dest);

    osc.start(time);
    osc.stop(time + dur + 0.02);
    clickOsc.start(time);
    clickOsc.stop(time + 0.03);
  }

  private static snare(
    ctx: BaseAudioContext,
    dest: AudioNode,
    noiseBuffer: AudioBuffer,
    time: number,
    volume: number,
    mode: number,
    pitchMult: number,
    decayMult: number,
    style: string
  ) {
    const isRim = style === 'rim' || mode === 3;
    const level = volume * (mode === 2 ? 1.18 : 0.95);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    const bodyFreq = isRim ? 420 : style === '808' ? 185 : 220;
    osc.frequency.setValueAtTime(bodyFreq * pitchMult, time);
    osc.frequency.exponentialRampToValueAtTime((isRim ? 290 : 110) * pitchMult, time + 0.09);

    oscGain.gain.setValueAtTime(level * 0.75, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + (isRim ? 0.055 : 0.13));

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.14);

    if (isRim) return;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(style === '808' ? 1500 : 1000, time);

    const noiseGain = ctx.createGain();
    const noiseDur = (style === '808' ? 0.16 : 0.24) * decayMult;
    noiseGain.gain.setValueAtTime(level * 0.85, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(time);
    noise.stop(time + noiseDur + 0.02);
  }

  private static hihat(
    ctx: BaseAudioContext,
    dest: AudioNode,
    noiseBuffer: AudioBuffer,
    time: number,
    volume: number,
    isOpen: boolean,
    mode: number,
    pitchMult: number,
    decayMult: number
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(9200 * pitchMult, time);
    bandpass.Q.setValueAtTime(1.4, time);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(6800, time);

    const gain = ctx.createGain();
    let dur = isOpen ? 0.36 : 0.055;
    dur *= decayMult;
    const level = volume * (mode === 2 ? 1.15 : 0.85);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(dest);

    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  private static clap(
    ctx: BaseAudioContext,
    dest: AudioNode,
    noiseBuffer: AudioBuffer,
    time: number,
    volume: number,
    mode: number,
    pitchMult: number,
    decayMult: number,
    isFat: boolean
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((isFat ? 1150 : 1400) * pitchMult, time);
    filter.Q.setValueAtTime(isFat ? 1.2 : 1.8, time);

    const gain = ctx.createGain();
    const tailDur = (isFat ? 0.36 : 0.21) * decayMult;
    const level = volume * (mode === 2 ? 1.15 : 0.9);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.01);
    gain.gain.setValueAtTime(level, time + 0.011);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.02);
    gain.gain.setValueAtTime(level, time + 0.021);
    gain.gain.exponentialRampToValueAtTime(0.001, time + tailDur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + tailDur + 0.02);
  }

  private static shaker(
    ctx: BaseAudioContext,
    dest: AudioNode,
    noiseBuffer: AudioBuffer,
    time: number,
    volume: number,
    pitchMult: number,
    decayMult: number
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7500 * pitchMult, time);
    filter.Q.setValueAtTime(2.5, time);

    const gain = ctx.createGain();
    const dur = 0.08 * decayMult;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume * 0.75, time + 0.022);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  private static cymbal(
    ctx: BaseAudioContext,
    dest: AudioNode,
    noiseBuffer: AudioBuffer,
    time: number,
    volume: number,
    pitchMult: number,
    decayMult: number,
    isCrash: boolean
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime((isCrash ? 3800 : 5800) * pitchMult, time);

    const gain = ctx.createGain();
    const dur = (isCrash ? 0.95 : 0.48) * decayMult;
    gain.gain.setValueAtTime(volume * 0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    if (!isCrash) {
      const bellOsc = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bellOsc.type = 'square';
      bellOsc.frequency.setValueAtTime(980 * pitchMult, time);
      bellGain.gain.setValueAtTime(volume * 0.15, time);
      bellGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      bellOsc.connect(bellGain);
      bellGain.connect(dest);
      bellOsc.start(time);
      bellOsc.stop(time + 0.2);
    }

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + dur + 0.03);
  }

  private static tom(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    volume: number,
    pitchMult: number,
    decayMult: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const baseFreq = 130 * pitchMult;
    const dur = 0.24 * decayMult;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.6, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, time + dur);

    gain.gain.setValueAtTime(volume * 0.95, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private static cowbell(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    volume: number,
    pitchMult: number,
    decayMult: number
  ) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

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
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  private static clave(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    volume: number,
    pitchMult: number,
    decayMult: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2150 * pitchMult, time);
    const dur = 0.045 * decayMult;
    gain.gain.setValueAtTime(volume * 0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  private static laser(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    volume: number,
    pitchMult: number,
    decayMult: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dur = 0.22 * decayMult;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600 * pitchMult, time);
    osc.frequency.exponentialRampToValueAtTime(75 * pitchMult, time + dur);

    gain.gain.setValueAtTime(volume * 0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private static vinyl(
    ctx: BaseAudioContext,
    dest: AudioNode,
    noiseBuffer: AudioBuffer,
    time: number,
    volume: number,
    pitchMult: number,
    decayMult: number
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200 * pitchMult, time);
    filter.Q.setValueAtTime(0.9, time);

    const gain = ctx.createGain();
    const dur = 0.35 * decayMult;
    gain.gain.setValueAtTime(volume * 0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  private static subBass(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    volume: number,
    mode: number,
    pitchMult: number,
    decayMult: number,
    style: string
  ) {
    const freqIndex = Math.min(Math.max(mode, 1), BASS_FREQS.length - 1);
    const freq = BASS_FREQS[freqIndex] * pitchMult;
    const dur = (style === 'reese' ? 0.38 : 0.26) * decayMult;

    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

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
    gain.connect(dest);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + dur + 0.02);
    subOsc.stop(time + dur + 0.02);
  }

  private static synth(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    volume: number,
    mode: number,
    pitchMult: number,
    decayMult: number,
    style: string
  ) {
    const freqIndex = Math.min(Math.max(mode, 1), SYNTH_FREQS.length - 1);
    const rootFreq = SYNTH_FREQS[freqIndex] * pitchMult;
    const dur = (style === 'chord' ? 0.42 : style === 'arp' ? 0.16 : 0.3) * decayMult;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(style === 'bell' ? 5200 : 3800, time);
    filter.frequency.exponentialRampToValueAtTime(style === 'lead' ? 1400 : 520, time + dur);
    filter.Q.setValueAtTime(style === 'lead' ? 3.5 : 1.8, time);

    let intervals = [1, 1.006, 1.498];
    if (style === 'chord') intervals = [1, 1.189, 1.498, 1.782];
    if (style === 'lead') intervals = [1, 1.008, 0.5];
    if (style === 'bell') intervals = [1, 2.0, 3.01];
    if (style === 'arp') intervals = [1];

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume * (style === 'arp' ? 0.55 : 0.36), time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    intervals.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      if (style === 'arp') osc.type = 'square';
      else if (style === 'bell') osc.type = 'sine';
      else osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';

      osc.frequency.setValueAtTime(rootFreq * ratio, time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    });

    filter.connect(gain);
    gain.connect(dest);
  }
}
