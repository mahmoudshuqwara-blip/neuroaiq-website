"""One-off conversion of Prototype V3 (a single-file design canvas) into a
multi-page static site.

Input : extract.json, produced by tools/extract.py from the standalone prototype
        (rendered page HTML for each of the nine frames, plus embedded images).
Output: src/*.html, src/css/pages.css, src/assets/img/*

What it does, in order:
  1. Splits the canvas into nine pages and gives each a real URL.
  2. Replaces each frame's header and footer with one shared, accessible header
     and footer (partials/header.html, partials/footer.html).
  3. Moves every inline style into a generated class (pages.css) and writes
     tablet and phone overrides for each one, so the fixed 1240px frames reflow.
  4. Removes design annotations and placeholders, fixes copy flagged in the
     handover (em dashes, change-management wording), and wires up the
     interactive parts (filters, tabs, enquiry form, booking) for main.js.

After this first conversion the pages are maintained by hand; re-running it
overwrites them. See README, "How the site was built".
"""
import json, re, sys, hashlib
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
EXTRACT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'tools' / 'extract.json'
IMG_IN = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'tools' / 'raw-assets'

PAGES = {
    '1a': ('index.html', 'AI Adoption Diagnostic for Leaders | NeuroAIQ',
           'Find out why your AI investment isn\'t delivering. The DRIVE™ Adaptability Diagnostic gives leaders an evidence-based roadmap in three weeks.', 'home'),
    '2a': ('about.html', 'About NeuroAIQ: The Neuroscience of AI Adoption',
           'NeuroAIQ helps organisations get greater value from the AI they have already paid for. Founded in Melbourne by Dr Mahtab Ameri.', 'about'),
    '2b': ('solutions.html', 'AI Adoption Solutions: DRIVE™, Advisory, Workforce Readiness | NeuroAIQ',
           'Measure it, embed it, scale it. DRIVE™ produces the evidence; Advisory and Workforce Readiness act on it.', 'solutions'),
    '2d': ('insights.html', 'AI Adoption Insights for Executives | NeuroAIQ',
           'Short answers to the questions leaders ask when AI investment isn\'t returning value.', 'insights'),
    '2e': ('insights-should-we-keep-investing-in-ai.html', 'Should We Keep Investing in AI? | NeuroAIQ',
           'The evidence a board needs to continue, pause or stop AI investment with confidence.', 'insights'),
    '2f': ('case-studies.html', 'AI Adoption Case Studies | NeuroAIQ',
           'Problem, approach, outcome and evidence from NeuroAIQ engagements.', 'case-studies'),
    '2g': ('events.html', 'Events | NeuroAIQ',
           'Past, current and upcoming NeuroAIQ events, and where the team has spoken.', 'events'),
    '2i': ('contact.html', 'Book a Discovery Conversation | NeuroAIQ',
           'Book a 30-minute Discovery Consultation with NeuroAIQ, or send an enquiry. Replies within two business days.', 'contact'),
    '2h': ('partnerships.html', 'Partnerships | NeuroAIQ',
           'NeuroAIQ partners with universities and organisations on applied, responsible AI capability.', 'partnerships'),
}
ANCHOR = {f'#{k}': v[0] for k, v in PAGES.items()}
ANCHOR['#1a'] = 'index.html'

# Copy changes. Each is logged in CHANGELOG.md for client approval.
COPY = [
    ('We deliver the missing bridge between innovation and human adaptability, so leaders act on evidence rather than assumption.',
     'We help organisations get greater value from the AI they have already paid for, so leaders act on evidence rather than assumption.'),
    ('technology-enabled transformation practice', 'technology-enabled delivery practice'),
    ('working alongside the AI and transformation initiatives you already have running', 'working alongside the AI and technology initiatives you already have running'),
    ('alongside the AI, technology and transformation initiatives already running', 'alongside the AI and technology initiatives already running'),
    ('Leading workforce transformation', 'Leading workforce capability'),
    ('workforce transformation, or education partnership', 'workforce capability, or education partnership'),
    ('still using our tools — a shift in behaviour', 'still using our tools: a shift in behaviour'),
    ('Workforce Readiness page — currently the only public university evidence', 'Workforce Readiness page, currently the only public university evidence'),
    ('What does it cost to rollout AI', 'What does it cost to roll out AI'),
]

# Structured data for the home page (SEO strategy, Part four). Facts only as
# confirmed by the client: founder, location, solutions.
JSONLD = '''<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ProfessionalService","name":"NeuroAIQ","legalName":"NeuroAIQ Pty Ltd",
 "url":"https://neuroaiq.com.au/","slogan":"The Neuroscience of AI Adoption","areaServed":"Australia",
 "address":{"@type":"PostalAddress","addressLocality":"Melbourne","addressRegion":"VIC","addressCountry":"AU"},
 "email":"info@neuroaiq.com.au","sameAs":["https://www.linkedin.com/company/neuroaiq/"],
 "founder":{"@type":"Person","name":"Dr Mahtab Ameri","jobTitle":"Founder and AI Adoption and Strategy Lead"},
 "makesOffer":[{"@type":"Offer","itemOffered":{"@type":"Service","name":"DRIVE™ Adaptability Diagnostic"}},
  {"@type":"Offer","itemOffered":{"@type":"Service","name":"Advisory"}},
  {"@type":"Offer","itemOffered":{"@type":"Service","name":"Workforce Readiness"}}]}
</script>
'''

ANNOTATIONS = [
    r'^week \d activities',
    r'^question count and result pathway',
    r'^further case studies',
    r'^Optional section',
    r'^name · date · venue',
]


# ── style → class ───────────────────────────────────────────────────────────
def norm_style(style):
    decls = []
    for part in style.split(';'):
        if ':' not in part:
            continue
        k, v = part.split(':', 1)
        k, v = k.strip().lower(), v.strip()
        if k == 'font-family' and 'Plus Jakarta Sans' in v:
            continue  # set once on body
        if k == 'font-family' and 'monospace' in v:
            v = "'JetBrains Mono', ui-monospace, monospace"
        decls.append((k, v))
    return tuple(decls)


def px(v):
    m = re.fullmatch(r'(-?[\d.]+)px', v.strip())
    return float(m.group(1)) if m else None


def responsive(decls):
    """Return (tablet, phone) override declarations for one class."""
    tab, ph = {}, {}
    d = dict(decls)
    gtc = d.get('grid-template-columns')
    if gtc and gtc not in ('1fr', 'minmax(0px, 1fr)'):
        m = re.match(r'repeat\((\d+)', gtc)
        n = int(m.group(1)) if m else len(re.findall(r'(?:minmax\([^)]*\)|[\d.]+fr|[\d.]+px|auto)', gtc))
        if n >= 4:
            tab['grid-template-columns'] = 'repeat(2, minmax(0, 1fr))'
            ph['grid-template-columns'] = 'repeat(2, minmax(0, 1fr))' if n >= 5 and 'gap' in d and (px(d['gap'].split()[0]) or 99) <= 16 else 'minmax(0, 1fr)'
        else:
            tab['grid-template-columns'] = 'minmax(0, 1fr)'
            ph['grid-template-columns'] = 'minmax(0, 1fr)'
    if 'grid-column' in d:
        tab['grid-column'] = 'auto'
    for key in ('padding',):
        if key in d:
            parts = d[key].split()
            vals = [px(p) for p in parts]
            if None in vals:
                continue
            if len(vals) == 1: t, r, b, l = vals * 4
            elif len(vals) == 2: t, r = vals; b, l = t, r
            elif len(vals) == 3: t, r, b = vals; l = r
            else: t, r, b, l = vals
            if max(r, l) >= 40 or max(t, b) >= 70:
                def f(x, cap): return f'{round(min(x, cap))}px'
                tab[key] = f'{f(t*0.75, 72)} {f(r, 32)} {f(b*0.75, 72)} {f(l, 32)}'
                ph[key] = f'{f(t*0.6, 56)} {f(r, 20)} {f(b*0.6, 56)} {f(l, 20)}'
            elif max(r, l) >= 28:
                ph[key] = f'{round(t)}px {round(min(r, 22))}px {round(b)}px {round(min(l, 22))}px'
    fs = d.get('font-size')
    if fs:
        v = px(fs)
        if v is None:
            m = re.fullmatch(r'([\d.]+)rem', fs)
            v = float(m.group(1)) * 16 if m else None
        if v and v >= 28:
            tab['font-size'] = f'{round(v*0.84)}px'
            ph['font-size'] = f'{round(max(26, v*0.62))}px'
        elif v and v >= 21:
            ph['font-size'] = f'{round(max(18, v*0.86))}px'
    for key in ('width', 'min-width'):
        v = px(d.get(key, '')) if key in d else None
        if v and v > 300:
            tab[key] = '100%' if key == 'width' else '0'
    if 'max-width' in d and (px(d['max-width']) or 0) > 400:
        tab['max-width'] = '100%'
    for key in ('gap', 'column-gap', 'row-gap'):
        if key in d:
            vals = [px(x) for x in d[key].split()]
            if vals and all(v is not None for v in vals) and max(vals) >= 32:
                tab[key] = ' '.join(f'{round(min(v, 28))}px' for v in vals)
                ph[key] = ' '.join(f'{round(min(v, 20))}px' for v in vals)
    if d.get('display') == 'flex' and d.get('flex-direction', 'row') == 'row':
        if d.get('justify-content') in ('space-between',) or (px(d.get('gap', '0px').split()[0]) or 0) >= 28:
            tab['flex-wrap'] = 'wrap'
    if d.get('flex') and re.match(r'0 0 \d{3,}px', d['flex']):
        tab['flex'] = '1 1 100%'
    if d.get('white-space') == 'nowrap':
        ph['white-space'] = 'normal'
    h = px(d.get('height', '')) if 'height' in d else None
    if h and h >= 380:
        tab['height'] = 'auto'
    if d.get('position') == 'absolute' and 'width' in d and (px(d['width']) or 0) > 300:
        tab['position'] = 'static'
    return tab, ph


class Styles:
    def __init__(self):
        self.map = {}

    def cls(self, style):
        decls = norm_style(style)
        if not decls:
            return None
        if decls not in self.map:
            self.map[decls] = f's{len(self.map) + 1}'
        return self.map[decls]

    def css(self):
        out = ['/* Generated by tools/convert.py from Prototype V3 inline styles.',
               '   One class per distinct style in the prototype, with tablet and phone',
               '   overrides derived from it. Edit by hand from here on. */', '']
        tab, ph = [], []
        for decls, name in self.map.items():
            out.append(f'.{name}{{' + ';'.join(f'{k}:{v}' for k, v in decls) + '}')
            t, p = responsive(decls)
            if t: tab.append(f'.{name}{{' + ';'.join(f'{k}:{v}' for k, v in t.items()) + '}')
            if p: ph.append(f'.{name}{{' + ';'.join(f'{k}:{v}' for k, v in p.items()) + '}')
        out += ['', '@media (max-width: 960px){', *('  ' + x for x in tab), '}',
                '', '@media (max-width: 600px){', *('  ' + x for x in ph), '}', '']
        return '\n'.join(out)


# ── images ─────────────────────────────────────────────────────────────────
def save_image(meta, out_dir):
    src = IMG_IN / meta['file']
    data = src.read_bytes()
    stem = 'img-' + hashlib.sha1(data).hexdigest()[:8]
    if meta['type'] == 'image/gif':
        name = stem + '.gif'
        (out_dir / name).write_bytes(data)
        return name, meta['w'], meta['h']
    im = Image.open(src)
    has_alpha = im.mode in ('RGBA', 'LA', 'P')
    im = im.convert('RGBA' if has_alpha else 'RGB')
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    name = stem + '.webp'
    im.save(out_dir / name, 'WEBP', quality=80, method=6)
    return name, im.width, im.height


sys.path.insert(0, str(Path(__file__).resolve().parent))
from wire import wire  # page-specific wiring for the interactive parts


def main():
    data = json.loads(EXTRACT.read_text())
    styles = Styles()
    img_dir = SRC / 'assets' / 'img'
    img_dir.mkdir(parents=True, exist_ok=True)
    images = {}
    for src, meta in data['images'].items():
        images[src] = save_image(meta, img_dir)

    logo = next(images[k][0] for k, m in data['images'].items() if m['alt'] == 'NeuroAIQ')
    header = (ROOT / 'partials' / 'header.html').read_text()
    footer = (ROOT / 'partials' / 'footer.html').read_text()
    layout = (ROOT / 'partials' / 'layout.html').read_text()

    for card in data['cards']:
        cid = card['id']
        fname, title, desc, nav = PAGES[cid]
        soup = BeautifulSoup(card['html'], 'html.parser')
        for tag in soup.find_all(['header', 'footer']):
            tag.decompose()
        for el in soup.find_all(True):
            for a in [a for a in el.attrs if a.startswith('data-dc')]:
                del el[a]

        # annotations and placeholders
        for pat in ANNOTATIONS:
            for s in soup.find_all(string=re.compile(pat, re.I)):
                el = s.parent
                while (el.parent is not None and el.parent.name not in ('section', 'form', '[document]')
                       and el.parent.get_text(strip=True) == el.get_text(strip=True)):
                    el = el.parent
                el['data-remove'] = 'annotation'
        for el in soup.find_all(attrs={'data-remove': True}):
            el.decompose()

        # copy fixes
        for s in soup.find_all(string=True):
            if isinstance(s, Comment):
                continue
            t = str(s)
            for a, b in COPY:
                t = t.replace(a, b)
            t = t.replace(' — ', ', ').replace('—', ', ')
            if t != str(s):
                s.replace_with(NavigableString(t))

        # links
        for a in soup.find_all('a', href=True):
            h = a['href']
            if h in ANCHOR:
                a['href'] = ANCHOR[h]
            elif h.startswith('#sol-') and cid != '2b':
                a['href'] = 'solutions.html' + h
            if h.startswith('http'):
                a['rel'] = 'noopener'

        # images
        for i, img in enumerate(soup.find_all('img')):
            name, w, h = images.get(img.get('src'), (None, None, None))
            if name:
                img['src'] = f'assets/img/{name}'
                img['width'], img['height'] = str(w), str(h)
            if i > 0 or cid != '1a':
                img['loading'] = 'lazy'
            else:
                img['fetchpriority'] = 'high'   # hero image is the LCP element
            img['decoding'] = 'async'

        wire(cid, soup)

        # inline style → class
        for el in soup.find_all(style=True):
            c = styles.cls(el['style'])
            del el['style']
            if c:
                el['class'] = (el.get('class') or []) + [c]

        body = soup.decode(formatter='html5')
        page = (layout.replace('{{title}}', title).replace('{{description}}', desc)
                .replace('{{header}}', header.replace(f'data-nav="{nav}"', f'data-nav="{nav}" aria-current="page"'))
                .replace('{{footer}}', footer).replace('{{body}}', body)
                .replace('{{page}}', nav).replace('{{file}}', fname).replace('{{logo}}', logo))
        if cid == '1a':
            page = page.replace('</head>', JSONLD + '</head>')
        (SRC / fname).write_text(page)
        print('wrote', fname, len(page))

    # simple pages written by hand (privacy, 404) share the same layout
    for f in sorted((ROOT / 'partials' / 'extra').glob('*.html')):
        body = f.read_text()
        title = re.search(r'<!-- title: (.*?) -->', body).group(1)
        desc = re.search(r'<!-- description: (.*?) -->', body).group(1)
        page = (layout.replace('{{title}}', title).replace('{{description}}', desc)
                .replace('{{header}}', header).replace('{{footer}}', footer)
                .replace('{{body}}', re.sub(r'<!--.*?-->\n', '', body))
                .replace('{{page}}', f.stem).replace('{{file}}', f.name).replace('{{logo}}', logo))
        (SRC / f.name).write_text(page)
        print('wrote', f.name)

    (SRC / 'css').mkdir(exist_ok=True)
    (SRC / 'css' / 'pages.css').write_text(styles.css())
    print(len(styles.map), 'classes')


if __name__ == '__main__':
    main()
