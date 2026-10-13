#!/usr/bin/env python3
"""Builds the NeuroAIQ V4 website into ./site from the sources in ./src.

    python3 build.py

Needs only Python 3.8+. Edit pages in src/pages, articles in src/articles and the shared
header, footers and next-step ladders in src/partials, then rebuild. Everything under
site/assets is edited in place; every .html file under site/ is generated and overwritten.

Template syntax (deliberately small):
    {{name}}                 a value from the page context (unknown names stop the build)
    {{> partial}}            src/partials/partial.html
    <!-- if name --> … <!-- endif name -->      kept when the value is truthy
    <!-- if not name --> … <!-- endif name -->  kept when it is falsy
Each page or article starts with a <!--meta {json} --> block.
"""
import datetime
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "site"

# ---------------------------------------------------------------------------
# Settings to confirm before launch. Each one is explained in README.md.
# ---------------------------------------------------------------------------
CONFIG = {
    "site_url": "https://neuroaiq.com.au",
    "contact_email": "info@neuroaiq.com.au",
    "linkedin_url": "https://www.linkedin.com/company/neuroaiq/",
    # Where the enquiry form POSTs (JSON). Empty: the form opens the visitor's email app instead.
    "form_endpoint": "",
    # Calendly event link for the Discovery Consultation. Empty: a preferred-time picker feeds the enquiry form.
    "calendly_url": "",
    # The DRIVE Scorecard tool, once it exists. Empty: "Take the DRIVE Scorecard" opens the enquiry form.
    "scorecard_url": "",
    # V4's illustrative case snapshots (invented figures). Off unless you need them for a review build.
    "show_sample_cases": False,
    # Adds <meta name="robots" content="noindex"> to every page, for a staging copy.
    "noindex": False,
}

NAV = [
    ("about", "About", "about.html"),
    ("solutions", "Solutions", "solutions.html"),
    ("cases", "Case Studies", "case-studies.html"),
    ("insights", "Executive Insights", "insights.html"),
    ("events", "Events", "events.html"),
]

PRIORITIES = {
    "technology-investment": "Technology investment",
    "workforce-capability": "Workforce capability",
    "governance-and-risk": "Governance and risk",
    "leadership": "Leadership",
}
RESPONSIBILITIES = {
    "business": "Leading the business",
    "operations": "Leading AI adoption and operations",
    "workforce": "Leading workforce transformation",
}
SOLUTION_STEPS = {
    "drive": ("DRIVE measures the conditions this article describes.", "See DRIVE on Solutions", "solutions.html#drive"),
    "workforce": ("Workforce Readiness builds the habits this article describes.", "See Workforce Readiness", "solutions.html#workforce"),
    "accelerator": ("The Adaptability Accelerator works on the conditions this article describes.", "See the Accelerator", "solutions.html#accelerator"),
}
AUTHORS = {
    "founder": ("MA", "Dr Mahtab Ameri", "Founder &amp; Director, NeuroAIQ"),
    "neuroaiq": ("N", "NeuroAIQ", "Executive insight &middot; AI adoption and organisational readiness"),
}

FLAGSHIP = "breaking-the-ai-roi-trap-the-executive-guide-to-technology-returns"
# Order of the cards on Executive Insights (after the flagship).
ARTICLE_ORDER = [
    "should-we-keep-investing-in-ai",
    "where-is-your-ai-investment-losing-value",
    "why-doesnt-training-change-how-people-use-ai",
    "what-is-shadow-ai-costing-you",
    "cost-of-premature-ai-rollouts",
    "which-departments-are-ready-for-ai",
    "why-ai-adoption-slides-backwards",
    "why-ai-policies-fail-to-change-behaviour",
    "hidden-organisational-risks-in-ai-adoption",
    "why-leadership-decisions-shape-ai-outcomes-more-than-the-technology",
    "why-organisational-conditions-matter-more-than-technology",
]
HOME_TEASERS = [
    "where-is-your-ai-investment-losing-value",
    "what-is-shadow-ai-costing-you",
    "should-we-keep-investing-in-ai",
]

META_RE = re.compile(r"\A\s*<!--meta\s*(\{.*?\})\s*-->\s*", re.S)
IF_RE = re.compile(r"<!--\s*if (not )?([\w-]+)\s*-->(.*?)<!--\s*endif \2\s*-->", re.S)
INC_RE = re.compile(r"\{\{>\s*([\w-]+)\s*\}\}")
VAR_RE = re.compile(r"\{\{\s*([\w-]+)\s*\}\}")
esc = html.escape


def read(path):
    return path.read_text(encoding="utf-8")


def split_meta(text, path):
    m = META_RE.match(text)
    if not m:
        sys.exit(f"{path}: missing <!--meta {{...}} --> block")
    return json.loads(m.group(1)), text[m.end():]


def render(text, ctx):
    text = INC_RE.sub(lambda m: render(read(SRC / "partials" / f"{m.group(1)}.html"), ctx), text)
    while True:
        new = IF_RE.sub(lambda m: m.group(3) if bool(ctx.get(m.group(2))) != bool(m.group(1)) else "", text)
        if new == text:
            break
        text = new

    def var(m):
        if m.group(1) not in ctx:
            raise KeyError(f"unknown template variable {{{{{m.group(1)}}}}}")
        return str(ctx[m.group(1)])

    return VAR_RE.sub(var, text)


def base_context(root, current):
    ctx = {
        "root": root,
        "year": datetime.date.today().year,
        "contact_email": CONFIG["contact_email"],
        "linkedin_url": CONFIG["linkedin_url"],
        "form_endpoint": esc(CONFIG["form_endpoint"]),
        "calendly_url": esc(CONFIG["calendly_url"]),
        "show_sample_cases": CONFIG["show_sample_cases"],
        "scorecard_href": esc(CONFIG["scorecard_url"]) or f"{root}contact.html?enquiry=scorecard#enquiry",
        "scorecard_label": "Take the DRIVE Scorecard" if CONFIG["scorecard_url"] else "Register for the DRIVE Scorecard",
        "robots": '<meta name="robots" content="noindex">' if CONFIG["noindex"] else "",
        "head_extra": "",
        "scripts_extra": "",
    }
    for key, _, _ in NAV:
        ctx[f"nav_{key}"] = ' aria-current="page"' if key == current else ""
    return ctx


def page_url(rel):
    rel = "" if rel == "index.html" else rel
    return f"{CONFIG['site_url'].rstrip('/')}/{rel}"


def write(rel, text):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


# ---------------------------------------------------------------------------
# Articles
# ---------------------------------------------------------------------------
def load_articles():
    articles = {}
    for path in sorted((SRC / "articles").glob("*.html")):
        meta, body = split_meta(read(path), path)
        meta["slug"] = path.stem
        meta["body"] = body
        meta.setdefault("image", f"assets/img/insights/{path.stem}.jpg")
        meta.setdefault("author", "neuroaiq")
        articles[path.stem] = meta
    missing = [s for s in [FLAGSHIP, *ARTICLE_ORDER] if s not in articles]
    if missing:
        sys.exit(f"articles listed in build.py but not found in src/articles: {missing}")
    return articles


def img_src(article, root):
    return esc(article["image"]) if article["image"].startswith("http") else root + article["image"]


def card_html(a, root, href_root):
    resp = " ".join(a["responsibilities"])
    return f"""<a class="card rv" href="{href_root}{a['slug']}.html" data-priority="{a['priority']}" data-responsibility="{resp}">
<div class="photo-frame"><img src="{img_src(a, root)}" alt="" loading="lazy" decoding="async" width="1000" height="666"></div>
<p class="label">{PRIORITIES[a['priority']]}</p>
<h3>{a['card_title']}</h3>
<p>{a['summary']}</p>
<span class="more">Read the article <span class="arrow" aria-hidden="true">&rarr;</span></span>
</a>"""


def teaser_html(a):
    return f"""<a class="teaser rv" href="insights/{a['slug']}.html">
<div class="photo-frame"><img src="{img_src(a, '')}" alt="" loading="lazy" decoding="async" width="1000" height="666"></div>
<p class="label">{PRIORITIES[a['priority']]}</p>
<h3>{a['card_title']}</h3>
<span class="more">Read the article <span class="arrow" aria-hidden="true">&rarr;</span></span>
</a>"""


def build_article(a, articles, layout):
    root = "../"
    ctx = base_context(root, "insights")
    initials, name, role = AUTHORS[a["author"]]
    text, link_label, link_href = SOLUTION_STEPS[a["solution"]]
    related = "".join(
        f'<li><a href="{s}.html">{articles[s]["title"]}</a></li>' for s in a.get("related", [])
    )
    ctx.update({
        "slug": a["slug"],
        "article_title": a["title"],
        "standfirst": a["standfirst"],
        "priority_label": PRIORITIES[a["priority"]],
        "image_src": img_src(a, root),
        "image_alt": esc(a["image_alt"]),
        "avatar": initials,
        "author_name": name,
        "author_role": role,
        "pills": "".join(f"<li>{RESPONSIBILITIES[r]}</li>" for r in a["responsibilities"]),
        "next_text": text,
        "next_label": link_label,
        "next_href": root + link_href,
        "related": related,
        "has_related": bool(related),
    })
    ctx["article_body"] = render(a["body"], ctx)
    image_abs = a["image"] if a["image"].startswith("http") else page_url(a["image"])
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": html.unescape(a["title"]),
        "description": html.unescape(a["description"]),
        "image": image_abs,
        "author": {"@type": "Person", "name": "Dr Mahtab Ameri"} if a["author"] == "founder"
        else {"@type": "Organization", "name": "NeuroAIQ"},
        "publisher": {"@type": "Organization", "name": "NeuroAIQ Pty Ltd",
                      "logo": {"@type": "ImageObject", "url": page_url("assets/img/logo.png")}},
        "mainEntityOfPage": page_url(f"insights/{a['slug']}.html"),
        "articleSection": PRIORITIES[a["priority"]],
        "inLanguage": "en-AU",
    }
    ctx.update({
        "title": esc(html.unescape(a["title"])) + " | NeuroAIQ",
        "description": esc(html.unescape(a["description"])),
        "canonical": page_url(f"insights/{a['slug']}.html"),
        "og_type": "article",
        "og_image": image_abs,
        "page_class": "page-article",
        "footer_full": False,
        "head_extra": f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>',
    })
    ctx["body"] = render(read(SRC / "templates" / "article.html"), ctx)
    write(f"insights/{a['slug']}.html", render(layout, ctx))


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
def build_page(path, articles, layout):
    meta, body = split_meta(read(path), path)
    rel = path.name
    ctx = base_context("/" if meta.get("absolute_root") else "", meta.get("nav", ""))
    if meta.get("noindex"):
        ctx["robots"] = '<meta name="robots" content="noindex">'
    flagship = articles[FLAGSHIP]
    ctx.update({
        "title": esc(meta["title"]),
        "description": esc(meta["description"]),
        "canonical": page_url(rel),
        "og_type": "website",
        "og_image": meta.get("og_image") or page_url("assets/img/og-default.jpg"),
        "page_class": f"page-{path.stem}",
        "footer_full": meta.get("footer") == "full",
        "insight_cards": "\n".join(card_html(articles[s], "", "insights/") for s in ARTICLE_ORDER),
        "insight_count": len(ARTICLE_ORDER),
        "home_teasers": "\n".join(teaser_html(articles[s]) for s in HOME_TEASERS),
        "flagship_href": f"insights/{FLAGSHIP}.html",
        "flagship_title": flagship["title"],
        "flagship_summary": flagship["summary"],
        "flagship_img": img_src(flagship, ""),
        "flagship_alt": esc(flagship["image_alt"]),
    })
    if meta.get("schema") == "organization":
        org = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "NeuroAIQ Pty Ltd",
            "alternateName": "NeuroAIQ",
            "url": page_url(""),
            "logo": page_url("assets/img/logo.png"),
            "email": CONFIG["contact_email"],
            "slogan": "The Neuroscience of AI Adoption",
            "foundingDate": "2025",
            "address": {"@type": "PostalAddress", "addressLocality": "Melbourne",
                        "addressRegion": "VIC", "addressCountry": "AU"},
            "founder": {"@type": "Person", "name": "Dr Mahtab Ameri"},
            "sameAs": [CONFIG["linkedin_url"]],
        }
        ctx["head_extra"] = f'<script type="application/ld+json">{json.dumps(org)}</script>'
    if meta.get("calendly") and CONFIG["calendly_url"]:
        ctx["scripts_extra"] = '<script src="https://assets.calendly.com/assets/external/widget.js" async></script>'
    ctx["body"] = render(body, ctx)
    write(rel, render(layout, ctx))
    return rel if meta.get("sitemap", True) else None


def build_sitemap(pages, articles):
    today = datetime.date.today().isoformat()
    urls = [page_url(p) for p in pages] + [page_url(f"insights/{s}.html") for s in articles]
    items = "\n".join(f"  <url><loc>{esc(u)}</loc><lastmod>{today}</lastmod></url>" for u in urls)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n'
                         f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{items}\n</urlset>\n')
    rules = "Disallow: /\n" if CONFIG["noindex"] else "Allow: /\n"
    write("robots.txt", f"User-agent: *\n{rules}\nSitemap: {page_url('sitemap.xml')}\n")


def main():
    layout = read(SRC / "templates" / "layout.html")
    articles = load_articles()
    built = [build_page(p, articles, layout) for p in sorted((SRC / "pages").glob("*.html"))]
    pages = [p for p in built if p]
    for a in articles.values():
        build_article(a, articles, layout)
    build_sitemap(pages, articles)
    print(f"Built {len(built)} pages and {len(articles)} articles into {OUT}")


if __name__ == "__main__":
    main()
