"use client";

import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, ChevronDown, Clock3, Eraser } from "lucide-react";
import { useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DateTimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseLocalDateTime(value?: string) {
  if (!value) return undefined;

  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!parts) return undefined;

  const date = new Date(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3]),
    Number(parts[4]),
    Number(parts[5]),
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getTime(value?: string) {
  return value?.match(/T(\d{2}:\d{2})/)?.[1];
}

function formatLocalValue(date: Date, time: string) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

function currentTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const displayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function DateTimeField({ label, value, onChange, min }: DateTimeFieldProps) {
  const selectedDate = useMemo(() => parseLocalDateTime(value), [value]);
  const minimumDate = useMemo(() => parseLocalDateTime(min), [min]);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | undefined>(selectedDate);
  const [draftTime, setDraftTime] = useState(getTime(value) ?? "08:00");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const now = new Date();
      const fallback = minimumDate && minimumDate > now ? minimumDate : now;
      const initialDate = selectedDate ?? fallback;
      setDraftDate(initialDate);
      setDraftTime(getTime(value) ?? getTime(min) ?? currentTime(initialDate));
    }

    setOpen(nextOpen);
  }

  function selectNow() {
    const now = new Date();
    const next = minimumDate && minimumDate > now ? minimumDate : now;
    setDraftDate(next);
    setDraftTime(currentTime(next));
  }

  const draftValue = draftDate ? formatLocalValue(draftDate, draftTime) : "";
  const isBeforeMinimum = Boolean(min && draftValue && draftValue < min);

  function applyValue() {
    if (!draftDate || isBeforeMinimum) return;
    onChange(draftValue);
    setOpen(false);
  }

  function clearValue() {
    onChange("");
    setDraftDate(undefined);
    setOpen(false);
  }

  return (
    <div className="date-time-field">
      <span className="date-time-label">{label}</span>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button type="button" className={`date-time-trigger${value ? " has-value" : ""}`}>
            <span className="date-time-trigger-icon"><CalendarDays size={17} /></span>
            <span className="date-time-trigger-copy">
              <strong>{selectedDate ? displayFormatter.format(selectedDate) : "Selecionar data e horário"}</strong>
              <small>{selectedDate ? "Clique para alterar" : "Nenhuma data definida"}</small>
            </span>
            <ChevronDown className="date-time-chevron" size={16} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" sideOffset={7} className="date-time-popover">
          <div className="date-time-popover-header">
            <span><CalendarDays size={17} /></span>
            <div>
              <strong>{label}</strong>
              <small>Escolha o dia e defina o horário</small>
            </div>
          </div>

          <Calendar
            mode="single"
            locale={ptBR}
            selected={draftDate}
            onSelect={setDraftDate}
            disabled={minimumDate ? { before: startOfDay(minimumDate) } : undefined}
            className="date-time-calendar"
          />

          <div className="date-time-time-row">
            <span className="date-time-clock"><Clock3 size={16} /></span>
            <label>
              <span>Horário</span>
              <input
                type="time"
                value={draftTime}
                onChange={(event) => setDraftTime(event.target.value)}
                aria-label={`Horário de ${label}`}
              />
            </label>
          </div>

          {isBeforeMinimum && (
            <p className="date-time-warning">Escolha um horário posterior à data de publicação.</p>
          )}

          <div className="date-time-actions">
            <button type="button" className="date-time-now" onClick={selectNow}>Agora</button>
            {value && (
              <button type="button" className="date-time-erase" onClick={clearValue}>
                <Eraser size={14} /> Limpar
              </button>
            )}
            <button type="button" className="date-time-apply" onClick={applyValue} disabled={!draftDate || isBeforeMinimum}>
              <Check size={14} /> Aplicar
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
