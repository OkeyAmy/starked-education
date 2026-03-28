import { Matrix } from 'ml-matrix';

export interface FrequencyBand {
  delta: number[];
  theta: number[];
  alpha: number[];
  beta: number[];
  gamma: number[];
}

export interface SignalFeatures {
  power: number;
  entropy: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  peakFrequency: number;
  frequencyBands: FrequencyBand;
}

export class SignalProcessor {
  private readonly sampleRate = 256;
  private readonly windowSize = 256;

  constructor() {}

  applyFFT(signal: number[]): number[] {
    const n = signal.length;
    const frequencies: number[] = [];
    
    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let t = 0; t < n; t++) {
        const angle = -2 * Math.PI * k * t / n;
        real += signal[t] * Math.cos(angle);
        imag += signal[t] * Math.sin(angle);
      }
      
      frequencies.push(Math.sqrt(real * real + imag * imag) / n);
    }
    
    return frequencies;
  }

  extractFrequencyBands(signal: number[]): FrequencyBand {
    const frequencies = this.applyFFT(signal);
    const bands: FrequencyBand = {
      delta: [],
      theta: [],
      alpha: [],
      beta: [],
      gamma: []
    };

    const freqResolution = this.sampleRate / signal.length;

    for (let i = 0; i < frequencies.length; i++) {
      const freq = i * freqResolution;
      
      if (freq >= 0.5 && freq <= 4) {
        bands.delta.push(frequencies[i]);
      } else if (freq >= 4 && freq <= 8) {
        bands.theta.push(frequencies[i]);
      } else if (freq >= 8 && freq <= 12) {
        bands.alpha.push(frequencies[i]);
      } else if (freq >= 12 && freq <= 30) {
        bands.beta.push(frequencies[i]);
      } else if (freq >= 30 && freq <= 100) {
        bands.gamma.push(frequencies[i]);
      }
    }

    return bands;
  }

  calculateBandPower(bands: FrequencyBand): { [key: string]: number } {
    const power: { [key: string]: number } = {};

    Object.keys(bands).forEach(band => {
      const bandData = bands[band as keyof FrequencyBand];
      power[band] = bandData.reduce((sum, val) => sum + val * val, 0) / bandData.length;
    });

    return power;
  }

  calculateEntropy(signal: number[]): number {
    const histogram = new Array(256).fill(0);
    const min = Math.min(...signal);
    const max = Math.max(...signal);
    const range = max - min || 1;

    signal.forEach(value => {
      const bin = Math.floor(((value - min) / range) * 255);
      histogram[Math.min(Math.max(bin, 0), 255)]++;
    });

    const total = signal.length;
    let entropy = 0;

    histogram.forEach(count => {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    });

    return entropy;
  }

  calculateStatisticalFeatures(signal: number[]): { variance: number; skewness: number; kurtosis: number } {
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    const std = Math.sqrt(variance);

    const skewness = signal.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 3);
    }, 0) / signal.length;

    const kurtosis = signal.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 4);
    }, 0) / signal.length - 3;

    return { variance, skewness, kurtosis };
  }

  findPeakFrequency(frequencies: number[]): number {
    let maxPower = 0;
    let peakFreq = 0;
    const freqResolution = this.sampleRate / (frequencies.length * 2);

    for (let i = 1; i < frequencies.length; i++) {
      if (frequencies[i] > maxPower) {
        maxPower = frequencies[i];
        peakFreq = i * freqResolution;
      }
    }

    return peakFreq;
  }

  extractFeatures(signal: number[]): SignalFeatures {
    const frequencies = this.applyFFT(signal);
    const frequencyBands = this.extractFrequencyBands(signal);
    const bandPower = this.calculateBandPower(frequencyBands);
    const stats = this.calculateStatisticalFeatures(signal);
    const entropy = this.calculateEntropy(signal);
    const peakFrequency = this.findPeakFrequency(frequencies);

    const totalPower = Object.values(bandPower).reduce((sum, power) => sum + power, 0);

    return {
      power: totalPower,
      entropy,
      variance: stats.variance,
      skewness: stats.skewness,
      kurtosis: stats.kurtosis,
      peakFrequency,
      frequencyBands
    };
  }

  filterSignal(signal: number[], lowFreq: number, highFreq: number): number[] {
    const frequencies = this.applyFFT(signal);
    const freqResolution = this.sampleRate / signal.length;

    for (let i = 0; i < frequencies.length; i++) {
      const freq = i * freqResolution;
      if (freq < lowFreq || freq > highFreq) {
        frequencies[i] = 0;
      }
    }

    return this.inverseFFT(frequencies);
  }

  private inverseFFT(frequencies: number[]): number[] {
    const n = frequencies.length * 2;
    const signal: number[] = [];

    for (let t = 0; t < n; t++) {
      let real = 0;
      
      for (let k = 0; k < frequencies.length; k++) {
        const angle = 2 * Math.PI * k * t / n;
        real += frequencies[k] * Math.cos(angle);
      }
      
      signal.push(real);
    }

    return signal;
  }

  applyWindow(signal: number[], windowType: 'hann' | 'hamming' | 'blackman' = 'hann'): number[] {
    const n = signal.length;
    const windowed: number[] = [];

    for (let i = 0; i < n; i++) {
      let windowValue = 1;

      switch (windowType) {
        case 'hann':
          windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
          break;
        case 'hamming':
          windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
          break;
        case 'blackman':
          windowValue = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)) + 
                      0.08 * Math.cos(4 * Math.PI * i / (n - 1));
          break;
      }

      windowed.push(signal[i] * windowValue);
    }

    return windowed;
  }

  calculateCoherence(signal1: number[], signal2: number[]): number {
    const fft1 = this.applyFFT(signal1);
    const fft2 = this.applyFFT(signal2);

    let crossPower = 0;
    let power1 = 0;
    let power2 = 0;

    for (let i = 0; i < fft1.length; i++) {
      crossPower += fft1[i] * fft2[i];
      power1 += fft1[i] * fft1[i];
      power2 += fft2[i] * fft2[i];
    }

    return Math.abs(crossPower) / Math.sqrt(power1 * power2);
  }

  detectArtifacts(signal: number[]): { hasArtifacts: boolean; artifactType?: string } {
    const stats = this.calculateStatisticalFeatures(signal);
    const maxAmplitude = Math.max(...signal.map(Math.abs));
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;

    if (maxAmplitude > 100) {
      return { hasArtifacts: true, artifactType: 'high_amplitude' };
    }

    if (Math.abs(stats.skewness) > 2) {
      return { hasArtifacts: true, artifactType: 'skewed' };
    }

    if (Math.abs(stats.kurtosis) > 5) {
      return { hasArtifacts: true, artifactType: 'heavy_tailed' };
    }

    if (Math.abs(mean) > 10) {
      return { hasArtifacts: true, artifactType: 'dc_offset' };
    }

    return { hasArtifacts: false };
  }

  removeArtifacts(signal: number[]): number[] {
    const artifactDetection = this.detectArtifacts(signal);
    
    if (!artifactDetection.hasArtifacts) {
      return signal;
    }

    let cleaned = [...signal];

    if (artifactDetection.artifactType === 'dc_offset') {
      const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
      cleaned = signal.map(val => val - mean);
    }

    if (artifactDetection.artifactType === 'high_amplitude') {
      const threshold = 50;
      cleaned = signal.map(val => Math.abs(val) > threshold ? 0 : val);
    }

    cleaned = this.filterSignal(cleaned, 1, 50);

    return cleaned;
  }
}

export const signalProcessor = new SignalProcessor();
