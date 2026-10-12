# Odd-One Auth

Isolated premium-dark authentication UI for Odd-One. This starter is separate from `adionline15/odd-one`; it does not change or deploy the main site.

## Included
- Responsive cinematic login/signup interface
- Supabase email/password signup and sign-in
- Google OAuth initiation
- Password reset request
- Email verification messaging
- Accessible status messages and reduced-motion styling
- Static Node.js smoke tests

## Setup required before real auth works
1. Create or select a Supabase project intended for Odd-One authentication.
2. In `config.js`, set `supabaseUrl`, `supabaseAnonKey` (publishable key or legacy anon key), and `appUrl`.
3. Never put a Supabase secret/service-role key in browser code.
4. In Supabase Auth settings, set the site URL and allowed redirect URLs for the preview hostname and intended destination.
5. Enable Google provider in Supabase and configure the OAuth client in Google Cloud. Add Supabase's callback URL to the Google OAuth client.
6. Configure email delivery and test signup verification and password reset.
7. Test with a preview URL first. For preview, set `appUrl` to that preview URL so you don't unexpectedly redirect testers to production.

## Deployment safety
Deploy as a separate preview first. Only attach `auth.odd-one.in` after redirect allowlists, DNS, TLS and session flows are verified. Main production stays untouched until explicit approval.

The starter requests password-reset emails, but a dedicated recovery page/session completion flow must be built and tested before production release. A login UI alone does not secure Odd-One APIs; server-side authorization and database policies must also be verified.

## Run locally
```bash
python3 -m http.server 4173
```
Open `http://localhost:4173`. Valid Supabase config is needed for authentication calls.

## Tests
Node.js 20+:
```bash
npm test
```
