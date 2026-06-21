<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: Aperture Social
description: A sleek, premium dark-mode canvas for visual creators.
colors:
  primary: "#4f46e5"
  neutral-bg: "#0e1116"
  neutral-surface: "#161b22"
  neutral-border: "#30363d"
  neutral-ink: "#f0f6fc"
  neutral-ink-muted: "#8b949e"
typography:
  display:
    fontFamily: "Outfit, Inter, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

# Design System: Aperture Social

## 1. Overview

**Creative North Star: "Aperture Dark"**

Aperture Dark is a premium, high-contrast dark environment designed explicitly to frame and showcase user-generated visual content. The UI is designed to recede entirely, functioning as a virtual gallery frame. It uses absolute blacks, deep grays, and precise borders to give a sense of sophistication and order, letting the vibrant colors of creator media draw the eye.

This system rejects typical SaaS clutter, heavy cards, and noisy neon accents. Spacing is generous, typography is sharp and intentional, and visual hierarchies are kept flat to preserve clean sightlines.

**Key Characteristics:**
- Deep obsidian backdrop that makes photos pop.
- Hairline borders (1px) instead of heavy dividers or block shadows.
- Generous, intentional padding to give content breathing room.
- Micro-interactions that feel responsive and tactile, never laggy or theatrical.

## 2. Colors

A sleek, sophisticated near-black palette accented by a singular vibrant indigo to command focus.

### Primary
- **Aperture Indigo** (#4f46e5 / oklch(50% 0.20 280)): Used exclusively for high-priority interactive highlights, active states, and follow actions.

### Neutral
- **Obsidian Dark** (#0e1116 / oklch(14% 0.01 280)): The core background color. Rich, deep, and immersive.
- **Gallery Surface** (#161b22 / oklch(18% 0.01 280)): Used for secondary panels, post containers, and comments.
- **Hairline Border** (#30363d / oklch(26% 0.01 280)): 1px thin boundary line to partition content cleanly.
- **Gallery Ink** (#f0f6fc / oklch(95% 0.01 280)): Primary typography color. Sharp, high contrast, yet easy on the eyes.
- **Muted Ink** (#8b949e / oklch(75% 0.01 280)): Secondary descriptions, timestamps, and secondary actions.

### Named Rules
**The One Voice Rule.** The primary accent (#4f46e5) is used on ≤10% of any given screen. Its rarity is what gives it weight.
**The Tinted Border Rule.** Borders must use `neutral-border` (#30363d). Never use pure white or solid gray lines.

## 3. Typography

**Display Font:** Outfit (with fallback sans-serif)
**Body Font:** Inter (with fallback sans-serif)

**Character:** Bold, geometric headings with clean, highly readable neutral body prose.

### Hierarchy
- **Display** (Bold 700, clamp(2rem, 5vw, 3.5rem), 1.1): Used for main app branding and hero titles.
- **Headline** (SemiBold 600, clamp(1.5rem, 3vw, 2rem), 1.2): Used for page sections and profile names.
- **Title** (Medium 500, 1.25rem, 1.3): Used for post titles, card headers, and popups.
- **Body** (Regular 400, 0.9375rem, 1.6): Used for captions, descriptions, and comments. Max line length is 70ch.
- **Label** (Medium 500, 0.75rem, 0.05em letter-spacing, uppercase): Used for eyebrows, metadata tags, and small utility text.

### Named Rules
**The Typographic Breathing Rule.** Maintain a minimum margin-bottom of 1.5rem (24px) after display headings to prevent text overcrowding.

## 4. Elevation

The system is flat by default, relying on solid background colors and thin borders rather than soft shadows to group content. 

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus) or on modals to separate them from the overlay.

### Shadow Vocabulary
- **Overlay Lift** (box-shadow: 0 12px 32px rgba(0,0,0,0.5)): Used only on dialogs and dropdown menus to separate them from the backdrop.

## 5. Components

*Component styles will be documented here once implementation begins.*

## 6. Do's and Don'ts

### Do:
- **Do** use `neutral-border` (#30363d) for all borders, keeping them at exactly 1px.
- **Do** prioritize image aspect ratios, rendering them without stretching or cropping that ruins composition.
- **Do** use smooth transitions (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`) for all state changes.

### Don't:
- **Don't** use border-left/right greater than 1px as a colored stripe on cards or list items.
- **Don't** use gradient text under any circumstances.
- **Don't** use decorative glassmorphism or heavy blur filters on normal containers (only use backdrop-blur on sticky nav headers).
- **Don't** build cluttered, text-heavy feeds; keep cards spacious and visual-first.
- **Don't** build interfaces that look like a generic SaaS admin dashboard.
