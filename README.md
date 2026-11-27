# LA ODOR PROS Website

Static multi-page website for LA ODOR PROS, a Los Angeles ozone odor removal business.

Run `node preview.cjs` and open `http://127.0.0.1:8096/` to preview locally with working clean page URLs. All call buttons use `tel:424-553-9449`.

The local preview does not send email. It runs the estimate handler with a simulated email provider so form submissions can be tested through the thank-you redirect. Real delivery still requires the configured Vercel deployment.

Run `node --test tests/chatbot.cjs tests/redesign.cjs` for offline integration, metadata, route, and form checks. The redesign remains a local draft until approved for publishing.

## Lead Email Backend

Estimate forms and chat estimate requests submit to `/api/estimate`, a Vercel serverless function that emails leads to `laodorpros@gmail.com` through Resend.

Set these Vercel environment variables before relying on live form submissions:

- `RESEND_API_KEY`: your Resend API key.
- `LEAD_TO_EMAIL`: `laodorpros@gmail.com`
- `LEAD_FROM_EMAIL`: use `LA ODOR PROS <onboarding@resend.dev>` for testing. To send from a branded address later, verify a custom domain in Resend first.

## Pushover visitor alerts

Production secrets `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY` enable `/api/visitor`. The shared script waits four seconds on a visible page before sending the page path only (no query string, contact details, or IP address). Session storage and a secure session cookie suppress repeat page alerts. Common bot user agents are skipped. A one-minute per-function-instance throttle coalesces busy traffic; it is not a unique-visitor analytics counter or a global rate limit. Notifications use normal priority and do not affect forms or navigation.

## Free Estimate Pushover alerts

After email-provider acceptance, every estimate handler sends a normal-priority alert titled LA ODOR PROS — Free Estimate request. Only fixed service labels and allowlisted LA page paths are included; unknown values become Not specified and /. Existing production Pushover secrets are reused. Visitor cookies/throttling do not apply. Push delivery has a 3-second timeout and no retries; failures or absent credentials preserve email success and the Thank You redirect. The API response reports notification accepted/disabled/failed without customer data or secrets. Acceptance does not confirm inbox or phone delivery.

## Location in notifications

Visitor alerts use only Vercel city, country-region, and country headers; missing or malformed components read Unavailable. This is approximate network location, which VPNs, proxies, and mobile networks may distort. No IP, coordinates, or query parameters are sent. Existing visitor delay, suppression, filtering, and throttle remain unchanged.

All estimate forms offer optional City and ZIP/postal code. After email acceptance these explicitly entered values are included in estimate alerts, with length/character validation and Not provided fallbacks. They are never derived from street addresses or visitor geolocation. Full submitted details remain in business email. Push failures still preserve form success.
