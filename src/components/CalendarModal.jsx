/* ---------------- components/CalendarModal.jsx ---------------- */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString } from '../lib/date.js';

export function dayHasLog(logs, dateStr) {
  const l = logs[dateStr];
  if (!l) return false;
  return (!!l.foods && l.foods.length > 0) || l.walk > 0 || l.gym > 0 || l.weight > 0;
}

export function CalendarModal({ state, onSelectDate }) {
  const [open, setOpen] = useState(false);
  const [calDate, setCalDate] = useState(() => new Date(state.currentDate + 'T00:00:00'));

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const monthTitle = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calDate);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getLocalDateString();

  const changeMonth = (dir) => {
    setCalDate((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + dir);
      return n;
    });
  };

  const selectDate = (dateStr) => {
    onSelectDate(dateStr);
    setOpen(false);
  };

  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <>
      <button
        onClick={() => { setCalDate(new Date(state.currentDate + 'T00:00:00')); setOpen(true); }}
        className="glass flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition hover:scale-[1.02] active:scale-95"
      >
        <Calendar size={16} style={{ color: 'var(--primary)' }} />
        <span>{state.currentDate === todayStr ? 'Today' : state.currentDate}</span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        >
          <div className="glass w-full max-w-sm rounded-3xl p-6 animate-scale-in" style={{ background: 'var(--surface-solid)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} className="rounded-lg border p-1.5 transition hover:scale-105" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-base font-bold">{monthTitle}</h3>
              <button onClick={() => changeMonth(1)} className="rounded-lg border p-1.5 transition hover:scale-105" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {dayLabels.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold uppercase" style={{ color: 'var(--text-faint)' }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => <div key={`b-${i}`} />)}
              {days.map((d) => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = dateStr === state.currentDate;
                const isToday = dateStr === todayStr;
                const hasLog = dayHasLog(state.logs, dateStr);
                let dayStyle = { color: 'var(--text)' };
                if (isSelected) {
                  dayStyle = { background: 'var(--primary)', color: '#fff', fontWeight: 700, boxShadow: '0 2px 8px var(--primary-glow)' };
                } else if (hasLog) {
                  dayStyle = { background: 'var(--primary-soft)', border: '1px solid var(--primary-glow)', color: 'var(--primary)', fontWeight: 650 };
                }
                return (
                  <button
                    key={d}
                    onClick={() => selectDate(dateStr)}
                    className="relative aspect-square rounded-lg text-sm transition hover:scale-105"
                    style={dayStyle}
                  >
                    <span style={{ opacity: isToday && !isSelected ? 0.5 : 1, fontWeight: isToday ? 700 : 400 }}>{d}</span>
                    {hasLog && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style={{ background: isSelected ? '#fff' : 'var(--primary)' }} />
                    )}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setOpen(false)} className="mt-5 w-full rounded-xl py-2.5 font-semibold text-white transition hover:scale-[1.02]" style={{ background: 'var(--primary)' }}>
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
