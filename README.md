# LA ODOR PROS Website

Static multi-page website for LA ODOR PROS, a Los Angeles ozone odor removal business.

Open `index.html` in a browser to preview locally. All call buttons use `tel:424-553-9449`.

## Lead Email Backend

Estimate forms and chat estimate requests submit to `/api/estimate`, a Vercel serverless function that emails leads to `info@laodorpros.com` through Resend.

Set these Vercel environment variables before relying on live form submissions:

- `RESEND_API_KEY`: your Resend API key.
- `LEAD_TO_EMAIL`: `info@laodorpros.com`
- `LEAD_FROM_EMAIL`: use `LA ODOR PROS <onboarding@resend.dev>` for testing, then switch to a verified sender such as `LA ODOR PROS <info@laodorpros.com>` after the domain is verified in Resend.
