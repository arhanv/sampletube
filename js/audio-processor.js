/**
 * Audio Processor
 * Extracts and processes audio from video files
 */

export class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
    }

    /**
     * Extract audio from a video file
     * @param {File} videoFile - The video file to process
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<{buffer: AudioBuffer, channelData: Float32Array, sampleRate: number}>}
     */
    async extractAudio(videoFile, onProgress = () => {}) {
        // Create audio context if needed
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        onProgress(10);

        // Read file as array buffer
        const arrayBuffer = await this.readFileAsArrayBuffer(videoFile, (p) => {
            onProgress(10 + p * 0.4); // 10-50%
        });

        onProgress(50);

        // Decode audio data
        try {
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            throw new Error(`Failed to decode audio: ${error.message}`);
        }

        onProgress(80);

        // Get mono channel data (mix down if stereo)
        const channelData = this.getMonoChannelData(this.audioBuffer);

        onProgress(100);

        return {
            buffer: this.audioBuffer,
            channelData: channelData,
            sampleRate: this.audioBuffer.sampleRate,
            duration: this.audioBuffer.duration
        };
    }

    /**
     * Read file as ArrayBuffer with progress
     */
    readFileAsArrayBuffer(file, onProgress) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(e.loaded / e.total);
                }
            };

            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Convert audio buffer to mono Float32Array
     */
    getMonoChannelData(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;

        if (numChannels === 1) {
            return audioBuffer.getChannelData(0);
        }

        // Mix down to mono
        const mono = new Float32Array(length);
        for (let i = 0; i < numChannels; i++) {
            const channel = audioBuffer.getChannelData(i);
            for (let j = 0; j < length; j++) {
                mono[j] += channel[j] / numChannels;
            }
        }

        return mono;
    }

    /**
     * Get duration of loaded audio
     */
    getDuration() {
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }
}
