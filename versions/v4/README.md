# NeuroAIQ website: V4 build

This is the working website built from `NeuroAIQ Prototype V4.dc.html`: all nine prototype pages, plus a page for each of the 12 Executive Insights articles. It is plain HTML, CSS and JavaScript with no framework and no npm. It runs on any static host, and you can open it straight from disk.

```
V4 build out/
├── build.py          rebuilds every .html file in site/ from src/
├── src/
│   ├── pages/        one file per page (Home, About, Solutions, …)
│   ├── articles/     one file per Executive Insights article
│   ├── partials/     header and the two footers
│   └── templates/    page layout and article layout
└── site/             the website itself: upload this folder
    ├── *.html, insights/*.html     generated, so don't edit them directly
    ├── assets/css/site.css         every style, edited in place
    ├── assets/js/site.js           every behaviour, edited in place
    ├── assets/img/                 logo, article and event images
    ├── sitemap.xml, robots.txt     generated
```

## View it

Open `site/index.html` in a browser. To test it the way a host serves it, run a local server instead:

```bash
python3 -m http.server 8000 --directory "site"
```

Then go to http://localhost:8000.

## Edit it

Change the files in `src/` (copy, sections, articles) or `site/assets/` (styles, scripts, images), then rebuild:

```bash
python3 build.py
```

The build needs only Python 3.8 or later. It stops on any unknown `{{placeholder}}`, so a typo can't ship silently.

- **To add an article**, copy a file in `src/articles/`, change its `<!--meta … -->` block, put the image in `site/assets/img/insights/<same-name>.jpg`, and add the file name to `ARTICLE_ORDER` in `build.py`.
- **Navigation** lives in `src/partials/header.html`. Footers are `footer-full.html` (Home) and `footer-compact.html` (every other page).
- **Styles** are in one file, `site/assets/css/site.css`, with a contents list at the top. Page markup uses its classes only, with no inline styles, so a design change happens in one place.

## Motion

The V4 notes allow three movements, and the site uses only those:

| Movement | What it looks like | Where |
|---|---|---|
| **Draw** | A line extends from left to right, or top to bottom | The Pathway on every page, section rules, list rows, the LEAD brackets, the DRIVE Discovery and Full Diagnostic bars (each sweeps across exactly the stages it covers), quote rules |
| **Light** | A node fills or pops in | Pathway nodes, the four-node eyebrow (it fills up to the visitor's stage: Recognise, Understand, Believe, Act), the short marks on inner pages, the closing pathway's gold node |
| **Settle** | Text rises 18px into place | Headings, paragraphs and cards; photographs come up slowly from slightly larger |

How it behaves:

- **It plays in causal order.** On every Pathway, each line arrives exactly as the next node lights. The LEAD brackets and closing line are timed from the moment the chain starts drawing, so the sequence holds however fast someone scrolls.
- **It runs once per element**, as each element enters the screen. Elements that arrive together play in reading order (top to bottom, then left to right).
- **Page load:** each page's opening heading, text and hero photograph play as one sequence.
- **Responses to the visitor:** navigation and text-link underlines draw on hover, arrows nudge, card photographs zoom slightly, the Events tab underline slides between tabs, filtered cards and calendar times settle in, and articles show a gold reading-progress line under the header.
- **It never hides content.** Motion switches off completely for visitors who ask their device to reduce motion, for anyone without JavaScript, and if the script fails to load (a 2.5-second safety net). Printed pages show everything.
- **Where to change it:** timings are in section 13 of `site.css`; the reveal logic is section 1 of `site.js`. In markup, add `rv` to any element to make it settle, `data-d="300"` to delay it 300ms on page load, or `data-after=".selector"` to time it from another element's reveal.

## Settings to confirm before launch

These are at the top of `build.py`, in `CONFIG`. Rebuild after changing any of them.

| Setting | Now | What happens |
|---|---|---|
| `form_endpoint` | empty | The enquiry form opens the visitor's own email app with the enquiry filled in, addressed to info@neuroaiq.com.au. Set a URL that accepts a JSON POST (HubSpot Forms, Formspree or our own back end) and the form sends directly, with a success or failure message on the page. |
| `calendly_url` | empty | Contact shows a **preferred-time picker**. A visitor picks a weekday and a 30-minute slot (Melbourne time), and the choice drops into the enquiry form; nothing is booked until NeuroAIQ confirms by email. Set the Calendly event link and the picker is replaced by Calendly's own booking widget. |
| `scorecard_url` | empty | The DRIVE Scorecard tool doesn't exist yet, so its button reads **"Register for the DRIVE Scorecard"** and opens the enquiry form with "DRIVE Scorecard" preselected. Set the tool's URL and the button becomes "Take the DRIVE Scorecard" and links there. |
| `show_sample_cases` | `False` | Hides V4's illustrative case snapshots (Advisory, Accelerator) and the three sample case-study cards. Their figures are invented, so they stay off on a public site. Set `True` only for an internal review copy. |
| `noindex` | `False` | Set `True` for a staging copy, so search engines don't index it alongside the live site. |
| `site_url` | neuroaiq.com.au | Used for canonical links, share previews, the sitemap and structured data. |

## Where the build differs from the prototype, and why

1. **Articles carry the full live text.** The prototype shows one short sample article. All 12 articles now have their own page, with the text copied unchanged from neuroaiq.com.au (13 October 2026) and the live site's sharper 1000px images. Training is the one exception: it uses the working-session photo, as V4 specifies.
2. **Real evidence replaces an invented snapshot.** V4's Workforce Readiness section had a made-up "regional health provider" snapshot. It now shows the **published Sunway University pilot results** from the live Workforce Readiness page (100%, 100%, 9.3/10), with the source line. That also makes the Partnerships page's "outcomes are published on the Workforce Readiness page" true, and both it and Case Studies now link to those results.
3. **DRIVE's five stages are named.** The prototype had grey placeholder bars. The names come from the live DRIVE page: Discover, Reveal, Intelligence, Value, Execution.
4. **Case Studies appears in the main navigation on every page.** In V4 it appeared only on the Case Studies page itself.
5. **Placeholder UI became working UI.** Filters, Events tabs, the booking picker and the enquiry form all work. The empty Current and Upcoming tabs show an empty state that points to LinkedIn, and the picker shows no fake "unavailable" slots.
6. **Design-only notes were removed.** The Contact page's "Optional section" note is gone. The "to be confirmed" tags stay, because they mark copy the client still needs to approve.
7. **Contrast fixes for accessibility.** The tinted second line on Home is now `#6E98BF` (3:1 for large text), the "Misses" labels are `#66727F` (4.5:1), and the "Leadership" eyebrow on navy is light blue instead of dark blue.
8. **A 404 page** for old WordPress links that miss a redirect. It offers the four main routes and is kept out of the sitemap and search results.
9. **Small additions.** ™ appears on first mention of LEAD™, DRIVE™ and Adaptability Accelerator™. The partner call to action reads "Start a partnership conversation" and opens the form with Partnerships preselected, which keeps it separate from buyer booking, as the V4 notes intended. Case Studies ends with a pilot-results link and a booking band.

## Content still to confirm with NeuroAIQ

Each of these shows a dashed "to be confirmed" tag on the page:

- Founder portrait (About)
- Further advisory roles (About)
- Engagement steps and deliverables for Advisory, Workforce Readiness and Adaptability Accelerator (Solutions)
- The post-Scorecard steps (Home)
- Sunway partnership wording (Partnerships)
- Event gallery captions (Events). These were written from what each photo shows.

Not tagged, but needs a check:

- **Article tags.** Each article's "leadership responsibility" (Leading the business / AI adoption and operations / workforce transformation) is the team's proposed mapping; V4 tagged only one article.
- **Copy issues on the live site, kept unchanged here:**
  - "rollout" is used as a verb ("to rollout AI"); the verb is "roll out".
  - *Why leadership decisions shape AI outcomes…* calls LEAD's D "Delivery & Adoption" and lists four elements. Everywhere else it is "Direction of Adoption", with Business Value as a fifth stage.

## At launch: redirects from the old WordPress addresses

Set up 301 redirects so existing links and search rankings carry over:

| Old address | New page |
|---|---|
| `/about/` | `/about.html` |
| `/about/contact-us/` | `/contact.html` |
| `/solutions/`, `/solutions/advisory-support/` | `/solutions.html` (`#advisory`) |
| `/solutions/drive-adaptability-diagnostic-program/`, `/drive-adaptability-diagnostic-program/` | `/solutions.html#drive` |
| `/solutions/workforce-readiness/` | `/solutions.html#workforce` |
| `/executive-insights/` | `/insights.html` |
| `/<article-slug>/` (all 12) | `/insights/<article-slug>.html` (same slugs) |
| `/events-2/`, `/events-2/past-events/`, `/events-2/upcoming-events/` | `/events.html` (`#upcoming`) |
| `/partnerships-collaborations/` | `/partnerships.html` |
| `/welcome-to-neuroa/` | `/` |

## Images

- **Logo:** `Proposals/source/img/mark.png`.
- **Article images:** the client's own, from the live site.
- **Event photos:** NeuroAIQ's own LinkedIn posts.
- **Everything else:** Unsplash, under its free licence. These are loaded from images.unsplash.com exactly as in the prototype, not downloaded. Photo IDs: 1573167507387, 1542744173, 1774186184383, 1646296066880, 1624555130581, 1622675363311, 1606836591695, 1579389083046, 1573166364839, 1573164574572, 1573164574511, 1568992687947, 1551836022, 1551434678, 1541746972996, 1531973576160, 1517048676732, 1504384308090.

## What was tested

- Every internal link and anchor resolves on all 21 pages (including the new 404 page). No page has inline styles, duplicate ids, skipped heading levels or images without size and alt text.
- No horizontal scrolling at 375px on all 8 pages and on two articles (every article uses the same template).
- Desktop layouts checked at 1440px against the prototype. The Home hero, Pathway included, fits above the fold on 1280×720, 1366×768, 1440×900 and 1536×864 laptop screens.
- Motion checked frame by frame in headless Chrome on every animated section. No console errors on any page. With step-by-step scrolling, every element reveals on every page.
- Text contrast meets WCAG AA for every colour pair in use.
- Keyboard focus is visible on every link and control, and the Tab order starts at the skip link.
- Mobile menu works.
- Filters work, including the empty state and reset.
- Events tabs work, including links straight to a tab such as `#upcoming`.
- The picker works by keyboard and skips weekends. A chosen slot reaches the form, and the enquiry type switches to Discovery Consultation.
- Form validation messages work, and so does the failure message when sending fails.
- The build works with every optional setting switched on.
- Motion turns off for visitors who set "reduce motion", and all content still shows if `site.js` is blocked.
- Phone layouts were checked in the first build only. They are due a full pass next.
