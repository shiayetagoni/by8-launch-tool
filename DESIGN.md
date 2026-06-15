# BY8 Launch Tool — Design System

**Category:** SaaS crypto analytics | **Theme:** Dark | **Status:** Production

## Direction

Professional Web3 launch analytics platform. Deep black minimalism with neon blue/purple accents. Refined, trustworthy, anti-scam visual language. Pill-capsule logo as primary trust signal. Editorial card-based layout with refined glass-morphism. All interactions GPU-accelerated, iOS-native polish.

## Visual Identity

**Tone:** Refined brutalism, SaaS professional, legitimate crypto tool. **Differentiation:** Deep black background, neon blue/purple accents only, no aggressive marketing language, minimal decorative effects — trust through clarity and polish.

## Color Palette

| Token       | OKLCH L C H     | Hex (approx) | Purpose                     |
|-------------|-----------------|-------------|-----------------------------|
| background  | 0.08 0.01 260   | #080d16     | Base surface (deep black)   |
| card        | 0.12 0.012 260  | #0f1420     | Elevated surfaces           |
| foreground  | 0.95 0.004 260  | #f1f5f9     | Primary text (high contrast)|
| primary     | 0.8 0.18 210    | #00d9ff     | Neon blue (CTA, accents)    |
| secondary   | 0.65 0.18 290   | #b366ff     | Neon purple (interactive)   |
| accent      | 0.65 0.18 290   | #b366ff     | Purple accent zones         |
| destructive | 0.58 0.2 15     | #ef4444     | Error/alert state           |
| muted       | 0.18 0.01 260   | #1a2332     | Subtle backgrounds          |

## Typography

**Display:** Space Grotesk 600–700 (headlines, hero, nav) | **Body:** Space Grotesk 400–500 (content, micro-copy) | **Mono:** JetBrains Mono 400–600 (data, addresses, codes) | **Scale:** 48/600 hero, 28/600 h2, 16/400 body, 14/500 label.

## Elevation & Depth

Layered dark surfaces with subtle borders. Glass-morphism 8px blur. Depth through border color + minimal shadows only. No glows or aggressive effects.

## Structural Zones

| Zone    | Background        | Border              | Notes                          |
|---------|-------------------|---------------------|--------------------------------|
| Header  | card (0.12)       | border (0.22)       | Logo-focused, sticky, 12px gap |
| Hero    | background (0.08) | None                | Deep black, subtle radial glow |
| Content | background (0.08) | border (0.22)       | Cards, 2rem gap, editorial flow|
| Footer  | card (0.12)       | border (0.22)       | Muted + accent text links      |

## Spacing

**Unit:** 16px | **Sections:** 2rem gap | **Cards:** 1.5rem padding | **Micro:** 0.5–0.75rem.

## Component Defaults

**Buttons:** Neon blue gradient, 12px radius, 3D depth (inset highlights + drop shadows), spring press (0.08s), no outline on focus (use box-shadow). **Cards:** 12px radius, 1px purple/blue border (0.15 opacity), glass blur 8px, hover brightens border + lifts shadow. **Inputs:** Dark bg (0.16), purple border (0.2), blue focus ring, no aggressive glow. **Icons:** 20–24px default, neon blue on primary, inherit text color on body.

## Motion Storyboard

**Splash:** Logo scales 0–100% over 0.4s spring; bar fills top 1.0s at 0.2s offset; text reveals at 0.5s. Overlay fades out at 1.8s. **Page transition:** 120ms opacity + translateY(6px). **Card entrance:** 0.4s scale(0.98)+opacity. **Hover:** Border brightens 0.25s, lift 1px, shadow expands. **Press:** 0.08s scale(0.97)+translate(2px down). **Reduced motion:** All animations → 0.01ms.

## Production Notes

**GPU Layer Promotion:** All animated elements use `will-change: transform, opacity` + `backface-visibility: hidden`. No layout-triggering properties (position, width, height, left, top). **iOS Compatibility:** Safe area padding on nav/buttons, `-webkit-overflow-scrolling: touch` on scrollable elements, no tap highlight. **Accessibility:** Contrast AA+ on all text, focus states use box-shadow not outline, reduced-motion respected. **Performance:** Lazy-load images, skeleton shimmer for data loading, no per-frame DOM mutations, CSS transforms only for animation.
