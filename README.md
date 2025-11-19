# sampletube

A browser-based tool for beat-aligned video sampling. Load a video, detect beats automatically, and use keyboard hotkeys to jump to musically-informed cue points.

## Features

- **Automatic beat detection** using Essentia.js (runs entirely in browser)
- **10 assignable hotkeys** (1-9, 0) that snap to detected beats/downbeats
- **Waveform visualization** with beat markers and color-coded hotkey positions
- **Playback speed control** (0.25x - 4.00x in 0.05 increments)

## Usage

### Running locally

```bash
cd sampletube
python -m http.server 8000
# Open http://localhost:8000
```

### Controls

| Key | Action |
|-----|--------|
| `1`-`9`, `0` | Jump to assigned time (or assign if empty) |
| `Shift`+number | Re-assign hotkey to current time |
| `Space` | Play/Pause |
| `[` / `]` | Decrease/Increase speed |

### Buttons

- **Default** - Spread hotkeys across detected beats
- **Clear** - Remove all assignments
- **Snap mode** - Quantize assignments to beat/downbeat/off

## Comparing Beat Detection Algorithms

Generate beat data with Python tools:

```bash
pip install librosa soundfile moviepy
python analysis/analyze_librosa.py video.mp4 -o beats_librosa.json
```

Then in the app:
1. Select "Load JSON" from the detector dropdown
2. Choose your JSON file
3. Compare results against Essentia.js

### JSON format

```json
{
  "beats": [0.0, 0.5, 1.0, ...],
  "downbeats": [0.0, 2.0, 4.0, ...],
  "bpm": 120
}
```
