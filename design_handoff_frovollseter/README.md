# Handoff: Frovollseter Design System

## Overview
This handoff documents the visual design system and UI patterns for **Frovollseter** — a Norwegian non-profit road and cabin owners' association web app (repo: `github.com/havardhu/frovollseter`). It covers colors, typography, component patterns, and key screens so that any developer working on the codebase can make consistent, on-brand changes.

## About the Design Files
The files in `ui_kits/app/` are **HTML/JSX design references** — high-fidelity prototypes showing intended look and behavior. They are **not production code to copy directly**. The task is to recreate these designs in the existing codebase (`frontend/` — React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui) using its established patterns and libraries.

## Fidelity
**High-fidelity.** The prototypes use exact colors, spacing, typography, and interactions from the real codebase. They are pixel-accurate recreations of the existing UI extended with design system documentation. Implement changes to match these references precisely.

---

## Tech Stack
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui component primitives
- **Icons**: `lucide-react` — always use Lucide, never emoji as functional icons
- **Routing**: React Router v6
- **Dates**: `date-fns` with `nb` (Norwegian) locale
- **Toasts**: `sonner`
- **Build**: Vite + Vercel deployment

---

## Design Tokens

### Colors (CSS custom properties in `globals.css`)

```css
/* Light mode */
--primary:           hsl(213 72% 30%);   /* Deep steel blue — buttons, active nav, focus rings */
--primary-foreground:hsl(210 40% 98%);
--background:        hsl(0 0% 100%);
--foreground:        hsl(222.2 84% 4.9%);
--card:              hsl(0 0% 100%);
--secondary:         hsl(210 40% 96.1%); /* Muted blue-gray bg */
--secondary-foreground: hsl(222.2 47.4% 11.2%);
--muted:             hsl(210 40% 96.1%);
--muted-foreground:  hsl(215.4 16.3% 46.9%); /* Subtitles, timestamps */
--border:            hsl(214.3 31.8% 91.4%);
--input:             hsl(214.3 31.8% 91.4%);
--ring:              hsl(213 72% 30%);
--destructive:       hsl(0 84.2% 60.2%);
--radius:            0.5rem;

/* Road status semantic colors (add these if not present) */
--status-safe:       hsl(142 76% 36%);
--status-caution:    hsl(38 92% 50%);
--status-danger:     hsl(0 84% 60%);
--status-closed:     hsl(215 16% 47%);
```

Dark mode equivalents are defined in the `.dark` class — see `frontend/src/styles/globals.css`.

### Typography
- **Font**: system-ui / Segoe UI stack (no custom web font)
- **Body**: 14px / 400 weight / 1.5 line-height
- **Page titles** (`h1`): `text-2xl font-bold` (24px/700)
- **Card titles**: `text-base font-semibold` (16px/600)
- **Section labels**: `text-sm font-semibold uppercase tracking-wide text-muted-foreground`
- **Meta/timestamps**: `text-xs text-muted-foreground` (12px)
- **Badges**: `text-xs font-semibold` (12px/600)

### Spacing
- Content max-width: `max-w-3xl` (768px), centered, `px-4` side padding
- Page padding: `py-6`
- Card list gap: `space-y-3`
- Section gap: `space-y-6`
- Header height: `h-14` (56px)

### Border Radius
- Cards: `rounded-lg` (8px)
- Buttons/inputs: `rounded-md` (6px)
- Badges: `rounded-full`
- Code inline: `rounded` (4px)

### Shadows
- **None used in the main UI** — separation is achieved with `border border-border` only
- No drop shadows on cards

---

## Component Patterns

### Button
Uses `Button` from `@/components/ui/button` (shadcn/ui cva variant).

| Variant | Usage |
|---|---|
| `default` | Primary actions (Rapporter, Logg inn, Send) |
| `outline` | Secondary actions (Avbryt, refresh icon) |
| `ghost` | Header icon buttons (dark mode toggle, logout) |
| `secondary` | Less common secondary actions |
| `destructive` | Delete / error actions |

Sizes: `default` (h-10), `sm` (h-9), `icon` (h-10 w-10 for icon-only).

**Icon buttons**: always use `size="icon"` + `variant="ghost"` for header controls.

### Badge
Uses `Badge` from `@/components/ui/badge`. Custom variants added in the codebase:
- `safe` → green (road clear)
- `caution` → amber (4WD recommended)
- `danger` → red (flood/dangerous)
- `closed` → gray (road closed)
- Standard: `default`, `secondary`, `outline`, `destructive`

**Always pair status badges with a Lucide icon** — never use emoji as functional icons.

### Card
Uses `Card`, `CardHeader`, `CardContent` from `@/components/ui/card`.
- `border border-border rounded-lg bg-card`
- CardHeader: `pb-2`, CardContent: `pt-0`
- Stale/inactive: add `opacity-60` to the Card wrapper

### Input
Uses `Input` from `@/components/ui/input`.
- Focus ring: `ring-2 ring-ring ring-offset-2`
- Error state: `border-destructive` + red helper text below

### Nav Links
Active state: `bg-primary/10 text-primary font-medium`
Inactive hover: `hover:bg-muted hover:text-foreground`
Use `NavLink` from react-router-dom with `end` prop on exact routes.

---

## Screens

### 1. Layout Shell (`frontend/src/components/shared/Layout.tsx`)
- Sticky header (`h-14`) with `backdrop-blur bg-background/95`
- Logo: `🏔️ Frovollseter` (emoji + text, hidden on mobile with `hidden sm:inline`)
- Desktop nav: hidden on mobile (`hidden md:flex`)
- Mobile hamburger menu: shown on mobile, renders nav items below header
- Dark mode toggle: `Moon`/`Sun` Lucide icons
- Auth: shows user display name + `LogOut` icon when authenticated, "Logg inn" button when not
- Main content: `max-w-3xl mx-auto w-full px-4 py-6 flex-1`
- Footer: `border-t py-4 text-center text-xs text-muted-foreground` — "Frovollseter · Non-profit veglag og hytteeierlag"

### 2. Veiforhold / Road Reports (`frontend/src/features/road-reports/RoadReportPage.tsx`)
- Page header: title + subtitle + action buttons (refresh icon, "Rapporter" if authenticated)
- Report cards: icon in a 36×36 muted rounded container, status badge, road segment text, timestamp, reporter name
- Stale reports: `opacity-60` on card
- Empty state: centered text with icon, Norwegian copy
- Report form: appears inline above list, `border-primary/30` card border, 2-col option grid

**Status icon → Lucide mapping:**
| Status | Icon |
|---|---|
| RecentlyPlowed | `Truck` |
| SummerTiresOk | `CheckCircle` |
| FourWheelDriveRecommended | `AlertTriangle` |
| FloodDamage | `Droplets` |
| UnsafeDangerous | `XCircle` |
| Closed | `Lock` |
| Unknown | `HelpCircle` |

### 3. Nyheter / News (`frontend/src/features/news/NewsPage.tsx`)
- Cards with title, association badge (`variant="secondary"`), relative timestamp
- Body text: `text-sm whitespace-pre-wrap`

### 4. Webkameraer (`frontend/src/features/webcams/WebcamsPage.tsx`)
- 2-column grid (`sm:grid-cols-2`)
- Image area: `h-40 object-cover w-full` or placeholder with `Camera` Lucide icon
- Public/private badge on each camera card

### 5. Nyttige lenker (`frontend/src/features/links/LinksPage.tsx`)
- Grouped by category, category label: `text-sm font-semibold uppercase tracking-wide text-muted-foreground`
- Link rows: `flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted` with `ExternalLink` icon
- Icon color transitions to `text-primary` on hover (`group-hover:text-primary`)

### 6. Login (`frontend/src/features/auth/LoginPage.tsx`)
- Centered card, max-w-sm
- Two modes: magic link vs OTP (toggle buttons)
- States: email entry → link-sent confirmation → OTP entry
- Back navigation away from login page

---

## Iconography Rules
1. **Always use Lucide React** — `import { IconName } from 'lucide-react'`
2. **Always `h-4 w-4`** for inline/header icons
3. **Never use emoji as functional icons** — only use emoji for the brand logo (🏔️) and decorative empty-state illustrations where no suitable Lucide icon exists
4. **Status icons**: always shown in a 36×36 muted rounded container (`bg-muted rounded-lg`) with the status's semantic color as stroke
5. **Icon-only buttons**: use `size="icon"` variant with ghost or outline

---

## Copy & Language Rules
- **Language**: Norwegian Bokmål only
- **Casing**: Sentence case (first word capitalised, rest lowercase)
- **Tone**: Short, direct, community notice-board style
- **Errors**: "Noe gikk galt. Prøv igjen." pattern
- **Time**: Always relative via `formatDistanceToNow` with `{ addSuffix: true, locale: nb }`
- **No emoji in copy** except brand logo and established empty-state illustrations

---

## Files in This Handoff

```
design_handoff_frovollseter/
  README.md                    ← this file
  ui_kits/app/
    index.html                 ← interactive prototype (open in browser)
    Components.jsx             ← shared UI primitives reference
    Layout.jsx                 ← header/nav/footer reference
    RoadReportPage.jsx         ← road reports + form reference
    Pages.jsx                  ← news, webcams, links, login reference
  preview/
    colors-brand.html          ← color palette
    colors-status.html         ← status color swatches
    type-scale.html            ← typography scale
    components-buttons.html    ← button variants
    components-badges.html     ← badge variants
    components-cards.html      ← card patterns
    components-inputs.html     ← form input patterns
    components-nav.html        ← header/nav pattern
    spacing-tokens.html        ← spacing + radius tokens
  colors_and_type.css          ← all CSS custom properties
```

Open `ui_kits/app/index.html` in a browser for the full interactive prototype. All other HTML files in `preview/` are standalone component reference cards.
