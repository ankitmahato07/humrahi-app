// Same-origin redirect guard. `next` comes from the URL, so it must be a
// relative path — reject absolute URLs and the "@evil.com" / "//evil.com" /
// "/\evil.com" tricks that turn `${origin}${next}` (or router.push(next)) into
// an off-site open redirect after a legitimate login.
export function safeNext(next: string | null | undefined): string {
  if (!next || next[0] !== "/" || next[1] === "/" || next[1] === "\\") return "/";
  return next;
}
