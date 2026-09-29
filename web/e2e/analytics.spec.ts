import {test, expect, open, choose, site} from './fixtures';
import {analyticsConfig} from '../src/analytics';

async function commands(page: import('@playwright/test').Page) {
  return page.evaluate(() => ((window as Window & {dataLayer?: ArrayLike<unknown>[]}).dataLayer ?? []).map(command => Array.from(command)));
}

test('production-equivalent page views are sanitized and filter updates do not send views', async ({page}) => {
  const tagRequests: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith('https://www.googletagmanager.com/gtag/js')) tagRequests.push(request.url());
  });
  await open(page);
  await expect.poll(() => tagRequests.length).toBe(1);
  expect(new URL(tagRequests[0]).searchParams.get('id')).toBe(analyticsConfig.measurementId);
  await choose(page, {year:'2022'});
  await page.evaluate(() => history.replaceState(null, '', '?region=15202&message=private#secret'));
  const queue = await commands(page);
  expect(queue.filter(command => command[0] === 'event')).toEqual([
    ['event','page_view',expect.objectContaining({page_location:site, page_referrer:'', send_to:analyticsConfig.measurementId})],
  ]);
  expect(JSON.stringify(queue)).not.toMatch(/15202|private|secret/);
  expect(queue[1][2]).toMatchObject({send_page_view:false});
  expect(tagRequests).toHaveLength(1);
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveAttribute('referrerpolicy','no-referrer');
});

test('native page navigation queues one view per destination document', async ({page}) => {
  await open(page);
  for (const route of ['learn','tables','contact']) {
    await page.locator(`header a[href$="/${route}/"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/${route}/$`));
    await expect.poll(async () => (await commands(page)).filter(command => command[0] === 'event').length).toBe(1);
    expect((await commands(page)).find(command => command[0] === 'event')?.[2]).toMatchObject({page_location:site + route + '/',page_referrer:''});
  }
});

test('review/exportReview and localhost never load Google tag', async ({page}) => {
  const requests: string[] = [];
  page.on('request', request => { if (/googletagmanager|google-analytics/.test(request.url())) requests.push(request.url()); });
  for (const url of [site+'?review',site+'?review=0',site+'?exportReview',site+'?exportReview=false','http://127.0.0.1:4399/health-data-vault/']) {
    await page.goto(url);
    await expect(page.getByRole('combobox',{name:'データを選ぶ',exact:true,includeHidden:true})).toBeAttached();
    expect(await commands(page)).toEqual([]);
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  }
  expect(requests).toEqual([]);
});
