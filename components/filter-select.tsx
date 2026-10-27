"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterOption[];
  onValueChange: (value: string) => void;
  compact?: boolean;
};

export function FilterSelect({ label, value, options, onValueChange, compact = false }: FilterSelectProps) {
  return (
    <div className={`filter-select${compact ? " filter-select-compact" : ""}`}>
      <span className="filter-select-label">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="filter-select-trigger" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align={compact ? "end" : "start"}
          sideOffset={5}
          className={`filter-select-content${compact ? " filter-select-content-compact" : ""}`}
        >
          {options.map((option) => (
            <SelectItem className="filter-select-option" key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
