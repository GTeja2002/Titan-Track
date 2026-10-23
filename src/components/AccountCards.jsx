/* ---------------- components/AccountCards.jsx ----------------
 * Settings blocks for data export and account deletion.
 */
import { useState } from 'react';
import { buildBackup, backupFilename, buildMealsCsv, buildDailyCsv } from '../lib/backup.js';

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataExportCard({ state }) {
  const date = state.currentDate;
  return (
    <section className="m-card space-y-3" aria-label="Your data">
      <h2 className="section-title">Your data</h2>
      <p className="text-[12.5px] text-[var(--text-dim)] font-medium leading-snug">
        Download everything you have logged. JSON can be restored from the profile drawer; CSV opens in Excel or Google Sheets.
      </p>
      <div className="grid grid-cols-1 gap-2 text-[13px] font-bold sm:grid-cols-3">
        <button
          onClick={() => download(backupFilename(date), JSON.stringify(buildBackup(state), null, 2), 'application/json')}
          className="min-h-[44px] px-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)] transition"
        >
          Full backup (JSON)
        </button>
        <button
          onClick={() => download(`titantrack-meals-${date}.csv`, buildMealsCsv(state), 'text/csv')}
          className="min-h-[44px] px-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)] transition"
        >
          Meals (CSV)
        </button>
        <button
          onClick={() => download(`titantrack-daily-${date}.csv`, buildDailyCsv(state), 'text/csv')}
          className="min-h-[44px] px-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)] transition"
        >
          Daily summary (CSV)
        </button>
      </div>
    </section>
  );
}

export function DeleteAccountCard({ onDelete }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await onDelete();
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="m-card space-y-3" style={{ borderColor: 'rgba(212,93,93,0.35)' }}>
      <div className="flex justify-between items-center gap-3">
        <div>
          <p className="text-[14.5px] font-bold text-rose-500">Delete account</p>
          <p className="text-[12px] text-[var(--text-dim)] mt-0.5 font-medium leading-snug">
            Permanently deletes your account and every log, meal and custom food stored in the cloud. This cannot be undone.
          </p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="shrink-0 min-h-[44px] px-4 rounded-xl border border-rose-500/40 text-rose-500 text-[13px] font-bold">
            Delete…
          </button>
        )}
      </div>
      {open && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-[var(--text)]">
            Download a backup first if you might want your data. Type DELETE to confirm.
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Type DELETE to confirm"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          {error && <p role="alert" className="text-[11px] font-bold text-rose-500">{error}</p>}
          <div className="flex gap-2 text-[13px] font-bold">
            <button onClick={() => { setOpen(false); setTyped(''); }} className="min-h-[44px] flex-1 px-4 rounded-xl border border-[var(--border)] text-[var(--text-dim)]">Cancel</button>
            <button
              onClick={confirm}
              disabled={typed !== 'DELETE' || busy}
              className="min-h-[44px] flex-1 px-4 rounded-xl bg-rose-500 text-white disabled:opacity-40"
            >
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
