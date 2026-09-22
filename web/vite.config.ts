import { defineConfig } from 'vite';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { pages, websiteSchema, productionOrigin as productionSiteUrl } from './src/seo';

const siteUrl = productionSiteUrl(
  process.env.PUBLIC_SITE_URL ?? ''
);

const production =
  process.env.CONTEXT === 'production' && !!siteUrl;

const site =
  siteUrl ? new URL(siteUrl) : null;

const basePath = site
  ? site.pathname.replace(/\/+$/, '')
  : '';

const viteBase =
  basePath ? `${basePath}/` : '/';

const expectedOrigin =
  site?.origin ?? '';

const esc = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');

function head(path: string) {
  const p = pages[path as keyof typeof pages];

  const url =
    siteUrl + (path === '/' ? '/' : path + '/');

  const runtimeRobotsGuard = `
<script>
(() => {
  const params = new URLSearchParams(location.search);

  const wrongHost =
    location.origin !== ${JSON.stringify(expectedOrigin)};

  const basePath =
    ${JSON.stringify(basePath)};

  const wrongBase =
    basePath &&
    !(
      location.pathname === basePath ||
      location.pathname.startsWith(basePath + '/')
    );

  if (
    wrongHost ||
    wrongBase ||
    params.has('review') ||
    params.has('exportReview')
  ) {
    document
      .querySelector('meta[name="robots"]')
      .setAttribute('content', 'noindex,nofollow');
  }
})();
</script>`;

  return (
    `<title>${p.title}</title>` +
    `<meta name="description" content="${esc(p.description)}">` +
    `<meta name="robots" content="${
      production ? 'index,follow' : 'noindex,nofollow'
    }">` +

    `<meta property="og:type" content="website">` +
    `<meta property="og:site_name" content="Health Data Vault">` +
    `<meta property="og:title" content="${p.title}">` +
    `<meta property="og:description" content="${esc(p.description)}">` +

    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${p.title}">` +
    `<meta name="twitter:description" content="${esc(p.description)}">` +

    (
      siteUrl
        ? `<link rel="canonical" href="${url}">` +
          `<meta property="og:url" content="${url}">` +
          `<meta property="og:image" content="${siteUrl}/og.png">` +
          `<meta property="og:image:width" content="1200">` +
          `<meta property="og:image:height" content="630">` +
          `<meta property="og:image:alt" content="Health Data Vault 新潟県の特定健診データ">` +
          `<meta name="twitter:image" content="${siteUrl}/og.png">`
        : ''
    ) +

    (
      path === '/' && siteUrl
        ? `<script type="application/ld+json">${
            JSON.stringify(
              websiteSchema(siteUrl)
            ).replaceAll('<', '\\u003c')
          }</script>`
        : ''
    ) +

    runtimeRobotsGuard
  );
}

export default defineConfig({
  base: viteBase,

  define: {
    __HDV_NETLIFY_FORMS__: JSON.stringify(process.env.NETLIFY === 'true'),
    __HDV_CONTACT_URL__: JSON.stringify(process.env.PUBLIC_CONTACT_URL ?? ''),
    __HDV_ORIGIN__: JSON.stringify(siteUrl),
    __HDV_PRODUCTION__: JSON.stringify(production),
  },

  plugins: [
    {
      name: 'hdv-static-head',
      apply: 'build',

      transformIndexHtml(html) {
        return html.replace(
          /<title>.*?<\/title>/,
          '<!--hdv-head-start-->' +
            head('/') +
            '<!--hdv-head-end-->'
        );
      },

      closeBundle() {
        if (process.env.VITEST) return;

        const base = readFileSync(
          'dist/index.html',
          'utf8'
        );

        for (
          const path of Object.keys(pages).filter(
            (p) => p !== '/'
          )
        ) {
          mkdirSync(`dist${path}`, {
            recursive: true,
          });

          writeFileSync(
            `dist${path}/index.html`,
            base.replace(
              /<!--hdv-head-start-->[\s\S]*?<!--hdv-head-end-->/,
              head(path)
            )
          );
        }

        writeFileSync(
          'dist/robots.txt',
          production
            ? `User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml
`
            : `User-agent: *
Disallow: /
`
        );

        writeFileSync(
          'dist/sitemap.xml',
          `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${
  production
    ? Object.keys(pages)
        .map(
          (p) =>
            `<url><loc>${siteUrl}${
              p === '/' ? '/' : p + '/'
            }</loc></url>`
        )
        .join('')
    : ''
}
</urlset>`
        );

        writeFileSync(
          'dist/_headers',
          production
            ? ''
            : `/*
  X-Robots-Tag: noindex, nofollow
`
        );
      },
    },
  ],
});
