/**
 * Waveform Visualization
 * Displays audio waveform with beat markers and playhead
 */

export class WaveformVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Audio data
        this.audioData = null;
        this.duration = 0;

        // Beat data
        this.beats = [];
        this.downbeats = [];

        // Hotkey assignments: { key: time }
        this.hotkeyAssignments = {};

        // Playback state
        this.currentTime = 0;

        // Colors
        this.colors = {
            background: '#252525',
            waveform: '#555',
            beat: '#666',
            downbeat: '#888',
            playhead: 'rgba(255, 255, 255, 0.8)',
            hotkey: '#4a9eff',
            // Individual hotkey colors for visual distinction
            hotkeyColors: [
                '#4a9eff', // 1 - blue
                '#ff6b6b', // 2 - red
                '#51cf66', // 3 - green
                '#ffd43b', // 4 - yellow
                '#cc5de8', // 5 - purple
                '#ff922b', // 6 - orange
                '#22b8cf', // 7 - cyan
                '#f06595', // 8 - pink
                '#20c997', // 9 - teal
                '#a9e34b', // 0 - lime
            ]
        };

        // Set up resize handler
        this.setupResize();
    }

    setupResize() {
        const resizeObserver = new ResizeObserver(() => {
            this.resize();
            this.draw();
        });
        resizeObserver.observe(this.canvas.parentElement);
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);

        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * Set audio data for waveform display
     * @param {Float32Array} channelData - Mono audio samples
     * @param {number} sampleRate - Sample rate
     * @param {number} duration - Duration in seconds
     */
    setAudioData(channelData, sampleRate, duration) {
        this.audioData = channelData;
        this.sampleRate = sampleRate;
        this.duration = duration;

        // Pre-compute waveform peaks for efficient drawing
        this.computePeaks();
    }

    /**
     * Pre-compute peaks for waveform drawing
     */
    computePeaks() {
        if (!this.audioData || !this.width) return;

        const samplesPerPixel = Math.floor(this.audioData.length / this.width);
        this.peaks = [];

        for (let i = 0; i < this.width; i++) {
            const start = i * samplesPerPixel;
            const end = start + samplesPerPixel;

            let min = 0;
            let max = 0;

            for (let j = start; j < end && j < this.audioData.length; j++) {
                const sample = this.audioData[j];
                if (sample < min) min = sample;
                if (sample > max) max = sample;
            }

            this.peaks.push({ min, max });
        }
    }

    /**
     * Set beat data
     */
    setBeats(beats, downbeats) {
        this.beats = beats || [];
        this.downbeats = downbeats || [];
    }

    /**
     * Update hotkey assignments
     * @param {Object} assignments - { key: { time: number, label: string } }
     */
    setHotkeyAssignments(assignments) {
        this.hotkeyAssignments = {};

        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        keys.forEach((key, index) => {
            if (assignments[key] && assignments[key].time !== null) {
                this.hotkeyAssignments[key] = {
                    time: assignments[key].time,
                    colorIndex: index
                };
            }
        });
    }

    /**
     * Update current playback time
     */
    setCurrentTime(time) {
        this.currentTime = time;
    }

    /**
     * Convert time to x position
     */
    timeToX(time) {
        if (this.duration === 0) return 0;
        return (time / this.duration) * this.width;
    }

    /**
     * Convert x position to time
     */
    xToTime(x) {
        if (this.width === 0) return 0;
        return (x / this.width) * this.duration;
    }

    /**
     * Draw the complete visualization
     */
    draw() {
        if (!this.ctx || !this.width) return;

        // Clear
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw waveform
        this.drawWaveform();

        // Draw beats
        this.drawBeats();

        // Draw hotkey markers
        this.drawHotkeyMarkers();

        // Draw playhead
        this.drawPlayhead();
    }

    drawWaveform() {
        if (!this.peaks || this.peaks.length === 0) return;

        const centerY = this.height / 2;
        const amplitude = this.height / 2 - 4;

        this.ctx.fillStyle = this.colors.waveform;

        for (let i = 0; i < this.peaks.length; i++) {
            const peak = this.peaks[i];
            const y1 = centerY + peak.min * amplitude;
            const y2 = centerY + peak.max * amplitude;
            const height = Math.max(1, y2 - y1);

            this.ctx.fillRect(i, y1, 1, height);
        }
    }

    drawBeats() {
        const beatHeight = 6;

        // Draw regular beats (small ticks at bottom)
        this.ctx.fillStyle = this.colors.beat;
        for (const beat of this.beats) {
            const x = this.timeToX(beat);
            this.ctx.fillRect(x, this.height - beatHeight, 1, beatHeight);
        }

        // Draw downbeats (taller ticks)
        this.ctx.fillStyle = this.colors.downbeat;
        for (const downbeat of this.downbeats) {
            const x = this.timeToX(downbeat);
            this.ctx.fillRect(x, this.height - beatHeight * 2, 1, beatHeight * 2);
        }
    }

    drawHotkeyMarkers() {
        for (const [key, data] of Object.entries(this.hotkeyAssignments)) {
            const x = this.timeToX(data.time);
            const color = this.colors.hotkeyColors[data.colorIndex];

            // Draw vertical line
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x - 1, 0, 2, this.height);

            // Draw key label
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(key, x, 12);
        }
    }

    drawPlayhead() {
        const x = this.timeToX(this.currentTime);

        // Draw playhead line
        this.ctx.fillStyle = this.colors.playhead;
        this.ctx.fillRect(x - 1, 0, 2, this.height);

        // Draw triangle at top
        this.ctx.beginPath();
        this.ctx.moveTo(x - 4, 0);
        this.ctx.lineTo(x + 4, 0);
        this.ctx.lineTo(x, 6);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Handle click on waveform to seek
     * @param {MouseEvent} event
     * @returns {number} Time in seconds
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        return this.xToTime(x);
    }
}
