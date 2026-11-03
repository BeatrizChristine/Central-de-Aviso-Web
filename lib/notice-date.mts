// O campo guarda o horário digitado, sem fuso. O offset explícito garante que a
// Intranet publique e expire o aviso no mesmo instante escolhido por quem o criou.
export function withLocalOffset(value: string) {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!parts) return value || null;

  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), Number(parts[4]), Number(parts[5]));
  const offsetMinutes = -date.getTimezoneOffset();
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${value}${offsetMinutes < 0 ? "-" : "+"}${hours}:${minutes}`;
}
