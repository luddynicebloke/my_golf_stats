function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Converts "YYYY-MM-DD" -> "YYYY/MM/DD"
export function toSlash(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${y}/${pad2(Number(m))}/${pad2(Number(d))}`;
}

// Converts "YYYY/MM/DD" -> "YYYY-MM-DD" (for putting back into <input type="date">)
export function toDash(slash: string) {
  const m = slash.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return "";
  const [, y, mm, dd] = m;
  return `${y}-${mm}-${dd}`;
}

// yyyy/mm/dd → dd/mm/yyyy
export function toDMYSlash(ymd: string) {
  return ymd.replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, "$3/$2/$1");
}

// dd/mm/yyyy → yyyy/mm/dd
export function toYMDSlash(dmy: string) {
  return dmy.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3/$2/$1");
}

// yyyy-mm-dd → dd-mm-yyyy
export function toDMYDash(ymd: string) {
  return ymd.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3-$2-$1");
}

// dd-mm-yyyy → yyyy-mm-dd
export function toYMDDash(dmy: string) {
  return dmy.replace(/^(\d{2})-(\d{2})-(\d{4})$/, "$3-$2-$1");
}
