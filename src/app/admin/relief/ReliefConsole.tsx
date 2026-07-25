"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addBeneficiary,
  setBeneficiarySynced,
  setPledgeStatus,
  type PledgeStatus,
} from "./actions";

// Seva Stack designation for this drive — stamped on every exported row so the
// dashboard import lands under the right project.
const REF = "assam-flood-2026";

export type ReliefPledge = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  items: string;
  note: string | null;
  status: PledgeStatus;
  synced_to_sevastack_at: string | null;
};

export type ReliefBeneficiary = {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
  village: string | null;
  district: string | null;
  household_size: number | null;
  items_given: string;
  distributed_on: string;
  notes: string | null;
  recorded_by: string | null;
  synced_to_sevastack_at: string | null;
};

const NEXT_STATUS: Record<PledgeStatus, PledgeStatus> = {
  pledged: "received",
  received: "synced",
  synced: "pledged", // full circle — lets a mis-clicked "synced" be undone
};

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyLines(lines: string) {
  try {
    await navigator.clipboard.writeText(lines);
    return true;
  } catch {
    // Clipboard blocked (e.g. insecure context) — surface the text to copy manually.
    window.prompt("Copy these Seva Stack lines:", lines);
    return false;
  }
}

const btnPrimary =
  "rounded-card bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-soft disabled:opacity-50";
const btnGhost =
  "rounded-card border border-taupe/60 bg-white px-4 py-2 text-sm font-medium text-soft transition-colors hover:border-ink disabled:opacity-50";
const th = "px-3 py-2 font-semibold";
const field =
  "w-full rounded-card border border-taupe/60 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function ReliefConsole({
  pledges,
  beneficiaries,
}: {
  pledges: ReliefPledge[];
  beneficiaries: ReliefBeneficiary[];
}) {
  return (
    <div className="space-y-12">
      <PledgesSection rows={pledges} />
      <BeneficiariesSection rows={beneficiaries} />
    </div>
  );
}

// ── Goods pledges ────────────────────────────────────────────────────────────

function PledgesSection({ rows }: { rows: ReliefPledge[] }) {
  const [copied, setCopied] = useState(false);
  const unsynced = useMemo(() => rows.filter((r) => r.status !== "synced"), [rows]);

  async function onCopy() {
    const lines = unsynced.map((r) => `${r.name}, ${r.phone}, ${r.items}`).join("\n");
    if (await copyLines(lines)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function onCsv() {
    downloadCsv(
      `relief-pledges-${new Date().toISOString().slice(0, 10)}.csv`,
      ["name", "phone", "email", "city", "items", "status", "created_at", "ref"],
      rows.map((r) => [
        r.name,
        r.phone,
        r.email,
        r.city,
        r.items,
        r.status,
        r.created_at,
        REF,
      ])
    );
  }

  return (
    <section>
      <h2 className="font-lora text-xl text-ink">Goods pledges ({rows.length})</h2>
      <p className="mt-1 text-sm text-soft">
        In-kind pledges from the public. {unsynced.length} not yet in Seva Stack. Advance a row as
        the goods move: pledged → received (collected in Siliguri) → synced (entered in Seva Stack).
      </p>

      <div className="my-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onCopy} disabled={unsynced.length === 0} className={btnPrimary}>
          {copied ? "Copied ✓" : `Copy Seva Stack bulk lines (${unsynced.length})`}
        </button>
        <button type="button" onClick={onCsv} disabled={rows.length === 0} className={btnGhost}>
          Download CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <Empty>No goods pledges yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-card border border-sand bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left text-xs uppercase tracking-wider text-taupe-dark">
                <th className={th}>Name</th>
                <th className={th}>Phone</th>
                <th className={th}>Email</th>
                <th className={th}>City</th>
                <th className={th}>Items</th>
                <th className={th}>Created</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={
                    "border-b border-sand/60 " +
                    (r.status === "synced" ? "text-taupe-dark" : "text-ink")
                  }
                >
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.phone}</td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="px-3 py-2">{r.city ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.items}
                    {r.note ? <span className="block text-xs text-taupe-dark">{r.note}</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-taupe-dark">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusButton row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusButton({ row }: { row: ReliefPledge }) {
  const [pending, startTransition] = useTransition();
  const next = NEXT_STATUS[row.status];

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => void (await setPledgeStatus(row.id, next)))}
      disabled={pending}
      title={
        row.status === "synced"
          ? `Synced ${row.synced_to_sevastack_at ? formatDate(row.synced_to_sevastack_at) : ""} — click to reset to pledged`
          : `Mark ${next}`
      }
      className={
        "rounded-card px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 " +
        (row.status === "synced"
          ? "bg-green-700 text-white hover:bg-green-800"
          : row.status === "received"
            ? "border border-ink bg-white text-ink hover:bg-whisper"
            : "border border-taupe/60 bg-white text-soft hover:border-ink")
      }
    >
      {pending ? "…" : row.status === "synced" ? "synced ✓" : `${row.status} → ${next}`}
    </button>
  );
}

// ── Beneficiaries ────────────────────────────────────────────────────────────

function BeneficiariesSection({ rows }: { rows: ReliefBeneficiary[] }) {
  const [copied, setCopied] = useState(false);
  const unsynced = useMemo(() => rows.filter((r) => !r.synced_to_sevastack_at), [rows]);

  async function onCopy() {
    const lines = unsynced
      .map((r) => `${r.name}, ${r.phone ?? ""}, ${r.items_given}`)
      .join("\n");
    if (await copyLines(lines)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function onCsv() {
    downloadCsv(
      `relief-beneficiaries-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "name",
        "phone",
        "village",
        "district",
        "household_size",
        "items_given",
        "distributed_on",
        "ref",
      ],
      rows.map((r) => [
        r.name,
        r.phone,
        r.village,
        r.district,
        r.household_size,
        r.items_given,
        r.distributed_on,
        REF,
      ])
    );
  }

  return (
    <section>
      <h2 className="font-lora text-xl text-ink">Relief beneficiaries ({rows.length})</h2>
      <p className="mt-1 text-sm text-soft">
        People the relief goods reached. {unsynced.length} not yet in Seva Stack.
      </p>

      <BeneficiaryForm />

      <div className="my-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onCopy} disabled={unsynced.length === 0} className={btnPrimary}>
          {copied ? "Copied ✓" : `Copy Seva Stack bulk lines (${unsynced.length})`}
        </button>
        <button type="button" onClick={onCsv} disabled={rows.length === 0} className={btnGhost}>
          Download CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <Empty>No distributions recorded yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-card border border-sand bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left text-xs uppercase tracking-wider text-taupe-dark">
                <th className={th}>Name</th>
                <th className={th}>Phone</th>
                <th className={th}>Village</th>
                <th className={th}>District</th>
                <th className={th}>Household</th>
                <th className={th}>Items given</th>
                <th className={th}>Distributed</th>
                <th className={th}>Synced</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={
                    "border-b border-sand/60 " +
                    (r.synced_to_sevastack_at ? "text-taupe-dark" : "text-ink")
                  }
                >
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.phone ?? "—"}</td>
                  <td className="px-3 py-2">{r.village ?? "—"}</td>
                  <td className="px-3 py-2">{r.district ?? "—"}</td>
                  <td className="px-3 py-2">{r.household_size ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.items_given}
                    {r.notes ? (
                      <span className="block text-xs text-taupe-dark">{r.notes}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-taupe-dark">
                    {r.distributed_on}
                    {r.recorded_by ? (
                      <span className="block">by {r.recorded_by}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <SyncedToggle row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SyncedToggle({ row }: { row: ReliefBeneficiary }) {
  const [pending, startTransition] = useTransition();
  const synced = row.synced_to_sevastack_at !== null;

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => void (await setBeneficiarySynced(row.id, !synced)))}
      disabled={pending}
      title={synced ? "In Seva Stack — click to clear" : "Mark entered in Seva Stack"}
      className={
        "rounded-card px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 " +
        (synced
          ? "bg-green-700 text-white hover:bg-green-800"
          : "border border-taupe/60 bg-white text-soft hover:border-ink")
      }
    >
      {pending ? "…" : synced ? "synced ✓" : "mark synced"}
    </button>
  );
}

function BeneficiaryForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const input = {
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      village: String(fd.get("village") ?? ""),
      district: String(fd.get("district") ?? ""),
      household_size: String(fd.get("household_size") ?? ""),
      items_given: String(fd.get("items_given") ?? ""),
      distributed_on: String(fd.get("distributed_on") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    };
    startTransition(async () => {
      const res = await addBeneficiary(input);
      if (res.ok) {
        setError(null);
        form.reset();
      } else {
        setError(res.error ?? "save_failed");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 grid gap-3 rounded-card border border-sand bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Labelled label="Name *">
        <input name="name" required maxLength={200} className={field} />
      </Labelled>
      <Labelled label="Phone">
        <input name="phone" className={field} />
      </Labelled>
      <Labelled label="Village">
        <input name="village" className={field} />
      </Labelled>
      <Labelled label="District">
        <input name="district" defaultValue="Assam" className={field} />
      </Labelled>
      <Labelled label="Household size">
        <input name="household_size" type="number" min={1} className={field} />
      </Labelled>
      <Labelled label="Distributed on">
        <input name="distributed_on" type="date" className={field} />
      </Labelled>
      <Labelled label="Items given *" className="lg:col-span-2">
        <input name="items_given" required maxLength={2000} className={field} />
      </Labelled>
      <Labelled label="Notes" className="sm:col-span-2 lg:col-span-3">
        <input name="notes" maxLength={2000} className={field} />
      </Labelled>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Add beneficiary"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red sm:col-span-2 lg:col-span-4">Could not save: {error}</p>
      ) : null}
    </form>
  );
}

function Labelled({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={"block text-xs text-taupe-dark " + (className ?? "")}>
      <span className="mb-1 block uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-taupe/40 bg-whisper p-10 text-center">
      <p className="text-soft">{children}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
