#!/usr/bin/env python3
"""
Beat detection using librosa
Outputs JSON file compatible with SampleTube's FileDetector

Usage:
    python analyze_librosa.py video.mp4 --output beats.json

Requirements:
    pip install librosa soundfile moviepy numpy
"""

import argparse
import json
import numpy as np

def extract_audio_from_video(video_path, sr=22050):
    """Extract audio from video file using moviepy"""
    from moviepy.editor import VideoFileClip
    import tempfile
    import soundfile as sf
    import os

    # Extract audio to temp file
    clip = VideoFileClip(video_path)

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        temp_path = f.name

    clip.audio.write_audiofile(temp_path, fps=sr, verbose=False, logger=None)
    clip.close()

    # Load audio
    import librosa
    y, sr = librosa.load(temp_path, sr=sr)

    # Clean up
    os.unlink(temp_path)

    return y, sr


def analyze_beats(y, sr):
    """Detect beats and downbeats using librosa"""
    import librosa

    # Beat tracking
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    # Estimate downbeats (simple 4/4 assumption)
    # For better results, use madmom's DBNDownBeatTrackingProcessor
    downbeat_times = beat_times[::4].tolist()

    return {
        'beats': beat_times.tolist(),
        'downbeats': downbeat_times,
        'bpm': float(tempo),
        'confidence': 1.0,  # librosa doesn't provide confidence
        'algorithm': 'librosa.beat.beat_track',
        'sample_rate': sr
    }


def main():
    parser = argparse.ArgumentParser(description='Analyze beats using librosa')
    parser.add_argument('input', help='Input video or audio file')
    parser.add_argument('--output', '-o', default='beats_librosa.json',
                        help='Output JSON file (default: beats_librosa.json)')
    parser.add_argument('--sr', type=int, default=22050,
                        help='Sample rate (default: 22050)')

    args = parser.parse_args()

    print(f'Loading audio from {args.input}...')

    # Check if input is video or audio
    if args.input.endswith(('.mp4', '.mov', '.avi', '.webm', '.mkv')):
        y, sr = extract_audio_from_video(args.input, args.sr)
    else:
        import librosa
        y, sr = librosa.load(args.input, sr=args.sr)

    print(f'Analyzing beats (sr={sr})...')
    result = analyze_beats(y, sr)

    print(f'Found {len(result["beats"])} beats at ~{result["bpm"]:.1f} BPM')

    # Save to JSON
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)

    print(f'Saved to {args.output}')


if __name__ == '__main__':
    main()
