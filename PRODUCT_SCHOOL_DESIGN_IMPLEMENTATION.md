# Product School Design System Implementation

**Date:** April 1, 2026
**Status:** ✅ Complete

---

## Overview

This document details the comprehensive implementation of the Product School brand and design system across the PS Campaign Manager application. All components, layouts, and styling have been updated to match the official Product School aesthetic.

---

## Design System Specifications

### Color Palette (Dark Mode Only)

All colors have been implemented as CSS custom properties:

```css
--color-bg-primary: #0A0A0A      /* Page/app background */
--color-bg-surface: #141414       /* Cards, panels, modals */
--color-bg-elevated: #1F1F1F      /* Hover states, nav, dropdowns */
--color-text-primary: #FFFFFF     /* Headlines, primary labels */
--color-text-secondary: #A0A0A0   /* Body copy, subtitles, metadata */
--color-accent: #7B2FFF           /* Primary CTA buttons, links, highlights */
--color-accent-hover: #6020CC     /* Hover state for accent */
--color-border: #2A2A2A           /* Dividers, card borders */
--color-success: #22C55E          /* Confirmations, badges */
--color-destructive: #EF4444      /* Errors, warnings */
```

### Typography

- **Font Family:** Inter (Google Fonts)
- **Weights:** 400, 500, 600, 700, 800
- **Scale:**
  - Heading XL: 48px / 800 weight / 1.1 line-height
  - Heading L: 32px / 700 weight / 1.2 line-height
  - Heading M: 24px / 600 weight / 1.3 line-height
  - Body: 16px / 400 weight / 1.6 line-height
  - Meta: 14px / 400 weight / secondary color
  - Label: 12px / 600 weight / 0.08em letter-spacing / uppercase

### Branding

- **Logo:** Product School SVG from `https://productschool.com/_next/static/media/logo-1__dark.a75f389c.svg`
- **Display Height:** 28px
- **Location:** Sidebar header (left-aligned)

---

## Files Modified

### Global Styling

1. **`app/globals.css`**
   - Added Product School CSS custom properties
   - Imported Inter font with all weights (400-800)
   - Configured HSL color mappings for Tailwind compatibility
   - Added typography base styles
   - Disabled all shadows globally
   - Added custom utility classes (`text-meta`, `text-label`, `bg-surface`, etc.)

2. **`tailwind.config.ts`**
   - Extended color palette with `ps.*` namespace
   - Updated border radius values (12px → 8px)
   - Added Product School typography scale
   - Configured Inter as default sans-serif font
   - Removed/disabled shadow utilities (except `glow-accent`)
   - Maintained backward compatibility with shadcn/ui colors

3. **`next.config.js`**
   - Added remote image pattern for `productschool.com` domain
   - Enables Product School logo loading via Next.js Image component

### Layout Components

4. **`app/layout.tsx`**
   - Updated Inter font import to include weights 400, 500, 600, 700, 800
   - Added `display: "swap"` for better font loading performance

5. **`components/layout/sidebar.tsx`**
   - Replaced title text with Product School logo
   - Updated background to `bg-surface` (#141414)
   - Updated navigation hover states to `bg-elevated`
   - Updated text colors to `text-ps-text-primary` and `text-ps-text-secondary`
   - Applied Product School border colors (`border-ps`)

6. **`components/layout/header.tsx`**
   - Updated background to `bg-[var(--color-bg-primary)]`
   - Updated text colors to Product School palette
   - Applied Product School border colors

7. **`app/campaigns/layout.tsx`**
   - Changed main background from `bg-gray-50` to `bg-[var(--color-bg-primary)]`

8. **`app/settings/layout.tsx`**
   - Changed main background from `bg-gray-50` to `bg-[var(--color-bg-primary)]`

9. **`app/templates/layout.tsx`**
   - Changed main background from `bg-gray-50` to `bg-[var(--color-bg-primary)]`

### UI Components

10. **`components/ui/button.tsx`**
    - Primary: Purple background (#7B2FFF), hover (#6020CC)
    - Secondary: Transparent with border, hover to elevated
    - Font size: 15px, weight: 600
    - Border radius: 8px (md)
    - Transition: 0.2s ease
    - No shadows, no gradients
    - Focus ring: Purple accent

11. **`components/ui/card.tsx`**
    - Background: `bg-surface` (#141414)
    - Border: `border-ps-border` (#2A2A2A)
    - Border radius: 12px (xl)
    - Padding: 24px
    - No shadows
    - Text colors updated to Product School palette

12. **`components/ui/input.tsx`**
    - Background: `bg-elevated` (#1F1F1F)
    - Border: `border-ps-border` (#2A2A2A)
    - Border radius: 8px (md)
    - Padding: 10px 14px
    - Focus: `border-ps-accent` (no ring, no offset)
    - Placeholder: `text-ps-text-secondary`

13. **`components/ui/textarea.tsx`**
    - Same styling as Input component
    - Min height: 80px

14. **`components/ui/label.tsx`**
    - Color: `text-ps-text-primary`
    - Font: 14px medium weight

15. **`components/ui/badge.tsx`**
    - Border radius: 999px (fully rounded)
    - Padding: 4px 10px
    - Font: 12px semibold
    - Variants:
      - Default: `bg-[#2A2A2A]` / white text
      - Accent: `bg-[rgba(123,47,255,0.2)]` / purple text
      - Success: `bg-[rgba(34,197,94,0.2)]` / green text
      - Destructive: `bg-[rgba(239,68,68,0.2)]` / red text
      - Secondary: `bg-elevated` with border
      - Outline: Transparent with border

16. **`components/ui/select.tsx`**
    - Trigger: Same styling as Input
    - Content: `bg-elevated` with Product School borders
    - Items: Hover to `bg-[var(--color-bg-primary)]`
    - Check icon: Purple accent color
    - Separator: Product School border color

17. **`components/ui/progress.tsx`**
    - Background: `bg-elevated` with border
    - Indicator: `bg-ps-accent` (purple)
    - Height: 8px
    - Border radius: Full (rounded-full)

### Page Files (Mass Updated)

18. **All page files in `app/` directory:**
    - Replaced `bg-white` → `bg-surface`
    - Replaced `bg-gray-50` → `bg-surface`
    - Replaced `bg-gray-100` → `bg-elevated`
    - Replaced `text-gray-900` → `text-ps-text-primary`
    - Replaced `text-gray-800` → `text-ps-text-primary`
    - Replaced `text-gray-700` → `text-ps-text-secondary`
    - Replaced `text-gray-600` → `text-ps-text-secondary`
    - Replaced `text-gray-500` → `text-ps-text-secondary`
    - Replaced `border-gray-200` → `border-ps`
    - Replaced `border-gray-300` → `border-ps`
    - Replaced `hover:bg-gray-100` → `hover:bg-elevated`

---

## Design Principles Applied

### ✅ Dark Mode Only
- No light mode toggle
- All backgrounds are dark (#0A0A0A, #141414, #1F1F1F)
- High contrast text for accessibility

### ✅ No Drop Shadows
- Used borders instead of shadows throughout
- Only exception: Optional purple glow on key CTAs (`glow-accent` utility)
- Removed all `shadow-*` utility classes

### ✅ Generous Whitespace
- Card padding: 24px
- Form spacing maintained
- Let content breathe

### ✅ Rounded Corners
- Surfaces: 12px (cards, panels)
- Inputs/Buttons: 8px
- Badges: Fully rounded (999px)

### ✅ Minimal Motion
- Transition duration: 0.2s
- Easing: `ease`
- Only on hover states
- No complex animations

### ✅ No Gradients
- Solid colors only
- Exception: Transparent color overlays for badges (`rgba(123,47,255,0.2)`)

---

## Tailwind Utility Classes Added

Custom utilities for Product School design system:

```css
.text-meta          /* 14px secondary color */
.text-label         /* 12px uppercase semibold */
.bg-surface         /* Surface background #141414 */
.bg-elevated        /* Elevated background #1F1F1F */
.border-ps          /* Product School border #2A2A2A */
.glow-accent        /* Purple glow: 0 0 20px rgba(123, 47, 255, 0.3) */
.transition-ps      /* 0.2s ease transition */
```

---

## Component Styling Reference

### Buttons

**Primary CTA:**
```tsx
<Button>Primary Action</Button>
```
- Background: #7B2FFF
- Hover: #6020CC
- Text: White
- Font: 15px / 600 weight
- Padding: 10px 20px
- Border radius: 8px

**Secondary/Ghost:**
```tsx
<Button variant="secondary">Secondary Action</Button>
<Button variant="ghost">Ghost Action</Button>
```
- Background: Transparent
- Border: 1px solid #2A2A2A
- Hover: Border #555, Background elevated

**Destructive:**
```tsx
<Button variant="destructive">Delete</Button>
```
- Background: #EF4444
- Hover: #EF4444/90

### Cards/Panels

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```
- Background: #141414
- Border: 1px solid #2A2A2A
- Border radius: 12px
- Padding: 24px

### Input Fields

```tsx
<Input placeholder="Enter text..." />
<Textarea placeholder="Enter long text..." />
```
- Background: #1F1F1F
- Border: 1px solid #2A2A2A
- Border radius: 8px
- Padding: 10px 14px
- Focus: Border #7B2FFF

### Badges/Tags

```tsx
<Badge>Default</Badge>
<Badge variant="accent">Accent</Badge>
<Badge variant="success">Success</Badge>
```
- Border radius: 999px (fully rounded)
- Padding: 4px 10px
- Font: 12px / 600 weight

---

## Breaking Changes

### Color References
Any hardcoded color values in custom code will need updating:
- `#FFFFFF` → `var(--color-text-primary)` or `text-ps-text-primary`
- `#000000` → `var(--color-bg-primary)` or `bg-[var(--color-bg-primary)]`
- Gray values → Product School palette

### Component Props
Button variants remain the same, but visual appearance changed:
- `variant="default"` now purple instead of blue
- `variant="secondary"` now transparent with border instead of gray

### Shadows
All shadows removed globally. If shadows are needed for specific use cases:
- Add `glow-accent` class for purple glow on CTAs
- Or add custom shadow in component className

---

## Verification Checklist

- [x] Global CSS variables configured
- [x] Tailwind config extended with PS colors
- [x] Inter font loaded with correct weights
- [x] Product School logo displayed in sidebar
- [x] All buttons match PS design spec
- [x] All cards match PS design spec
- [x] All inputs/forms match PS design spec
- [x] All badges match PS design spec
- [x] Navigation/header match PS design spec
- [x] All layouts use correct backgrounds
- [x] No shadows present (except optional glow)
- [x] All gray colors replaced with PS palette
- [x] Next.js configured for external logo
- [x] Typography scale applied
- [x] Border radius consistent (8-12px)
- [x] Transitions are 0.2s ease

---

## Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Check for styling errors
npm run lint
```

---

## Future Considerations

### Tables
If tables are added, apply this styling:
- Header row: `bg-elevated`, `text-ps-text-secondary`, uppercase labels
- Body rows: `border-bottom: 1px solid var(--color-border)`
- Hover row: `bg-elevated`

### Modals/Dialogs
Should use:
- Background: `bg-surface`
- Border: `border-ps`
- Border radius: 12px

### Toasts/Notifications
Consider using:
- Success: `bg-[rgba(34,197,94,0.2)]` with green text
- Error: `bg-[rgba(239,68,68,0.2)]` with red text
- Info: `bg-elevated` with purple accent

---

## Troubleshooting

### Logo not loading?
- Check `next.config.js` has `productschool.com` in `remotePatterns`
- Verify network access to productschool.com
- Check browser console for CORS errors

### Colors not applying?
- Ensure CSS custom properties are defined in `app/globals.css`
- Check Tailwind config has `ps.*` color extensions
- Verify no inline styles override Tailwind classes

### Fonts not loading?
- Check Google Fonts import in `globals.css`
- Verify Inter font weights in `layout.tsx`
- Clear browser cache if fonts cached incorrectly

---

## Resources

- Product School Website: https://productschool.com
- Design System Source: Provided by client (April 1, 2026)
- Tailwind CSS: https://tailwindcss.com
- Next.js: https://nextjs.org
- Radix UI: https://www.radix-ui.com

---

## Contact

For questions about the Product School design system implementation, refer to:
1. This document (PRODUCT_SCHOOL_DESIGN_IMPLEMENTATION.md)
2. `app/globals.css` for color definitions
3. `tailwind.config.ts` for Tailwind extensions
4. Individual component files in `components/ui/`

---

**Implementation completed:** April 1, 2026
**All components verified:** ✅
**Production ready:** ✅
