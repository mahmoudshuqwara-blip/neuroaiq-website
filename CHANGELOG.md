# Changelog

## 1.0.0, 13 October 2026: handover build

First multi-page build from Prototype V3.

### Added
- Nine pages with real URLs, plus a draft privacy statement and a 404 page.
- Responsive layouts at three widths (desktop, ≤960px, ≤600px), and a mobile menu.
- A working enquiry form: real controls, required fields, email and phone validation, accessible error messages, a confirmation, and a spam honeypot. Review mode sends nothing.
- A working booking flow: choose a person, date and time, add your details, then confirm. Review mode books nothing.
- Executive Insights filters by business priority and leadership role, with an empty state.
- Events tabs (Past, Current, Upcoming) following the WAI-ARIA tabs pattern.
- Structured data (organisation, founder, solutions), `sitemap.xml`, a hand-written `llms.txt` and security headers.
- Self-hosted fonts. Images converted to WebP and resized.
- 32 Playwright tests on desktop and phone, axe accessibility checks, and a GitHub Actions workflow.

### Removed from the prototype
- Design annotations ("week 1 activities, to be supplied", "question count … to be determined", "Optional section …", "further case studies, awaiting approval").
- Skeleton text bars and hatched image placeholders.
- The client-logo strip. Logos are shown only with permission.
- The empty week-by-week DRIVE™ cards. The client hasn't supplied the breakdown yet.
- The case-study filter bar, which isn't useful with one case study.

### Copy changes: **need client approval before launch**
| Where | Prototype | This build | Why |
|---|---|---|---|
| Home, hero | "We deliver the missing bridge between innovation and human adaptability…" | "We help organisations get greater value from the AI they have already paid for…" | The client's own positioning (22 Sep); avoids change-management language |
| About, team intro | "technology-enabled transformation practice" | "technology-enabled delivery practice" | Same |
| Solutions, Advisory (×2) | "AI and transformation initiatives" | "AI and technology initiatives" | Same |
| Insights filter, contact form | "Leading workforce transformation" | "Leading workforce capability" | Same |
| Case study, partnerships | Em dashes | Colon or comma | The client flagged em dashes as reading machine-written |
| Insights card | "rollout AI" | "roll out AI" | Grammar (verb) |
| Insights cards (all but one) | "Read the article →" | "Article coming soon" | Only one article exists |

Unchanged on purpose: the tagline "Where Adaptability Is the New Intelligence", the product name "DRIVE™ Adaptability Diagnostic", and the founder's biography, which are the client's own words.

### Fixed during testing
- **The form stayed visible after a successful send.** `.enquiry{display:grid}` overrode the `hidden` attribute. Fixed with a global `[hidden]{display:none!important}`.
- **Bad phone numbers were accepted.** The `pattern` attribute is compiled with the regex `v` flag in current Chrome, where `(`, `)`, `+` and `-` must be escaped inside a character class. The unescaped pattern was invalid, so Chrome silently ignored it.
- The person cards on the booking panel were converted at the wrong level, which broke the panel's grid. They now select the whole card.
- Annotation removal once deleted a parent element in the same loop it was iterating over. The loop now re-queries after each removal.
