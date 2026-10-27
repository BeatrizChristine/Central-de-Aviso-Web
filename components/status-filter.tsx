import { FilterSelect } from "@/components/filter-select";

type StatusFilterValue = "all" | "active" | "inactive";

type StatusFilterProps = {
  value: string;
  onChange: (value: StatusFilterValue) => void;
};

const options: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <FilterSelect label="STATUS" value={value} options={options} onValueChange={(nextValue) => onChange(nextValue as StatusFilterValue)} />
  );
}
