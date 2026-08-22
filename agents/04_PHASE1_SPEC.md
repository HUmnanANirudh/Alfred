# Alfred — Phase 1 Frontend MVP Specification

> **Phase 1 is frontend-only.**
> No real AI, no real media processing, no backend, no database.
> Mocked services simulate async behaviour. The UI must be real, polished, and demo-able end to end.

---

## 1. Phase 1 Goals

| Goal | Definition |
|------|-----------|
| Complete UI | Every screen from the spec is built and navigable |
| Mocked services | All async operations use a service layer with realistic delays and state |
| Correct data model | All entities use types from `03_DATA_MODELS.md` — no ad-hoc shapes |
| Architectural seam | Replacing mocked service with real `invoke()` requires zero UI changes |
| Demo flow complete | A user can walk the full product flow without a backend running |

---

## 2. Definition of Done

Phase 1 is complete when this full demo flow works without errors:

```
Launch Alfred
  └─ Empty workspace screen: "Alfred, welcomes you"
       └─ Click "Commission a Project"
            └─ Project creation modal
                 └─ Name + optional description
                      └─ Project created → navigate to project workspace
                           ├─ SOURCES
                           │    ├─ Add article (URL → mock fetch → success)
                           │    ├─ Add article (URL → mock fetch → FAIL → paste fallback)
                           │    ├─ Add YouTube video (URL → mock process → success)
                           │    ├─ Paste content (manual source)
                           │    └─ View source list → open source detail
                           │
                           ├─ VIDEO
                           │    ├─ Create Short → choose video source
                           │    ├─ Choose preset (visual cards)
                           │    ├─ Configure options → click "Create Shorts"
                           │    ├─ Processing UI with step progress
                           │    ├─ Generated shorts list
                           │    └─ Open transcript
                           │
                           ├─ AUDIO
                           │    ├─ Write / paste script
                           │    ├─ Select sources
                           │    ├─ Click "Generate Audio" → voice selection modal
                           │    ├─ Processing UI
                           │    └─ Generated audio result
                           │
                           └─ WRITING
                                ├─ Article → source selection → generate → editor
                                ├─ X post → generate → editable post cards
                                ├─ Thread → generate → editable thread cards
                                └─ LinkedIn → generate → editor
```

---

## 3. Screens Inventory

### Global / App Shell
| Screen | Route | Description |
|--------|-------|-------------|
| Empty workspace | `/` | First-launch state, no projects |
| Project workspace shell | `/projects/:id` | Persistent sidebar + main content area |
| Settings | `/settings` | General, AI Models, Privacy, Storage |
| Voices | `/voices` | Global voice management |

### Project Workspace
| Screen | Route | Description |
|--------|-------|-------------|
| Overview | `/projects/:id` | Stats, recent activity, quick actions |
| Sources | `/projects/:id/sources` | Source list + add source |
| Source detail | `/projects/:id/sources/:srcId` | Full source view |
| Video | `/projects/:id/video` | Video list |
| Shorts | `/projects/:id/video/shorts` | Generated shorts list |
| Transcripts | `/projects/:id/video/transcripts` | Transcript list |
| Transcript detail | `/projects/:id/video/transcripts/:trsId` | Full transcript view |
| Audio | `/projects/:id/audio` | Audio generation interface |
| Writing — Article | `/projects/:id/writing/article` | Article generation + editor |
| Writing — X | `/projects/:id/writing/x` | X post / thread generation |
| Writing — LinkedIn | `/projects/:id/writing/linkedin` | LinkedIn post generation |

---

## 4. Component Architecture

### Folder structure (recommended)

```
src/
├── main.tsx
├── App.tsx
│
├── types/               ← all types from 03_DATA_MODELS.md
│   └── index.ts
│
├── services/            ← mock service layer
│   ├── projectService.ts
│   ├── sourceService.ts
│   ├── videoService.ts
│   ├── transcriptService.ts
│   ├── shortService.ts
│   ├── audioService.ts
│   ├── voiceService.ts
│   ├── writingService.ts
│   └── modelService.ts
│
├── store/               ← Zustand (or React Context) stores
│   ├── projectStore.ts
│   ├── uiStore.ts
│   └── toastStore.ts
│
├── router/              ← route definitions
│   └── index.tsx
│
├── layouts/
│   ├── AppShell.tsx     ← top-level wrapper
│   └── ProjectLayout.tsx ← sidebar + main content
│
├── pages/
│   ├── EmptyWorkspace.tsx
│   ├── ProjectOverview.tsx
│   ├── SourcesPage.tsx
│   ├── SourceDetailPage.tsx
│   ├── VideoPage.tsx
│   ├── ShortsPage.tsx
│   ├── TranscriptsPage.tsx
│   ├── TranscriptDetailPage.tsx
│   ├── AudioPage.tsx
│   ├── WritingArticlePage.tsx
│   ├── WritingXPage.tsx
│   ├── WritingLinkedInPage.tsx
│   ├── VoicesPage.tsx
│   └── SettingsPage.tsx
│
├── components/
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── ProjectSwitcher.tsx
│   │   └── NavItem.tsx
│   │
│   ├── sources/
│   │   ├── SourceCard.tsx
│   │   ├── SourceIcon.tsx
│   │   ├── SourceSelector.tsx   ← REUSABLE across all gen flows
│   │   └── AddSourceModal.tsx
│   │
│   ├── video/
│   │   ├── PresetCard.tsx
│   │   ├── PresetSelector.tsx
│   │   ├── ShortCard.tsx
│   │   └── ProcessingPanel.tsx
│   │
│   ├── audio/
│   │   ├── VoiceCard.tsx
│   │   ├── VoiceSelector.tsx
│   │   └── AudioCard.tsx
│   │
│   ├── writing/
│   │   ├── ArticleEditor.tsx
│   │   ├── SocialPostCard.tsx
│   │   └── ThreadEditor.tsx
│   │
│   ├── ui/              ← design system primitives
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── Tabs.tsx
│   │   ├── Toast.tsx
│   │   ├── Spinner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Badge.tsx
│   │   ├── Tooltip.tsx
│   │   └── CommandPalette.tsx
│   │
│   └── layout/
│       ├── PageHeader.tsx
│       └── StatusBar.tsx
│
└── utils/
    ├── id.ts            ← nanoid wrappers: newProjectId(), newSourceId(), …
    ├── format.ts        ← formatDuration(), formatWordCount(), formatDate()
    └── mock.ts          ← shared mock data generators / fixtures
```

---

## 5. Mock Service Contract

Each service must:
1. Return a typed promise
2. Simulate async delay (use `delay(ms)` helper — 800–2000ms feels realistic)
3. Support a configurable "fail" path for error state testing
4. **Never** directly mutate component state — return data, let callers update state

### Example pattern

```typescript
// services/sourceService.ts

import { delay, generateId } from "../utils/mock";
import type { Source } from "../types";

const mockSources: Source[] = [/* seed data */];

export const sourceService = {
  async list(projectId: string): Promise<Source[]> {
    await delay(400);
    return mockSources.filter(s => s.projectId === projectId);
  },

  async fetchArticle(url: string): Promise<{ success: boolean; source?: Partial<Source> }> {
    await delay(1800);
    // Simulate 20% failure rate for realistic UX testing
    if (Math.random() < 0.2) return { success: false };
    return {
      success: true,
      source: {
        title: "Extracted Article Title",
        content: "Lorem ipsum article content...",
        wordCount: 2431,
        url,
      },
    };
  },

  async add(source: Omit<Source, "id" | "createdAt">): Promise<Source> {
    await delay(600);
    const newSource: Source = {
      ...source,
      id: generateId("src"),
      createdAt: new Date().toISOString(),
    };
    mockSources.push(newSource);
    return newSource;
  },
};
```

---

## 6. Key UX Requirements

### 6.1 Empty States
Every section must have an empty state. None should show a blank area.

| Section | Empty state message |
|---------|---------------------|
| Workspace (no projects) | *Alfred, welcomes you. Your workspace is clear.* |
| Sources | *Your project has no sources yet. Add articles, videos, or paste content.* |
| Video | *No videos yet. Bring in a YouTube video or choose a local file.* |
| Shorts | *No shorts generated yet. Create your first short.* |
| Audio | *Nothing generated yet. Write a script and choose a voice.* |
| Writing | *No drafts yet. Use your project sources to create something.* |

### 6.2 Loading States
Every async operation requires:
- `loading` — show spinner or step list
- `success` — transition to result
- `error` — recoverable error message + action
- `retry` — attempt the operation again

### 6.3 Toast Notifications
Trigger toasts for every meaningful user action:
- ✅ `Source added`
- ✅ `Project created`
- ✅ `Draft generated`
- ✅ `Short generation complete`
- ✅ `Voice created`
- ❌ `We couldn't add this source. Try pasting the content manually.`

### 6.4 Error Messages
Use human language, not error codes.
| Bad | Good |
|-----|------|
| `ERR_PROCESS_4921` | *We couldn't add this source.* |
| `null reference exception` | *Something went wrong. Try again.* |
| `fetch failed` | *We couldn't read this article. You can paste it manually instead.* |

### 6.5 Processing UI — Video Generation
```
Creating your shorts

  Analyzing transcript       ✓
  Finding strong moments     ✓
  Selecting clips            ✓
  Generating captions        ●  (running)
  Rendering videos           ○  (pending)
```
Mock each step with a realistic delay (1–3 seconds per step).

### 6.6 Processing UI — Audio Generation
```
Generating audio

  Preparing script           ✓
  Processing voice           ✓
  Generating speech          ●  (running)
  Finalizing audio           ○  (pending)
```

---

## 7. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + N` | Commission a new project |
| `Ctrl/Cmd + Shift + A` | Add source (when inside a project) |
| `Esc` | Close modal / cancel |

### Command Palette items
- Commission a Project
- Add Source
- Create Short
- Generate Audio
- Write Article
- Write X Post
- Write LinkedIn Post
- Open Sources
- Open Settings
- Open Voices

---

## 8. Privacy Indicator

A subtle **`● Local`** indicator in the app status bar (bottom or top right).

Clicking it opens a small popover:
```
Local Processing

  AI inference      On device
  Media processing  On device
  Project data      Local
```

Do not make this a banner. It should be ambient and reassuring, not a marketing shout.

---

## 9. Responsive Breakpoints (desktop only)

| Width | Behaviour |
|-------|-----------|
| `≥ 1180px` | Full layout — sidebar visible, inspector panels visible |
| `1024–1179px` | Sidebar collapsed to icons; panels collapsed |
| `< 1024px` | Not a supported layout; degrade gracefully, no broken overflow |

---

## 10. What to Mock

| Feature | Mock behaviour |
|---------|---------------|
| Article fetch | 80% success with fake content, 20% failure |
| YouTube add | 2s delay → fake video metadata |
| Short generation | 5-step progress, each ~1.5s |
| Transcript | Pre-written mock transcript with timestamps |
| Audio generation | 4-step progress, ~1s per step |
| Article generation | 2s delay → pre-written mock article |
| Social post generation | 1.5s delay → 5 mock posts |
| Voice preview | Play a pre-bundled audio file |
| Project creation | Instant success |
| Source save | 500ms delay → success |

---

*Next: [05_DESIGN_SYSTEM.md](./05_DESIGN_SYSTEM.md)*
