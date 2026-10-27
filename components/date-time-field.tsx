"use client";

import { CalendarDays, X } from "lucide-react";
import { useId, useRef } from "react";

type DateTimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
};

export function DateTimeField({ label, value, onChange, min }: DateTimeFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  function openPicker() {
    const picker = input.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    picker?.showPicker?.();
    picker?.focus();
  }

  return (
    <label className="date-time-field" htmlFor={id}>
      <span>{label}</span>
      <div className="date-time-control">
        <CalendarDays size={17} />
        <input ref={input} id={id} type="datetime-local" value={value} min={min} onChange={(event) => onChange(event.target.value)} />
        {value && <button type="button" className="date-time-clear" onClick={() => onChange("")} aria-label={`Limpar ${label}`}><X size={14} /></button>}
        <button type="button" className="date-time-open" onClick={openPicker} aria-label={`Abrir calendário de ${label}`}><CalendarDays size={16} /></button>
      </div>
    </label>
  );
}
