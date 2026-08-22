# Alfred — Services Layer

> The service layer is the **architectural seam** between the UI and the backend.
> Phase 1: all services return mocked data.
> Phase 2: replace mock implementations with `invoke()` calls. Zero UI changes required.

---

## 1. Design Contract

Every service must follow these rules:

1. **Returns typed promises** — `Promise<T>`, never `any`
2. **Async always** — even if the data is local, wrap in `async/await`
3. **Never throws raw** — catches errors and returns `{ success: false, error: string }` where needed
4. **No direct state mutation** — returns data; callers update state
5. **No `invoke()` calls in Phase 1** — swap implementations in Phase 2, not interfaces

### Phase 1 / Phase 2 swap pattern

```typescript
// Phase 1 implementation
export const projectService = {
  async create(name: string, description?: string): Promise<Project> {
    await delay(600);
    return { id: generateId("proj"), name, description, createdAt: now(), updatedAt: now() };
  },
};

// Phase 2 — same interface, real implementation
export const projectService = {
  async create(name: string, description?: string): Promise<Project> {
    return invoke<Project>("create_project", { name, description });
  },
};
```

The calling component never changes.

---

## 2. Utility Helpers (`utils/mock.ts`)

```typescript
export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const generateId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 7)}`;

export const now = () => new Date().toISOString();

// Simulate failure with a given probability (0–1)
export const failWith = (probability: number) =>
  Math.random() < probability;
```

---

## 3. projectService

```typescript
interface ProjectService {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(name: string, description?: string): Promise<Project>;
  update(id: string, updates: Partial<Pick<Project, "name" | "description">>): Promise<Project>;
  delete(id: string): Promise<void>;
  getStats(id: string): Promise<ProjectStats>;
}
```

**Mock behaviours:**
- `list()` — 400ms delay, return seed projects
- `create()` — 600ms delay, push to in-memory array
- `delete()` — 400ms delay, remove from array
- `getStats()` — 300ms delay, compute from related mock data

---

## 4. sourceService

```typescript
interface SourceService {
  list(projectId: string): Promise<Source[]>;
  get(id: string): Promise<Source | null>;
  fetchArticle(url: string): Promise<FetchArticleResult>;
  addYouTube(projectId: string, url: string): Promise<AddYouTubeResult>;
  addText(projectId: string, title: string, content: string): Promise<Source>;
  add(source: Omit<Source, "id" | "createdAt">): Promise<Source>;
  update(id: string, updates: Partial<Source>): Promise<Source>;
  delete(id: string): Promise<void>;
}

type FetchArticleResult =
  | { success: true; data: Partial<Source> }
  | { success: false; reason: "extraction_failed" | "paywall" | "network_error" };

type AddYouTubeResult =
  | { success: true; source: Source }
  | { success: false; reason: "invalid_url" | "private_video" | "network_error" };
```

**Mock behaviours:**
- `fetchArticle()` — 1800ms, 80% success with fake article, 20% failure
- `addYouTube()` — 2200ms, simulate "Reading video..." then success with fake metadata
- `addText()` — 500ms, always succeeds
- `list()` — 400ms, filter by projectId

---

## 5. videoService

```typescript
interface VideoService {
  list(projectId: string): Promise<Video[]>;
  get(id: string): Promise<Video | null>;
  addFromSource(projectId: string, sourceId: string): Promise<Video>;
  addFromUrl(projectId: string, url: string): Promise<Video>;
  addFromLocal(projectId: string, filePath: string): Promise<Video>;
  delete(id: string): Promise<void>;
}
```

**Mock behaviours:**
- `addFromUrl()` — 2500ms, returns fake Video with mocked metadata
- `addFromLocal()` — 1500ms, returns fake Video

---

## 6. shortService

```typescript
interface ShortService {
  list(projectId: string): Promise<Short[]>;
  get(id: string): Promise<Short | null>;
  create(config: CreateShortConfig): Promise<Job>;        // returns a Job (progress tracked)
  delete(id: string): Promise<void>;
  regenerate(id: string): Promise<Job>;
  getPresets(): Promise<VideoPreset[]>;
}

type CreateShortConfig = {
  projectId: string;
  videoId: string;
  presetId: string;
  captionsEnabled: boolean;
  captionStyle?: string;
  findClipsAuto: boolean;
  numberOfClips: number;
};
```

**Mock job steps for `create()`:**
1. `Analyzing transcript` — 1500ms
2. `Finding strong moments` — 1500ms
3. `Selecting clips` — 1200ms
4. `Generating captions` — 2000ms
5. `Rendering videos` — 2500ms

Each step emits a progress update via a callback or store update.

---

## 7. transcriptService

```typescript
interface TranscriptService {
  get(videoId: string): Promise<Transcript | null>;
  generate(videoId: string): Promise<Job>;
  list(projectId: string): Promise<Transcript[]>;
}
```

**Mock behaviours:**
- `get()` — returns a pre-written mock transcript with 20–40 segments
- `generate()` — 3-step job simulating Whisper transcription

---

## 8. audioService

```typescript
interface AudioService {
  list(projectId: string): Promise<AudioGeneration[]>;
  get(id: string): Promise<AudioGeneration | null>;
  generate(config: GenerateAudioConfig): Promise<Job>;
  delete(id: string): Promise<void>;
  regenerate(id: string): Promise<Job>;
}

type GenerateAudioConfig = {
  projectId: string;
  voiceId: string;
  script: string;
  sourceIds?: string[];
};
```

**Mock job steps for `generate()`:**
1. `Preparing script` — 800ms
2. `Processing voice` — 1200ms
3. `Generating speech` — 2500ms
4. `Finalizing audio` — 800ms

---

## 9. voiceService

```typescript
interface VoiceService {
  list(): Promise<Voice[]>;
  get(id: string): Promise<Voice | null>;
  create(name: string, samplePath?: string): Promise<Job>;
  delete(id: string): Promise<void>;
  preview(id: string): Promise<string>;    // returns mock audio URL
}
```

**Mock behaviours:**
- `list()` — returns 3 default voices: Alex, Sarah, James
- `create()` — 3-step job simulating voice cloning
- `preview()` — returns URL to a bundled placeholder audio

---

## 10. writingService

```typescript
interface WritingService {
  list(projectId: string): Promise<WritingOutput[]>;
  get(id: string): Promise<WritingOutput | null>;
  generateArticle(config: GenerateArticleConfig): Promise<WritingOutput>;
  generateXPost(config: GenerateSocialConfig): Promise<WritingOutput>;
  generateThread(config: GenerateSocialConfig): Promise<WritingOutput>;
  generateLinkedIn(config: GenerateSocialConfig): Promise<WritingOutput>;
  update(id: string, content: string): Promise<WritingOutput>;
  delete(id: string): Promise<void>;
}

type GenerateArticleConfig = {
  projectId: string;
  title?: string;
  topic: string;
  sourceIds: string[];
  tone?: WritingTone;
  length?: "short" | "medium" | "long";
};

type GenerateSocialConfig = {
  projectId: string;
  topic?: string;
  sourceIds: string[];
  tone?: WritingTone;
  style?: string;
  postCount?: number;    // for threads
};
```

**Mock behaviours:**
- `generateArticle()` — 2000ms delay → pre-written ~800 word mock article
- `generateXPost()` — 1500ms → single mock post
- `generateThread()` — 2000ms → array of 5–7 mock posts
- `generateLinkedIn()` — 1500ms → pre-written mock LinkedIn post

---

## 11. modelService

```typescript
interface ModelService {
  list(): Promise<AIModel[]>;
  install(modelId: string): Promise<Job>;
  uninstall(modelId: string): Promise<void>;
  getStorageUsage(): Promise<StorageUsage>;
}

type StorageUsage = {
  projects: number;     // bytes
  models: number;       // bytes
  exports: number;      // bytes
};
```

**Mock behaviours:**
- `list()` — returns 3 models: text gen (installed), transcription (installed), voice (not installed)
- `getStorageUsage()` — returns fake sizes

---

## 12. Job Progress Pattern

Long-running operations return a `Job`. UI subscribes to progress updates.

```typescript
// In the service (mock version)
async function runJob(steps: JobStep[], onProgress: (job: Job) => void): Promise<Job> {
  const job: Job = {
    id: generateId("job"),
    type: "generate_short",
    status: "running",
    steps: steps.map(s => ({ ...s, status: "pending" })),
    createdAt: now(),
    updatedAt: now(),
  };

  for (let i = 0; i < job.steps.length; i++) {
    job.steps[i].status = "running";
    onProgress({ ...job });
    await delay(1200 + Math.random() * 1000);
    job.steps[i].status = "done";
  }

  job.status = "done";
  onProgress({ ...job });
  return job;
}
```

In Phase 2, this becomes a Tauri event listener:
```typescript
listen("job:progress", (event) => {
  updateJob(event.payload as JobProgress);
});
```

---

*Next: [07_FEATURE_MAP.md](./07_FEATURE_MAP.md)*
