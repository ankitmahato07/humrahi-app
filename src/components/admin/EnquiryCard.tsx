"use client";

import { useState, useTransition } from "react";
import type { Enquiry, EnquiryStatus } from "@/types/database";
import { updateEnquiryStatus, saveEnquiryNotes } from "@/app/admin/volunteers/actions";

const STATUSES: EnquiryStatus[] = ["New", "Contacted", "Active", "Closed"];

export function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
  const [notes, setNotes] = useState(enquiry.notes ?? "");
  const [savedMsg, setSavedMsg] = useState("");
  const [pending, startTransition] = useTransition();

  const created = new Date(enquiry.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const sourceLabel = (enquiry.source ?? "web").replace("web:", "");

  function flash(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 2000);
  }

  function onStatusChange(next: EnquiryStatus) {
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const res = await updateEnquiryStatus(enquiry.id, next);
      if (res.ok) flash("Status updated");
      else {
        setStatus(prev);
        flash("Could not update");
      }
    });
  }

  function onSaveNotes() {
    startTransition(async () => {
      const res = await saveEnquiryNotes(enquiry.id, notes);
      flash(res.ok ? "Notes saved" : "Could not save");
    });
  }

  return (
    <div className="rounded-card border border-taupe/40 bg-white shadow-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-lora text-lg text-ink leading-tight">{enquiry.name}</h3>
          <p className="text-xs text-taupe-dark mt-0.5">
            <span className="uppercase tracking-wide">{sourceLabel}</span> · {created}
          </p>
        </div>
      </div>

      <div className="text-sm text-soft space-y-1">
        {enquiry.phone && (
          <div>
            <span className="text-taupe-dark">Phone:</span>{" "}
            <a className="text-red hover:underline" href={`tel:${enquiry.phone}`}>
              {enquiry.phone}
            </a>
          </div>
        )}
        {enquiry.email && (
          <div>
            <span className="text-taupe-dark">Email:</span>{" "}
            <a className="text-red hover:underline" href={`mailto:${enquiry.email}`}>
              {enquiry.email}
            </a>
          </div>
        )}
        {enquiry.interest && (
          <div>
            <span className="text-taupe-dark">Interest:</span> {enquiry.interest}
          </div>
        )}
        {enquiry.availability && (
          <div>
            <span className="text-taupe-dark">Availability:</span> {enquiry.availability}
          </div>
        )}
      </div>

      {enquiry.message && (
        <p className="text-sm text-soft bg-whisper rounded-card p-2 border border-taupe/20 whitespace-pre-wrap">
          {enquiry.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <label htmlFor={`status-${enquiry.id}`} className="text-xs text-taupe-dark">
          Status
        </label>
        <select
          id={`status-${enquiry.id}`}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as EnquiryStatus)}
          disabled={pending}
          className="text-sm rounded-card border border-taupe/50 bg-white px-2 py-1 text-ink focus:border-ink focus:outline-none disabled:opacity-50"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (e.g. 'Called 3 July — keen on kitchen drives')"
          rows={2}
          className="w-full text-sm rounded-card border border-taupe/40 bg-whisper p-2 text-ink placeholder:text-taupe focus:border-ink focus:outline-none resize-y"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-taupe-dark h-4" aria-live="polite">
            {savedMsg}
          </span>
          <button
            onClick={onSaveNotes}
            disabled={pending || notes === (enquiry.notes ?? "")}
            className="text-xs px-3 py-1 rounded-card bg-ink text-white disabled:opacity-40 hover:bg-soft transition-colors"
          >
            Save notes
          </button>
        </div>
      </div>
    </div>
  );
}
