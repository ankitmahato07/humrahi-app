# WhatsApp OTP — fast-follow (post-launch)

Launch auth is **email magic-link** (`src/app/auth/login/LoginForm.tsx`). SMS is
removed. WhatsApp OTP is the owner's preferred next step; it can't gate launch
because it needs WhatsApp Business / Cloud API provisioning (lead time + review).

This note is the seam so swapping it in later is a small, well-scoped change.

## What's already in place
- `humrahis.phone` is **nullable** (migration `005_auth_email.sql`) and unique —
  so a phone can be attached to an existing email account later without a
  schema change.
- The login screen is a single provider component; adding a second path
  (WhatsApp) is additive.

## When the WhatsApp API is provisioned
1. **Provider.** Pick a Supabase-compatible route:
   - Supabase Phone Auth with a WhatsApp-capable SMS provider (e.g. a Twilio
     WhatsApp sender), configured in Dashboard → Authentication → Providers, or
   - A custom OTP: send the code via the WhatsApp Cloud API from an Edge
     Function and verify it against a short-lived store, then mint a session.
2. **Login UI.** In `LoginForm.tsx`, add a "Continue on WhatsApp" option that
   collects the phone (reuse the old `normalisePhone` +91 logic from git history
   at commit before this change) and calls `signInWithOtp({ phone })` /
   `verifyOtp({ phone, token, type: 'whatsapp' | 'sms' })`.
3. **Linking.** For an existing email user adding WhatsApp, update
   `humrahis.phone` on the profile (it's nullable + unique) and, if using
   Supabase phone identities, `supabase.auth.updateUser({ phone })`.
4. **Profile setup.** `SetupForm` already writes `phone` when present; no change
   needed beyond passing the verified number through.

## Do not
- Re-introduce SMS OTP for launch (owner decision; DLT registration + cost).
- Add points/badges/leaderboards (against brand + strategy).
