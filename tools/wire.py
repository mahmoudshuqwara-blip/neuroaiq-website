"""Page-specific changes applied during conversion: removing placeholders,
adding ids and data attributes for main.js, and replacing drawn controls
(fake drop-downs, a static calendar) with real ones."""
import re
from bs4 import BeautifulSoup


def frag(html):
    return BeautifulSoup(html, 'html.parser')


def by_text(soup, text, name=None, exact=True):
    pat = re.compile('^\\s*' + re.escape(text) + '\\s*$') if exact else re.compile(re.escape(text))
    for s in soup.find_all(string=pat):
        if name is None or s.parent.name == name:
            return s.parent
    return None


def climb(el, until):
    while el is not None and not until(el):
        el = el.parent
    return el


def all_by_text(soup, text):
    return [s.parent for s in soup.find_all(string=re.compile('^\\s*' + re.escape(text) + '\\s*$'))]


def solidify(el):
    if el is not None and el.get('style'):
        el['style'] = el['style'].replace('dashed', 'solid')


# ── Home ───────────────────────────────────────────────────────────────────
def home(soup):
    trusted = by_text(soup, 'Trusted by')
    if trusted:
        trusted.parent.decompose()          # client logos only with permission
    for n, span in enumerate(all_by_text(soup, 'figure'), 1):
        span.string = f'0{n}'
        span['aria-hidden'] = 'true'
        solidify(span.parent); solidify(span)
        span['style'] = span.get('style', '') + ';font-size:18px;font-weight:800;letter-spacing:-.01em;color:#003466;font-family:inherit'
    lead = by_text(soup, 'Adoption is not an individual choice. It is a chain of consequences.', exact=False)
    if lead:
        climb(lead, lambda e: e.name == 'section')['id'] = 'lead'
    a = by_text(soup, 'See the LEAD framework', 'a')
    if a:
        a['href'] = '#lead'
    # DRIVE weeks: the week-by-week detail hasn't been supplied, so the three
    # empty week cards go and the outcome card stands on its own
    recv = by_text(soup, 'You receive')
    if recv:
        card = recv.parent
        strip = card.parent
        strip.replace_with(card.extract())
        card['style'] = card.get('style', '') + ';max-width:560px'
    article_cards(soup)
    wip = by_text(soup, 'Work in progress', exact=False)
    if wip:
        for s in wip.find_all(string=re.compile('Work in progress', re.I)):
            s.replace_with('Coming soon')


# ── About ──────────────────────────────────────────────────────────────────
def about(soup):
    p = by_text(soup, 'founder portrait')
    if p:
        p.string = 'MA'
        p['aria-hidden'] = 'true'
        p['style'] = (p.get('style', '') + ';font-size:44px;font-weight:800;line-height:1;color:#003466;letter-spacing:-.03em;font-family:inherit')
        solidify(p.parent)


# ── Solutions ──────────────────────────────────────────────────────────────
def solutions(soup):
    for label in ('the engagement', 'what you receive'):
        for el in all_by_text(soup, label):
            box = el.parent if el.parent.get_text(strip=True) == el.get_text(strip=True) else el
            holder = box.parent
            box.decompose()
            if holder is not None and not holder.get_text(strip=True) and not holder.find('img'):
                holder.decompose()
    if not soup.find(id='sol-drive'):
        h = by_text(soup, 'DRIVE in detail')
        if h:
            climb(h, lambda e: e.name == 'section')['id'] = 'sol-drive'
    for sec_id in ('sol-drive', 'sol-advisory', 'sol-workforce', 'sol-accelerator'):
        el = soup.find(id=sec_id)
        if el:
            el['style'] = el.get('style', '') + ';scroll-margin-top:96px'


# ── Insights ───────────────────────────────────────────────────────────────
ROLE_TOPICS = {   # leadership role → business priorities its articles cover
    'Leading the business': ['Leadership', 'Technology investment'],
    'Leading AI adoption and operations': ['Technology investment', 'Governance and risk'],
    'Leading workforce capability': ['Workforce capability'],
}
ARTICLE = 'insights-should-we-keep-investing-in-ai.html'


def article_cards(soup):
    """Only one article exists so far; the other cards say so instead of all
    opening the same page."""
    for a in [a for a in soup.find_all('a', href=True) if a.find('h3') and a['href'] in ('#2e', ARTICLE)]:
        title = a.find('h3').get_text(strip=True)
        more = a.find(string=re.compile('Read the article'))
        if title.startswith('Should we keep investing in AI'):
            a['href'] = ARTICLE
        else:
            a.name = 'article'
            del a['href']
            if more:
                more.replace_with('Article coming soon')
    # cards where only the "Read the article" line is a link (home page)
    for a in [a for a in soup.find_all('a', href=ARTICLE) if not a.find('h3')]:
        box = a.parent
        while box is not None and box.find('h3') is None:
            box = box.parent
        if box is not None and not box.find('h3').get_text(strip=True).startswith('Should we keep investing in AI'):
            a.name = 'span'
            del a['href']
            a.string = 'Article coming soon'


def insights(soup):
    # filter chips → buttons
    for group, label in (('topic', 'Business priority'), ('role', 'Leadership responsibility')):
        lab = by_text(soup, label)
        if not lab:
            continue
        row = lab.parent
        row['role'] = 'group'
        row['aria-label'] = f'Filter by {label.lower()}'
        row['data-filter-group'] = group
        for chip in [c for c in row.find_all('span', recursive=False) if c is not lab]:
            chip.name = 'button'
            chip['type'] = 'button'
            chip['data-filter'] = chip.get_text(strip=True)
            chip['aria-pressed'] = 'true' if chip.get_text(strip=True) == 'All' else 'false'
            chip['class'] = (chip.get('class') or []) + ['chip']
    # article cards
    cards = [a for a in soup.find_all('a', href=True) if a.find('h3') and a['href'] == ARTICLE]
    grid = cards[0].parent if cards else None
    for a in cards:
        a['data-topic'] = a.find('p').get_text(strip=True)
    article_cards(soup)
    if grid is not None:
        grid['data-filter-list'] = ''
        empty = frag('<p class="filter-empty" data-filter-empty hidden>No articles match both filters yet. Try "All".</p>')
        grid.insert_after(empty)
    guide = by_text(soup, 'Read the guide', exact=False)
    if guide:
        a = climb(guide, lambda e: e.name == 'a')
        if a is not None:
            a.name = 'span'; del a['href']
        for s in guide.find_all(string=re.compile('Read the guide')) or []:
            s.replace_with('Guide coming soon')
        if guide.string and 'Read the guide' in guide.string:
            guide.string = 'Guide coming soon'
    cta = by_text(soup, 'Explore DRIVE Diagnostic →', exact=False)
    if cta is not None and cta.name == 'a':
        cta['href'] = 'solutions.html#sol-drive'


# ── Case studies ───────────────────────────────────────────────────────────
def case_studies(soup):
    f = by_text(soup, 'Filter')
    if f:
        bar = climb(f, lambda e: e.parent is not None and e.parent.name == 'section')
        bar.decompose()
    fc = by_text(soup, 'Further case studies')
    if fc:
        sec = climb(fc, lambda e: e.name == 'section')
        if sec is not None and len(sec.get_text(strip=True)) < 40:
            sec.decompose()


# ── Events ─────────────────────────────────────────────────────────────────
def events(soup):
    other = by_text(soup, 'The other two tabs')
    if other:
        climb(other, lambda e: e.name == 'section').decompose()
    past = by_text(soup, 'Past')
    if not past:
        return
    bar = past.parent
    bar['role'] = 'tablist'
    bar['aria-label'] = 'Events'
    for sp in [c for c in bar.find_all(True, recursive=False) if c.get_text(strip=True) in ('Past', 'Current', 'Upcoming')]:
        key = sp.get_text(strip=True).lower()
        sp.name = 'button'
        sp['type'] = 'button'
        sp['role'] = 'tab'
        sp['id'] = f'tab-{key}'
        sp['aria-controls'] = f'panel-{key}'
        sp['aria-selected'] = 'true' if key == 'past' else 'false'
        sp['class'] = (sp.get('class') or []) + ['tab']
    for sep in [c for c in bar.find_all(True, recursive=False) if c.get_text(strip=True) in ('|', '')]:
        sep['aria-hidden'] = 'true'
    head = climb(bar, lambda e: e.name == 'section')
    panel = soup.new_tag('div', id='panel-past', role='tabpanel', **{'aria-labelledby': 'tab-past'})
    sib = head.find_next_sibling('section')
    head.insert_after(panel)
    while sib is not None:
        nxt = sib.find_next_sibling('section')
        panel.append(sib.extract())
        sib = nxt
    for key, msg in (('current', 'Nothing is running right now.'), ('upcoming', 'New events are announced on LinkedIn first.')):
        panel.insert_after(frag(f'''<div id="panel-{key}" role="tabpanel" aria-labelledby="tab-{key}" class="events-empty" hidden>
  <p class="events-empty__title">{msg}</p>
  <p>Follow NeuroAIQ on <a href="https://www.linkedin.com/company/neuroaiq/" rel="noopener">LinkedIn</a> for dates, or <a href="contact.html#enquiry">ask about bringing a session to your organisation</a>.</p>
</div>'''))


# ── Contact ────────────────────────────────────────────────────────────────
FORM = '''<form class="enquiry" id="enquiry-form" novalidate data-endpoint="">
  <p class="form-note">Fields marked <span aria-hidden="true">*</span><span class="visually-hidden">with an asterisk</span> are required.</p>
  <div class="form-row">
    <div class="field"><label for="f-first">First name <span aria-hidden="true">*</span></label><input id="f-first" name="first_name" type="text" autocomplete="given-name" required></div>
    <div class="field"><label for="f-last">Last name <span aria-hidden="true">*</span></label><input id="f-last" name="last_name" type="text" autocomplete="family-name" required></div>
  </div>
  <div class="field"><label for="f-email">Work email <span aria-hidden="true">*</span></label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
  <div class="field"><label for="f-org">Organisation <span aria-hidden="true">*</span></label><input id="f-org" name="organisation" type="text" autocomplete="organization" required></div>
  <div class="field"><label for="f-phone">Phone number</label>
    <div class="phone"><span class="phone__cc" aria-hidden="true">+61</span><input id="f-phone" name="phone" type="tel" autocomplete="tel-national" inputmode="tel" pattern="[0-9 \\(\\)\\+\\-]{8,16}" aria-describedby="f-phone-hint"></div>
    <p class="hint" id="f-phone-hint">Optional. Australian number, for example 0400 000 000.</p></div>
  <div class="field"><label for="f-nature">Nature of enquiry <span aria-hidden="true">*</span></label>
    <select id="f-nature" name="nature" required>
      <option value="">Please select an option</option>
      <option>The DRIVE™ Adaptability Diagnostic</option>
      <option>Advisory</option>
      <option>Workforce Readiness</option>
      <option>Partnership or collaboration</option>
      <option>Media or speaking</option>
      <option>General business enquiry</option>
    </select></div>
  <fieldset class="qualify">
    <legend>Enquiry qualification <span class="optional">Optional, helps us reply with the right person</span></legend>
    <div class="field"><label for="f-role">Role or leadership responsibility</label>
      <select id="f-role" name="role">
        <option value="">Select</option>
        <option>Leading the business</option>
        <option>Leading AI adoption and operations</option>
        <option>Leading workforce capability</option>
        <option>Education partnership</option>
      </select></div>
    <div class="form-row">
      <div class="field"><label for="f-size">Organisation size</label>
        <select id="f-size" name="size">
          <option value="">Select</option>
          <option>1 to 19 people</option><option>20 to 199 people</option><option>200 to 999 people</option><option>1,000 or more</option>
        </select></div>
      <div class="field"><label for="f-stage">AI adoption stage</label>
        <select id="f-stage" name="stage">
          <option value="">Select</option>
          <option>Exploring</option><option>Piloting</option><option>Rolled out, value unclear</option><option>Scaling</option>
        </select></div>
    </div>
  </fieldset>
  <div class="field"><label for="f-msg">What challenge would you like to discuss? <span aria-hidden="true">*</span></label>
    <textarea id="f-msg" name="message" rows="5" minlength="10" maxlength="2000" required></textarea></div>
  <div class="hp" aria-hidden="true"><label for="f-website">Leave this empty</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
  <p class="form-errors" role="alert" aria-live="assertive" hidden></p>
  <button class="btn btn--navy btn--lg" type="submit">Send enquiry</button>
  <p class="form-privacy">We use your details only to reply to this enquiry. See our <a href="privacy.html">privacy statement</a>.</p>
</form>
<div class="form-success" id="enquiry-success" role="status" tabindex="-1" hidden>
  <p class="form-success__title">Thanks, your enquiry is in.</p>
  <p>We reply within two business days.</p>
  <p class="form-success__test" data-test-note>This is a review build: nothing was sent.</p>
</div>'''

BOOKING = '''<div class="booking" id="booking-app" data-booking>
  <noscript><p>Booking needs JavaScript. You can <a href="#enquiry">send an enquiry</a> instead.</p></noscript>
</div>'''


def contact(soup):
    form = soup.find('form')
    if form is not None:
        sec = climb(form, lambda e: e.name == 'section')
        if sec is not None:
            sec['id'] = 'enquiry'
            sec['style'] = sec.get('style', '') + ';scroll-margin-top:90px'
        form.replace_with(frag(FORM))
    # the two option boxes at the top become links to their sections
    for text, target in (('Partnerships, media and general questions.', '#enquiry'), ('Pick a time below.', '#booking')):
        p = by_text(soup, text, exact=False)
        if p is not None:
            box = p.parent
            box.name = 'a'
            box['href'] = target
            box['style'] = box.get('style', '') + ';text-decoration:none;display:block'
    # calendar + time columns → one JS booking widget
    sel = by_text(soup, 'Select a date and time')
    if sel is not None:
        col = sel.parent
        grid = col.parent
        sec = climb(grid, lambda e: e.name == 'section')
        if sec is not None:
            sec['id'] = 'booking'
            sec['style'] = sec.get('style', '') + ';scroll-margin-top:90px'
        kids = [c for c in grid.find_all(True, recursive=False)]
        idx = kids.index(col)
        for k in kids[idx:]:
            k.decompose()
        grid.append(frag(BOOKING))
        grid['data-booking-grid'] = ''
        grid['style'] = re.sub(r'grid-template-columns:[^;]*', 'grid-template-columns: 336px 1px minmax(0px, 1fr)', grid['style'])
    # booking-with cards → selectable
    for name, role in (('Dr Mahtab Ameri', 'Founder, NeuroAIQ'), ('NeuroAIQ consultant', 'Advisory team')):
        el = by_text(soup, name)
        if el is None:
            continue
        card = climb(el, lambda e: role in e.get_text(' ', strip=True))
        other = 'NeuroAIQ consultant' if name.startswith('Dr') else 'Dr Mahtab Ameri'
        while card.parent is not None and other not in card.parent.get_text() and 'Booking with' not in card.parent.get_text():
            card = card.parent
        card.name = 'button'
        card['type'] = 'button'
        card['data-person'] = name
        card['aria-pressed'] = 'true' if name.startswith('Dr') else 'false'
        card['class'] = (card.get('class') or []) + ['person']


def skeletons(soup):
    """Grey bars and hatched boxes the prototype used to stand in for copy and
    images nobody has supplied yet. Containers left empty are removed too."""
    def empty(el):
        return not el.get_text(strip=True) and el.find('img') is None and el.find('svg') is None
    for el in soup.find_all(['div', 'span']):
        st = el.get('style', '')
        if not empty(el) or el.find(True):
            continue
        m = re.search(r'(?:^|;)\s*height:\s*(\d+)px', st)
        bar = m and int(m.group(1)) <= 16 and 'border-radius: 2px' in st
        bar = bar or (m and int(m.group(1)) <= 12 and re.search(r'width:\s*\d+%', st))
        if bar or 'repeating-linear-gradient' in st:
            el['data-skeleton'] = ''
    for el in soup.find_all(attrs={'data-skeleton': True}):
        el.decompose()
    while True:
        hit = next((el for el in soup.find_all('div') if 'dashed' in el.get('style', '') and empty(el)), None)
        if hit is None:
            break
        hit.decompose()


def wire(cid, soup):
    skeletons(soup)
    {'1a': home, '2a': about, '2b': solutions, '2d': insights, '2f': case_studies,
     '2g': events, '2i': contact}.get(cid, lambda s: None)(soup)
