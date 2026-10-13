# NeuroAIQ website rebuild

The rebuilt marketing website for **NeuroAIQ Pty Ltd** (neuroaiq.com.au), a Melbourne AI-adoption advisory. Built by **Team B58** for the CSE3CAP Capstone at La Trobe University, Semester 2 2026, from the client-reviewed Prototype V3.

> **Confidential.** This repository is covered by the NeuroAIQ Confidentiality and IP Deed signed by Team B58. Keep it private.

| | |
|---|---|
| **What it is** | A static, multi-page, responsive website: nine pages plus privacy and 404 |
| **Stack** | Plain HTML, CSS and JavaScript. No framework, no build step, no runtime dependencies |
| **Status** | Review build at <https://grand-dodol-927468.netlify.app>. Not live. Search engines are blocked (`noindex` and `robots.txt`) |
| **Design source** | Prototype V3, the latest version on 13 October 2026. A further iteration is in progress; see *Porting a newer prototype* |
| **Tests** | 32 Playwright tests × 2 devices (desktop, phone), including axe accessibility checks |
| **Docs** | System Maintenance Document and User Documentation in [`docs/`](docs/) |

## Quick start

You need **Node.js 18 or later** for the preview server and tests. The site itself needs nothing.

```bash
git clone <this repo>
cd neuroaiq-website
npm install                 # test tools only
npm start                   # http://localhost:4173
```

Or open `src/index.html` straight in a browser. Every link is relative, so it works from disk.

## Run the tests

```bash
npx playwright install chromium   # first time only
npm test
npm run test:report               # opens the HTML report
```

To use a Chromium that's already installed, set `PW_CHROMIUM_PATH` to its executable first.

What the suite checks, on a 1280px desktop and a Pixel 7 phone:

- **Every page:** loads, has one `<h1>`, a title and a description, every image loads and has alt text, nothing scrolls sideways, no em dashes in the copy, and no console errors.
- **Accessibility:** no serious or critical WCAG 2 A/AA violations (axe-core).
- **Links:** every internal link and `#anchor` resolves.
- **Navigation:** the mobile menu opens, closes on Escape, and shows the current page.
- **Insights filters:** filtering by business priority and by role, the empty state, and the reset.
- **Events tabs:** mouse and arrow-key navigation.
- **Enquiry form:** required fields, email and phone validation, the confirmation, and the spam honeypot.
- **Booking:** the full flow (person, date, time, details, confirmation); weekends and past dates are blocked.
- **Indexing:** the review build can't be indexed.

GitHub Actions runs the suite on every push and pull request (`.github/workflows/test.yml`).

**Lighthouse (12.2.1, 13 October 2026, local server):**

| Page | Device | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|---|
| Home | Mobile | 97 | 100 | 100 | 66* | 2.4 s | 0 |
| Home | Desktop | 100 | 100 | 100 | 66* | 0.5 s | 0 |
| Contact | Mobile | 97 | 100 | 100 | 66* | 2.4 s | 0 |
| Contact | Desktop | 100 | 100 | 100 | 66* | 0.5 s | 0 |

\*SEO is capped only by the deliberate `noindex` on the review build. Every other SEO audit passes. Rerun after launch.

## Project structure

```
src/                  the website (deploy this folder)
  *.html              one file per page
  css/site.css        tokens, base, header, footer, every interactive component
  css/pages.css       page layouts, generated from the prototype (see below)
  js/main.js          menu, filters, tabs, form validation, booking (no dependencies)
  assets/img/         images, converted to WebP and capped at 1600px wide
  assets/fonts/       Plus Jakarta Sans, self-hosted (SIL OFL 1.1)
  _headers            security headers for Netlify / Cloudflare Pages
  robots.txt, sitemap.xml, llms.txt
partials/             shared layout, header and footer, plus hand-written pages
tools/                the one-off converter from Prototype V3 (see below)
tests/                Playwright suite and a zero-dependency static server
docs/                 handover documents
```

## How the site was built

Prototype V3 was a single HTML design canvas: nine fixed 1240px frames side by side, about 1,265 inline styles, and drawn controls rather than real ones. The client reviewed it on 22 September 2026 as "a strong foundation".

`tools/convert.py` turned it into this site in one pass:

1. **Split the frames** into nine pages with real URLs, and replaced each frame's header and footer with one shared, accessible version (`partials/`).
2. **Moved inline styles into classes.** Each distinct style became one class in `pages.css` (454 classes), with tablet (≤960px) and phone (≤600px) overrides derived from it. Multi-column grids stack, large type scales down, and wide padding narrows.
3. **Removed design annotations and placeholders**, such as "to be supplied" notes, skeleton text bars, hatched image boxes and empty client-logo slots.
4. **Applied the copy fixes** flagged in the handover. Every change is listed in `CHANGELOG.md` for client approval.
5. **Wired up the interactive parts** (`tools/wire.py`). Drawn drop-downs became real `<select>`s, filter chips and tabs became buttons with ARIA state, and the static calendar became a working booking widget.

The converter needs the prototype export (`tools/extract.json` and `tools/raw-assets/`, both git-ignored because they hold the full confidential prototype).

### Porting a newer prototype

No page has been edited by hand since conversion: every fix lives in `tools/wire.py`, `partials/`, `src/css/site.css` and `src/js/main.js`. A newer prototype from the same design tool can be ported by re-running the pipeline:

```bash
pip install -r tools/requirements.txt
python tools/extract.py "NeuroAIQ Prototype V4 (standalone).html"
python tools/convert.py
npm test
git diff --stat
```

The wiring finds elements by their visible text. If a heading is reworded, update `wire.py`, and a failing test will tell you where. **Once anyone edits a page in `src/` by hand, stop using the converter** and port changes manually.

> **Known trade-off:** `pages.css` uses generated class names (`.s1` to `.s454`). They are faithful to the approved design but not semantic. Refactoring them into named components is the first item under Future work.

## Configuration

| Setting | Where | Notes |
|---|---|---|
| Form destination | `data-endpoint` on `#enquiry-form` (contact.html) | Empty means review mode: validates and confirms, sends nothing. Set it to a handler URL and the form POSTs JSON there. |
| Booking | `[data-booking]` in contact.html, `main.js` | Review mode generates sample weekday availability. At launch, replace it with the scheduling tool's embed, or a link. |
| Indexing | `<meta name="robots">` in `partials/layout.html`, `src/robots.txt`, `X-Robots-Tag` in `_headers` | All three block indexing in the review build. **Remove all three at launch.** |
| Security headers | `src/_headers` | Strict CSP: only same-origin. Add HubSpot, Tag Manager and Turnstile domains as they're added. |
| Structured data | `JSONLD` in `tools/convert.py`, in the `<head>` of index.html | Organisation, founder and solutions, from client-confirmed facts. |

## Deploy

**Review link (fastest):** drag the `src` folder onto <https://app.netlify.com/drop>. Netlify reads `_headers` automatically.

**Production (recommended in the Website Security Plan):** Cloudflare Pages connected to this repo.

1. Build command: none. Output directory: `src`.
2. Point DNS at Cloudflare and switch on DNSSEC.
3. Add the form handler (a Cloudflare Pages Function posting to HubSpot and/or Microsoft 365) and set `data-endpoint`.
4. Add Turnstile to the form, and its domain to the CSP.

### Launch checklist

- [ ] Remove the three `noindex` controls (see Configuration) and replace `robots.txt` with the crawler policy from the SEO strategy
- [ ] Form connected; a real test enquiry arrives
- [ ] Booking connected, or replaced with a link
- [ ] Client has approved every entry in `CHANGELOG.md` → *Copy changes*
- [ ] Footer note "Review build by Team B58" removed from `partials/footer.html`
- [ ] Privacy page approved by NeuroAIQ (it's marked as a draft)
- [ ] 301 redirects from every old WordPress URL
- [ ] SSL Labs **A** and securityheaders.com **A**
- [ ] `npm test` passes; Lighthouse mobile run and saved

## Licences and third-party material

| Item | Licence |
|---|---|
| Site code (HTML, CSS, JS, tools, tests) | © NeuroAIQ Pty Ltd under the project's IP deed. All rights reserved. See `LICENSE`. |
| Copy, logo, event and team photos | NeuroAIQ's own material |
| Plus Jakarta Sans | SIL Open Font Licence 1.1 (`src/assets/fonts/OFL.txt`) |
| Stock photos | Unsplash Licence and Pixabay Content Licence (commercial use, no attribution required) |
| Playwright, axe-core (dev only) | Apache 2.0, MPL 2.0 |

## Future work

1. **Refactor `pages.css`** generated classes into named components (section, eyebrow, card, stat), page by page.
2. **Connect the form and booking** (see Deploy).
3. **Add the remaining articles.** Only one is published; the rest show "Article coming soon".
4. **Decide on the self-check and the Adaptability Accelerator™.** Both are waiting on NeuroAIQ.
5. **Add a Lighthouse CI budget** once the site is on its real domain.

## Team

Team B58, CSE3CAP 2026: Ahmad Zawi (lead, client liaison), Rubayet Mohammad Abdullah (UX/UI), Mahmoud Shuqwara (development, SEO/AEO, handover docs), Saif Qasem (security, SEO/AEO), Matthew Axiotis (security, documentation).

Client: Dr Mahtab Ameri, Founder, NeuroAIQ.
