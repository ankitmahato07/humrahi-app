"use client";

import { useState, useTransition } from "react";
import { importDonationsCsv, type ImportResult } from "@/app/admin/donations/actions";

export function ImportDonations() {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function onImport() {
    setResult(null);
    startTransition(async () => {
      const res = await importDonationsCsv(csv);
      setResult(res);
      if (res.ok) setCsv("");
    });
  }

  return (
    <div className="rounded-card border border-taupe/40 bg-white shadow-card p-5">
      <h2 className="font-lora text-lg text-ink">Import donations (CSV)</h2>
      <p className="text-sm text-soft mt-1">
        Export your donations from Seva Stack and upload here. Columns are matched by name —
        it looks for a <span className="text-ink">receipt/transaction id</span>,{" "}
        <span className="text-ink">amount</span>, and (optionally) phone, email, date, fund,
        recurring. Re-uploading the same file is safe (no duplicates).
      </p>

      <div className="mt-4 space-y-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block text-sm text-soft file:mr-3 file:rounded-card file:border-0 file:bg-sand file:px-4 file:py-2 file:text-ink file:cursor-pointer"
        />
        <div className="text-xs text-taupe-dark">or paste CSV below</div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={5}
          placeholder="receipt_id,phone,email,amount,date,fund,recurring&#10;RC1001,9800011122,priya@example.com,2500,01/07/2026,meals,no"
          className="w-full text-sm font-mono rounded-card border border-taupe/40 bg-whisper p-3 text-ink placeholder:text-taupe focus:border-ink focus:outline-none resize-y"
        />
        <button
          onClick={onImport}
          disabled={pending || !csv.trim()}
          className="text-sm px-5 py-2 rounded-card bg-red text-white hover:bg-crimson disabled:opacity-40 transition-colors"
        >
          {pending ? "Importing…" : "Import donations"}
        </button>
      </div>

      {result && (
        <div
          className={
            "mt-4 rounded-card p-3 text-sm border " +
            (result.ok
              ? "border-taupe/40 bg-whisper text-soft"
              : "border-red/40 bg-red/5 text-red")
          }
        >
          {result.ok ? (
            <>
              <div className="text-ink font-medium">Import complete</div>
              <div className="mt-1">
                {result.processed} processed · {result.linked} linked to a Humrahi ·{" "}
                {result.skipped} skipped
              </div>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-taupe-dark">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            result.error
          )}
        </div>
      )}
    </div>
  );
}
