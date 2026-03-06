import { expect, test } from '@playwright/test';
import path from 'path';

const HTML_PATH = path.resolve(__dirname, '../tools/excluded-areas-builder.html');
const TEST_IMAGE = path.resolve(__dirname, '../test-data/actual/youtube-play-button.png');

async function openPage(page: import('@playwright/test').Page) {
    await page.goto(`file://${HTML_PATH}`);
}

async function loadImage(page: import('@playwright/test').Page) {
    await page.locator('#file-input').setInputFiles(TEST_IMAGE);
    await page.locator('#image-wrapper').waitFor({ state: 'visible' });
}

async function drawRect(page: import('@playwright/test').Page, offsetX1: number, offsetY1: number, offsetX2: number, offsetY2: number) {
    const box = await page.locator('#svg-overlay').boundingBox();
    if (!box) throw new Error('svg-overlay not found');
    await page.mouse.move(box.x + offsetX1, box.y + offsetY1);
    await page.mouse.down();
    await page.mouse.move(box.x + offsetX2, box.y + offsetY2);
    await page.mouse.up();
}

// ── Initial state ──────────────────────────────────────────────────────────

test('page has correct title', async ({ page }) => {
    await openPage(page);
    await expect(page).toHaveTitle('Excluded Areas Builder');
});

test('drop zone is visible and image wrapper is hidden before loading', async ({ page }) => {
    await openPage(page);
    await expect(page.locator('#drop-zone')).toBeVisible();
    await expect(page.locator('#image-wrapper')).toBeHidden();
});

test('zoom buttons are disabled before loading an image', async ({ page }) => {
    await openPage(page);
    await expect(page.locator('#zoom-fit-btn')).toBeDisabled();
    await expect(page.locator('#zoom-in-btn')).toBeDisabled();
    await expect(page.locator('#zoom-out-btn')).toBeDisabled();
});

test('areas list shows empty hint and JSON shows [] before loading', async ({ page }) => {
    await openPage(page);
    await expect(page.locator('#empty-hint')).toBeVisible();
    await expect(page.locator('#json-output')).toHaveText('[]');
    await expect(page.locator('#area-count')).toHaveText('0');
});

// ── Image loading ──────────────────────────────────────────────────────────

test('loading an image hides drop zone and shows image wrapper', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await expect(page.locator('#drop-zone')).toBeHidden();
    await expect(page.locator('#image-wrapper')).toBeVisible();
});

test('loading an image enables zoom controls', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await expect(page.locator('#zoom-fit-btn')).toBeEnabled();
    await expect(page.locator('#zoom-in-btn')).toBeEnabled();
    await expect(page.locator('#zoom-out-btn')).toBeEnabled();
});

test('zoom label shows a percentage after loading an image', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await expect(page.locator('#zoom-label')).toHaveText(/%$/);
});

// ── Drawing rectangles ─────────────────────────────────────────────────────

test('drawing a rectangle adds an area to the sidebar', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    await expect(page.locator('#area-count')).toHaveText('1');
    await expect(page.locator('.area-item')).toHaveCount(1);
    await expect(page.locator('#empty-hint')).toBeHidden();
});

test('drawn rectangle gets a numbered SVG label', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    const label = page.locator('#svg-overlay text.area-rect').first();
    await expect(label).toHaveText('#1');
});

test('drawn rectangle creates an SVG rect with data-area-id', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    const rect = page.locator('#svg-overlay rect.area-rect').first();
    await expect(rect).toHaveAttribute('data-area-id');
});

test('area item in sidebar shows coordinate label', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    const item = page.locator('.area-item').first();
    await expect(item).toContainText('#1');
    // Coordinates follow the (x1,y1) → (x2,y2) format
    await expect(item).toContainText('→');
});

test('JSON output reflects drawn area with correct keys', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    const json = await page.locator('#json-output').textContent();
    const areas = JSON.parse(json!);
    expect(areas).toHaveLength(1);
    const [area] = areas;
    expect(area).toHaveProperty('x1');
    expect(area).toHaveProperty('y1');
    expect(area).toHaveProperty('x2');
    expect(area).toHaveProperty('y2');
    expect(area.x1).toBeLessThan(area.x2);
    expect(area.y1).toBeLessThan(area.y2);
    expect(area.x1).toBeGreaterThanOrEqual(0);
    expect(area.y1).toBeGreaterThanOrEqual(0);
});

test('JSON output contains only x1,y1,x2,y2 — no internal id field', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    const json = await page.locator('#json-output').textContent();
    const areas = JSON.parse(json!);
    const keys = Object.keys(areas[0]);
    expect(keys).toEqual(['x1', 'y1', 'x2', 'y2']);
});

test('drawing multiple rectangles numbers them sequentially', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 60, 50);
    await drawRect(page, 70, 10, 130, 50);
    await expect(page.locator('#area-count')).toHaveText('2');
    const labels = page.locator('#svg-overlay text.area-rect');
    await expect(labels).toHaveCount(2);
    await expect(labels.nth(0)).toHaveText('#1');
    await expect(labels.nth(1)).toHaveText('#2');
});

test('tiny drag (< 2px) does not create an area', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 11, 11);
    await expect(page.locator('#area-count')).toHaveText('0');
});

// ── Selection ──────────────────────────────────────────────────────────────

test('clicking an area item in sidebar selects it', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    const item = page.locator('.area-item').first();
    await item.click();
    await expect(item).toHaveClass(/selected/);
});

test('clicking a selected area item deselects it', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    const item = page.locator('.area-item').first();
    await item.click(); // select
    await item.click(); // deselect
    await expect(item).not.toHaveClass(/selected/);
});

test('pressing Escape deselects the selected area', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    await page.locator('.area-item').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.area-item').first()).not.toHaveClass(/selected/);
});

// ── Deletion ───────────────────────────────────────────────────────────────

test('clicking × button removes the area', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    await page.locator('.area-item .delete-btn').first().click();
    await expect(page.locator('#area-count')).toHaveText('0');
    await expect(page.locator('.area-item')).toHaveCount(0);
    await expect(page.locator('#empty-hint')).toBeVisible();
    await expect(page.locator('#json-output')).toHaveText('[]');
});

test('selecting an area and pressing Delete removes it', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    await page.locator('.area-item').first().click();
    await page.keyboard.press('Delete');
    await expect(page.locator('#area-count')).toHaveText('0');
    await expect(page.locator('#empty-hint')).toBeVisible();
});

test('selecting an area and pressing Backspace removes it', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    await page.locator('.area-item').first().click();
    await page.keyboard.press('Backspace');
    await expect(page.locator('#area-count')).toHaveText('0');
});

test('deleting one area renumbers the remaining areas', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 60, 50);
    await drawRect(page, 70, 10, 130, 50);
    // Delete the first area
    await page.locator('.area-item .delete-btn').first().click();
    await expect(page.locator('#area-count')).toHaveText('1');
    // Remaining item is now #1
    await expect(page.locator('.area-item').first()).toContainText('#1');
    await expect(page.locator('#svg-overlay text.area-rect').first()).toHaveText('#1');
});

test('Clear all button removes every area', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 60, 50);
    await drawRect(page, 70, 10, 130, 50);
    await page.locator('#clear-all-btn').click();
    await expect(page.locator('#area-count')).toHaveText('0');
    await expect(page.locator('.area-item')).toHaveCount(0);
    await expect(page.locator('#empty-hint')).toBeVisible();
    await expect(page.locator('#json-output')).toHaveText('[]');
});

test('Clear all button is disabled when there are no areas', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await expect(page.locator('#clear-all-btn')).toBeDisabled();
});

test('Clear all button is enabled after drawing an area', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    await expect(page.locator('#clear-all-btn')).toBeEnabled();
});

// ── Zoom ───────────────────────────────────────────────────────────────────

test('zoom-in button increases the zoom percentage', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    const before = await page.locator('#zoom-label').textContent();
    await page.locator('#zoom-in-btn').click();
    const after = await page.locator('#zoom-label').textContent();
    const pct = (s: string) => parseInt(s!.replace('%', ''), 10);
    expect(pct(after!)).toBeGreaterThan(pct(before!));
});

test('zoom-out button decreases the zoom percentage', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    // Zoom in first so there's room to zoom out
    await page.locator('#zoom-in-btn').click();
    const before = await page.locator('#zoom-label').textContent();
    await page.locator('#zoom-out-btn').click();
    const after = await page.locator('#zoom-label').textContent();
    const pct = (s: string) => parseInt(s!.replace('%', ''), 10);
    expect(pct(after!)).toBeLessThan(pct(before!));
});

test('fit button restores the zoom to the fit percentage', async ({ page }) => {
    await openPage(page);
    await loadImage(page);
    const fit = await page.locator('#zoom-label').textContent();
    await page.locator('#zoom-in-btn').click();
    await page.locator('#zoom-in-btn').click();
    await page.locator('#zoom-fit-btn').click();
    await expect(page.locator('#zoom-label')).toHaveText(fit!);
});

// ── Copy JSON ──────────────────────────────────────────────────────────────

test('copy button shows "Copied!" then reverts on successful clipboard write', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window.navigator, 'clipboard', {
            value: { writeText: () => Promise.resolve() },
            configurable: true,
            writable: true,
        });
    });
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    await page.locator('#copy-btn').click();
    await expect(page.locator('#copy-btn')).toHaveText('Copied!');
    await expect(page.locator('#copy-btn')).toHaveText('Copy', { timeout: 3000 });
});

test('copy button shows "Failed!" then reverts when clipboard write fails', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window.navigator, 'clipboard', {
            value: { writeText: () => Promise.reject(new Error('clipboard mock')) },
            configurable: true,
            writable: true,
        });
    });
    await openPage(page);
    await loadImage(page);
    await drawRect(page, 10, 10, 80, 60);
    await page.locator('#copy-btn').click();
    await expect(page.locator('#copy-btn')).toHaveText('Failed!');
    await expect(page.locator('#copy-btn')).toHaveText('Copy', { timeout: 3000 });
});
