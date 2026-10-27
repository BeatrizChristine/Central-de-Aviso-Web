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
    <div className="status-filter">
      <span>STATUS</span>
      <div className="status-filter-buttons" role="group" aria-label="Filtrar por status">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={value === option.value ? "active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
