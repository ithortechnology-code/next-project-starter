---
name: Project Starter
description: A reusable account-access example for web and native apps.
colors:
  ink: "#091125"
  blue: "#0853e8"
  blue-focus: "#2168f3"
  blue-panel: "#edf2f8"
  white: "#ffffff"
  muted: "#515c6c"
  border: "#d5dce6"
  danger: "#b42318"
  success: "#176b47"
typography:
  display:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.25vw, 2.75rem)"
    fontWeight: 720
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.3vw, 2.875rem)"
    fontWeight: 720
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 650
    lineHeight: 1.4
rounded:
  field: "0.625rem"
  status: "0.625rem"
  icon: "0.75rem"
  mark: "0.125rem"
spacing:
  field-gap: "1.375rem"
  mobile-inset: "1.125rem"
  section-gap: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.field}"
    height: "3.5rem"
    padding: "0 1rem"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "3.5rem"
    padding: "0 0.875rem"
---

# Design System: Project Starter

## Overview

The web account screens adapt a split account-access composition to a generic starter. A pale blue context panel explains the example on desktop; the right panel keeps the lifecycle task and its primary action clear. At mobile widths, the explanatory panel drops away and the form becomes the first reading path.

The system uses a restrained blue accent, deep ink, white form surfaces, and readable muted text. It contains no Razorpay branding or product claims. The wordmark is a simple geometric starter mark made from CSS shapes.

**Key Characteristics:**

- Split desktop layout, single-column mobile layout.
- Blue primary action and focus treatment.
- Direct labels, concise lifecycle copy, and visible status states.

## Colors

The palette pairs a strong blue action color with cool pale blue context surfaces and high-contrast ink.

### Primary

- **Starter Blue** (#0853e8): Primary actions, links, and lifecycle icons.
- **Focus Blue** (#2168f3): Visible keyboard focus.

### Neutral

- **Ink** (#091125): Main text and headings.
- **Muted Slate** (#515c6c): Supporting text.
- **Cool Panel** (#edf2f8): Context and neutral feedback backgrounds.
- **Border** (#d5dce6): Separators and boundaries.
- **White** (#ffffff): Main page and form surfaces.

### Named Rules

**The Form First Rule.** On narrow screens, keep the form heading, fields, primary action, and lifecycle links in one readable column.

## Typography

**Display Font:** Inter Variable (with system sans-serif fallback)
**Body Font:** Inter Variable (with system sans-serif fallback)
**Label/Mono Font:** None

**Character:** Compact, bold headings establish the account task. Body text remains neutral and spacious enough to explain each lifecycle state.

### Hierarchy

- **Display** (720, clamp(2rem, 3.25vw, 2.75rem), 1.12): Context panel heading.
- **Title** (720, clamp(2rem, 3.3vw, 2.875rem), 1.12): Form and state heading.
- **Body** (400, 1rem, 1.55): Descriptions and feedback.
- **Label** (650, 0.9375rem, 1.4): Form field names.

Inter Variable is self-hosted from the `@fontsource-variable/inter` package under the SIL Open Font License.

## Layout

Desktop uses a 40/60 context and form split. The form width is capped at 43.75rem. At 920px and below, the context panel is hidden and the form uses a single column. The narrowest supported width is 320px, with 1.125rem side insets at 360px and below.

## Shapes

Inputs and primary buttons use 0.625rem corners. Context icons use 0.75rem corners. Inputs and actions share a 3.5rem target height.

## Components

- **Primary action:** Full-width blue button with white text, visible focus, and a disabled pending state.
- **Field:** Persistent label, white surface, border, and blue focus ring. Validation errors appear beside the field and are associated with it.
- **Status message:** Neutral, error, or success surface with text and a screen-reader role.
- **Context panel:** Quiet lifecycle explanation on desktop; omitted on mobile to keep the task first.

## Do's and Don'ts

- Keep lifecycle feedback generic so it does not disclose whether an account exists.
- Preserve a server-validated session as the source of authenticated identity.
- Keep keyboard focus visible and mobile controls comfortably sized.
- Do not add product-specific claims, third-party branding, or social-auth controls.
