-- Razorpay as a donation source (online donations via app.myhumrahi.org/donate).
-- Run on live: Supabase Dashboard → SQL Editor.
alter type donation_source add value if not exists 'razorpay';
