# System architecture

This document outlines the parts that make up Alfred and how they work together.

## Overview

Alfred consists of three main parts:

1. User interface: A React 19 single-page application built with TypeScript, Vite, and CSS Modules.
2. Desktop runtime: A Tauri 2 shell written in Rust that handles file access, local databases, and external processes.
3. Model runtimes: Native C++ programs (audio.cpp and llama.cpp) running on localhost.

## Communication

* Frontend to backend: The frontend calls Rust functions using the Tauri invoke interface and receives progress updates through event listeners.
* Media streaming: An internal HTTP server runs in Rust on localhost to stream audio and video with byte-range support to the webview.
* Model execution: The Rust backend sends HTTP requests to audio.cpp on port 8766 and llama.cpp on port 8765.

## Local database

The application stores data in an embedded SQLite database using the Turso Rust library. The database file is stored at:
`~/.local/share/com.anni.alfred/alfred.db`

Database tables store projects, imported sources, generated audio tracks, video clips, and transcripts.
