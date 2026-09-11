import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('manual entry can be saved and found in history', async ({ page }) => {
  await page.getByRole('button', { name: 'Manual entry' }).click();
  await page.getByLabel('Location').fill('LOC-A-01');
  await page.getByLabel('Item ID').fill('ITEM-0042');
  await page.getByLabel('Weight (kg)').fill('0');
  await page.getByRole('button', { name: 'Apply & lock' }).click();

  await expect(page.getByRole('heading', { name: 'Ready to record' })).toBeVisible();
  await expect(page.getByText('0.000 kg')).toBeVisible();
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByText('Record saved.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('ITEM-0042')).toBeVisible();
  await expect(page.getByText(/LOC-A-01/)).toBeVisible();
});

test('duplicate items require an explicit storage decision', async ({ page }) => {
  const enter = async (location: string, weight: string) => {
    await page.getByRole('button', { name: 'Manual entry' }).click();
    await page.getByLabel('Location').fill(location);
    await page.getByLabel('Item ID').fill('ITEM-DUPLICATE');
    await page.getByLabel('Weight (kg)').fill(weight);
    await page.getByRole('button', { name: 'Apply & lock' }).click();
    await page.getByRole('button', { name: 'Save record' }).click();
  };

  await enter('LOC-FIRST', '1.2');
  await enter('LOC-SECOND', '2.4');
  await expect(page.getByRole('heading', { name: 'ITEM-DUPLICATE already exists' })).toBeVisible();
  await page.getByRole('button', { name: 'Update latest' }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText(/LOC-SECOND/)).toBeVisible();
  await expect(page.getByText('2.400 kg')).toBeVisible();
  await expect(page.getByText(/LOC-FIRST/)).toHaveCount(0);
});

test('invalid manual identifiers receive usable errors', async ({ page }) => {
  await page.getByRole('button', { name: 'Manual entry' }).click();
  await page.getByLabel('Location').fill('WRONG');
  await page.getByLabel('Item ID').fill('ALSO-WRONG');
  await page.getByRole('button', { name: 'Apply & lock' }).click();
  await expect(page.getByText('Location does not match the configured rule.')).toBeVisible();
  await expect(page.getByText('Item ID does not match the configured rule.')).toBeVisible();
});

test('negative manual weights are rejected', async ({ page }) => {
  await page.getByRole('button', { name: 'Manual entry' }).click();
  await page.getByLabel('Location').fill('LOC-A');
  await page.getByLabel('Item ID').fill('ITEM-A');
  await page.getByLabel('Weight (kg)').fill('-1');
  await page.getByRole('button', { name: 'Apply & lock' }).click();
  await expect(page.getByText(/non-negative number/i)).toBeVisible();
});

test('duplicate updates use chronological rather than lexical timestamp order', async ({ page }) => {
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('trackAndTag.state.v2')!);
    state.records = [
      { id: 'oct', timestamp: '10/1/2025', location: 'LOC-OCT', item: 'ITEM-DATE', weight: 1 },
      { id: 'sep', timestamp: '9/1/2025', location: 'LOC-SEP', item: 'ITEM-DATE', weight: 2 },
    ];
    localStorage.setItem('trackAndTag.state.v2', JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Manual entry' }).click();
  await page.getByLabel('Location').fill('LOC-NEW');
  await page.getByLabel('Item ID').fill('ITEM-DATE');
  await page.getByLabel('Weight (kg)').fill('3');
  await page.getByRole('button', { name: 'Apply & lock' }).click();
  await page.getByRole('button', { name: 'Save record' }).click();
  await page.getByRole('button', { name: 'Update latest' }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText(/LOC-SEP/)).toBeVisible();
  await expect(page.getByText(/LOC-OCT/)).toHaveCount(0);
  await expect(page.getByText(/LOC-NEW/)).toBeVisible();
});

test('navigation and reset cannot race an in-flight print', async ({ page }) => {
  await page.addInitScript(() => {
    const characteristic = { properties: { writeWithoutResponse: true }, writeValueWithoutResponse: () => new Promise<void>(resolve => setTimeout(resolve, 75)) };
    const gatt = { connected: true, disconnect() { this.connected = false; }, async connect() { return { getPrimaryService: async () => ({ getCharacteristic: async () => characteristic }) }; } };
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: { requestDevice: async () => Object.assign(new EventTarget(), { gatt }) } });
  });
  await page.reload();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pwa-update', { detail: async () => undefined })));
  await expect(page.getByRole('button', { name: 'reload' })).toBeEnabled();
  await page.getByRole('button', { name: 'Manual entry' }).click();
  await page.getByLabel('Location').fill('LOC-PRINT');
  await page.getByLabel('Item ID').fill('ITEM-PRINT');
  await page.getByLabel('Weight (kg)').fill('1');
  await page.getByRole('button', { name: 'Apply & lock' }).click();
  await page.getByRole('button', { name: 'Print label' }).click();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'History' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'reload' })).toBeDisabled();
});
