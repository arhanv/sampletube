/**
 * File-based Beat Detector
 * Loads pre-computed beat data from JSON files
 * Useful for comparing different algorithms (librosa, madmom, etc.)
 */

import { BaseDetector } from './base-detector.js';

export class FileDetector extends BaseDetector {
    constructor() {
        super();
        this.name = 'JSON File';
        this.data = null;
    }

    /**
     * Load beat data from a JSON file
     * Expected format:
     * {
     *   "beats": [0.0, 0.5, 1.0, ...],
     *   "downbeats": [0.0, 2.0, 4.0, ...],  // optional
     *   "bpm": 120,                          // optional
     *   "confidence": 1.0                    // optional
     * }
     *
     * @param {File} file - JSON file to load
     */
    async loadFromFile(file) {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.beats || !Array.isArray(data.beats)) {
            throw new Error('Invalid JSON format: missing "beats" array');
        }

        this.data = {
            beats: data.beats,
            downbeats: data.downbeats || this.estimateDownbeats(data.beats, data.bpm || 120),
            bpm: data.bpm || this.estimateBPMFromBeats(data.beats),
            confidence: data.confidence || 1.0
        };

        this.name = `JSON: ${file.name}`;
    }

    /**
     * Analyze method - returns pre-loaded data
     * The channelData/sampleRate params are ignored since we use pre-computed data
     */
    async analyze(channelData, sampleRate, onProgress = () => {}) {
        if (!this.data) {
            throw new Error('No JSON file loaded. Call loadFromFile() first.');
        }

        onProgress(100);

        return {
            beats: this.data.beats,
            downbeats: this.data.downbeats,
            bpm: this.data.bpm,
            confidence: this.data.confidence
        };
    }

    /**
     * Estimate BPM from beat timestamps
     */
    estimateBPMFromBeats(beats) {
        if (beats.length < 2) return 120;

        const intervals = [];
        for (let i = 1; i < beats.length; i++) {
            intervals.push(beats[i] - beats[i - 1]);
        }

        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];

        return Math.round((60 / medianInterval) * 10) / 10;
    }
}
