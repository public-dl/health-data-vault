# Contact form delivery

The contact page submits JSON to Web3Forms from the browser. Configuration
(endpoint, public access key, and subject) is centralized in
web/src/contact.tsx. The key is intended for use in the public form; it is not
a server credential.

The existing name (optional), email (required), category, message (required),
length limits, status messages, and styling are retained. The hidden botcheck
checkbox is a honeypot. A populated honeypot is rejected locally. HTTP success
and JSON success=true are both required before clearing the form.

Submission is enabled only in the configured production site/base path using
the existing indexable guard. Local development, preview builds, review and
exportReview remain disabled. No form values are logged or sent to analytics.

Netlify Forms attributes, the static forms.html detection page, and the
PUBLIC_CONTACT_URL redirect configuration have been removed. Earlier Netlify
deployment documents describe historical operation.

Tests intercept Web3Forms requests (no email is sent), covering native required
validation, payload, API failure/retry, success/reset, and review guards on
desktop and iPhone-sized Chromium. Actual delivery and recipient inbox
verification require a separately authorized real submission after deployment.

Reference: https://docs.web3forms.com/how-to-guides/html-and-javascript
