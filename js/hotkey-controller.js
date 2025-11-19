/**
 * Hotkey Controller
 * Manages hotkey assignments and quantization
 */

import { VideoPlayer } from './video-player.js';

export class HotkeyController {
    constructor() {
        // Keys 1-9, 0 (representing 1-10)
        this.keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

        // Hotkey assignments: { key: { time: number|null, label: string } }
        this.assignments = {};
        this.keys.forEach(key => {
            this.assignments[key] = { time: null, label: '' };
        });

        // Beat data
        this.beats = [];
        this.downbeats = [];

        // Quantization mode: 'beat', 'downbeat', 'off'
        this.quantizeMode = 'beat';

        // Callbacks
        this.onAssignmentChange = null;
        this.onHotkeyTrigger = null;
    }

    /**
     * Set beat data from detector
     */
    setBeats(beats, downbeats) {
        this.beats = beats || [];
        this.downbeats = downbeats || [];
    }

    /**
     * Set quantization mode
     */
    setQuantizeMode(mode) {
        this.quantizeMode = mode;
    }

    /**
     * Assign a hotkey to a time
     * @param {string} key - The key ('1'-'9', '0')
     * @param {number} time - Time in seconds
     * @param {string} label - Optional label
     */
    assign(key, time, label = '') {
        if (!this.keys.includes(key)) return;

        // Quantize if enabled
        const quantizedTime = this.quantize(time);

        this.assignments[key] = {
            time: quantizedTime,
            label: label
        };

        if (this.onAssignmentChange) {
            this.onAssignmentChange(key, this.assignments[key]);
        }
    }

    /**
     * Clear a single hotkey assignment
     */
    clearKey(key) {
        if (!this.keys.includes(key)) return;

        this.assignments[key] = { time: null, label: '' };

        if (this.onAssignmentChange) {
            this.onAssignmentChange(key, this.assignments[key]);
        }
    }

    /**
     * Clear all hotkey assignments
     */
    clearAll() {
        this.keys.forEach(key => {
            this.assignments[key] = { time: null, label: '' };
        });

        if (this.onAssignmentChange) {
            this.keys.forEach(key => {
                this.onAssignmentChange(key, this.assignments[key]);
            });
        }
    }

    /**
     * Set default assignments (spread across beats/downbeats)
     * @param {number} duration - Video duration in seconds
     */
    setDefault(duration) {
        const timestamps = this.downbeats.length >= 10 ? this.downbeats : this.beats;

        if (timestamps.length === 0) {
            // No beats detected - spread evenly across duration
            this.keys.forEach((key, i) => {
                const time = (duration / 10) * i;
                this.assignments[key] = { time, label: '' };
            });
        } else {
            // Spread across detected beats/downbeats
            const step = Math.max(1, Math.floor(timestamps.length / 10));

            this.keys.forEach((key, i) => {
                const index = Math.min(i * step, timestamps.length - 1);
                this.assignments[key] = {
                    time: timestamps[index],
                    label: ''
                };
            });
        }

        // Notify UI
        if (this.onAssignmentChange) {
            this.keys.forEach(key => {
                this.onAssignmentChange(key, this.assignments[key]);
            });
        }
    }

    /**
     * Quantize time to nearest beat or downbeat
     */
    quantize(time) {
        if (this.quantizeMode === 'off') {
            return time;
        }

        const timestamps = this.quantizeMode === 'downbeat' ? this.downbeats : this.beats;

        if (timestamps.length === 0) {
            return time;
        }

        // Find nearest timestamp
        let nearest = timestamps[0];
        let minDiff = Math.abs(time - nearest);

        for (const ts of timestamps) {
            const diff = Math.abs(time - ts);
            if (diff < minDiff) {
                minDiff = diff;
                nearest = ts;
            }
        }

        return nearest;
    }

    /**
     * Handle key press
     * @param {string} key - The key pressed
     * @param {boolean} shift - Was shift held
     * @param {number} currentTime - Current video time
     * @returns {number|null} Time to seek to, or null
     */
    handleKeyPress(key, shift, currentTime) {
        if (!this.keys.includes(key)) return null;

        const assignment = this.assignments[key];

        if (shift) {
            // Shift+key: always reassign
            this.assign(key, currentTime);
            return null; // Don't seek when assigning
        } else if (assignment.time === null) {
            // Unassigned: assign to current time
            this.assign(key, currentTime);
            return null;
        } else {
            // Assigned: seek to time
            if (this.onHotkeyTrigger) {
                this.onHotkeyTrigger(key, assignment.time);
            }
            return assignment.time;
        }
    }

    /**
     * Check if a key is assigned
     */
    isAssigned(key) {
        return this.assignments[key]?.time !== null;
    }

    /**
     * Get assignment for a key
     */
    getAssignment(key) {
        return this.assignments[key];
    }

    /**
     * Get all assignments
     */
    getAllAssignments() {
        return { ...this.assignments };
    }
}
