# Alfred — Design System

> Alfred's visual language is **restrained, professional, and desktop-native**.
> No gradients. No excessive rounding. No SaaS-dashboard aesthetics.
> Think: Linear × Raycast × a professional writing workspace.

---

## 1. Color Palette

### Base (neutral)

```css
/* Background layers */
--color-bg-base:       #1d1d1b;   /* Dark Grey — deepest background */
--color-bg-surface:    #111111;   /* Secondary Dark Gray — panels, sidebar */
--color-bg-elevated:   #2a2a2a;   /* Slightly lighter grey — cards, modals */
--color-bg-overlay:    rgba(0, 0, 0, 0.6);   /* modal overlay */
--color-bg-hover:      #333333;   /* hover state on interactive elements */
--color-bg-active:     #404040;   /* pressed / active state */

/* Borders */
--color-border:        #3a3a3a;   /* default border */
--color-border-subtle: #2a2a2a;   /* very subtle separator */
--color-border-focus:  #c2121a;   /* focused element border (Vivid Red) */

/* Text */
--color-text-primary:  #ffffff;   /* White — primary readable text */
--color-text-secondary:#dad9d9;   /* Light Grey — secondary / metadata text */
--color-text-tertiary: #888888;   /* disabled / placeholder text */
--color-text-inverse:  #ffffff;   /* text on accent backgrounds */
```

### Accent

```css
--color-accent:        #c2121a;   /* Vivid Red — primary accent */
--color-accent-subtle: #3d0508;   /* accent tint — used for active nav bg */
--color-accent-dim:    #8f0d13;   /* muted accent — secondary actions */
```

### Semantic

```css
--color-success:       #4ade80;   /* step complete, success state */
--color-success-dim:   #14532d;
--color-error:         #f87171;   /* error state */
--color-error-dim:     #7f1d1d;
--color-warning:       #fbbf24;   /* warning state */
--color-warning-dim:   #78350f;
--color-info:          #60a5fa;   /* informational */
--color-info-dim:      #1e3a5f;

/* Job status indicators */
--color-status-done:    var(--color-success);
--color-status-running: var(--color-accent);
--color-status-pending: var(--color-text-tertiary);
--color-status-error:   var(--color-error);
```

### Local / Privacy indicator

```css
--color-local: #4ade80;           /* green dot for "● Local" */
```

---

## 2. Typography

### Font stack

```css
--font-sans: "Inter", "SF Pro Text", system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", "Cascadia Code", monospace;
```

### Scale

| Token | Size | Weight | Line height | Usage |
|-------|------|--------|-------------|-------|
| `--text-xs` | 11px | 400 | 1.5 | Metadata, timestamps, badges |
| `--text-sm` | 13px | 400 | 1.5 | Secondary labels, captions |
| `--text-base` | 14px | 400 | 1.6 | Body text, default UI |
| `--text-md` | 15px | 400 | 1.6 | Slightly prominent body |
| `--text-lg` | 17px | 500 | 1.4 | Section headings |
| `--text-xl` | 20px | 600 | 1.3 | Page titles |
| `--text-2xl` | 26px | 600 | 1.2 | Major headings |
| `--text-3xl` | 34px | 700 | 1.1 | Empty state headline |

### Rules
- Default body text is **14px / `--text-base`**
- Hierarchy through **weight and opacity**, not size alone
- Avoid font sizes > 34px inside the app UI
- Monospace for transcripts, code, timestamps

---

## 3. Spacing

Alfred uses an **8px base grid**.

```css
--space-1:   4px;
--space-2:   8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Layout dimensions

```css
--sidebar-width:         220px;
--sidebar-collapsed:      48px;
--content-max-width:    900px;    /* max width of main content column */
--modal-width-sm:        420px;
--modal-width-md:        560px;
--modal-width-lg:        720px;
```

---

## 4. Border Radius

Alfred uses **conservative** rounding. Not pill-shaped. Not sharp boxes.

```css
--radius-sm:  4px;    /* inputs, badges, tags */
--radius-md:  6px;    /* buttons, cards */
--radius-lg:  8px;    /* modals, panels */
--radius-xl: 12px;    /* large panels (used sparingly) */
```

---

## 5. Shadows

Minimal. Used only for modals and floating elements.

```css
--shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.4);
--shadow-md:  0 4px 12px rgba(0, 0, 0, 0.5);
--shadow-lg:  0 12px 32px rgba(0, 0, 0, 0.6);
```

---

## 6. Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  App Shell (100vw × 100vh, bg: --color-bg-base)             │
│                                                             │
│  ┌─────────────┬───────────────────────────────────────┐   │
│  │             │                                       │   │
│  │  Sidebar    │         Main Content                  │   │
│  │  220px      │         flex-1, overflow-y: auto      │   │
│  │  fixed      │                                       │   │
│  │             │   ┌───────────────────────────────┐   │   │
│  │             │   │  Page Header                  │   │   │
│  │             │   │  (title, actions, tabs)       │   │   │
│  │             │   └───────────────────────────────┘   │   │
│  │             │                                       │   │
│  │             │   Page-specific content               │   │
│  │             │                                       │   │
│  └─────────────┴───────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Status Bar  (● Local, subtle, bottom)               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Sidebar Design

```css
/* sidebar */
background: var(--color-bg-surface);
border-right: 1px solid var(--color-border);
width: var(--sidebar-width);
```

### Sidebar anatomy

```
[ALFRED]                           ← app wordmark / logo (small)

The Future of AI  ▾               ← project switcher (clickable)

─────────────────────

  Overview                        ← nav item
  Sources                         ← nav item

─────────────────────

  Video                           ← nav section
    Create Short                  ← nav sub-item
    Transcripts                   ← nav sub-item

  Audio                           ← nav section

  Writing                         ← nav section
    Article
    X
    LinkedIn

─────────────────────

  Voices                          ← bottom nav
  Settings                        ← bottom nav
```

### Nav item states

```css
/* default */
color: var(--color-text-secondary);
background: transparent;

/* hover */
color: var(--color-text-primary);
background: var(--color-bg-hover);

/* active */
color: var(--color-accent);
background: var(--color-accent-subtle);
```

---

## 8. Button Variants

```typescript
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
type ButtonSize = "sm" | "md" | "lg";
```

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| `primary` | `--color-accent` | `--color-text-inverse` | none | Main CTAs |
| `secondary` | `--color-bg-elevated` | `--color-text-primary` | `--color-border` | Supporting actions |
| `ghost` | transparent | `--color-text-secondary` | none | Tertiary actions |
| `danger` | `--color-error-dim` | `--color-error` | none | Destructive actions |
| `link` | transparent | `--color-accent` | none | In-text navigation |

---

## 9. Input Design

```css
/* Base input */
background: var(--color-bg-elevated);
border: 1px solid var(--color-border);
border-radius: var(--radius-sm);
color: var(--color-text-primary);
padding: var(--space-2) var(--space-3);
font-size: var(--text-base);
transition: border-color 150ms ease;

/* Focus */
border-color: var(--color-border-focus);
outline: none;

/* Placeholder */
color: var(--color-text-tertiary);
```

---

## 10. Modal Design

```css
/* Overlay */
background: rgba(0, 0, 0, 0.7);

/* Modal panel */
background: var(--color-bg-elevated);
border: 1px solid var(--color-border);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-lg);
```

### Modal header / footer pattern
```
┌──────────────────────────────────────────┐
│  Modal Title               [×]           │  ← header
├──────────────────────────────────────────┤
│                                          │
│  Content area                            │  ← body
│                                          │
├──────────────────────────────────────────┤
│                    [Cancel]  [Primary]   │  ← footer
└──────────────────────────────────────────┘
```

---

## 11. Status / Badge

```typescript
type BadgeVariant = "default" | "success" | "error" | "warning" | "accent";
```

Small inline indicators:
```
● Installed        ← success (green dot)
● Running          ← accent (warm white dot)
○ Pending          ← muted (grey ring)
● Error            ← error (red dot)
```

---

## 12. Job Processing UI

The multi-step progress pattern used in Short and Audio generation:

```
Step label              icon
─────────────────────────────
Analyzing transcript     ✓       ← done (--color-success)
Finding strong moments   ✓       ← done
Selecting clips          ✓       ← done
Generating captions      ●       ← running (animated pulse)
Rendering videos         ○       ← pending
```

**Icons:**
- Done: `✓` in `--color-success`
- Running: animated pulsing dot in `--color-accent`
- Pending: `○` in `--color-text-tertiary`
- Error: `✕` in `--color-error`

---

## 13. Empty State Component

Standard empty state layout:

```
        [Icon — large, muted]

        Primary message
        Secondary message / description

        [Primary CTA Button]
```

```css
/* EmptyState wrapper */
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: var(--space-4);
padding: var(--space-16);
text-align: center;

/* Icon */
color: var(--color-text-tertiary);
font-size: 40px;

/* Primary message */
font-size: var(--text-xl);
font-weight: 600;
color: var(--color-text-primary);

/* Secondary message */
font-size: var(--text-base);
color: var(--color-text-secondary);
max-width: 360px;
```

---

## 14. Toast Design

Toasts appear at **bottom-right**, stacked, animated slide-in.

```css
/* Toast panel */
background: var(--color-bg-elevated);
border: 1px solid var(--color-border);
border-radius: var(--radius-md);
box-shadow: var(--shadow-md);
padding: var(--space-3) var(--space-4);
min-width: 280px;
max-width: 380px;
```

Left border accent by type:
- Success → `--color-success`
- Error → `--color-error`
- Info → `--color-info`
- Warning → `--color-warning`

Default duration: **4000ms**, error toasts: **persistent until dismissed**.

---

## 15. Source Type Icons

| Source type | Icon | Colour |
|-------------|------|--------|
| Article | `◎` / document | `--color-text-secondary` |
| YouTube | `▶` / play | `--color-error` |
| Local video | `▶` / film | `--color-accent-dim` |
| Text / paste | `▤` / text | `--color-text-tertiary` |

---

## 16. Preset Card (Video)

Visual representation of a video layout preset:

```
┌─────────────────┐
│                 │   ← layout preview (ASCII/SVG diagram)
│  FULL VIDEO     │
│                 │
└─────────────────┘

Full Screen
Full-screen vertical
```

Cards should be selectable (border highlight on selection).

---

## 17. Design DOs and DON'Ts

| DO | DON'T |
|----|-------|
| Use subtle borders to define surfaces | Use card elevation/shadows for every component |
| Use muted secondary text generously | Make everything full `--color-text-primary` |
| Use 14px as default UI text size | Use tiny 11px text as default |
| Keep modals narrow and focused | Build wide multi-column modals |
| Animate meaningful state changes | Animate purely for decoration |
| Label empty states with clear next actions | Leave sections blank |
| Use `● Local` indicator consistently | Add privacy banners to every page |
| Keep the sidebar hierarchy flat and readable | Nest nav items more than 1 level deep |

---

*Next: [06_SERVICES_LAYER.md](./06_SERVICES_LAYER.md)*
