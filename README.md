# Alfred

Alfred is a desktop application that turns articles, notes, and videos into short video clips, speech, and written posts on your local computer. It does not send your data, audio, or text to external servers.

## Features

### Video to short clips
* Transcribes video files with local speech recognition using Qwen3-ASR.
* Finds clip segments and hooks with a local language model.
* Crops, formats, and renders vertical video with subtitles using FFmpeg.
* Lets you view, search, and edit transcripts with timestamps.

### Speech synthesis
* Converts text to speech locally using PocketTTS.
* Runs on graphics cards through Vulkan or CUDA, or directly on the CPU.
* Includes an audio player with seeking, volume controls, and track separation.
* Exports audio files to WAV and MP3.

### Text generation
* Writes articles, short posts, and threads from your imported sources.
* Edits drafts with tools to rewrite, expand, or shorten text.
* Exports written work to Markdown or plain text files.

### Source management
* Imports text from article web addresses, local videos, or pasted notes.
* Lets you reuse the same source material across video, audio, and writing tasks.

## System design

The application uses:
* React 19, TypeScript, and Vite for the user interface.
* Tauri 2 and Rust for the desktop window, process management, and local database.
* audio.cpp and llama.cpp for local model execution without Python.
* Turso for the local SQLite database.
* FFmpeg and an internal HTTP server for media playback.

## How to download and install

### Prebuilt packages

Download the package for your operating system from the repository releases page.

| Operating system | Package type | Command or action |
|---|---|---|
| Linux (Ubuntu/Debian) | .deb | `sudo dpkg -i alfred_0.1.0_amd64.deb` |
| Linux (Other) | .AppImage | `chmod +x alfred_0.1.0_amd64.AppImage && ./alfred_0.1.0_amd64.AppImage` |
| macOS | .dmg | Open the file and drag Alfred to the Applications folder |
| Windows | .msi | Run the installer file |

### Build from source

#### 1. Install system tools

On Ubuntu or Debian:
```bash
sudo apt update && sudo apt install -y \
  build-essential \
  curl \
  wget \
  file \
  pkg-config \
  libssl-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  ffmpeg
```

On macOS:
```bash
xcode-select --install
brew install ffmpeg
```

On Windows:
* Install Visual Studio C++ Build Tools.
* Install FFmpeg and add its bin folder to your PATH environment variable.

#### 2. Install Rust and Bun

Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
source $HOME/.bashrc
```

#### 3. Download the code and install dependencies

```bash
git clone https://github.com/HUmnanANirudh/Alfred.git
cd Alfred
bun install
```

#### 4. Run the app in development mode

```bash
bun tauri dev
```

#### 5. Build an installer package

```bash
bun tauri build
```

The output files will be in:
* Linux: `src-tauri/target/release/bundle/deb/` and `src-tauri/target/release/bundle/appimage/`
* macOS: `src-tauri/target/release/bundle/dmg/`
* Windows: `src-tauri/target/release/bundle/msi/`

## Local models and hardware

The app runs GGUF model files:
* Speech recognition: Qwen3-ASR (0.6B)
* Text to speech: PocketTTS English (Q8_0)
* Text writing: LFM2.5 (350M)

The server configuration file is stored at:
`~/.local/share/audiocpp_server.json`

Set the backend field to "vulkan" for Intel, AMD, or Nvidia graphics cards, "cuda" for Nvidia systems with CUDA installed, or "cpu" for processor-only mode.

## Project layout

* `src/`: React frontend code, page layouts, components, and state stores.
* `src-tauri/`: Rust backend code, local database queries, file streaming, and process controls.
* `docs/`: Technical guides for installation, hardware configuration, and architecture.

## License

MIT
