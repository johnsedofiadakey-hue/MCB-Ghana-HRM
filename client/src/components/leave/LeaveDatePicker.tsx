import React, { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, isBefore, isWeekend, addMonths, subMonths, format, startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LeaveDatePickerProps {
  selectedDates: string[]; // 'yyyy-MM-dd'
  onChange: (dates: string[]) => void;
  holidays: Array<{ date: string | Date; name?: string }>;
  minDate?: Date;
}

const toKey = (d: Date) => format(d, 'yyyy-MM-dd');

const LeaveDatePicker: React.FC<LeaveDatePickerProps> = ({ selectedDates, onChange, holidays, minDate }) => {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(minDate || new Date()));

  const holidaySet = useMemo(
    () => new Set(holidays.map(h => toKey(new Date(h.date)))),
    [holidays]
  );
  const holidayNameByDate = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach(h => map.set(toKey(new Date(h.date)), h.name || 'Public holiday'));
    return map;
  }, [holidays]);

  const today = startOfDay(minDate || new Date());

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const toggleDay = (day: Date) => {
    const key = toKey(day);
    if (isBefore(day, today)) return;
    if (isWeekend(day)) return;
    if (holidaySet.has(key)) return;
    const next = selectedSet.has(key)
      ? selectedDates.filter(d => d !== key)
      : [...selectedDates, key].sort();
    onChange(next);
  };

  const removeDate = (key: string) => onChange(selectedDates.filter(d => d !== key));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)]">
            {format(viewMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth(m => addMonths(m, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
            <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {gridDays.map(day => {
            const key = toKey(day);
            const inMonth = isSameMonth(day, viewMonth);
            const isPast = isBefore(day, today);
            const weekend = isWeekend(day);
            const isHoliday = holidaySet.has(key);
            const disabled = isPast || weekend || isHoliday;
            const selected = selectedSet.has(key);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => toggleDay(day)}
                title={isHoliday ? holidayNameByDate.get(key) : undefined}
                className={cn(
                  'aspect-square rounded-lg text-[11px] font-bold flex items-center justify-center transition-all',
                  !inMonth && 'opacity-20',
                  disabled && 'opacity-25 cursor-not-allowed line-through',
                  !disabled && !selected && 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] cursor-pointer',
                  selected && 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/30',
                  isToday && !selected && 'ring-1 ring-[var(--primary)]/40',
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        <p className="text-[9px] text-[var(--text-muted)] mt-3 text-center">Weekends and public holidays are disabled automatically.</p>
      </div>

      {selectedDates.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
            {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map(key => (
              <span
                key={key}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-bold"
              >
                {format(new Date(`${key}T00:00:00`), 'EEE, MMM d')}
                <button type="button" onClick={() => removeDate(key)} aria-label={`Remove ${key}`} className="hover:opacity-60">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveDatePicker;
