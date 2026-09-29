# GA4 page views

Measurement ID and allowed production URL are defined in `web/src/analytics.ts`.
Initialization runs once in `main.tsx`, independently of data loading. Native links
to `/`, `/learn/`, `/tables/`, and `/contact/` load a new document and record one
explicit `page_view`. Dashboard and table `history.replaceState` updates are not
page navigation and are not tracked. No history listener or custom event is added.

## Activation prerequisite

Before enabling analytics, turn **Enhanced Measurement OFF** in GA4 Admin → Data
streams → this web stream. The tag configuration inspected during implementation
had automatic history page views, scroll, site search, and video measurement on.
`send_page_view: false` alone does not disable Enhanced Measurement history events.
GA4-side data stream settings must remain off to prevent automatic events and URL
query collection. Do not enable user-provided data collection.

The site owner confirmed Enhanced Measurement was turned off during this task.
The publicly served tag was fetched again and no Enhanced Measurement configuration
entries remained.
The GitHub Pages build sets `PUBLIC_GA4_ENABLED=true`. Omission keeps
analytics disabled for other builds. Editing this workflow does not run or deploy it.
The existing production build context and Vite production mode are also required;
neither flag alone allows tracking on another host or preview environment.

Runtime checks reuse SEO `indexable`: exact HTTPS origin, the production base path,
and absence of `review` / `exportReview` parameters, irrespective of their values.
Only the four known page paths are accepted. Unknown paths are not tracked.

## Privacy and duplication

- Explicit page location contains only the fixed canonical origin/path, no query/hash.
- Page title comes from static page metadata; referrer is blank.
- No theme, indicator, region, year, form value or free text is read or sent.
- Script requests use `no-referrer` to avoid exposing the browser URL as Referer.
- Automatic config page views, Google signals and ad personalization signals are off.
- A per-window marker prevents duplicate initialization.
- GA4 still processes its normal technical analytics information and cookies; this
  is not an assertion that Google's SDK collects no technical device information.

E2E builds enable the flag but intercept the tag with an empty script and block
Analytics requests. They verify browser tag requests and the queued commands,
not receipt in GA4 Realtime. No test visit is sent to the real property.
Actual production delivery/Realtime verification requires a separately authorized
deployment after the GA4-side prerequisite is confirmed.

A separate browser check used the actual downloaded Google tag with all collection
requests intercepted locally: the top and learn pages each generated one
`page_view`, with canonical location, blank referrer and the configured measurement
ID. Updating the region/query did not generate another event. This validates the
SDK-generated request payload without sending visits to the live property.

Verification: 218 UI/unit tests passed; 74 E2E tests passed (37 desktop, 37 iPhone
equivalent), including six analytics browser cases. Application and E2E TypeScript
checks passed. Production `tsc && vite build` passed with the Pages environment
and analytics enabled. No commit, push, merge or production deployment performed.

References: [manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views),
[history page view settings](https://developers.google.com/analytics/devguides/collection/ga4/measure-spa-gtm),
[Enhanced Measurement](https://support.google.com/analytics/answer/9216061?hl=en).
