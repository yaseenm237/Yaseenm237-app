/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API "AudioProcessor" to enhance voice output quality in the app.
// Implements the proposed DSP processing chain (Noise Gate -> High-Pass -> Low-Pass -> Equalizer -> Compressor) 
// along with Formant Resonance EQ, Metallic Artifact Cuts, Shimmer LFO, and Breath Noise floors.
export class AudioProcessor {
  private ctx: AudioContext | null = null;
  private hpf: BiquadFilterNode | null = null;
  private lpf: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  // Advanced DSP Formant EQ & Metallic Cut Nodes to shape resonances and remove vocoder-like ringing
  private formantEnhancer1: BiquadFilterNode | null = null;
  private formantEnhancer2: BiquadFilterNode | null = null;
  private metallicCutFilter: BiquadFilterNode | null = null;

  // 🎙️ Eco-Lazer (Equalizer) Nodes
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;

  // Background noise & air presence buffers to cover synthetic quiet spaces
  private presenceSource: AudioBufferSourceNode | null = null;
  private breathSource: AudioBufferSourceNode | null = null;
  private breathFilter: BiquadFilterNode | null = null;

  // Shimmer LFO (Amplitude micro-variation mimicking natural human speech volume wobble)
  private shimmerLFO: OscillatorNode | null = null;
  private shimmerGainNode: GainNode | null = null;

  // Noise Gate (implemented via automated gain envelope for fast attack & release)
  private gainNode: GainNode | null = null;

  // State toggle: Defaults to off (false)
  public isEnabled: boolean = false;

  // Equalizer values cache
  private currentBass: number = 0;
  private currentMid: number = 0;
  private currentTreble: number = 0;

  constructor() {
    // Load initial settings if stored
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sahira_voice_config_v1');
        if (stored) {
          const config = JSON.parse(stored);
          this.isEnabled = config.eqEnabled ?? false;
          this.currentBass = config.eqBass ?? 0;
          this.currentMid = config.eqMid ?? 0;
          this.currentTreble = config.eqTreble ?? 0;
        }
      } catch (e) {
        console.warn("[AudioProcessor] Error loading stored config:", e);
      }
    }
  }

  private init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();

    // 1. HPF (High-Pass Filter): Cut muddy, non-vocal low frequencies (below 80Hz)
    this.hpf = this.ctx.createBiquadFilter();
    this.hpf.type = 'highpass';
    this.hpf.frequency.value = 80;

    // 2. LPF (Low-Pass Filter): Cut harsh high-frequency digital hiss and aliasing noise (above 8000Hz)
    this.lpf = this.ctx.createBiquadFilter();
    this.lpf.type = 'lowpass';
    this.lpf.frequency.value = 8000;

    // 3. Formant Enhancers: Boost natural vocal tract character resonances (vowel clarity)
    this.formantEnhancer1 = this.ctx.createBiquadFilter();
    this.formantEnhancer1.type = 'peaking';
    this.formantEnhancer1.frequency.value = 1200; // Peak around 1.2kHz for speech presence
    this.formantEnhancer1.Q.value = 2.5;
    this.formantEnhancer1.gain.value = 2.0;

    this.formantEnhancer2 = this.ctx.createBiquadFilter();
    this.formantEnhancer2.type = 'peaking';
    this.formantEnhancer2.frequency.value = 2600; // Peak around 2.6kHz for consonant articulation
    this.formantEnhancer2.Q.value = 2.5;
    this.formantEnhancer2.gain.value = 1.5;

    // 4. Metallic Artifact Cut: Specifically targets digital ringing in TTS voices (3kHz to 6.5kHz)
    this.metallicCutFilter = this.ctx.createBiquadFilter();
    this.metallicCutFilter.type = 'peaking';
    this.metallicCutFilter.frequency.value = 4500; // Center of the digital "ringing" zone
    this.metallicCutFilter.Q.value = 1.0;
    this.metallicCutFilter.gain.value = -4.0; // Moderate cut to warm up the sound

    // 5. Eco-Lazer (Equalizer) Peaking / Shelving Nodes
    // Bass (Low Shelf at 150 Hz)
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 150;
    this.bassFilter.gain.value = this.currentBass;

    // Midrange (Peaking at 1500 Hz)
    this.midFilter = this.ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1500;
    this.midFilter.Q.value = 1.0;
    this.midFilter.gain.value = this.currentMid;

    // Treble (High Shelf at 5000 Hz)
    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 5000;
    this.trebleFilter.gain.value = this.currentTreble;

    // 6. Dynamics Compressor: Smooths out peaks and brings up low-level details
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.ratio.value = 4;
    this.compressor.knee.value = 30;
    this.compressor.attack.value = 0.05;
    this.compressor.release.value = 0.2;

    // 7. Noise Gate (automated GainNode): Prevents background noise when no speech is active
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.0; // closed by default

    // Connect the processing chain dynamically
    this.connectNodes();
  }

  /**
   * Connects the Web Audio API nodes in the processing chain.
   */
  public connectNodes() {
    if (!this.hpf || !this.lpf || !this.formantEnhancer1 || !this.formantEnhancer2 || 
        !this.metallicCutFilter || !this.bassFilter || !this.midFilter || 
        !this.trebleFilter || !this.compressor || !this.gainNode || !this.ctx) return;

    try {
      this.disconnectNodes();

      // Chain: HPF -> LPF -> Formants -> MetallicCut -> Equalizer (Bass -> Mid -> Treble) -> Compressor -> GainNode -> Destination
      this.hpf.connect(this.lpf);
      this.lpf.connect(this.formantEnhancer1);
      this.formantEnhancer1.connect(this.formantEnhancer2);
      this.formantEnhancer2.connect(this.metallicCutFilter);
      this.metallicCutFilter.connect(this.bassFilter);
      this.bassFilter.connect(this.midFilter);
      this.midFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.compressor);
      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
    } catch (e) {
      console.warn("[AudioProcessor] Error connecting nodes:", e);
    }
  }

  /**
   * Disconnects the Web Audio API nodes to release resources or bypass.
   */
  public disconnectNodes() {
    try {
      if (this.hpf) this.hpf.disconnect();
      if (this.lpf) this.lpf.disconnect();
      if (this.formantEnhancer1) this.formantEnhancer1.disconnect();
      if (this.formantEnhancer2) this.formantEnhancer2.disconnect();
      if (this.metallicCutFilter) this.metallicCutFilter.disconnect();
      if (this.bassFilter) this.bassFilter.disconnect();
      if (this.midFilter) this.midFilter.disconnect();
      if (this.trebleFilter) this.trebleFilter.disconnect();
      if (this.compressor) this.compressor.disconnect();
      if (this.gainNode) this.gainNode.disconnect();
    } catch (e) {
      // Ignore disconnect errors if they were not connected
    }
  }

  /**
   * Updates Equalizer gains dynamically.
   */
  public setEQ(bass: number, mid: number, treble: number) {
    this.currentBass = bass;
    this.currentMid = mid;
    this.currentTreble = treble;

    if (this.bassFilter) {
      this.bassFilter.gain.value = bass;
    }
    if (this.midFilter) {
      this.midFilter.gain.value = mid;
    }
    if (this.trebleFilter) {
      this.trebleFilter.gain.value = treble;
    }
  }

  /**
   * Opens the Noise Gate and starts natural ambient presence layers (Brownian noise floor + Breath/Air + Shimmer LFO)
   * to blend smoothly with speech and cover up sterile silence.
   */
  public start() {
    // If not enabled, bypass completely (do not start ambient noise floor)
    if (!this.isEnabled) {
      return;
    }

    try {
      this.init();
      if (!this.ctx || !this.gainNode || !this.hpf) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.stop();

      const sampleRate = this.ctx.sampleRate;

      // LAYER 1: Analog Brownian Tape Hum (Low-frequency grounding)
      const bufferSize1 = sampleRate * 2;
      const buffer1 = this.ctx.createBuffer(1, bufferSize1, sampleRate);
      const data1 = buffer1.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize1; i++) {
        const white = Math.random() * 2 - 1;
        data1[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data1[i];
        data1[i] *= 0.025; // Extremely soft, warm analog rumble
      }
      this.presenceSource = this.ctx.createBufferSource();
      this.presenceSource.buffer = buffer1;
      this.presenceSource.loop = true;
      this.presenceSource.connect(this.hpf);

      // LAYER 2: Breathy High-Frequency Air
      const bufferSize2 = sampleRate * 2;
      const buffer2 = this.ctx.createBuffer(1, bufferSize2, sampleRate);
      const data2 = buffer2.getChannelData(0);
      for (let i = 0; i < bufferSize2; i++) {
        data2[i] = (Math.random() * 2 - 1) * 0.003; 
      }
      this.breathSource = this.ctx.createBufferSource();
      this.breathSource.buffer = buffer2;
      this.breathSource.loop = true;

      this.breathFilter = this.ctx.createBiquadFilter();
      this.breathFilter.type = 'highpass';
      this.breathFilter.frequency.value = 2800; // Let only soft high-frequency breath pass

      this.breathSource.connect(this.breathFilter);
      this.breathFilter.connect(this.hpf);

      // LAYER 3: Shimmer LFO (Amplitude Modulation)
      this.shimmerLFO = this.ctx.createOscillator();
      this.shimmerLFO.type = 'sine';
      this.shimmerLFO.frequency.value = 5.5; // Natural speed of voice shimmer

      this.shimmerGainNode = this.ctx.createGain();
      this.shimmerGainNode.gain.value = 0.05; // Subtle variation depth

      this.shimmerLFO.connect(this.shimmerGainNode);
      this.shimmerGainNode.connect(this.gainNode.gain);

      // Start the oscillators and sources
      this.presenceSource.start();
      this.breathSource.start();
      this.shimmerLFO.start();

      // Open Noise Gate: Fast Attack (0.05 seconds)
      const now = this.ctx.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(0.06, now); // Baseline idle level
      this.gainNode.gain.linearRampToValueAtTime(0.40, now + 0.05); // Fully open speech level
    } catch (e) {
      console.warn("[AudioProcessor] start error:", e);
    }
  }

  /**
   * Closes the Noise Gate and cleanly stops all active oscillators and noise sources.
   */
  public stop() {
    if (!this.isEnabled) {
      return;
    }

    try {
      if (!this.ctx || !this.gainNode) return;
      const now = this.ctx.currentTime;
      
      // Close Noise Gate: Smooth Release (0.2 seconds)
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

      setTimeout(() => {
        try {
          if (this.presenceSource) {
            this.presenceSource.stop();
            this.presenceSource = null;
          }
          if (this.breathSource) {
            this.breathSource.stop();
            this.breathSource = null;
          }
          if (this.shimmerLFO) {
            this.shimmerLFO.stop();
            this.shimmerLFO = null;
          }
        } catch (err) {}
      }, 250);
    } catch (e) {
      console.warn("[AudioProcessor] stop error:", e);
    }
  }
}
