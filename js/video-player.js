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
