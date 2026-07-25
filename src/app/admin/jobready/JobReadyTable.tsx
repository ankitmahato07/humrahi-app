"use client";

import { useMemo, useState, useTransition } from "react";
import { markInvited, setSevastackRegistered } from "./actions";

export type JobReadySignup = {
  id: string;
  created_at: string;
  full_name: string;
  whatsapp_phone: string;
  email: string | null;
  language: "bn" | "en";
  is_minor: boolean;
  guardian_consent: boolean;
  invited_to_sevastack: boolean;
  sevastack_registered_at: string | null;
};

export function JobReadyTable({ rows }: { rows: JobReadySignup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const unInvited = useMemo(() => rows.filter((r) => !r.invited_to_sevastack), [rows]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllUnInvited() {
    setSelected(new Set(unInvited.map((r) => r.id)));
  }

  // Rows to act on: explicit selection, else all un-invited.
  const targetRows = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : unInvited;

  async function copyBulkLines() {
    const lines = targetRows
      .map((r) => `${r.full_name}, ${r.whatsapp_phone}, ${r.email ?? ""}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — surface the text to copy manually.
      window.prompt("Copy these Seva Stack lines:", lines);
    }
  }

  function onMarkInvited() {
    const ids = targetRows.map((r) => r.id);
    if (ids.length === 0) return;
    startTransition(async () => {
      await markInvited(ids);
      setSelected(new Set());
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copyBulkLines}
          className="rounded-card bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-soft"
        >
          {copied ? "Copied ✓" : `Copy Seva Stack bulk lines (${targetRows.length})`}
        </button>
        <button
          type="button"
          onClick={onMarkInvited}
          disabled={pending || targetRows.length === 0}
          className="rounded-card border border-taupe/60 bg-white px-4 py-2 text-sm font-medium text-soft transition-colors hover:border-ink disabled:opacity-50"
        >
          {pending ? "Marking…" : `Mark invited (${targetRows.length})`}
        </button>
        <button
          type="button"
          onClick={selectAllUnInvited}
          className="text-sm text-taupe-dark underline hover:text-ink"
        >
          Select all un-invited ({unInvited.length})
        </button>
        <span className="text-xs text-taupe-dark">
          {selected.size > 0
            ? `${selected.size} selected`
            : "no selection → acts on all un-invited"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-card border border-sand bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wider text-taupe-dark">
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Phone</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Lang</th>
              <th className="px-3 py-2 font-semibold">Minor</th>
              <th className="px-3 py-2 font-semibold">Created</th>
              <th className="px-3 py-2 font-semibold">Invited</th>
              <th className="px-3 py-2 font-semibold">Registered</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={
                  "border-b border-sand/60 " +
                  (r.invited_to_sevastack ? "text-taupe-dark" : "text-ink")
                }
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="h-4 w-4 accent-red"
                  />
                </td>
                <td className="px-3 py-2">{r.full_name}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.whatsapp_phone}</td>
                <td className="px-3 py-2">{r.email ?? "—"}</td>
                <td className="px-3 py-2 uppercase">{r.language}</td>
                <td className="px-3 py-2">
                  {r.is_minor ? (r.guardian_consent ? "yes · consent ✓" : "yes · NO consent") : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-taupe-dark">
                  {new Date(r.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-3 py-2">
                  {r.invited_to_sevastack ? (
                    <span className="text-xs text-green-700">invited ✓</span>
                  ) : (
                    <span className="text-xs text-red">pending</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <RegisteredToggle row={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Per-row "confirmed in Seva Stack" toggle. Setting it stamps
// sevastack_registered_at (which unlocks the Wadhwani link in that person's
// logged-in dashboard); clearing it reverts to NULL.
function RegisteredToggle({ row }: { row: JobReadySignup }) {
  const [pending, startTransition] = useTransition();
  const registered = row.sevastack_registered_at !== null;

  function onToggle() {
    startTransition(async () => {
      await setSevastackRegistered(row.id, !registered);
    });
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      title={registered ? "Registered in Seva Stack — click to clear" : "Mark registered in Seva Stack"}
      className={
        "rounded-card px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 " +
        (registered
          ? "bg-green-700 text-white hover:bg-green-800"
          : "border border-taupe/60 bg-white text-soft hover:border-ink")
      }
    >
      {pending ? "…" : registered ? "registered ✓" : "mark registered"}
    </button>
  );
}
