/* ---------------- components/ProfileDrawer.jsx ----------------
 * The ONE place user information is edited. It works on a draft copy:
 * nothing changes until Save is pressed. Cancel, the ✕, the backdrop,
 * Escape / Android back or a refresh all leave the saved profile exactly as
 * it was (asking first if there are unsaved changes).
 *
 * Every other screen (Goal card, Body composition, Activity) shows these
 * values read-only and opens this drawer to change them.
 */
import { useEffect, useState } from 'react';
import { useDismiss } from '../lib/dismiss.js';
import { X, Download, Upload } from 'lucide-react';
import { goalsForAge } from '../lib/goals.js';
import { ACCENTS, DEFAULT_ACCENT } from '../lib/accents.js';
import { buildBackup, backupFilename, parseBackup, describeBackup } from '../lib/backup.js';
import { draftFromState, validateProfile, applyProfile, isDirty } from '../lib/profile.js';

/** A labelled on/off row. Used for the display and privacy switches, which
 *  are the controls that decide how much of this app is about your body. */
function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full min-h-[52px] items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition"
      style={{ background: 'var(--surface-solid)', borderColor: checked ? 'var(--primary)' : 'var(--border)' }}
    >
      <span className="flex flex-col">
        <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{label}</span>
        {hint && <span className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-dim)' }}>{hint}</span>}
      </span>
      <span className="relative h-6 w-11 shrink-0 rounded-full transition" style={{ background: checked ? 'var(--primary)' : 'var(--border-strong)' }}>
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: checked ? 22 : 2 }} />
      </span>
    </button>
  );
}

const inputStyle = { background: 'var(--bg-2, var(--surface))', borderColor: 'var(--border)', color: 'var(--text)' };

function Field({ id, label, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{label}</label>
      {children}
      {error
        ? <p role="alert" className="text-[11.5px] font-bold" style={{ color: 'var(--danger)' }}>{error}</p>
        : hint && <p className="text-[11.5px]" style={{ color: 'var(--text-faint)' }}>{hint}</p>}
    </div>
  );
}

function NumberInput({ id, value, onChange, placeholder, step = '0.1', error }) {
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={Boolean(error)}
      data-step={step}
      className="w-full min-h-[44px] rounded-xl border px-3 text-sm font-semibold outline-none"
      style={{ ...inputStyle, borderColor: error ? 'var(--danger)' : 'var(--border)' }}
    />
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3.5">
      <h3 className="border-b pb-1.5 text-[11px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ProfileDrawer({ state, update, isOpen, onClose }) {
  const [draft, setDraft] = useState(() => draftFromState(state));
  const [errors, setErrors] = useState({});
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState(false);

  // Fresh draft from the saved profile every time the drawer opens, so an
  // abandoned edit never leaks into the next one.
  useEffect(() => {
    if (isOpen) {
      setDraft(draftFromState(state));
      setErrors({});
      setBackupMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const dirty = isOpen && isDirty(state, draft);

  const requestClose = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onClose();
  };

  useDismiss(isOpen, requestClose);

  // Every hook must run before this early return, or the hook order changes
  // between renders when the drawer opens and closes.
  if (!isOpen) return null;

  const set = (field) => (value) => {
    setDraft((d) => ({ ...d, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const save = () => {
    const found = validateProfile(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    update((prev) => applyProfile(prev, draft));
    onClose();
  };

  const handleExportBackup = () => {
    try {
      const blob = new Blob([JSON.stringify(buildBackup(state), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFilename(state.currentDate);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupError(false);
      setBackupMessage('Backup downloaded.');
    } catch (err) {
      setBackupError(true);
      setBackupMessage(`Could not export: ${err.message}`);
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files && e.target.files[0];
    // Reset the input so re-picking the same file fires change again.
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      setBackupError(true);
      setBackupMessage('Could not read that file.');
    };
    reader.onload = () => {
      const result = parseBackup(String(reader.result));
      if (!result.ok) {
        setBackupError(true);
        setBackupMessage(result.error);
        return;
      }
      const { days, meals } = describeBackup(result.data);
      const ok = window.confirm(
        `Restore ${days} day${days === 1 ? '' : 's'} of history (${meals} logged item${meals === 1 ? '' : 's'})?\n\n` +
        'This replaces everything currently in this profile.'
      );
      if (!ok) return;
      // Keep the signed-in identity; a backup should never move data to a
      // different account than the one restoring it.
      update((prev) => ({ ...prev, ...result.data, email: prev.email, isOnboarded: true }));
      setBackupError(false);
      setBackupMessage(`Restored ${days} day${days === 1 ? '' : 's'} of history.`);
      onClose();
    };
    reader.readAsText(file);
  };

  const ageForGoals = Number(draft.age) || state.age;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="profile-editor-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={requestClose} />

      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full sm:pl-10">
        <div className="pointer-events-auto w-screen max-w-md">
          <div className="flex h-full flex-col shadow-2xl" style={{ background: 'var(--surface-solid)', borderLeft: '1px solid var(--border)' }}>
            <div className="flex shrink-0 items-center justify-between border-b px-5 pb-3 sm:px-6" style={{ borderColor: 'var(--border)', paddingTop: 'calc(var(--safe-top) + 14px)' }}>
              <div>
                <h2 id="profile-editor-title" className="text-[17px] font-black" style={{ color: 'var(--text)' }}>Edit profile</h2>
                <p className="text-[12px]" style={{ color: dirty ? 'var(--warning, #A56212)' : 'var(--text-faint)' }}>
                  {dirty ? 'Unsaved changes' : 'Changes apply when you press Save'}
                </p>
              </div>
              <button onClick={requestClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ color: 'var(--text-faint)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-6 drawer-scroll">
              <Section title="About you">
                <Field id="profile-name" label="Name">
                  <input
                    id="profile-name"
                    type="text"
                    value={draft.name}
                    onChange={(e) => set('name')(e.target.value)}
                    placeholder="Your name"
                    className="w-full min-h-[44px] rounded-xl border px-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </Field>

                <Field id="profile-gender" label="Gender">
                  <div className="segmented-group" id="profile-gender">
                    {[['male', 'Male'], ['female', 'Female'], ['', 'Rather not say']].map(([value, label]) => (
                      <button key={label} type="button" className={`segment-card py-2.5 ${draft.gender === value ? 'active' : ''}`} onClick={() => set('gender')(value)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field id="profile-age" label="Age (years)" error={errors.age}>
                    <NumberInput id="profile-age" value={draft.age} onChange={set('age')} placeholder="e.g. 24" error={errors.age} />
                  </Field>
                  <Field id="profile-height" label="Height (cm)" error={errors.height}>
                    <NumberInput id="profile-height" value={draft.height} onChange={set('height')} placeholder="e.g. 172" error={errors.height} />
                  </Field>
                </div>
              </Section>

              <Section title="Weight & goal">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="profile-weight" label="Current weight (kg)" error={errors.weight} hint="Saved as today's weigh-in">
                    <NumberInput id="profile-weight" value={draft.weight} onChange={set('weight')} placeholder="e.g. 70" error={errors.weight} />
                  </Field>
                  <Field id="profile-start-weight" label="Starting weight (kg)" error={errors.startWeight}>
                    <NumberInput id="profile-start-weight" value={draft.startWeight} onChange={set('startWeight')} placeholder="Optional" error={errors.startWeight} />
                  </Field>
                  <Field id="profile-goal-weight" label="Goal weight (kg)" error={errors.goalWeight}>
                    <NumberInput id="profile-goal-weight" value={draft.goalWeight} onChange={set('goalWeight')} placeholder="Optional" error={errors.goalWeight} />
                  </Field>
                  <Field id="profile-goal-date" label="Goal date" error={errors.goalTargetDate}>
                    <input
                      id="profile-goal-date"
                      type="date"
                      value={draft.goalTargetDate}
                      onChange={(e) => set('goalTargetDate')(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border px-3 text-sm outline-none"
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {/* The list is age-filtered, so weight-loss goals are simply not offered to under-18s. */}
                <Field id="profile-goal" label="Goal">
                  <div className="chip-grid" id="profile-goal">
                    {goalsForAge(ageForGoals).map((g) => (
                      <button key={g.id} type="button" className={`chip-card ${draft.goal === g.id ? 'active' : ''}`} onClick={() => set('goal')(g.id)}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field id="profile-activity" label="Activity level" hint="Used for your calorie target — Sedentary (little/no exercise) to Athlete (intense daily training).">
                  <div className="segmented-group flex-wrap" id="profile-activity">
                    {['Sedentary', 'Light', 'Moderate', 'Active', 'Athlete'].map((lvl) => (
                      <button key={lvl} type="button" className={`segment-card py-2.5 ${draft.activityLevel === lvl ? 'active' : ''}`} onClick={() => set('activityLevel')(lvl)}>
                        {lvl}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>

              <Section title="Privacy & display">
                <div className="flex flex-col gap-2">
                  <ToggleRow label="Track weight" hint="Show weight, goal weight and the trend chart." checked={draft.trackWeight} onChange={set('trackWeight')} />
                  <ToggleRow label="Body composition" hint="Body-fat estimates and the body reference photos." checked={draft.showBodyComposition} onChange={set('showBodyComposition')} />
                  <ToggleRow label="Wellbeing check-in" hint="Daily sleep, mood and energy." checked={draft.trackWellbeing} onChange={set('trackWellbeing')} />
                  <ToggleRow label="Cycle tracking" hint="Period and cycle phase alongside your logs." checked={draft.cycleEnabled} onChange={set('cycleEnabled')} />
                </div>

                <Field id="profile-accent" label="Accent colour">
                  <div className="flex flex-wrap gap-2.5" id="profile-accent">
                    {ACCENTS.map((a) => {
                      const active = (draft.accent || DEFAULT_ACCENT) === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => set('accent')(a.id)}
                          title={a.label}
                          aria-label={a.label}
                          aria-pressed={active}
                          className="h-10 w-10 rounded-full transition active:scale-95"
                          style={{ background: a.swatch, outline: active ? '2px solid var(--text)' : '1px solid var(--border)', outlineOffset: 2 }}
                        />
                      );
                    })}
                  </div>
                </Field>
              </Section>

              {/* Backup actions happen immediately; they are not part of the draft. */}
              <Section title="Backup">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleExportBackup} className="flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 text-[12.5px] font-bold" style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                    <Download size={14} /> Export backup
                  </button>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-[12.5px] font-bold" style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                    <Upload size={14} /> Restore from file
                    <input type="file" accept="application/json,.json" className="hidden" onChange={handleImportBackup} />
                  </label>
                </div>
                {backupMessage && (
                  <p className="text-[12px]" style={{ color: backupError ? 'var(--danger)' : 'var(--primary)' }}>{backupMessage}</p>
                )}
              </Section>
            </div>

            <div className="flex shrink-0 gap-2.5 border-t px-5 pt-3 sm:px-6" style={{ borderColor: 'var(--border)', paddingBottom: 'calc(14px + var(--safe-bottom))' }}>
              <button type="button" onClick={requestClose} className="min-h-[48px] flex-1 rounded-xl border text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty}
                className="min-h-[48px] flex-[2] rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--grad-primary-cta)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
