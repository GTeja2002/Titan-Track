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
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
      <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-dim)]">Your data</h4>
      <p className="text-[11px] text-[var(--text-dim)] font-medium">
        Download everything you have logged. JSON can be restored from the profile drawer; CSV opens in Excel or Google Sheets.
      </p>
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <button
          onClick={() => download(backupFilename(date), JSON.stringify(buildBackup(state), null, 2), 'application/json')}
          className="py-2 px-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)] transition"
        >
          Full backup (JSON)
        </button>
        <button
          onClick={() => download(`titantrack-meals-${date}.csv`, buildMealsCsv(state), 'text/csv')}
          className="py-2 px-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)] transition"
        >
          Meals (CSV)
        </button>
        <button
          onClick={() => download(`titantrack-daily-${date}.csv`, buildDailyCsv(state), 'text/csv')}
          className="py-2 px-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)] transition"
        >
          Daily summary (CSV)
        </button>
      </div>
    </div>
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
    <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
      <div className="flex justify-between items-center gap-3">
        <div>
          <p className="text-xs font-black text-rose-500">Delete account</p>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5 font-medium">
            Permanently deletes your account and every log, meal and custom food stored in the cloud. This cannot be undone.
          </p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="shrink-0 py-2 px-4 rounded-xl border border-rose-500/40 text-rose-500 text-xs font-bold">
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
          <div className="flex gap-2 text-xs font-bold">
            <button onClick={() => { setOpen(false); setTyped(''); }} className="py-2 px-4 rounded-xl border border-[var(--border)] text-[var(--text-dim)]">Cancel</button>
            <button
              onClick={confirm}
              disabled={typed !== 'DELETE' || busy}
              className="py-2 px-4 rounded-xl bg-rose-500 text-white disabled:opacity-40"
            >
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
