/**
 * SampleTube - Main Application
 * Beat-aligned video sampling tool
 */

import { AudioProcessor } from './audio-processor.js';
import { VideoPlayer } from './video-player.js';
import { HotkeyController } from './hotkey-controller.js';
import { EssentiaDetector } from './detectors/essentia-detector.js';

class SampleTubeApp {
    constructor() {
        // Core components
        this.audioProcessor = new AudioProcessor();
        this.videoPlayer = null;
        this.hotkeyController = new HotkeyController();
        this.detector = new EssentiaDetector();

        // DOM elements
        this.elements = {
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('file-input'),
            fileSection: document.getElementById('file-section'),
            playerSection: document.getElementById('player-section'),
            videoPlayer: document.getElementById('video-player'),
            statusText: document.getElementById('status-text'),
            analysisProgress: document.getElementById('analysis-progress'),
            hotkeyList: document.getElementById('hotkey-list'),
            btnDefault: document.getElementById('btn-default'),
            btnClear: document.getElementById('btn-clear'),
            quantizeMode: document.getElementById('quantize-mode')
        };

        // State
        this.isAnalyzing = false;
        this.analysisComplete = false;

        this.init();
    }

    init() {
        // Initialize video player
        this.videoPlayer = new VideoPlayer(this.elements.videoPlayer);

        // Set up event listeners
        this.setupFileInput();
        this.setupHotkeyUI();
        this.setupControls();
        this.setupKeyboardShortcuts();

        // Connect hotkey controller callbacks
        this.hotkeyController.onAssignmentChange = (key, assignment) => {
            this.updateHotkeyUI(key, assignment);
        };

        console.log('SampleTube initialized');
    }

    setupFileInput() {
        const { dropZone, fileInput } = this.elements;

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadVideo(e.target.files[0]);
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('video/')) {
                this.loadVideo(files[0]);
            }
        });
    }

    setupHotkeyUI() {
        const { hotkeyList } = this.elements;

        // Create hotkey items
        this.hotkeyController.keys.forEach(key => {
            const item = document.createElement('div');
            item.className = 'hotkey-item';
            item.dataset.key = key;
            item.innerHTML = `
                <span class="hotkey-key">${key}</span>
                <span class="hotkey-time">--:--</span>
            `;
            hotkeyList.appendChild(item);
        });
    }

    setupControls() {
        const { btnDefault, btnClear, quantizeMode } = this.elements;

        btnDefault.addEventListener('click', () => {
            if (this.videoPlayer) {
                this.hotkeyController.setDefault(this.videoPlayer.getDuration());
            }
        });

        btnClear.addEventListener('click', () => {
            this.hotkeyController.clearAll();
        });

        quantizeMode.addEventListener('change', (e) => {
            this.hotkeyController.setQuantizeMode(e.target.value);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Space: play/pause
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.videoPlayer) {
                    this.videoPlayer.togglePlay();
                }
                return;
            }

            // Number keys 1-9, 0
            const key = e.key;
            if (this.hotkeyController.keys.includes(key)) {
                e.preventDefault();

                if (!this.videoPlayer) return;

                const currentTime = this.videoPlayer.getCurrentTime();
                const seekTime = this.hotkeyController.handleKeyPress(key, e.shiftKey, currentTime);

                if (seekTime !== null) {
                    this.videoPlayer.seekTo(seekTime);
                    this.flashHotkeyUI(key);
                }
            }
        });
    }

    async loadVideo(file) {
        this.setStatus('Loading video...');

        try {
            // Load video into player
            await this.videoPlayer.loadFile(file);

            // Show player section
            this.elements.fileSection.classList.add('hidden');
            this.elements.playerSection.classList.remove('hidden');

            this.setStatus('Analyzing audio...');

            // Start beat detection
            await this.analyzeAudio(file);

        } catch (error) {
            console.error('Error loading video:', error);
            this.setStatus(`Error: ${error.message}`);
        }
    }

    async analyzeAudio(file) {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        this.elements.analysisProgress.classList.remove('hidden');

        try {
            // Extract audio
            this.setStatus('Extracting audio...');
            const audioData = await this.audioProcessor.extractAudio(file, (p) => {
                this.setProgress(p * 0.5); // 0-50%
            });

            // Run beat detection
            this.setStatus(`Detecting beats (${this.detector.name})...`);
            const result = await this.detector.analyze(
                audioData.channelData,
                audioData.sampleRate,
                (p) => {
                    this.setProgress(50 + p * 0.5); // 50-100%
                }
            );

            // Store results
            this.hotkeyController.setBeats(result.beats, result.downbeats);

            // Set default hotkey assignments
            this.hotkeyController.setDefault(this.videoPlayer.getDuration());

            // Update status
            this.analysisComplete = true;
            this.setStatus(
                `Ready - ${result.beats.length} beats detected, ` +
                `~${result.bpm} BPM, confidence: ${result.confidence.toFixed(2)}`
            );

        } catch (error) {
            console.error('Analysis error:', error);
            this.setStatus(`Analysis failed: ${error.message}`);
        } finally {
            this.isAnalyzing = false;
            this.elements.analysisProgress.classList.add('hidden');
        }
    }

    updateHotkeyUI(key, assignment) {
        const item = this.elements.hotkeyList.querySelector(`[data-key="${key}"]`);
        if (!item) return;

        const timeSpan = item.querySelector('.hotkey-time');

        if (assignment.time !== null) {
            item.classList.add('assigned');
            timeSpan.textContent = VideoPlayer.formatTime(assignment.time);
        } else {
            item.classList.remove('assigned');
            timeSpan.textContent = '--:--';
        }
    }

    flashHotkeyUI(key) {
        const item = this.elements.hotkeyList.querySelector(`[data-key="${key}"]`);
        if (!item) return;

        item.classList.add('active');
        setTimeout(() => {
            item.classList.remove('active');
        }, 150);
    }

    setStatus(text) {
        this.elements.statusText.textContent = text;
    }

    setProgress(percent) {
        this.elements.analysisProgress.value = percent;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SampleTubeApp();
});
