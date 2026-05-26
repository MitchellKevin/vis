# Visdeurbel — Style Guide

> **For AI assistants**: this document is the source of truth for the Visdeurbel website's visual design. When generating UI, CSS, components, or copy for this site, follow these rules exactly. Always reference the **token names** (e.g. `--color-primary`, `--space-4`) rather than hardcoding values.
>
> Companion file: `visdeurbel-tokens.css` — drop this in and use the custom properties.
>
> **Source**: extracted from Figma file `qZHuYUoqOr02S5jao29b7a` (Visdeurbel — website design — v2 — 2026), May 2026.

---

## 1. Brand at a glance

Visdeurbel ("fish doorbell") is a friendly, playful conservation project. The visual language pairs a **deep, natural dark green** with **soft purples and creams** to feel both grounded (nature, water) and approachable (modern, web-native). Typography is bold and warm: a chunky display sans for headings, a humanist sans for body.

**Tone**: warm, playful, informative, second-person Dutch ("je", not "u"). Encourages action without being shouty.

**Don't**: use pure black, harsh shadows, generic stock photography, or cold gray UI chrome. The palette is naturalistic — no neon, no flat material-design colors.

---

## 2. Color tokens

All colors are exposed as CSS custom properties. **Always use the semantic token first**, fall back to the raw token only when you genuinely need a one-off.

### 2.1 Brand palette (raw)

| Token | Hex | Figma name | Use |
|---|---|---|---|
| `--color-green-dark` | `#01463c` | Donker groen | Primary anchor — text, dark surfaces, outlines |
| `--color-green-dark-mode` | `#033932` | Donkergroen DarkMode | Dark-mode surface |
| `--color-teal` | `#1eacb0` | Blauwgroen | Accent — water, links on dark |
| `--color-purple` | `#c0a8ff` | Paars | Primary accent — CTAs, highlights |
| `--color-purple-bell` | `#9b74ff` | Deurbel ring | The "doorbell ring" — CTA in dark mode, emphasis |
| `--color-purple-deep` | `#a172ff` | (gradient stop) | Gradient endpoint only |
| `--color-purple-dark-mode` | `#292435` | Paars DarkMode | Dark-mode purple surface |
| `--color-pink` | `#ff80b9` | Roze | Accent — playful highlights, badges |
| `--color-gold` | `#f0af00` | Goud | Accent — warnings, attention, fish |
| `--color-gold-light` | `#f8e7cd` | Licht Goud | Card surface, soft background |
| `--color-off-white` | `#fdf7ef` | Off-white | Page background |

### 2.2 Semantic palette (use these by default)

| Token | Default value | Purpose |
|---|---|---|
| `--bg-page` | `--color-off-white` | Page background |
| `--bg-surface` | `--color-gold-light` | Card / tip surface |
| `--bg-inverse` | `--color-green-dark` | Footer, dark sections, overlays |
| `--text-primary` | `--color-green-dark` | All body text, headings on light bg |
| `--text-on-inverse` | `--color-off-white` | Text on dark bg |
| `--text-muted` | `--color-green-dark` at 70% | Secondary copy |
| `--border-default` | `--color-green-dark` | All 1px outlines (buttons, toggles) |
| `--accent-primary` | `--color-purple` | Primary CTA fill (light mode) |
| `--accent-primary-strong` | `--color-purple-bell` | Primary CTA fill (dark mode) / emphasis |
| `--accent-secondary` | `--color-off-white` | Secondary CTA fill |
| `--accent-highlight` | `--color-pink` | Decorative highlights |
| `--accent-warning` | `--color-gold` | Attention states |

### 2.3 Gradients

| Token | Definition |
|---|---|
| `--gradient-data-bg` | `linear-gradient(180deg, #f8e7cd 9%, #fdf7ef 100%)` — soft cream wash for data sections |
| `--gradient-purple` | `linear-gradient(180deg, #c0a8ff 0%, #a172ff 78%)` — emphasis on the bell / hero accents |

### 2.4 Color rules

- **Body text is always `--text-primary` (dark green)** on light backgrounds, `--text-on-inverse` on dark.
- **Never** use pure black (`#000`) or pure white (`#fff`). Use `--text-primary` and `--bg-page` instead.
- The 1px **border around buttons and toggles is always `--color-green-dark`** in light mode, `--color-off-white` in dark mode. This outline is signature — don't drop it.
- **Pink and gold are decorative** — fine on illustrations, badges, and "Foto van de week" content, but they are not interactive colors. Don't make a button gold.

---

## 3. Typography

**Fonts** (load both):
- **Bricolage Grotesque** — display, headings, buttons, nav. Use the `ExtraBold` weight (Figma names it `96pt ExtraBold` for the optical size, but in CSS this is just `font-weight: 800`).
- **PT Sans** — body, paragraphs, sub-navigation. Regular (400) and Bold (700).

Both are on Google Fonts. Recommended `<link>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet">
```

### 3.1 Desktop scale

| Token | Element | Font | Size | Line-height | Weight | Notes |
|---|---|---|---|---|---|---|
| `--text-h1` | H1 | Bricolage Grotesque | 54px | 125% | 800 | Hero headings |
| `--text-h2` | H2 | Bricolage Grotesque | 36px | 125% | 800 | Section headings |
| `--text-h3` | H3 | Bricolage Grotesque | 27px | 125% | 800 | Sub-section headings |
| `--text-p1` | Body large | PT Sans | 20px | 150% | 400 | Default paragraph |
| `--text-p1-bold` | Body large bold | PT Sans | 20px | 150% | 700 | Lead-in / emphasis |
| `--text-p2` | Body small | PT Sans | 16px | 125% | 400 | Captions, secondary copy |
| `--text-p2-bold` | Body small bold | PT Sans | 16px | 125% | 700 | Inline emphasis |
| `--text-button` | Primary button | Bricolage Grotesque | 20px | auto | 800 | All buttons |
| `--text-nav` | Nav (extrabold) | Bricolage Grotesque | 16px | auto | 800 | Main nav links |
| `--text-nav-bold` | Nav (bold) | Bricolage Grotesque | 16px | 24px | 700 | Less-prominent nav |
| `--text-nav-caps` | Nav allcaps | Bricolage Grotesque | 16px | auto | 800 | UPPERCASE — utility nav |
| `--text-subnav` | Sub-nav | PT Sans | 16px | 24px | 400 | Footer & secondary nav |

### 3.2 Mobile scale (≤ 768px)

| Token | Element | Font | Size | Line-height | Weight |
|---|---|---|---|---|---|
| `--text-h1-m` | H1 | Bricolage Grotesque | 32px | 125% | 800 |
| `--text-h2-m` | H2 | Bricolage Grotesque | 28px | 125% | 800 |
| `--text-h3-m` | H3 | Bricolage Grotesque | 20px | 125% | 800 |
| `--text-p1-m` | Body | PT Sans | 18px | 150% | 400 |
| `--text-p1-bold-m` | Body bold | PT Sans | 18px | 150% | 700 |
| `--text-p2-m` | Body small | PT Sans | 14px | 125% | 400 |
| `--text-button-m` | Button | Bricolage Grotesque | 18px | auto | 800 |

The companion CSS file already wires these together via a `@media` query — at viewport ≤ 768px the desktop H1/H2/H3/P1/P2/button tokens **resolve to the mobile values automatically**. So you write `font: var(--text-h1)` once and it adapts.

### 3.3 Type rules

- Headings **never** use PT Sans. Body **never** uses Bricolage Grotesque (except buttons / nav).
- Default body color is `--text-primary`. Headings inherit the same color — they are not blue or purple.
- **All-caps is rare** — only for utility nav items. Don't allcaps headings.
- Letter-spacing is `0` everywhere. Don't add tracking.

---

## 4. Spacing scale

Built on an **8px base unit**. The design also uses 4px and 10px as fine adjustments inside compact components.

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4px | Tight gaps inside compact UI (nav-link inner spacing) |
| `--space-2` | 8px | Small gaps |
| `--space-3` | 10px | Button vertical padding |
| `--space-4` | 16px | Standard gap, button horizontal padding, card spacing |
| `--space-5` | 20px | Nav gap |
| `--space-6` | 24px | Card horizontal padding, outer page gutter |
| `--space-7` | 32px | Card vertical padding, section spacing |
| `--space-8` | 40px | Section breaks |
| `--space-9` | 48px | Large section breaks |
| `--space-10` | 64px | Menu bar height |
| `--space-11` | 80px | Footer vertical padding, major section breaks |

**Rule of thumb**: prefer the 8px-aligned tokens (`--space-2`, `--space-4`, `--space-6`, `--space-7`, `--space-9`, `--space-11`). Use `--space-3` only for button padding (it's part of the 44px button height calculation).

---

## 5. Border radii

| Token | Value | Use |
|---|---|---|
| `--radius-card` | 16px | Cards, tip cards, modals |
| `--radius-button` | 25px | Default buttons (creates pill shape on 44px height) |
| `--radius-pill` | 40px | Larger pill controls (toggles, Vis-Check switch) |
| `--radius-full` | 9999px | Circular elements (icons in circles, the bell) |

There is **no small radius** (4px, 6px, 8px). The visual language is intentionally rounded — corners are either soft (16px) or fully pill (25px+). If you find yourself reaching for a 4px radius, you're probably building something that shouldn't be on this site.

---

## 6. Layout & grid

### 6.1 Desktop

- **Canvas width**: 1440px (design baseline)
- **Outer gutter**: 24px left/right
- **Content max-width**: 1392px
- **Grid**: 12 columns, 24px gutters
- **Baseline grid**: 8px rows
- **Header (Menu)** height: 64px, with 24px top padding (so logo sits 24px from top)
- **Footer**: 80px top padding, 24px side/bottom padding, height ≈ 584px

### 6.2 Mobile

- **Canvas width**: 375px (design baseline)
- **Outer gutter**: 16px left/right (rule of thumb — adjust to viewport)
- **Stack everything vertically**: no multi-column layouts below 768px

### 6.3 Breakpoint

There is a single breakpoint in the design: **768px**. Below it, switch the typography scale to mobile and stack the layout. Above it, use the desktop grid.

---

## 7. Component patterns

These are the recurring patterns in the design. When asked to build a component, match these specs.

### 7.1 Button — primary

The signature button is a **pill with a 1px outline** in the brand dark green.

| Property | Value |
|---|---|
| Height | 44px |
| Padding | `10px 16px` (`--space-3 --space-4`) |
| Border radius | `--radius-button` (25px) |
| Border | `1px solid --border-default` |
| Background | `--accent-primary` (purple `#c0a8ff`) |
| Text | `--text-button`, color `--text-primary` |
| Gap (icon + label) | 10px |

**Variants** (controlled via a `data-variant` or class):
- `default` (light bg + purple fill): bg `--color-purple`, border `--color-green-dark`
- `secondary` (light bg + off-white fill): bg `--color-off-white`, border `--color-green-dark`
- `dark-default` (dark bg + bell-purple fill): bg `--color-purple-bell`, border `--color-off-white`
- `dark-secondary` (dark bg + dark-green fill): bg `--color-green-dark`, border `--color-off-white`

**Don't**: remove the border, use a gradient fill on a button, or change the radius.

### 7.2 Card — Tip / "Visdeurbel bel"

| Property | Value |
|---|---|
| Background | `--bg-surface` (light gold `#f8e7cd`) |
| Border radius | `--radius-card` (16px) |
| Padding | `32px 24px` (`--space-7 --space-6`) |
| Gap (vertical content) | `--space-7` (32px) |
| Text color | `--text-primary` |

### 7.3 Header / Menu bar

| Property | Value |
|---|---|
| Width | 100% (1440 design baseline) |
| Padding | `24px 24px 0` |
| Layout | flex, `space-between`, `align-items: center` |
| Logo size | ~154px wide, 31px tall |
| Nav gap (main) | 4px between items |
| Nav gap (sections) | 20–40px |
| Background | transparent (sits on page bg) |

### 7.4 Footer

| Property | Value |
|---|---|
| Background | `--bg-inverse` (`#01463c`) |
| Text | `--text-on-inverse` (`#fdf7ef`) |
| Padding | `80px 24px 24px` |
| Inner section gap | `--space-11` (80px) |
| Sub-section gap | `--space-9` (48px) |

### 7.5 Toggle / Vis-Check switch

| Property | Value |
|---|---|
| Height | 46px |
| Border radius | `--radius-pill` (40px) |
| Border | `1px solid --border-default` |
| Padding | `5px 16px 5px 5px` (or mirrored for "on" state) |
| Background | transparent |

### 7.6 Pop-up / modal

| Property | Value |
|---|---|
| Border | `1px solid #8a38f5` (deep purple) |
| Inner padding | inherits card spacing (`--space-7 --space-6`) |
| Internal gap | 10px between stacked sections |

---

## 8. Light and dark mode

The design ships **both light and dark mode** as first-class.

### 8.1 Light mode (default)

- Page bg: `--color-off-white` (`#fdf7ef`)
- Text: `--color-green-dark` (`#01463c`)
- Primary CTA fill: `--color-purple` (`#c0a8ff`)
- Borders: `--color-green-dark`

### 8.2 Dark mode

Activated via `[data-theme="dark"]` on `<html>` or `prefers-color-scheme: dark`.

- Page bg: `--color-green-dark-mode` (`#033932`)
- Text: `--color-off-white` (`#fdf7ef`)
- Primary CTA fill: `--color-purple-bell` (`#9b74ff`)
- Borders: `--color-off-white`
- Surface (cards): `--color-purple-dark-mode` (`#292435`) — *not* light gold; the cream surface is light-mode only.

The companion CSS file handles all of this — just set `data-theme="dark"` and the tokens swap.

---

## 9. Iconography & illustration

- The brand mark is **the doorbell ("Visdeurbel bel")** — a stylized illustrated bell. It's playful and hand-drawn-feeling, not geometric.
- Other recurring icons: **fish**, **the lock (sluis)**, social icons (Instagram, YouTube). All have a hand-drawn, slightly chunky style.
- **Don't substitute Material/Lucide/Heroicons** for the brand icons. For generic UI affordances (close, arrows, chevrons) the design uses custom-drawn versions; for code, the closest match is a chunky, rounded outline icon set (e.g. Phosphor Bold or Lucide with `stroke-width: 2.5`).

---

## 10. Quick checklist for AI

Before shipping any UI, verify:

- [ ] Body text uses **PT Sans**, headings use **Bricolage Grotesque ExtraBold**.
- [ ] Text color is **`--color-green-dark`** on light bg, **`--color-off-white`** on dark bg (no `#000`, no `#fff`).
- [ ] Buttons have a **1px outline in the brand dark green** (or off-white in dark mode), 44px tall, 25px radius.
- [ ] Cards are **light gold** (`#f8e7cd`) in light mode, with **16px radius** and **32px / 24px padding**.
- [ ] Spacing snaps to the **8px scale** (avoid 5px, 12px, 14px, 18px gaps).
- [ ] No pure black or pure white anywhere.
- [ ] Dark mode is supported via `[data-theme="dark"]`.
- [ ] Mobile typography is used below 768px.

---

## 11. Token reference (flat list)

For quick lookup. All tokens are defined in `visdeurbel-tokens.css`.

```
COLOR (raw)
  --color-green-dark           #01463c
  --color-green-dark-mode      #033932
  --color-teal                 #1eacb0
  --color-purple               #c0a8ff
  --color-purple-bell          #9b74ff
  --color-purple-deep          #a172ff
  --color-purple-dark-mode     #292435
  --color-pink                 #ff80b9
  --color-gold                 #f0af00
  --color-gold-light           #f8e7cd
  --color-off-white            #fdf7ef

COLOR (semantic)
  --bg-page, --bg-surface, --bg-inverse
  --text-primary, --text-on-inverse, --text-muted
  --border-default
  --accent-primary, --accent-primary-strong, --accent-secondary
  --accent-highlight, --accent-warning

GRADIENT
  --gradient-data-bg
  --gradient-purple

TYPOGRAPHY (desktop)
  --text-h1, --text-h2, --text-h3
  --text-p1, --text-p1-bold, --text-p2, --text-p2-bold
  --text-button
  --text-nav, --text-nav-bold, --text-nav-caps, --text-subnav

TYPOGRAPHY (mobile)
  --text-h1-m, --text-h2-m, --text-h3-m
  --text-p1-m, --text-p1-bold-m, --text-p2-m, --text-button-m

SPACING
  --space-1 ... --space-11   (4, 8, 10, 16, 20, 24, 32, 40, 48, 64, 80)

RADIUS
  --radius-card               16px
  --radius-button             25px
  --radius-pill               40px
  --radius-full               9999px

LAYOUT
  --layout-max-width          1392px
  --layout-gutter             24px
  --layout-columns            12
  --breakpoint-mobile         768px
```
