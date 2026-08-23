# Desktop installation guide

This guide explains how to install, build, and package Alfred on Linux, macOS, and Windows.

## System requirements

* Operating system: Ubuntu 22.04 or later, macOS 12 or later, Windows 10 or 11.
* Processor: 4 cores or more (x86_64 or Apple Silicon).
* Memory: 8 GB minimum, 16 GB recommended.
* Graphics: Integrated graphics with Vulkan support, Nvidia GPU with CUDA, or CPU mode.
* Disk space: 10 GB free space for models and local files.

## Install prebuilt packages

### Linux

For Ubuntu or Debian:
```bash
sudo dpkg -i alfred_0.1.0_amd64.deb
sudo apt-get install -f
```

For AppImage:
```bash
chmod +x alfred_0.1.0_amd64.AppImage
./alfred_0.1.0_amd64.AppImage
```

### macOS

1. Open the downloaded .dmg file.
2. Drag Alfred into your Applications folder.
3. Open Alfred from your Applications folder.

### Windows

1. Open the .msi installer.
2. Complete the setup wizard steps.
3. Open Alfred from the Start menu.

## Build from source

### 1. Install system tools

On Linux (Debian or Ubuntu):
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
* Install FFmpeg and add its bin folder to your PATH.

### 2. Install Rust and Bun

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

### 3. Get the code and install packages

```bash
git clone https://github.com/HUmnanANirudh/Alfred.git
cd Alfred
bun install
```

### 4. Run in development mode

```bash
bun tauri dev
```

### 5. Build installation packages

```bash
bun tauri build
```

The output files will be in:
* Linux: `src-tauri/target/release/bundle/deb/` and `src-tauri/target/release/bundle/appimage/`
* macOS: `src-tauri/target/release/bundle/dmg/`
* Windows: `src-tauri/target/release/bundle/msi/`

## Troubleshooting

### Audio does not play on Linux
Linux WebKit requires audio files to load through HTTP with byte-range support. Alfred starts an internal server on 127.0.0.1 to stream these files. Make sure your local network settings allow connections to localhost.

### File storage locations
Alfred stores all projects, drafts, and database files in your local application data folder:
* Linux: `~/.local/share/com.anni.alfred/`
* macOS: `~/Library/Application Support/com.anni.alfred/`
* Windows: `%LOCALAPPDATA%\com.anni.alfred\`
