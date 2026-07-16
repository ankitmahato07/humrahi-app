import { NextResponse } from "next/server";

// The app's internal Razorpay donate page was removed — all giving now runs
// through Seva Stack + the static site. This URL may still be indexed, so it
// must not 404: permanent-redirect it to the canonical static donate page.
export function GET() {
  return NextResponse.redirect("https://www.myhumrahi.org/donate.html", 308);
}
