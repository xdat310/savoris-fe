---
name: Savoris
description: A modern Vietnamese restaurant house in warm cream and deep navy, for the guest site and the staff app.
colors:
  navy: "#232c4f"
  navy-deep: "#181f3a"
  navy-raised: "#2f3a66"
  navy-line: "rgba(244, 242, 239, 0.18)"
  on-navy: "#f4f2ef"
  on-navy-dim: "rgba(244, 242, 239, 0.76)"
  ground: "#f4f2ef"
  sand: "#e8e1d5"
  paper: "#fbfaf7"
  ink: "#1b2036"
  ink-soft: "#4a5068"
  ink-faint: "#6d7184"
  rule: "#ddd6ca"
  rule-strong: "#c3baab"
  accent: "#2347a6"
  accent-deep: "#1a3784"
  accent-wash: "#e3e9f7"
  amber-ink: "#7a5208"
  amber-wash: "#f7ecd6"
  red: "#c2414b"
  red-ink: "#93212b"
  red-wash: "#f6e1e2"
  red-on-navy: "#ffa3ab"
  blue-ink: "#1f4a8f"
  blue-wash: "#e3ebf8"
  green: "#6fb08a"
  green-ink: "#22663f"
  green-wash: "#e1efe5"
typography:
  display:
    fontFamily: "Noto Serif Display Variable, Noto Serif, Georgia, serif"
    fontSize: "clamp(56px, 7.4vw, 112px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 68"
  headline-lg:
    fontFamily: "Noto Serif Display Variable, Noto Serif, Georgia, serif"
    fontSize: "88px"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "Noto Serif Display Variable, Noto Serif, Georgia, serif"
    fontSize: "52px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 68"
  figure-lg:
    fontFamily: "Noto Serif Display Variable, Noto Serif, Georgia, serif"
    fontSize: "60px"
    fontWeight: 400
    lineHeight: 1
    fontVariation: "'wdth' 68"
  figure:
    fontFamily: "Noto Serif Display Variable, Noto Serif, Georgia, serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 0.95
    fontVariation: "'wdth' 68"
  title:
    fontFamily: "Noto Serif Display Variable, Noto Serif, Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.1
    fontVariation: "'wdth' 68"
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-strong:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.08em"
  wordmark:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    letterSpacing: "0.32em"
  oval-caps:
    fontFamily: "Noto Serif Display Variable, Noto Serif, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 68"
rounded:
  sm: "4px"
  md: "6px"
  pill: "999px"
  oval: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
  xl: "36px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.navy-deep}"
  button-primary-lg:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "56px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "42px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "42px"
  button-accent-hover:
    backgroundColor: "{colors.accent-deep}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.pill}"
    height: "42px"
  button-oval:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    typography: "{typography.oval-caps}"
    rounded: "{rounded.oval}"
    padding: "8px 22px"
    height: "64px"
    width: "112px"
  button-oval-hover:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "42px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "20px 22px"
  menu-board:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px 24px 22px"
  rail-link-active:
    backgroundColor: "{colors.on-navy}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "11px 12px"
  table-tile:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "104px"
  table-tile-occupied:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
  state-ok:
    backgroundColor: "{colors.green-wash}"
    textColor: "{colors.green-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  state-warn:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  state-bad:
    backgroundColor: "{colors.red-wash}"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  counter-digit:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    typography: "{typography.figure}"
    rounded: "0"
    width: "32px"
    height: "44px"
---

# Design System: Savoris

## Overview

**Creative North Star: "The House on Cream and Navy"**

Savoris is dressed as a modern Vietnamese restaurant house: a warm cream ground, deep navy for everything that frames the room (the staff rail, the guest band, the kitchen display, occupied tables, full-colour blocks), and one royal blue that says "act here". The brand is carried by two things only: large, narrow condensed serif type and food photography. Everything else (labels, sentences, form text, staff buttons) is a quiet grotesk. The visual style was taken from a user-pinned restaurant website (pizza4ps.com/vn) as a reference for palette, type, composition and buttons only; none of its identity is used.

The system runs in two modes. The guest home persuades: a full-bleed food photo, a stacked giant serif list of the ways to eat, a royal-blue panel counting open branches in boxed digits, a royal-blue/sand split (branch list beside a dish photo), and a photo-led menu grid. The guest ordering pages and the whole staff app under /nha-hang operate: dense, flat work surfaces with hairline rules (cream on the guest pages; on the staff side the user asked for a brighter house, so /nha-hang runs on pure white: white ground, white panels, a white rail with navy text, and navy kept only for action: the active link, the primary button, occupied tables and the next kitchen ticket), serif for the numbers the eye must find first (table numbers, prices, totals, change, quantities, codes) and large touch targets. The kitchen display follows the staff side: white ground, ink type, and the next ticket in each column filled navy (blue while cooking) so the one dish to act on is the only dark object in the room.

The world replaces an earlier chalkboard skin (board green, chalk colours, handwritten face) and refuses the grey SaaS POS. Surfaces are flat; depth comes from tone and hairlines, not shadow.

**Key Characteristics:**
- Cream ground, sand panels, paper cards; deep navy frames the room and fills the blocks.
- One royal-blue accent for links, focus, selection, the guest's forward action and live counters.
- Condensed serif (Noto Serif Display, width 68%) for headings and figures; Be Vietnam Pro for every word of UI.
- Pill controls for staff, hairline ovals with serif capitals for guest calls to action.
- The boxed-digit counter for live numbers; a clean drawn rule strikes through what is gone.
- Status is always a word plus an icon, never colour alone.

## Colors

A warm two-pole palette: cream and navy do almost all the work, royal blue is rare, and status hues appear only as wash-and-ink pairs.

### Primary
- **Deep Navy** (navy): the frame. Staff rail, guest header band, occupied table tiles, the staff primary button, active tab underline, serif headings and figures on light grounds, the navy half of the home split, the mobile bottom bar.
- **Night Navy** (navy-deep): the kitchen room's ground, hover of navy buttons, digit boxes on the blue home panel, photo-shade tint.
- **Raised Navy** (navy-raised): digit boxes on the kitchen display, where navy alone would vanish.
- **Navy Hairline** (navy-line): every rule and outline drawn on navy (rail dividers, kitchen columns, ghost buttons on navy).

### Secondary
- **Royal Blue** (accent): the one accent. Links, focus outline, text selection, the 3px selection ring on tiles and tickets, the guest's sticky cart and checkout button, the first kitchen ticket's action, the current tracking step, the home's open-branches panel and branch-list block, quick-login usernames.
- **Deep Royal** (accent-deep): hover of blue fills.
- **Royal Wash** (accent-wash): a web takeaway ticket waiting for the cashier.

### Tertiary
- **Green ink on green wash** (green-ink / green-wash): normal load, done, discounts in the money proof.
- **Amber ink on amber wash** (amber-ink / amber-wash): busy, waiting for payment, cash-at-counter notice.
- **Red ink on red wash** (red-ink / red-wash): overloaded, errors, danger buttons, short change.
- **Blue ink on blue wash** (blue-ink / blue-wash): informational notes, the web-guest banner.
- **Raw red, raw green, light red on navy** (red / green / red-on-navy): only as meter fills, the strike line, and late or overloaded marks on the navy kitchen.

### Neutral
- **Cream Ground** (ground): page background everywhere outside navy; the money-proof band.
- **Sand** (sand): the menu board panel, the sand half of the home split, the photo-less dish tile, neutral state chip, meter tracks.
- **Paper** (paper): cards, panels, inputs, table tiles, the POS order column.
- **Ink / Soft Ink / Faint Ink** (ink, ink-soft, ink-faint): body text, secondary text, meta and placeholders.
- **Rule / Strong Rule** (rule, rule-strong): hairlines between rows and around panels; strong rule for input borders and the line above a total.
- **Cream on Navy** (on-navy, on-navy-dim): text on navy, full and secondary.

### Named Rules
**The One Blue Rule.** Royal blue means "act here" or "you are here": links, focus, selection, live counters and the single forward action of a guest page. It is never decoration and never a heading colour. One exception, asked for by the user: the guest home's branch list sits on a full royal-blue block (white type, white hairlines, white ovals) so the branches read brighter than the navy frame; no other content block takes a blue ground.

**The Navy Frames the Room Rule.** Navy holds navigation, the guest band, the kitchen display and full-colour blocks. Work happens on cream, sand and paper; the kitchen's own controls are the only working surface on navy.

**The Wash and Ink Rule.** On light surfaces a status hue appears as its wash behind its ink, with a word and an icon. Raw status hues are for meters, strikes and marks on navy only.

## Typography

**Display Font:** Noto Serif Display Variable at font-stretch 68% (with Noto Serif, Georgia)
**Body Font:** Be Vietnam Pro 400 to 700 (with system-ui)

**Character:** A tall, narrow, high-contrast serif carries the house's voice and its numbers; a plain Vietnamese grotesk carries everything that must simply be read. The contrast between them is the brand.

### Hierarchy
- **Display** (400, clamp(56px, 7.4vw, 112px), 0.98): the home hero's stacked list of ways to eat; 52px on phones.
- **Headline large** (400, 88px, 0.9): home section titles; guest page titles at 72px, split titles at 64px.
- **Headline** (400, 52px, 1): staff page heads, login heading (56px); 40px on phones.
- **Figure large** (400, 60px): change due, kitchen quantities; owner totals 56px; order total 42 to 44px.
- **Figure** (400, 40px, 0.95): table numbers, menu board title, photo-less dish names; branch codes 28 to 32px.
- **Title** (400, 26px, 1.1): panel heads, menu prices, empty-state headings.
- **Body** (400, 15px, 1.5): all UI text; 14px in tables; intro copy capped at 56ch.
- **Body strong** (500 to 600, 16px): dish names, line items, branch names.
- **Label** (600, 12px, 0.06 to 0.1em, uppercase): menu categories, floor areas, kitchen column names, table headers, total labels, payment legend.
- **Wordmark** (500, 15 to 20px, 0.32em, uppercase): "SAVORIS" in the rail, site header and footer. Text only; no logo exists.

### Named Rules
**The Serif Speaks Rule.** The condensed serif writes headings, prices, table numbers, totals, change, quantities, codes, counts and clocks. Sentences, labels, form text, dish names in lists and staff buttons are always Be Vietnam Pro. The guest oval is the one control set in serif capitals.

**The Label Names a Group Rule.** Uppercase small labels name a group of data (a category, an area, a column, a field). They never float above a headline as a decorative eyebrow.

**The Tabular Money Rule.** Grotesk amounts use tabular numerals and sit right-aligned; VND, no decimals; every total shows its proof (subtotal, discount, points, VAT).

## Layout

Staff app: a 240px navy rail beside a cream work area (page padding 32px 36px, max 1440px). POS is a two-column grid: floor and menu on the left, a 400px paper order column on the right with the money proof and actions pinned at its foot. Kitchen is three equal columns separated by navy hairlines. On tablets (901 to 1100px) the rail collapses to 96px of icons with small labels and the order column narrows to 360px; at 900px and below the rail becomes a top bar with a horizontally scrolling nav and everything stacks to one column.

Guest pages: a full-width navy band (optionally over a 45%-opacity food photo) with content held to a 680px phone column; sticky category tabs; a fixed bottom bar for the cart action. The home page is full-bleed: a 100vh photo hero (88vh on phones), a centred intro, a 50/50 navy and sand split, a 1240px menu grid of 260px-minimum cards with 4:3 photos, and a footer under a navy rule. On phones a fixed three-action navy bar replaces the header nav.

Rhythm runs in small steps (6, 10, 14, 22px) inside components and opens to 36px page padding and 96px home sections (64px on phones). Breakpoints: 600, 700, 900, 1100px.

## Elevation & Depth

Flat by default. Depth is tonal (navy, cream, sand, paper) and drawn with 1px hairlines; panels and tiles carry no shadow at rest.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 2px 6px rgba(27, 32, 54, 0.08), 0 16px 36px rgba(27, 32, 54, 0.14)`): only for layers that float over content: toasts and the guest's sticky cart button.
- **Selection ring** (`box-shadow: 0 0 0 3px #2347a6`): the picked table tile or ticket, with a 2px rise; unpicked tiles dim to 0.78.

### Named Rules
**The Hairline, Not Shadow Rule.** Separate with a 1px rule or a change of ground. Shadow is reserved for floating layers; selection is a blue ring, never a shadow.

## Shapes

Controls are pills (999px): buttons, segmented toggles, rail links, state chips, icon buttons, kitchen chips. Surfaces take gently squared corners: 6px for panels, tiles, tickets and cards, 4px for inputs, notices, toasts and the login quick-role cards. The guest call to action is a true ellipse (50% radius) drawn in a hairline. Photos and the boxed counter digits are square-cornered. Bottom sheets round only their top corners. QR cards use a dashed strong-rule border, the cut line of a printed sheet.

## Components

### Buttons
Quiet outlines with one filled action per screen.
- **Shape:** pill (999px), 42px tall; small 34px; large 56px.
- **Primary:** navy fill, cream text, 600 weight, 0 18px; hover night navy. The one primary action of a staff screen (collect cash, log in).
- **Hover / Focus:** outlines take a 6% navy tint; press drops 1px; focus is a 2px royal outline offset 2px.
- **Accent:** royal fill, white text; the guest's forward action (cart, checkout) and the first kitchen ticket's step. Hover deep royal.
- **Outline (default):** transparent with a navy hairline and navy text.
- **Danger:** transparent, red ink text, pale red outline; hover red wash.
- **Ghost:** no outline; on navy, a navy-hairline outline with cream text.
- **Oval (guest):** a hairline ellipse, minimum 112 by 64px, serif capitals at 15px with 0.06em tracking, inheriting colour; hover fills navy with cream text. Used only on guest pages (home split, branch lists).
- **Disabled:** 40% opacity, not-allowed cursor.

### Chips
- **Style:** pill, 13px 600, wash background with ink text, a 14px icon plus a word (Bình thường, Bận, Quá tải; Chờ bếp, Đang nấu).
- **State:** on the navy kitchen, an outlined pill in the state's light hue; sold-out toggles are navy-hairline pills whose name dims and takes the strike when pressed.

### Cards / Containers
- **Corner Style:** 6px.
- **Background:** paper on cream; sand for the menu board; navy for kitchen tickets.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** 1px rule; navy hairline for the seat card; royal blue for the takeaway card.
- **Internal Padding:** 20px 22px, with a 16px 22px head over a rule.

### Inputs / Fields
- **Style:** paper fill, strong-rule hairline, 4px radius, 42px tall; label above in 13px 500 soft ink.
- **Focus:** border turns royal blue with a 2px 35% royal outline; caret royal blue.
- **Payment choice:** a paper row with a radio; selected takes a doubled navy hairline; unavailable fades to 50%.

### Navigation
- **Staff rail:** navy, spaced-capital wordmark, branch box with the branch name in serif, pill links in dim cream; hover an 8% cream tint; active is a cream pill with navy text and a royal icon. Tablet: icon column; phone: top bar.
- **Tabs:** grotesk 500 in faint ink over a rule; selected navy 600 with a 2px navy underline.
- **Guest site:** white spaced wordmark and uppercase links over the hero photo; on phones a fixed navy three-action bar with hairline dividers.

### Table Tiles and Tickets
Paper tiles with a serif table number (40px; 28px compact) and grotesk meta. Occupied tiles turn solid navy with cream type. Selected takes the royal ring and rises 2px while the rest dim. Kitchen tickets are navy cards; the oldest per column turns cream with a royal quantity and the only filled action; late tickets take a light-red border and a bold red wait time with a warning icon.

### The Menu Board
A sand panel titled in serif, uppercase category labels over a strong rule, dish rows in grotesk with serif prices and a plus mark; hover turns the name royal. Sold-out rows fade to faint ink, take the strike and a red uppercase "hết" tag. On the guest home, dishes become photo cards (4:3, slow 1.04 zoom on hover); a dish without a photo shows its name set in serif on sand.

### The Counter (signature)
Live numbers (open branches, the order total, a takeaway order code, kitchen column counts) are written one digit per box: square-cornered navy boxes (sm 24x34, md 32x44, lg 44x62) with cream condensed serif digits; separators sit loose between the boxes. Inverted to cream boxes on the navy guest band, night navy on the blue home panel, raised navy in the kitchen, and an empty hairline box for zero. It always carries an accessible label.

### The Strike (signature)
A clean straight rule (2px, butt caps) drawn across a sold-out or cancelled dish, left to right in 360ms with the house easing, and wiped back out when restored; instant under reduced motion. Red on light surfaces, light red on navy. The item stays visible.

### Motion
One easing (cubic-bezier(0.16, 1, 0.3, 1)). Press 120ms, hover and state 160 to 240ms, toast and sheet 260ms, kitchen ticket arrival 320ms, strike 360ms, meters 600ms, the hero photo settles from 1.12 to 1.04 over 2.4s. Reduced motion removes the hero, sheet and strike animations.

## Do's and Don'ts

### Do:
- **Do** give each staff screen one solid navy pill as its primary action; other actions are outlines.
- **Do** write figures in the condensed serif at width 68%: table numbers, prices, totals, change, quantities, codes, clocks.
- **Do** use the boxed-digit counter for live numbers and give it an accessible label.
- **Do** strike sold-out or cancelled items with the drawn rule and keep them visible.
- **Do** pair every status with a word and an icon, on its wash with its ink.
- **Do** separate with 1px hairlines and changes of ground; keep panels flat.
- **Do** lead the guest home with food photography and let serif type sit directly on it under a navy shade.
- **Do** keep touch targets at 42px or more, 52 to 56px on POS and kitchen actions.

### Don't:
- **Don't** introduce a second accent hue; royal blue is the only one.
- **Don't** convey status by colour alone.
- **Don't** set sentences, labels, form text or staff buttons in the serif.
- **Don't** place uppercase labels above headlines as decorative eyebrows.
- **Don't** use shadows on resting cards or for selection.
- **Don't** use oval buttons in the staff app; they belong to guest pages.
- **Don't** round photos or counter digit boxes.
- **Don't** bring back the chalkboard skin (board green, chalk colours, a handwritten face) or drift toward a grey SaaS POS.
- **Don't** use the reference site's logo, name, photos or copy; no Savoris logo or tagline exists, so the wordmark stays text.
