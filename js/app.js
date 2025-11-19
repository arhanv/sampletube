/**
 * SampleTube - Main Application
 * Beat-aligned video sampling tool
 */

import { AudioProcessor } from './audio-processor.js';
import { VideoPlayer } from './video-player.js';
import { HotkeyController } from './hotkey-controller.js';
import { EssentiaDetector } from './detectors/essentia-detector.js';
import { FileDetector } from './detectors/file-detector.js';
import { WaveformVisualizer } from './ui/waveform.js';

class SampleTubeApp {
    constructor() {
        // Core components
        this.audioProcessor = new AudioProcessor();
        this.videoPlayer = null;
        this.hotkeyController = new HotkeyController();
        this.waveform = null;

        // Detectors
        this.essentiaDetector = new EssentiaDetector();
        this.fileDetector = new FileDetector();
        this.currentDetector = this.essentiaDetector;

        // Cached audio data for re-analysis
        this.cachedAudioData = null;

        // DOM elements
        this.elements = {
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('file-input'),
            fileSection: document.getElementById('file-section'),
            playerSection: document.getElementById('player-section'),
            videoPlayer: document.getElementById('video-player'),
            waveformCanvas: document.getElementById('waveform-canvas'),
            detectorType: document.getElementById('detector-type'),
            jsonFileInput: document.getElementById('json-file-input'),
            jsonFileLabel: document.getElementById('json-file-label'),
            statusText: document.getElementById('status-text'),
            analysisProgress: document.getElementById('analysis-progress'),
            hotkeyList: document.getElementById('hotkey-list'),
            btnDefault: document.getElementById('btn-default'),
            btnClear: document.getElementById('btn-clear'),
            quantizeMode: document.getElementById('quantize-mode'),
            btnSpeedDown: document.getElementById('btn-speed-down'),
            btnSpeedUp: document.getElementById('btn-speed-up'),
            speedDisplay: document.getElementById('speed-display')
        };

        // State
        this.isAnalyzing = false;
        this.analysisComplete = false;

        this.init();
    }

    init() {
        // Initialize video player
        this.videoPlayer = new VideoPlayer(this.elements.videoPlayer);

        // Initialize waveform visualizer
        this.waveform = new WaveformVisualizer(this.elements.waveformCanvas);

        // Set up event listeners
        this.setupFileInput();
        this.setupHotkeyUI();
        this.setupControls();
        this.setupSpeedControls();
        this.setupKeyboardShortcuts();
        this.setupDetectorSelector();
        this.setupWaveform();

        // Connect hotkey controller callbacks
        this.hotkeyController.onAssignmentChange = (key, assignment) => {
            this.updateHotkeyUI(key, assignment);
            this.updateWaveformHotkeys();
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

    setupDetectorSelector() {
        const { detectorType, jsonFileInput, jsonFileLabel } = this.elements;

        // Toggle JSON file input visibility
        detectorType.addEventListener('change', (e) => {
            if (e.target.value === 'json') {
                jsonFileLabel.classList.remove('hidden');
            } else {
                jsonFileLabel.classList.add('hidden');
                this.currentDetector = this.essentiaDetector;

                // Re-analyze with Essentia if we have cached audio
                if (this.cachedAudioData) {
                    this.runDetection();
                }
            }
        });

        // JSON file selection
        jsonFileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                try {
                    await this.fileDetector.loadFromFile(file);
                    this.currentDetector = this.fileDetector;

                    // Update label to show filename
                    jsonFileLabel.textContent = file.name.length > 15
                        ? file.name.substring(0, 12) + '...'
                        : file.name;

                    // Run detection with loaded JSON
                    if (this.cachedAudioData) {
                        this.runDetection();
                    }
                } catch (error) {
                    console.error('Error loading JSON:', error);
                    this.setStatus(`Error loading JSON: ${error.message}`);
                }
            }
        });
    }

    setupWaveform() {
        const { waveformCanvas, videoPlayer } = this.elements;

        // Click to seek
        waveformCanvas.addEventListener('click', (e) => {
            if (this.videoPlayer && this.waveform) {
                const time = this.waveform.handleClick(e);
                this.videoPlayer.seekTo(time);
            }
        });

        // Update waveform on video time updates
        videoPlayer.addEventListener('timeupdate', () => {
            if (this.waveform) {
                this.waveform.setCurrentTime(this.videoPlayer.getCurrentTime());
                this.waveform.draw();
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

    setupSpeedControls() {
        const { btnSpeedDown, btnSpeedUp } = this.elements;

        btnSpeedDown.addEventListener('click', () => {
            if (this.videoPlayer) {
                const speed = this.videoPlayer.slowDown();
                this.updateSpeedDisplay(speed);
            }
        });

        btnSpeedUp.addEventListener('click', () => {
            if (this.videoPlayer) {
                const speed = this.videoPlayer.speedUp();
                this.updateSpeedDisplay(speed);
            }
        });
    }

    updateSpeedDisplay(speed) {
        this.elements.speedDisplay.textContent = `${speed}x`;
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

            // Speed controls: [ and ]
            if (e.key === '[') {
                e.preventDefault();
                if (this.videoPlayer) {
                    const speed = this.videoPlayer.slowDown();
                    this.updateSpeedDisplay(speed);
                }
                return;
            }

            if (e.key === ']') {
                e.preventDefault();
                if (this.videoPlayer) {
                    const speed = this.videoPlayer.speedUp();
                    this.updateSpeedDisplay(speed);
                }
                return;
            }

            // Number keys 1-9, 0
            // Use e.code to get physical key (Digit1, Digit0, etc.) since e.key changes with shift
            const codeToKey = {
                'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4', 'Digit5': '5',
                'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9', 'Digit0': '0'
            };
            const key = codeToKey[e.code];

            if (key && this.hotkeyController.keys.includes(key)) {
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

            // Initialize waveform size
            this.waveform.resize();

            this.setStatus('Extracting audio...');

            // Extract audio
            this.elements.analysisProgress.classList.remove('hidden');
            this.cachedAudioData = await this.audioProcessor.extractAudio(file, (p) => {
                this.setProgress(p * 0.5);
            });

            // Set waveform audio data
            this.waveform.setAudioData(
                this.cachedAudioData.channelData,
                this.cachedAudioData.sampleRate,
                this.cachedAudioData.duration
            );

            // Run beat detection
            await this.runDetection();

        } catch (error) {
            console.error('Error loading video:', error);
            this.setStatus(`Error: ${error.message}`);
            this.elements.analysisProgress.classList.add('hidden');
        }
    }

    async runDetection() {
        if (this.isAnalyzing || !this.cachedAudioData) return;
        this.isAnalyzing = true;

        this.elements.analysisProgress.classList.remove('hidden');

        try {
            // Run beat detection
            this.setStatus(`Detecting beats (${this.currentDetector.name})...`);
            const result = await this.currentDetector.analyze(
                this.cachedAudioData.channelData,
                this.cachedAudioData.sampleRate,
                (p) => {
                    this.setProgress(50 + p * 0.5);
                }
            );

            // Store results
            this.hotkeyController.setBeats(result.beats, result.downbeats);

            // Update waveform
            this.waveform.setBeats(result.beats, result.downbeats);

            // Set default hotkey assignments
            this.hotkeyController.setDefault(this.videoPlayer.getDuration());

            // Update waveform with hotkey assignments
            this.updateWaveformHotkeys();

            // Draw waveform
            this.waveform.draw();

            // Update status
            this.analysisComplete = true;
            this.setStatus(
                `Ready - ${result.beats.length} beats, ` +
                `~${result.bpm} BPM (${this.currentDetector.name})`
            );

        } catch (error) {
            console.error('Analysis error:', error);
            this.setStatus(`Analysis failed: ${error.message}`);
        } finally {
            this.isAnalyzing = false;
            this.elements.analysisProgress.classList.add('hidden');
        }
    }

    updateWaveformHotkeys() {
        if (this.waveform) {
            this.waveform.setHotkeyAssignments(this.hotkeyController.getAllAssignments());
            this.waveform.draw();
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
