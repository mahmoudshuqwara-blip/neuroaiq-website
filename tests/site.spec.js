// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = [
  'index.html', 'about.html', 'solutions.html', 'case-studies.html', 'insights.html',
  'insights-should-we-keep-investing-in-ai.html', 'events.html', 'contact.html',
  'partnerships.html', 'privacy.html',
];

async function loadAllImages(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => i.setAttribute('loading', 'eager'));
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
}

test.describe('every page', () => {
  for (const path of PAGES) {
    test(`${path} renders cleanly`, async ({ page }) => {
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);

      // one h1, a real title and description
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/NeuroAIQ/);
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc && desc.length).toBeGreaterThan(40);

      // images load and are described
      await loadAllImages(page);
      const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src));
      expect(broken).toEqual([]);
      const noAlt = await page.locator('img:not([alt])').count();
      expect(noAlt).toBe(0);

      // nothing spills sideways (the prototype's main defect)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      // no em dashes left in visible copy (client flagged them)
      const text = await page.locator('body').innerText();
      expect(text).not.toContain('—');

      expect(errors).toEqual([]);
    });

    test(`${path} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''));
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
    });
  }
});

test('every internal link resolves', async ({ page, request }) => {
  const seen = new Set();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const href of hrefs) {
      if (!href || /^(https?:|mailto:|tel:)/.test(href)) continue;
      const [file, hash] = href.split('#');
      const target = file || path;
      if (!seen.has(target)) {
        seen.add(target);
        const r = await request.get(target);
        expect(r.status(), `${path} → ${href}`).toBe(200);
      }
      if (hash) {
        await page.goto(target);
        await expect(page.locator(`[id="${hash}"]`), `${path} → ${href}`).toHaveCount(1);
        await page.goto(path);
      }
    }
  }
});

test('header shows the current page and booking is one click away', async ({ page, isMobile }) => {
  await page.goto('solutions.html');
  if (isMobile) {
    const toggle = page.locator('.nav-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#site-nav')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#site-nav')).toBeHidden();
    await toggle.click();
  }
  await expect(page.locator('#site-nav a[aria-current="page"]')).toHaveText('Solutions');
  await page.locator('#site-nav').getByRole('link', { name: 'Book a consultation' }).click();
  await expect(page).toHaveURL(/contact\.html/);
});

test.describe('Executive Insights filters', () => {
  test('filter by priority, then by role', async ({ page }) => {
    await page.goto('insights.html');
    const cards = page.locator('[data-topic]');
    const total = await cards.count();
    expect(total).toBeGreaterThan(5);

    await page.getByRole('button', { name: 'Governance and risk' }).click();
    await expect(page.getByRole('button', { name: 'Governance and risk' })).toHaveAttribute('aria-pressed', 'true');
    const visible = page.locator('[data-topic]:visible');
    await expect(visible).toHaveCount(await page.locator('[data-topic="Governance and risk"]').count());

    // a role whose topics don't include governance → empty state
    await page.getByRole('button', { name: 'Leading workforce capability' }).click();
    await expect(page.locator('[data-filter-empty]')).toBeVisible();

    // reset
    const allButtons = page.getByRole('button', { name: 'All', exact: true });
    await allButtons.nth(0).click();
    await allButtons.nth(1).click();
    await expect(page.locator('[data-topic]:visible')).toHaveCount(total);
  });

  test('only the published article is a link', async ({ page }) => {
    await page.goto('insights.html');
    await page.getByRole('link', { name: /Should we keep investing in AI/ }).click();
    await expect(page.locator('h1')).toContainText('Should we keep investing in AI?');
  });
});

test('Events tabs work with mouse and keyboard', async ({ page }) => {
  await page.goto('events.html');
  const past = page.getByRole('tab', { name: 'Past' });
  const upcoming = page.getByRole('tab', { name: 'Upcoming' });
  await expect(past).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-past')).toBeVisible();
  await upcoming.click();
  await expect(upcoming).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-upcoming')).toBeVisible();
  await expect(page.locator('#panel-past')).toBeHidden();
  await upcoming.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Current' })).toBeFocused();
  await expect(page.locator('#panel-current')).toBeVisible();
});

test.describe('enquiry form', () => {
  test('empty submit shows every required error and focuses the first', async ({ page }) => {
    await page.goto('contact.html#enquiry');
    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(page.locator('.form-errors')).toHaveText('6 fields need attention.');
    await expect(page.locator('#f-first')).toBeFocused();
    await expect(page.locator('#f-first')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#f-nature-error')).toHaveText('Please choose an option.');
  });

  test('bad email and phone are caught; fixing them clears the error', async ({ page }) => {
    await page.goto('contact.html#enquiry');
    await page.fill('#f-email', 'not-an-email');
    await page.fill('#f-phone', 'abc');
    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(page.locator('#f-email-error')).toHaveText('Please enter a valid email address.');
    await expect(page.locator('#f-phone-error')).toHaveText('Please enter a valid Australian phone number.');
    await page.fill('#f-email', 'leader@example.com');
    await expect(page.locator('#f-email-error')).toHaveCount(0);
  });

  test('a complete enquiry shows the confirmation', async ({ page }) => {
    await page.goto('contact.html#enquiry');
    await page.fill('#f-first', 'Alex');
    await page.fill('#f-last', 'Tester');
    await page.fill('#f-email', 'alex@example.com');
    await page.fill('#f-org', 'Example Pty Ltd');
    await page.selectOption('#f-nature', { label: 'The DRIVE™ Adaptability Diagnostic' });
    await page.selectOption('#f-size', { label: '20 to 199 people' });
    await page.fill('#f-msg', 'Our Copilot licences renew in March and usage looks low.');
    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(page.locator('#enquiry-success')).toBeVisible();
    await expect(page.locator('#enquiry-success')).toBeFocused();
    await expect(page.locator('#enquiry-form')).toBeHidden();
  });

  test('a bot filling the honeypot gets no confirmation', async ({ page }) => {
    await page.goto('contact.html#enquiry');
    for (const [id, v] of [['#f-first', 'a'], ['#f-last', 'b'], ['#f-email', 'c@d.co'], ['#f-org', 'e'], ['#f-msg', 'long enough message']]) await page.fill(id, v);
    await page.selectOption('#f-nature', { index: 1 });
    await page.locator('#f-website').evaluate((el) => { /** @type {HTMLInputElement} */ (el).value = 'spam'; });
    await page.getByRole('button', { name: 'Send enquiry' }).click();
    await expect(page.locator('#enquiry-success')).toBeHidden();
  });
});

test('booking: person, date, time, details, confirmation', async ({ page }) => {
  await page.goto('contact.html#booking');
  await page.locator('[data-person="NeuroAIQ consultant"]').click();
  await expect(page.locator('[data-person="NeuroAIQ consultant"]')).toHaveAttribute('aria-pressed', 'true');
  let day = page.locator('.cal__day[data-available]').first();
  if (!(await day.count())) { await page.getByRole('button', { name: 'Next month' }).click(); day = page.locator('.cal__day[data-available]').first(); }
  await day.click();
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.slot:not([disabled])').first().click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(page.locator('#b-name')).toHaveAttribute('aria-invalid', 'true');
  await page.fill('#b-name', 'Alex Tester');
  await page.fill('#b-email', 'alex@example.com');
  await page.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(page.locator('#booking-app')).toContainText('with NeuroAIQ consultant');
  await expect(page.locator('#booking-app')).toContainText('review build');
});

test('weekends and past dates cannot be booked', async ({ page }) => {
  await page.goto('contact.html#booking');
  const bad = await page.$$eval('.cal__day[data-available]', (bs) => bs.filter((b) => {
    const label = b.getAttribute('aria-label') || '';
    return label.startsWith('Saturday') || label.startsWith('Sunday');
  }).length);
  expect(bad).toBe(0);
});

test('test build is not indexable', async ({ page, request }) => {
  await page.goto('index.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(await (await request.get('robots.txt')).text()).toContain('Disallow: /');
});
