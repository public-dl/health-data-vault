import {indexable, pages} from './seo';

export const analyticsConfig = {
  measurementId: 'G-QJCHVX2XEW',
  siteUrl: 'https://public-dl.github.io/health-data-vault',
} as const;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __hdvAnalyticsStarted?: boolean;
};

/** Only known public pages are measured. Never copy search, hash or document.title. */
export function analyticsPage(url: URL, production: boolean) {
  if (!indexable(analyticsConfig.siteUrl, production ? 'production' : '', url.origin, url.search, url.pathname)) return null;
  const base = new URL(analyticsConfig.siteUrl).pathname;
  const path = url.pathname.slice(base.length).replace(/\/$/, '') || '/';
  if (!Object.prototype.hasOwnProperty.call(pages, path)) return null;
  return {
    page_location: analyticsConfig.siteUrl + (path === '/' ? '/' : path + '/'),
    page_title: pages[path as keyof typeof pages].title,
    // Referrers can contain search terms or form data, including on external sites.
    page_referrer: '',
  };
}

/** Call once per document, not for dashboard history.replaceState/filter updates. */
export function initializeAnalytics(win: AnalyticsWindow, production: boolean, enabled: boolean) {
  const page = analyticsPage(new URL(win.location.href), production);
  if (!enabled || !page || win.__hdvAnalyticsStarted) return false;
  win.__hdvAnalyticsStarted = true;
  win.dataLayer = win.dataLayer || [];
  win.gtag = function (..._args: unknown[]) { win.dataLayer!.push(arguments); };
  win.gtag('js', new Date());
  win.gtag('config', analyticsConfig.measurementId, {
    ...page,
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  win.gtag('event', 'page_view', {...page, send_to: analyticsConfig.measurementId});
  const script = win.document.createElement('script');
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.measurementId}`;
  win.document.head.append(script);
  return true;
}
