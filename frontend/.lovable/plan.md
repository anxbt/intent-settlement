

# Intent Pay — Premium $10K Website Design

A judge-facing demonstration of intent-based cross-chain payments, designed with the sophistication of institutional fintech and the elegance of editorial typography.

---

## Design Foundation

### Typography
- **Headlines**: Playfair Display (elegant serif) — conveys authority and permanence
- **Body/UI**: Inter — clean, highly readable, pairs beautifully with serif display
- **Hierarchy**: Large, confident headlines with generous tracking; refined body copy

### Color Palette (Dark Mode Premium)
- **Background**: Deep charcoal (#0a0a0b) with subtle warm undertone
- **Surface**: Elevated charcoal (#141416) for cards and sections
- **Border**: Soft warm gray (#2a2a2e) for subtle definition
- **Primary text**: Warm off-white (#faf9f7) — softer than pure white
- **Muted text**: Warm gray (#a3a3a3)
- **Accent**: Champagne gold (#d4af37) for CTAs and highlights — luxury finance feel
- **Secondary accent**: Soft cream (#f5f0e8) for subtle emphasis

### Visual Refinements
- Generous whitespace and padding throughout
- Subtle backdrop blur on elevated surfaces
- Fine 1px borders with low opacity
- Elegant hover states with opacity transitions
- No harsh contrasts — everything feels considered

---

## Global Navigation Header

- Minimal, fixed header with subtle blur backdrop
- Left: "IntentPay" wordmark in Playfair Display
- Right: Navigation links in Inter (Create Intent, Pay Intent, Examples dropdown)
- Examples dropdown reveals 5 state demo links
- Subtle gold accent on active/hover states

---

## Landing Page (`/`)

### Hero Section
- **HLS video background** with 10-15% opacity, slight warmth filter
- Generous vertical padding (feels editorial)
- **Headline** (Playfair Display, ~56-64px):
  *"Cross-Chain Payments, Settled by Intent"*
- **Subheadline** (Inter, refined spacing):
  *"Define the exact outcome you want. Funds move only if the intent is fulfilled — otherwise they return safely."*
- **Primary CTA**: Champagne gold button, subtle hover glow
- **Secondary CTA**: Ghost button with gold border

### Section 1: "Why Intent-Based Payments?"
- Section title in Playfair Display
- Three refined cards with warm surface color
- Minimal icons (if any) — content speaks
- Generous padding, elegant typography

### Section 2: "How It Works"
- Numbered steps with gold accent numbers
- Clean vertical flow
- Each step card with subtle border

### Section 3: "Failure Is a Feature"
- Full-width section with slightly different background tone
- Editorial typography treatment
- Emphasis through spacing, not decoration

### Final CTA
- Centered, generous padding
- Premium button treatments
- Subtle fade-in on scroll

---

## Create Intent Page (`/create-intent`)

- Page title in Playfair Display
- Clean form layout with refined inputs
- Input fields with subtle warm borders
- Gold focus states
- "Generate Intent" in champagne gold
- Redirects to status page on submit

---

## Pay Intent Page (`/pay-intent`)

- Intent summary displayed in elegant card
- Asset selector with refined dropdown styling
- "Pay with LI.FI Composer" primary button
- Simulated loading with subtle animation

---

## Intent Status Page (`/intent/:id`)

- Large Intent ID display
- Refined status badge with appropriate colors:
  - CREATED: Warm gray
  - LOCKED: Soft gold
  - FULFILLED: Elegant green (#22c55e)
  - FAILED: Warm amber (#f59e0b)
  - REFUNDED: Neutral
- Expiry countdown
- "Reclaim Funds" button for FAILED state (secondary styling, non-urgent)

---

## Micro-interactions

- Subtle fade-in on scroll (content reveals gracefully)
- Hover opacity transitions (0.8 → 1)
- Button hover: subtle brightness increase
- State badge color transitions
- No bounce, scale, or aggressive animations

---

## Implementation Details

- Import Playfair Display from Google Fonts
- Update CSS variables for premium dark palette
- Custom button variants with gold accent
- Refined input styling matching luxury aesthetic
- HLS.js for video background

---

## Result

Judges will see a site that feels like it handles serious money — calm, confident, and beautifully crafted. The serif headlines convey permanence and trust, while the refined dark interface feels like Bloomberg meets Stripe.

