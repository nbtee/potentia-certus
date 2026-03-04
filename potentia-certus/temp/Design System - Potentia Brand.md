# Potentia Design System

A design system for Potentia Group's internal tools. This document defines the brand palette, typography, data visualization colors, component color schemes, and usage guidelines so that any builder can produce visually consistent UIs across the Potentia product ecosystem.

---

## 1. Brand Palette

Five anchor colors form the foundation of the brand identity. The overall feel flows from **Bright Aqua** through teal-blue and purple to **Hot Pink**, anchored by **Pitch Black**.

| Name         | Hex       | Swatch | Usage                              |
|--------------|-----------|--------|------------------------------------|
| Pitch Black  | `#0B141B` | ![](https://placehold.co/24x24/0B141B/0B141B) | Sidebar, dark backgrounds, foreground text on light |
| Bright Aqua  | `#00E5C0` | ![](https://placehold.co/24x24/00E5C0/00E5C0) | Primary brand accent, buttons, links, active states |
| White        | `#FFFFFF` | ![](https://placehold.co/24x24/FFFFFF/CCCCCC) | Page backgrounds, text on dark surfaces |
| Hot Pink     | `#FF1EFF` | ![](https://placehold.co/24x24/FF1EFF/FF1EFF) | Sparingly -- accent highlights, marketing only |
| Crazy Taxi   | `#FDEA00` | ![](https://placehold.co/24x24/FDEA00/FDEA00) | Sparingly -- 1st place badges, rank icons, callouts |

### Primary Color Scale (Aqua-based)

For UI elements that need lighter/darker shades of the primary brand color:

| Token | Hex       | Use Case                        |
|-------|-----------|---------------------------------|
| 50    | `#e6fff9` | Lightest tint, hover backgrounds |
| 100   | `#b3ffe8` | Selected row background          |
| 200   | `#80ffd7` | Light accent                     |
| 300   | `#4dffc6` | Badges, tags                     |
| 400   | `#1affb5` | Active borders                   |
| **500** | **`#00E5C0`** | **Primary brand (buttons, links)** |
| 600   | `#00b89a` | Primary hover                    |
| 700   | `#008f7a` | Primary active/pressed           |
| 800   | `#006659` | Dark accents                     |
| 900   | `#003d35` | Darkest tint                     |

---

## 2. Typography

| Role       | Font Family       | Weights Available | Usage                        |
|------------|-------------------|-------------------|------------------------------|
| Display    | **Degular Display** | 400, 600, 700   | Page titles, section headings (h1-h6) |
| Body       | **Gesta**           | 400, 500, 700   | All body text, labels, UI copy |
| Fallbacks  | Arial, Helvetica, sans-serif | -- | Applied to both stacks |

### CSS Custom Properties

```css
--font-display: 'Degular Display', Arial, Helvetica, sans-serif;
--font-body: 'Gesta', Arial, Helvetica, sans-serif;
```

### Type Scale

| Token | Size      | Line Height | Use Case         |
|-------|-----------|-------------|------------------|
| xs    | 0.75rem   | 1rem        | Captions, badges |
| sm    | 0.875rem  | 1.25rem     | Labels, metadata |
| base  | 1rem      | 1.5rem      | Body text        |
| lg    | 1.125rem  | 1.75rem     | Subheadings      |
| xl    | 1.25rem   | 1.75rem     | Card titles      |
| 2xl   | 1.5rem    | 2rem        | Section headers  |
| 3xl   | 1.875rem  | 2.25rem     | Page titles      |
| 4xl   | 2.25rem   | 2.5rem      | Hero text        |

---

## 3. Data Visualization Palette

A 10-color palette derived from the brand gradient (aqua -> teal -> purple -> pink), muted ~15-20% from their neon origins for comfortable daily use in charts, graphs, and dashboards.

| #  | Name        | Hex       | Swatch | Origin          |
|----|-------------|-----------|--------|-----------------|
| 1  | Aqua        | `#00C9A7` | ![](https://placehold.co/24x24/00C9A7/00C9A7) | Brand aqua (muted) |
| 2  | Ocean       | `#3B9EB5` | ![](https://placehold.co/24x24/3B9EB5/3B9EB5) | Teal-blue      |
| 3  | Steel Blue  | `#5488B5` | ![](https://placehold.co/24x24/5488B5/5488B5) | Mid-blue       |
| 4  | Indigo      | `#6C6EB5` | ![](https://placehold.co/24x24/6C6EB5/6C6EB5) | Blue-violet    |
| 5  | Violet      | `#8566A8` | ![](https://placehold.co/24x24/8566A8/8566A8) | Purple         |
| 6  | Berry       | `#A85C9A` | ![](https://placehold.co/24x24/A85C9A/A85C9A) | Red-purple     |
| 7  | Rose        | `#C75591` | ![](https://placehold.co/24x24/C75591/C75591) | Pink           |
| 8  | Coral       | `#D46B7A` | ![](https://placehold.co/24x24/D46B7A/D46B7A) | Warm pink      |
| 9  | Gold        | `#C9B73D` | ![](https://placehold.co/24x24/C9B73D/C9B73D) | Crazy Taxi (muted) |
| 10 | Warm Sand   | `#B5944A` | ![](https://placehold.co/24x24/B5944A/B5944A) | Earth tone     |

### Usage Rules

- Use colors **in order** (1, 2, 3...) for multi-series charts. This creates a natural gradient flow.
- For **2-color** charts (e.g., bar + line combo), use Aqua (`#00C9A7`) + Rose (`#C75591`) for maximum contrast.
- For **3-category** stacked bars, use Aqua, Ocean, Violet (positions 1, 2, 5).
- For **5-category** stacked bars, use Aqua, Ocean, Steel Blue, Violet, Rose (positions 1, 2, 3, 5, 7).
- **Never use the raw brand neons** (`#00E5C0`, `#FF1EFF`, `#FDEA00`) in data viz. Use the muted palette above.

### CSS Custom Properties

```css
--color-viz-1: #00C9A7;
--color-viz-2: #3B9EB5;
--color-viz-3: #5488B5;
--color-viz-4: #6C6EB5;
--color-viz-5: #8566A8;
--color-viz-6: #A85C9A;
--color-viz-7: #C75591;
--color-viz-8: #D46B7A;
--color-viz-9: #C9B73D;
--color-viz-10: #B5944A;
```

### JavaScript/TypeScript

```ts
export const BRAND_VIZ_PALETTE = [
  '#00C9A7', '#3B9EB5', '#5488B5', '#6C6EB5', '#8566A8',
  '#A85C9A', '#C75591', '#D46B7A', '#C9B73D', '#B5944A',
];
```

---

## 4. Component Color Schemes

KPI cards, stat cards, and conversion indicators use four named color schemes. Each scheme defines background gradients, icon tints, borders, and progress bar fills.

| Scheme   | Base Color | Hex       | Use For                           |
|----------|------------|-----------|-----------------------------------|
| **aqua** | Aqua       | `#00C9A7` | Default scheme, delivery metrics  |
| **ocean**| Ocean      | `#3B9EB5` | Secondary metrics, meetings       |
| **violet** | Violet   | `#8566A8` | Sales metrics, client activities  |
| **rose** | Rose       | `#C75591` | Accent metrics, outcomes          |

### Scheme Definitions

```ts
const colorSchemes = {
  aqua: {
    gradient: 'from-[#00C9A7]/10 to-[#00C9A7]/5',
    iconBg:   'bg-[#00C9A7]/10',
    iconColor:'text-[#00A88A]',
    border:   'border-[#00C9A7]/25',
    barFill:  'bg-[#00C9A7]',
  },
  ocean: {
    gradient: 'from-[#3B9EB5]/10 to-[#3B9EB5]/5',
    iconBg:   'bg-[#3B9EB5]/10',
    iconColor:'text-[#2E7D8F]',
    border:   'border-[#3B9EB5]/25',
    barFill:  'bg-[#3B9EB5]',
  },
  violet: {
    gradient: 'from-[#8566A8]/10 to-[#8566A8]/5',
    iconBg:   'bg-[#8566A8]/10',
    iconColor:'text-[#6B4F8A]',
    border:   'border-[#8566A8]/25',
    barFill:  'bg-[#8566A8]',
  },
  rose: {
    gradient: 'from-[#C75591]/10 to-[#C75591]/5',
    iconBg:   'bg-[#C75591]/10',
    iconColor:'text-[#A84479]',
    border:   'border-[#C75591]/25',
    barFill:  'bg-[#C75591]',
  },
};
```

---

## 5. Heatmap Sequential Scale

For heatmaps and density visualizations, use this 7-step aqua sequential scale from lightest to darkest:

```
#e6fff9 -> #b3ffe8 -> #66dfc0 -> #33c9a7 -> #00b89a -> #008f7a -> #006659
```

| Step | Hex       | Use                    |
|------|-----------|------------------------|
| 1    | `#e6fff9` | Zero / minimal values  |
| 2    | `#b3ffe8` | Low                    |
| 3    | `#66dfc0` | Below average          |
| 4    | `#33c9a7` | Average                |
| 5    | `#00b89a` | Above average          |
| 6    | `#008f7a` | High                   |
| 7    | `#006659` | Maximum                |

---

## 6. Leaderboard & Rank Colors

| Rank   | Element     | Color                  | Hex       |
|--------|-------------|------------------------|-----------|
| 1st    | Trophy icon | Crazy Taxi Gold        | `#FDEA00` |
| 1st    | Progress bar| Crazy Taxi Gold        | `#FDEA00` |
| 2nd    | Medal icon  | Gray                   | Tailwind `gray-400` |
| 2nd    | Progress bar| Gray                   | Tailwind `gray-400` |
| 3rd    | Award icon  | Amber                  | Tailwind `amber-600` / `amber-500` |
| 4th+   | Number      | Gray text              | Tailwind `gray-400` |
| 4th+   | Progress bar| Muted Aqua             | `#00C9A7` |

---

## 7. Semantic Colors (Do Not Override)

These colors carry universal meaning and should remain consistent regardless of brand:

| Purpose  | Color   | Hex       | Use Case                          |
|----------|---------|-----------|-----------------------------------|
| Success  | Green   | `#10b981` | Positive trends, targets met      |
| Warning  | Amber   | `#f59e0b` | Caution states, approaching limits |
| Danger   | Red     | `#ef4444` | Errors, negative trends, missed targets |

Target gauges, trend arrows, and status indicators always use semantic colors, not brand colors.

---

## 8. Surface & Layout

| Element              | Value                        |
|----------------------|------------------------------|
| Sidebar background   | Pitch Black `#0B141B`        |
| Page background      | White `#FFFFFF` (light mode) |
| Card background      | White `#FFFFFF`              |
| Card border          | `border-gray-200`           |
| Card border radius   | `rounded-xl` (1rem)         |
| Card shadow          | `shadow-sm`, `shadow-md` on hover |
| Active nav indicator | Gradient `from-brand-primary to-brand-dark` |
| Active nav icon      | `text-emerald-400`          |

---

## 9. Spacing

Based on a 4px grid:

| Token | Value   | Pixels |
|-------|---------|--------|
| xs    | 0.25rem | 4px    |
| sm    | 0.5rem  | 8px    |
| md    | 1rem    | 16px   |
| lg    | 1.5rem  | 24px   |
| xl    | 2rem    | 32px   |
| 2xl   | 3rem    | 48px   |
| 3xl   | 4rem    | 64px   |

---

## 10. Motion

| Property   | Token   | Value   | Use Case                 |
|------------|---------|---------|--------------------------|
| Duration   | fast    | 150ms   | Hover states, toggles    |
| Duration   | normal  | 250ms   | Transitions, fades       |
| Duration   | slow    | 350ms   | Page transitions, modals |
| Easing     | easeOut | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |
| Easing     | easeInOut | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| Easing     | spring  | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful bounces |

### Framer Motion Patterns

- **Cards**: `initial={{ opacity: 0, y: 20 }}` -> `animate={{ opacity: 1, y: 0 }}`
- **Hover lift**: `whileHover={{ y: -4, transition: { duration: 0.2 } }}`
- **Stagger children**: `staggerChildren: 0.05` to `0.1`
- **Progress bars**: `initial={{ width: 0 }}` -> `animate={{ width: target }}` with `ease: 'easeOut'`

---

## 11. Quick Reference Card

```
BRAND:       #0B141B  #00E5C0  #FFFFFF  #FF1EFF  #FDEA00
VIZ PALETTE: #00C9A7  #3B9EB5  #5488B5  #6C6EB5  #8566A8
             #A85C9A  #C75591  #D46B7A  #C9B73D  #B5944A
SCHEMES:     aqua=#00C9A7  ocean=#3B9EB5  violet=#8566A8  rose=#C75591
HEATMAP:     #e6fff9 -> #b3ffe8 -> #66dfc0 -> #33c9a7 -> #00b89a -> #008f7a -> #006659
SEMANTIC:    success=#10b981  warning=#f59e0b  danger=#ef4444
FONTS:       Degular Display (headings)  |  Gesta (body)
SIDEBAR:     #0B141B (Pitch Black)
1ST PLACE:   #FDEA00 (Crazy Taxi)
```
