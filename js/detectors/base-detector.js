/**
 * Base Beat Detector Interface
 * All detector implementations should extend this class
 */

export class BaseDetector {
    constructor() {
        this.name = 'Base Detector';
    }

    /**
     * Analyze audio and extract beat positions
     * @param {Float32Array} channelData - Mono audio samples
     * @param {number} sampleRate - Sample rate in Hz
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<{beats: number[], downbeats: number[], bpm: number, confidence: number}>}
     */
    async analyze(channelData, sampleRate, onProgress = () => {}) {
        throw new Error('analyze() must be implemented by subclass');
    }

    /**
     * Estimate downbeats from beat positions
     * Simple heuristic: assume 4/4 time, take every 4th beat
     * Override in subclass for better detection
     */
    estimateDownbeats(beats, bpm) {
        if (beats.length < 4) return beats.slice();

        // Calculate expected beats per measure (assume 4/4)
        const beatsPerMeasure = 4;
        const downbeats = [];

        for (let i = 0; i < beats.length; i += beatsPerMeasure) {
            downbeats.push(beats[i]);
        }

        return downbeats;
    }
}
