# Alfred — Project Skills Reference

> Skills are instruction sets that extend agent capabilities for specialized tooling.
> Both skills live in `.agents/skills/` and MUST be read before writing any Tauri or database code.

---

## Available Skills

| Skill | Location | Activate When |
|-------|----------|---------------|
| `tauri-development` | `.agents/skills/tauri-development/SKILL.md` | Any work involving Tauri IPC, Rust commands, window events, file dialogs, native menus, or platform APIs |
| `turso-db` | `.agents/skills/turso-db/SKILL.md` | Any work involving the Alfred database (`alfred.db`) — schema, queries, migrations, or persistence |

---

## Skill: `tauri-development`

**Read:** `.agents/skills/tauri-development/SKILL.md`

### Alfred-Specific Rules

Alfred uses **Tauri 2** (not Tauri v1). The import paths have changed:

```typescript
// ✅ Tauri 2 (correct)
import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';

// ❌ Tauri v1 (wrong — will not compile)
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
```

### IPC Pattern for Alfred Services

All service files in `src/services/` must call Tauri IPC, never reach the `db` memory object in Phase 2+:

```typescript
// src/services/sourceService.ts — Phase 2 pattern
import { invoke } from '@tauri-apps/api/core';
import type { Source, FetchArticleResult } from '../types';

export const sourceService = {
  async list(projectId: string): Promise<Source[]> {
    return invoke<Source[]>('list_sources', { projectId });
  },

  async fetchArticle(url: string): Promise<FetchArticleResult> {
    return invoke<FetchArticleResult>('fetch_article', { url });
  },
};
```

### Job Progress via Tauri Events

AI generation jobs (transcription, TTS, short rendering) must stream step progress using Tauri events, not `delay()`:

```typescript
// Frontend — listen for job progress
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<Job>('job:progress', (event) => {
  onProgress(event.payload);
});

await invoke('start_audio_generation', config);
unlisten(); // cleanup
```

```rust
// Rust — emit progress events
use tauri::Emitter;
app.emit("job:progress", &job_payload)?;
```

### Rust Command Structure (Alfred conventions)

All Tauri commands live in `src-tauri/src/commands/`:

```
src-tauri/src/
├── main.rs              ← app bootstrap, plugin registration
├── lib.rs               ← invoke_handler registration
└── commands/
    ├── mod.rs
    ├── sources.rs       ← fetch_article, add_youtube, list_sources
    ├── transcription.rs ← run_asr, get_transcript
    ├── writing.rs       ← generate_article, generate_social
    ├── audio.rs         ← generate_audio, list_audio
    ├── shorts.rs        ← create_short, list_shorts
    └── db.rs            ← DB bootstrap, migrations
```

---

## Skill: `turso-db`

**Read:** `.agents/skills/turso-db/SKILL.md`

### Alfred's Database: `alfred.db`

Alfred uses **Turso (Limbo)** as its embedded SQLite-compatible database. One file, stored locally in the Tauri app data directory:

```
~/.local/share/com.anni.alfred/alfred.db        (Linux)
~/Library/Application Support/com.anni.alfred/alfred.db  (macOS)
C:\Users\<user>\AppData\Roaming\com.anni.alfred\alfred.db (Windows)
```

### SDK: Rust (`turso` crate)

Alfred's database is opened **from Rust** inside the Tauri backend. The Rust SDK is `turso` (not `libsql`, not `rusqlite`):

```toml
# src-tauri/Cargo.toml
[dependencies]
turso = { version = "0.1", features = ["core"] }
```

```rust
use turso::Builder;

pub async fn open_db(path: &str) -> turso::Database {
    Builder::new_local(path)
        .build()
        .await
        .expect("Failed to open alfred.db")
}
```

### Critical Rules for Alfred

1. **Never use `@libsql/client` or `libsql-experimental`** — legacy names, wrong API. Use `turso` crate in Rust.
2. **One writer at a time** — Turso does not support multi-process access. Alfred's single Tauri process is the only DB writer.
3. **WAL mode is default** — do not attempt to change the journal mode.
4. **Turso Cloud is opt-in only** — Alfred's privacy claim requires local-only data by default. Cloud sync is a future user preference, never the default.
5. **No VACUUM** — not supported by Turso/Limbo.

### Phase 2A: Full Schema

Maps 1:1 with types in `03_DATA_MODELS.md`. Run as migrations on first app launch:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  word_count INTEGER,
  excerpt TEXT,
  metadata TEXT,  -- JSON blob of SourceMetadata
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES sources(id),
  title TEXT NOT NULL,
  duration REAL,
  file_path TEXT,
  thumbnail_path TEXT,
  url TEXT,
  has_transcript INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  segments TEXT NOT NULL,  -- JSON array of TranscriptSegment
  language TEXT,
  engine TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shorts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  preset_id TEXT NOT NULL,
  title TEXT,
  duration REAL,
  file_path TEXT,
  thumbnail_path TEXT,
  hook TEXT,
  confidence REAL,
  captions_enabled INTEGER DEFAULT 1,
  caption_style TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audio_generations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  title TEXT,
  script TEXT NOT NULL,
  duration REAL,
  file_path TEXT,
  engine TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  source_ids TEXT,  -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS writing_outputs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  source_ids TEXT NOT NULL,  -- JSON array
  tone TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  output_id TEXT NOT NULL REFERENCES writing_outputs(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sample_path TEXT,
  engine TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  is_cloned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
```

### Rust Query Pattern

```rust
#[tauri::command]
async fn list_sources(
    project_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Source>, String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    let mut rows = conn
        .query(
            "SELECT * FROM sources WHERE project_id = ?1 ORDER BY created_at DESC",
            [project_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    let mut sources = vec![];
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        sources.push(row_to_source(&row)?);
    }
    Ok(sources)
}
```

---

## Quick Decision Table

| Task | Read |
|------|------|
| Writing a new Tauri `#[command]` in Rust | `tauri-development` |
| Wiring a frontend service to IPC | `tauri-development` |
| Opening a file dialog for video upload | `tauri-development` |
| Streaming progress events from a native process | `tauri-development` |
| Creating a new DB table or index | `turso-db` |
| Writing a SQL query or migration | `turso-db` |
| Querying sources, transcripts, audio from Rust | `turso-db` |
| Adding vector search (Phase 3+) | `turso-db` → `references/vector-search.md` |
| Adding full-text search over transcripts | `turso-db` → `references/full-text-search.md` |

---

*Return to: [00_INDEX.md](./00_INDEX.md)*
