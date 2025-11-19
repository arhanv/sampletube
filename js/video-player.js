/**
 * Video Player Controller
 * Handles video playback and seeking
 */

export class VideoPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.onTimeUpdate = null;
    }

    /**
     * Load a video file
     * @param {File} file - Video file to load
     * @returns {Promise<void>}
     */
    loadFile(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);

            this.video.onloadedmetadata = () => {
                resolve();
            };

            this.video.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load video'));
            };

            this.video.src = url;
        });
    }

    /**
     * Seek to a specific time
     * @param {number} time - Time in seconds
     */
    seekTo(time) {
        if (time < 0) time = 0;
        if (time > this.video.duration) time = this.video.duration;
        this.video.currentTime = time;
    }

    /**
     * Get current playback time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        return this.video.currentTime;
    }

    /**
     * Get video duration
     * @returns {number} Duration in seconds
     */
    getDuration() {
        return this.video.duration || 0;
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }

    /**
     * Play the video
     */
    play() {
        this.video.play();
    }

    /**
     * Pause the video
     */
    pause() {
        this.video.pause();
    }

    /**
     * Check if video is playing
     * @returns {boolean}
     */
    isPlaying() {
        return !this.video.paused;
    }

    /**
     * Get current playback speed
     * @returns {number}
     */
    getSpeed() {
        return this.video.playbackRate;
    }

    /**
     * Set playback speed
     * @param {number} rate - Speed multiplier (0.25 to 4.0)
     */
    setSpeed(rate) {
        // Clamp to valid range
        rate = Math.max(0.25, Math.min(4.0, rate));
        this.video.playbackRate = rate;
    }

    /**
     * Increase playback speed
     * @returns {number} New speed
     */
    speedUp() {
        const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
        const current = this.video.playbackRate;
        const next = speeds.find(s => s > current) || speeds[speeds.length - 1];
        this.video.playbackRate = next;
        return next;
    }

    /**
     * Decrease playback speed
     * @returns {number} New speed
     */
    slowDown() {
        const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
        const current = this.video.playbackRate;
        const prev = speeds.reverse().find(s => s < current) || speeds[speeds.length - 1];
        this.video.playbackRate = prev;
        return prev;
    }

    /**
     * Format time as MM:SS.ms
     * @param {number} seconds
     * @returns {string}
     */
    static formatTime(seconds) {
        if (seconds == null || isNaN(seconds)) return '--:--';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);

        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
}
