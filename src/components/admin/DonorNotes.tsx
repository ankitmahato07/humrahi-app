"use client";

import { useState, useTransition } from "react";
import { saveDonorNotes } from "@/app/admin/donors/actions";

export function DonorNotes({ id, initial }: { id: string; initial: string | null }) {
  const [notes, setNotes] = useState(initial ?? "");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const res = await saveDonorNotes(id, notes);
      setMsg(res.ok ? "Saved" : "Could not save");
      setTimeout(() => setMsg(""), 2000);
    });
  }

  return (
    <div className="border-t border-taupe/20 pt-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (e.g. 'monthly donor', 'called 3 July')"
        rows={2}
        className="w-full text-sm rounded-card border border-taupe/40 bg-whisper p-2 text-ink placeholder:text-taupe focus:border-ink focus:outline-none resize-y"
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-taupe-dark h-4" aria-live="polite">
          {msg}
        </span>
        <button
          onClick={onSave}
          disabled={pending || notes === (initial ?? "")}
          className="text-xs px-3 py-1 rounded-card bg-ink text-white disabled:opacity-40 hover:bg-soft transition-colors"
        >
          Save notes
        </button>
      </div>
    </div>
  );
}
