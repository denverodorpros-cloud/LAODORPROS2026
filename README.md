# LA ODOR PROS Website

Static multi-page website for LA ODOR PROS, a Los Angeles ozone odor removal business.

Open `index.html` in a browser to preview locally. All call buttons use `tel:424-553-9449`.

## Lead Email Backend

Estimate forms and chat estimate requests submit to `/api/estimate`, a Vercel serverless function that emails leads to `laodorpros@gmail.com` through Resend.

Set these Vercel environment variables before relying on live form submissions:

- `RESEND_API_KEY`: your Resend API key.
- `LEAD_TO_EMAIL`: `laodorpros@gmail.com`
- `LEAD_FROM_EMAIL`: use `LA ODOR PROS <onboarding@resend.dev>` for testing. To send from a branded address later, verify a custom domain in Resend first.
