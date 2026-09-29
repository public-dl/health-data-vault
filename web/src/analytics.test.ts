import {describe, expect, it, vi} from 'vitest';
import {analyticsConfig, analyticsPage, initializeAnalytics} from './analytics';

const site = analyticsConfig.siteUrl;
describe('analytics privacy boundary', () => {
  it.each([
    'http://localhost:5173/health-data-vault/',
    'http://127.0.0.1:4399/health-data-vault/',
    'https://deploy-preview-1--health-data-vault.netlify.app/health-data-vault/',
    'https://health-data-vault.netlify.app/',
    'https://public-dl.github.io.evil.example/health-data-vault/',
    'http://public-dl.github.io/health-data-vault/',
    'https://public-dl.github.io/other/',
    site + '-preview/',
    site + '/unknown-person/',
    site + '/?review', site + '/?review=0',
    site + '/?exportReview', site + '/learn/?exportReview=false',
  ])('excludes %s', url => expect(analyticsPage(new URL(url), true)).toBeNull());

  it('rejects development/preview builds even on the production host', () => {
    expect(analyticsPage(new URL(site + '/'), false)).toBeNull();
  });
  it.each(['/', '/learn/', '/tables/', '/contact/'])('measures only the canonical route %s', path => {
    const page = analyticsPage(new URL(site + path + '?region=15202&message=private#secret'), true);
    expect(page?.page_location).toBe(site + path);
    expect(page?.page_referrer).toBe('');
    expect(JSON.stringify(page)).not.toMatch(/15202|private|secret/);
  });

  function browser(url = site + '/') {
    const append = vi.fn();
    const win = {
      location: {href: url},
      document: {createElement: () => ({}), head: {append}},
      dataLayer: [] as unknown[],
    };
    return {win: win as unknown as Parameters<typeof initializeAnalytics>[0], append};
  }
  it('initializes once, disables automatic page_view and queues one sanitized event', () => {
    const {win, append} = browser(site + '/?region=15202&message=private');
    expect(initializeAnalytics(win, true, true)).toBe(true);
    expect(initializeAnalytics(win, true, true)).toBe(false);
    const commands = win.dataLayer!.map(command => Array.from(command as ArrayLike<unknown>));
    expect(commands[1]).toEqual(['config', analyticsConfig.measurementId, expect.objectContaining({send_page_view:false, allow_google_signals:false, allow_ad_personalization_signals:false})]);
    expect(commands.filter(command => command[0] === 'event')).toEqual([
      ['event', 'page_view', expect.objectContaining({page_location:site + '/', page_referrer:'', send_to:analyticsConfig.measurementId})],
    ]);
    expect(JSON.stringify(commands)).not.toMatch(/15202|private/);
    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(expect.objectContaining({async:true, referrerPolicy:'no-referrer', src:`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.measurementId}`}));
  });
  it('does not create a script or queue when disabled, nonproduction or review', () => {
    for (const [production, enabled, url] of [[true,false,site+'/'],[false,true,site+'/'],[true,true,site+'/?review']] as const) {
      const {win, append} = browser(url);
      expect(initializeAnalytics(win, production, enabled)).toBe(false);
      expect(append).not.toHaveBeenCalled();
      expect(win.dataLayer).toEqual([]);
    }
  });
});
