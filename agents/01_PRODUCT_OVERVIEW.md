# Alfred — Product Overview

---

## 1. What Is Alfred?

Alfred is a **privacy-first, local-first AI content creation hub** for desktop.

The product is inspired by Batman's butler: the user feeds Alfred raw material — articles, videos, notes, research — and Alfred handles the tedious work of transforming that material into creator-ready content formats without sending anything to a cloud service.

**One-line pitch:**
> Give Alfred something to work with. Alfred does the rest — entirely on your machine.

---

## 2. Core Problem Alfred Solves

Modern content creators face three recurring pains:

| Pain | Reality |
|------|---------|
| **Re-pasting context** | Writers paste the same research into 5 different AI tools for 5 different formats |
| **Cloud privacy risk** | Every major AI tool sends your content, scripts, and voice to a remote server |
| **Fragmented tooling** | Video editors, caption tools, blog writers, social tools — all disconnected |

Alfred solves all three:
- **One project = one source library.** Add your research once; use it in every format.
- **Everything local.** AI inference, media processing, transcription — on device.
- **One workspace.** Video, audio, writing — all drawing from the same project context.

---

## 3. Product Philosophy

### Feel
Alfred should feel like a **premium desktop creator workspace**, not a generic SaaS dashboard.

| Should feel like | Should NOT feel like |
|-----------------|---------------------|
| Linear | Notion |
| Raycast | Canva |
| DaVinci Resolve | ChatGPT wrapper |
| A professional writing room | A cloud AI product |
| A serious creative tool | A startup demo |

### Words that define Alfred's aesthetic
- Minimal
- Calm
- Fast
- Professional
- Creator-focused
- Desktop-first
- Keyboard-friendly
- Information-dense without clutter
- Local / private

### Avoid
- Generic AI dashboard aesthetics
- Excessive gradients
- Hero sections / marketing copy inside the app
- Oversized rounded cards
- Cluttered sidebars
- Gamification
- Cloud-centric language ("Upload", "Sync to cloud", "Powered by GPT-X")
- SaaS billing / subscription UI

---

## 4. Core Mental Model

The fundamental hierarchy of Alfred:

```
Alfred
│
├── Projects
│   │
│   ├── Sources  ← centralized project memory
│   │   ├── Articles
│   │   ├── YouTube Videos
│   │   ├── Local Videos
│   │   ├── Notes
│   │   └── Pasted Content
│   │
│   ├── Video
│   │   ├── Videos
│   │   ├── Transcripts
│   │   └── Shorts
│   │
│   ├── Audio
│   │   └── Generated Audio
│   │
│   └── Writing
│       ├── Articles
│       ├── X Posts
│       ├── Threads
│       └── LinkedIn Posts
│
└── Voices  ← global, cross-project
```

### The content flow

```
PROJECT
   │
   ▼
SOURCES  (add once, reuse everywhere)
   │
   ├──────────────────────────────────┐
   ▼                ▼                 ▼
VIDEO            AUDIO            WRITING
   │                │                 │
   ▼                ▼                 ▼
Shorts           Voice +          Articles /
Transcripts      Speech           Social Posts
```

**The user should never have to re-paste the same information into different workflows.**

---

## 5. Privacy Identity

Privacy is one of Alfred's strongest product differentiators.

Every piece of the pipeline is designed to run on-device:

| Capability | Technology | Location |
|-----------|-----------|----------|
| AI text generation | llama.cpp + local models | On device |
| Transcription | local Whisper | On device |
| Voice / TTS | local voice model | On device |
| Media processing | FFmpeg | On device |
| Video download | yt-dlp | On device |
| Project database | Turso (local file) | On device |

The UI must reinforce this with:
- A persistent **`● Local`** status indicator in the app chrome
- A **Privacy** section in Settings
- Clear copy: *"Your content stays on this device."*
- Avoid claiming "local" for anything that is still mocked in Phase 1; represent the *intended* architecture

---

## 6. Target User

Alfred's primary user is an **independent content creator** who:
- Produces long-form content (YouTube, podcasts, newsletters, research)
- Wants to repurpose that content across formats (shorts, blog posts, X threads, LinkedIn)
- Values privacy and owns their workflow
- Uses a desktop Mac/Linux/Windows machine as their primary workstation
- Is willing to invest time in a setup that gives them real creative leverage

Secondary users:
- Researchers producing content from their research
- Teams doing local-first content workflows

---

## 7. What Alfred Is Not

- Not a cloud AI chatbot wrapper
- Not a SaaS subscription product (it may eventually be sold as a license, not a monthly SaaS fee)
- Not a mobile app
- Not a real-time collaboration tool
- Not a video editor (it orchestrates FFmpeg; it is not a timeline editor)

---

## 8. Product Name & Identity

| Attribute | Value |
|-----------|-------|
| Name | Alfred |
| Inspiration | Alfred Pennyworth (Batman's butler) |
| Tone | Composed, competent, understated |
| Tagline | *(TBD — avoid clichés)* |
| App identifier | `com.anni.alfred` |

---

*Next: [02_ARCHITECTURE.md](./02_ARCHITECTURE.md)*
