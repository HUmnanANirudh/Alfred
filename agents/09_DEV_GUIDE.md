# Alfred — Developer Guide

> Everything you need to set up, run, build, and contribute to Alfred.
> Read this before writing a single line of code.

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| Bun | Latest | Package manager + scripts |
| Rust | 1.77+ | Tauri backend |
| Tauri CLI | 2.x | Desktop build tool |
| VS Code | Latest | Recommended editor |

### VS Code extensions (required)
- `tauri-apps.tauri-vscode` — Tauri support
- `rust-lang.rust-analyzer` — Rust intellisense
- `bradlc.vscode-tailwindcss` — if using Tailwind
- `esbenp.prettier-vscode` — formatting
- `dbaeumer.vscode-eslint` — linting

---

## 2. Project Setup

```bash
# Clone the repo
git clone <repo-url>
cd alfred

# Install frontend dependencies
bun install

# Install Rust toolchain (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify Tauri CLI
bun tauri --version
```

---

## 3. Running the App

### Development mode
```bash
bun tauri dev
```

This starts:
1. Vite dev server at `http://localhost:1420`
2. Tauri native window connecting to Vite
3. Hot module reload (HMR) for frontend changes

> ⚠️ The first `tauri dev` run compiles Rust — expect 2–4 minutes. Subsequent runs are fast.

### Frontend only (no Tauri window)
```bash
bun dev
```
Opens `http://localhost:1420` in your browser. Useful for rapid UI iteration, but Tauri APIs won't work.

---

## 4. Building

### Development build
```bash
bun tauri build --debug
```

### Production build
```bash
bun tauri build
```

Output: `src-tauri/target/release/bundle/`

| Platform | Output format |
|----------|--------------|
| macOS | `.dmg` |
| Windows | `.msi` + `.exe` |
| Linux | `.deb` + `.AppImage` |

---

## 5. Project Structure

```
alfred/
├── agents/                  ← 📖 This documentation hub
│
├── src/                     ← React frontend
│   ├── types/               ← Canonical TypeScript types
│   ├── services/            ← Service layer (mock → real)
│   ├── store/               ← Zustand state stores
│   ├── router/              ← Route definitions
│   ├── layouts/             ← App shell + Project layout
│   ├── pages/               ← One file per route
│   ├── components/          ← Shared components
│   │   └── ui/              ← Design system primitives
│   └── utils/               ← id, format, mock helpers
│
├── src-tauri/               ← Rust / Tauri backend
│   ├── src/
│   │   ├── main.rs          ← Entry point
│   │   └── lib.rs           ← Command handlers
│   ├── Cargo.toml           ← Rust dependencies
│   └── tauri.conf.json      ← Tauri configuration
│
├── public/                  ← Static assets
├── index.html               ← HTML entry point
├── vite.config.ts           ← Vite config
├── tsconfig.json            ← TypeScript config
└── package.json             ← Frontend scripts + deps
```

---

## 6. Key Conventions

### Naming

| What | Convention | Example |
|------|-----------|---------|
| Component files | PascalCase | `SourceCard.tsx` |
| Utility files | camelCase | `formatDuration.ts` |
| Page files | PascalCase + `Page` | `SourcesPage.tsx` |
| CSS modules | camelCase | `sourceCard.module.css` |
| Service files | camelCase + `Service` | `sourceService.ts` |
| Store files | camelCase + `Store` | `projectStore.ts` |
| Type names | PascalCase | `Source`, `Project` |
| Type union strings | lowercase kebab | `"x_post"`, `"youtube"` |

### ID generation

Always use the `generateId()` util with the correct prefix:

```typescript
import { generateId } from "../utils/id";

const id = generateId("proj");   // → "proj_k7m2n"
const id = generateId("src");    // → "src_x91ab"
```

Never use `Math.random()` directly for IDs in components.

### Dates

Always store and pass dates as ISO 8601 strings. Format only at the display layer:

```typescript
import { formatDate } from "../utils/format";

// ✅ correct — format at display time
<span>{formatDate(source.createdAt)}</span>

// ❌ wrong — storing a formatted string
const source = { createdAt: "Added today" };
```

---

## 7. State Management

Alfred uses **Zustand** for global state.

### Store structure

```typescript
// store/projectStore.ts
import { create } from "zustand";

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
  addProject: (project: Project) => void;
  // ...
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
}));
```

### Rules
- Keep stores **per-domain** (project, ui, toast) — no single mega-store
- Stores hold **data** — not UI state like modal open/closed (use local state for that)
- Seed stores with mock data on app init (Phase 1 only)

---

## 8. Adding a New Service

1. Define the interface in `services/serviceNameService.ts`
2. Implement with mock data using `delay()` and typed returns
3. Export as a named singleton object
4. Add seed data to `utils/mock.ts` if needed
5. Never call the service directly from JSX — call from event handlers or `useEffect`

```typescript
// Pattern
export const myService = {
  async doThing(param: string): Promise<Result> {
    await delay(800);
    // mock implementation
    return { ... };
  },
};
```

---

## 9. Adding a New Page

1. Create `src/pages/MyNewPage.tsx`
2. Add route to `src/router/index.tsx`
3. Add nav item to `src/components/sidebar/Sidebar.tsx` if applicable
4. Add command palette entry in `src/components/ui/CommandPalette.tsx` if applicable

---

## 10. CSS / Styling Conventions

Alfred uses **CSS Modules** + **CSS custom properties** (design tokens).

```css
/* components/ui/Button.module.css */
.button {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;
}

.button:hover {
  background: var(--color-bg-hover);
}

.button--primary {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-color: transparent;
}
```

```tsx
import styles from "./Button.module.css";
<button className={`${styles.button} ${variant === "primary" ? styles["button--primary"] : ""}`}>
```

### Rules
- All colours, spacing, and radius values must use **CSS variables from the design system** — no hardcoded hex values in component CSS
- No inline `style` props for anything other than truly dynamic values (e.g. progress bar width)
- No Tailwind (unless added deliberately — document the decision here if so)

---

## 11. DOs and DON'Ts

### DO
- ✅ Read `03_DATA_MODELS.md` before creating any new type
- ✅ Call services from event handlers, never from render
- ✅ Handle loading, success, and error states for every async operation
- ✅ Write empty states for every list/section
- ✅ Use `formatDate()`, `formatDuration()`, `formatWordCount()` from utils
- ✅ Give every interactive element a visible focus state
- ✅ Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<dialog>`)
- ✅ Add a toast on every meaningful user action

### DON'T
- ❌ Call `invoke()` directly from a component — use the service layer
- ❌ Invent new types inline in component files
- ❌ Use `any` — TypeScript strict mode is on
- ❌ Leave console.log statements in committed code
- ❌ Make network requests (Phase 1 is offline-only)
- ❌ Use `Math.random()` for IDs — use `generateId()`
- ❌ Hardcode hex colours in component CSS
- ❌ Create modals wider than `--modal-width-lg` (720px)
- ❌ Skip error handling for mock services

---

## 12. Commit Convention

Use conventional commits:

```
feat(sources): add YouTube source flow
fix(sidebar): project switcher not updating active state
chore(deps): bump react to 19.1.0
docs(agents): update Phase 1 DoD checklist
style(ui): align button padding with design system
refactor(services): extract delay helper to utils/mock
```

Format: `type(scope): message`

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`

---

## 13. Environment

No `.env` files are required for Phase 1 (frontend only, no API keys).

Phase 2 will introduce:
- Model paths (set via settings, stored in Tauri app config)
- Python sidecar port (auto-assigned, managed by Tauri)

---

## 14. Troubleshooting

| Problem | Fix |
|---------|-----|
| `tauri dev` hangs on first run | Rust is compiling — wait up to 5 minutes |
| Port 1420 in use | Kill the process using that port: `lsof -ti:1420 \| xargs kill` |
| Vite HMR not working | Check that `src-tauri` is excluded from Vite's watcher (see `vite.config.ts`) |
| Rust compile errors | Run `cargo check` in `src-tauri/` to see detailed errors |
| Types not resolving | Run `bun tsc --noEmit` to check TypeScript errors |

---

*End of Alfred Developer Guide*
*Return to: [00_INDEX.md](./00_INDEX.md)*
