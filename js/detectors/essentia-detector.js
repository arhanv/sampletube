/**
 * Essentia.js Beat Detector
 * Uses Essentia's BeatTrackerMultiFeature algorithm
 */

import { BaseDetector } from './base-detector.js';

export class EssentiaDetector extends BaseDetector {
    constructor() {
        super();
        this.name = 'Essentia.js';
        this.essentia = null;
    }

    /**
     * Initialize Essentia WASM module
     */
    async initialize() {
        if (this.essentia) return;

        // Wait for global EssentiaWASM to be available
        if (typeof EssentiaWASM === 'undefined') {
            throw new Error('Essentia WASM not loaded. Make sure essentia-wasm.web.js is included.');
        }

        // Load WASM module
        const wasmModule = await EssentiaWASM();
        this.essentia = new Essentia(wasmModule);

        console.log('Essentia.js initialized:', this.essentia.version);
    }

    /**
     * Analyze audio for beats using BeatTrackerMultiFeature
     */
    async analyze(channelData, sampleRate, onProgress = () => {}) {
        await this.initialize();
        onProgress(10);

        // Essentia expects specific sample rate (44100 Hz)
        // Resample if necessary
        let processedData = channelData;
        let processedSampleRate = sampleRate;

        if (sampleRate !== 44100) {
            console.log(`Resampling from ${sampleRate}Hz to 44100Hz`);
            processedData = this.resample(channelData, sampleRate, 44100);
            processedSampleRate = 44100;
        }

        onProgress(30);

        // Convert to Essentia vector format
        const signalVector = this.essentia.arrayToVector(processedData);

        onProgress(40);

        // Run beat tracker
        let result;
        try {
            result = this.essentia.BeatTrackerMultiFeature(signalVector);
        } catch (error) {
            console.error('BeatTrackerMultiFeature failed:', error);
            // Fallback to simpler algorithm
            result = this.essentia.BeatTrackerDegara(signalVector);
        }

        onProgress(80);

        // Extract beat times from result
        const beats = this.essentia.vectorToArray(result.ticks);
        const confidence = result.confidence || 0;

        // Estimate BPM from beat intervals
        const bpm = this.estimateBPM(beats);

        // Estimate downbeats
        const downbeats = this.estimateDownbeats(beats, bpm);

        onProgress(100);

        return {
            beats: Array.from(beats),
            downbeats: downbeats,
            bpm: bpm,
            confidence: confidence
        };
    }

    /**
     * Simple resampling using linear interpolation
     * For production, use a proper resampling library
     */
    resample(data, fromRate, toRate) {
        const ratio = fromRate / toRate;
        const newLength = Math.round(data.length / ratio);
        const result = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const srcIndex = i * ratio;
            const srcIndexFloor = Math.floor(srcIndex);
            const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1);
            const fraction = srcIndex - srcIndexFloor;

            result[i] = data[srcIndexFloor] * (1 - fraction) + data[srcIndexCeil] * fraction;
        }

        return result;
    }

    /**
     * Estimate BPM from beat timestamps
     */
    estimateBPM(beats) {
        if (beats.length < 2) return 120; // Default

        // Calculate intervals between beats
        const intervals = [];
        for (let i = 1; i < beats.length; i++) {
            intervals.push(beats[i] - beats[i - 1]);
        }

        // Get median interval (more robust than mean)
        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];

        // Convert to BPM
        const bpm = 60 / medianInterval;

        return Math.round(bpm * 10) / 10;
    }

    /**
     * Override: Better downbeat estimation using beat strength patterns
     */
    estimateDownbeats(beats, bpm) {
        if (beats.length < 4) return beats.slice();

        // For now, use simple 4/4 assumption
        // TODO: Implement proper downbeat detection using RhythmExtractor2013
        const beatsPerMeasure = 4;
        const downbeats = [];

        // Find the first strong beat (often the actual downbeat)
        // Simple heuristic: start from the first beat
        for (let i = 0; i < beats.length; i += beatsPerMeasure) {
            downbeats.push(beats[i]);
        }

        return downbeats;
    }
}
