# Humrahi App — Owner Guide

> This guide is written for **you, Ankit** — no technical knowledge assumed.
> Everything you need to run the app and admin panel day-to-day is here.

---

## What is this?

The Humrahi App is a second, separate website that lives at **app.myhumrahi.org**.
Your public website (myhumrahi.org) is untouched — this is a new layer on top.

It has two parts:

1. **The Humrahi dashboard** — what donors see when they sign in. Their impact, the current drive, the community wall.
2. **The Admin panel** (`app.myhumrahi.org/admin`) — what you see. Data, donors, volunteers, content.

---

## How to sign into the admin

1. Go to **app.myhumrahi.org/admin**
2. Enter your phone number — you'll receive a 6-digit SMS code
3. Type in the code → you're in

If your phone isn't recognized as an admin yet, ask your developer to run:
```
UPDATE humrahis SET role = 'admin' WHERE phone = '+91XXXXXXXXXX';
```
(just once, at setup)

---

## The Admin panel — section by section

### Overview (the home screen)
This is your **data dashboard**. You'll see:
- Total raised this month and all-time
- How many Humrahis have signed in
- Meals funded (approximate — always shown as ≈)
- The Visitor→Humrahi funnel — how many donors claimed their space
- Donations over time (area chart)
- Breakdown by fund — meals / health / school / general (donut chart)

**Nothing to do here** — it's for reading. Refresh it anytime.

---

### Donors
A searchable list of everyone who has donated and signed in as a Humrahi.

**What you can do:**
- Search by name or phone
- See their full donation history and lifetime total
- Read and write notes (e.g. "Called on 3 July — interested in volunteering")
- Tag donors (e.g. "lapsed 90d", "monthly", "first-time")
- See whether they've consented to recognition

**What you cannot do from here:**
- Change their donation records (Sevastack owns those)
- See their raw transaction details (Sevastack's portal has those)

---

### Volunteers
Every volunteer enquiry that comes in via the website form lands here.

The pipeline: **New → Contacted → Active → Closed**

**Your daily routine:**
1. Check for any "New" entries
2. Call or WhatsApp the person
3. Move their status to "Contacted"
4. When they start helping, move to "Active"
5. If they drop off, move to "Closed"

You can write notes on each person and assign them to a drive.

---

### Drives
Create and manage the **monthly Siliguri cohort** and specific drives (e.g. Winter Blanket Drive).

**To create a drive:**
1. Click "New drive"
2. Fill in: name, description, goal amount, start and end date
3. Choose type: Monthly cohort or Drive
4. Set status to "Active" when you're ready for it to appear on dashboards
5. Save

Donors' contributions are automatically added to participation counts when their donation syncs.

---

### Impact reveals
This is how you publish the "your gift became Tuesday's plates" moments — the most powerful thing you can do.

**To publish a reveal:**
1. Take a photo from the kitchen or camp (or get one from the volunteer)
2. Click "New reveal"
3. Upload the photo, write a short sentence (e.g. "312 plates, Siliguri District Hospital, Tuesday")
4. Choose a date ("served on")
5. Link to a drive if relevant
6. If this is for a specific donor, enter their name/phone (optional — a broadcast goes to everyone)
7. Click "Publish"

**Dignity rules (non-negotiable):**
- Never post a photo of a child alone without a parent's consent
- Never show faces of people receiving aid without consent
- Use first names only when the person has agreed
- When in doubt, photograph the food, not the people

---

### Content
Edit the words and numbers on your public website **without touching any code**.

**What you can edit:**
- Donation amounts (₹500 / ₹2,500 / ₹5,000) and their descriptions
- UPI ID, QR code image, bank account details
- Impact numbers on the homepage ("1,20,000+ meals")
- Contact phone and email
- Team members
- Press mentions
- Homepage "work" cards
- FAQ answers

**How it works:**
1. Edit the field
2. Click "Save & publish"
3. The change goes live on the public website within a few minutes

---

### Compliance
**Data access / erasure requests:**
When a Humrahi clicks "Request my data" or "Request erasure" from their account page, it shows up here.

You have 30 days to respond. Steps:
- For an **access request**: email them a copy of their record (name, phone, donations linked to them, consent choices) at wecare@myhumrahi.org
- For an **erasure request**: delete their humrahi profile (their linked donations become anonymous; Sevastack's records are separate)

**Reconciliation:**
A daily check compares our donation records against Sevastack's totals.
If there's a mismatch, it'll appear here with a flag. Write to Sevastack to resolve it.

**Audit log:**
Every time you view a donor profile or change donor data, it's recorded here with a timestamp. This is for compliance — you can't edit or delete these records.

---

## Setting up SMS (phone OTP) — one-time setup

For donors to sign in via phone, you need to:

1. Create a **Twilio account** at twilio.com (or use MessageBird / Vonage)
2. Get an Account SID and Auth Token
3. Register a sender ID with India's DLT system (mandatory for transactional SMS in India)
4. In the Supabase dashboard → Authentication → SMS Provider, enter Twilio credentials
5. Test by signing in with your own number

**WhatsApp OTP alternative:** Twilio also offers WhatsApp OTP — in India this often delivers better than SMS. Worth considering.

**Cost:** roughly ₹0.50–₹1 per OTP SMS. With ~100 new signups/month, that's under ₹100/month.

---

## Understanding the impact numbers

All impact figures are marked **≈** (approximately). Here's why:

- Your donation pays for ingredients, fuel, labour, logistics together
- We divide the total by a cost-per-meal (currently ₹45) to get an approximate meal count
- These rates are set by you in the "Content" section → "Impact conversion rates"
- Update them if your actual costs change

The dashboard always links to "how we count" so donors can read the methodology.

---

## Monthly routine (suggested)

| When | What |
|------|------|
| 1st of month | Create the new Monthly Cohort drive for Siliguri |
| During month | Check new volunteer enquiries 2–3× a week |
| After each kitchen/camp | Publish an impact reveal |
| End of month | Check the reconciliation view for any mismatches |
| Quarterly | Review impact rates against actual costs |

---

## Getting help

- **Email:** wecare@myhumrahi.org
- **Technical issues with the app:** share the error message with your developer
- **Supabase (database) support:** supabase.com/support
- **Sevastack support:** support@sevastack.in

---

*manavta ki ek nayi pehchaan*
*Humrahi Foundation · Siliguri, West Bengal*
