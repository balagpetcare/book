const MONTHS_BN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function formatOperationalDate(date: Date | string | null | undefined): string {
  if (!date) return "Not yet";

  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_BN[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

export function formatOperationalTime(date: Date | string | null | undefined): string {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  const displayHours = d.getHours() % 12 || 12;

  return `${String(displayHours).padStart(2, "0")}:${mins} ${ampm}`;
}

export function formatOperationalDateCompact(date: Date | string | null | undefined): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_BN[d.getMonth()];
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  const displayHours = d.getHours() % 12 || 12;

  return `${day} ${month} · ${String(displayHours).padStart(2, "0")}:${mins} ${ampm}`;
}
