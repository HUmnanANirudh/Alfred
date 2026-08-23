# Local AI engines and models

Alfred runs models on your local computer using audio.cpp and llama.cpp. It does not require Python, Conda environments, or remote APIs.

## Models

| Model | Purpose | Parameters | Format |
|---|---|---|---|
| PocketTTS | Text to speech | 100M | GGUF (Q8_0) |
| Qwen3-ASR | Speech recognition | 0.6B | GGUF (Q8_0) |
| LFM2.5 | Text drafting and hook scoring | 350M | GGUF (Q4_K_M) |

## Configuration file

The configuration file is located at:
`~/.local/share/audiocpp_server.json`

```json
{
  "host": "127.0.0.1",
  "port": 8766,
  "backend": "vulkan",
  "device": 0,
  "threads": 4,
  "lazy_load": true,
  "models": [
    {
      "id": "qwen3-asr",
      "family": "qwen3_asr",
      "path": "/home/anni/.local/share/audiocpp_models/Qwen3-ASR-0.6B-GGUF",
      "task": "asr",
      "mode": "offline"
    },
    {
      "id": "pocket-tts",
      "family": "pocket_tts",
      "path": "/home/anni/.local/share/audiocpp_models/PocketTTS-GGUF/english",
      "task": "tts",
      "mode": "offline",
      "model_spec_override": "/home/anni/.local/share/audiocpp_models/model_specs/pocket_tts.json"
    }
  ]
}
```

## Hardware backends

### Vulkan
Use Vulkan for Intel, AMD, and Nvidia graphics cards.
Configuration value: `"backend": "vulkan"`

### CUDA
Use CUDA for Nvidia systems with the CUDA toolkit installed.
Configuration value: `"backend": "cuda"`

### CPU
Use CPU mode on computers without supported graphics cards. On Intel hybrid processors with performance and efficient cores, set threads to 4 to avoid slowdowns.
Configuration value: `"backend": "cpu"`, `"threads": 4`
