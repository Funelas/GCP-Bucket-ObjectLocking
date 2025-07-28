import dayjs from "dayjs";

export function calculateLockDuration(holdExpiry) {
  if (!holdExpiry) return "Indefinite";

  const now = dayjs();
  const expiry = dayjs(holdExpiry);
  if (expiry.diff(now, "second") <= 30) return "Indefinite";

  const diff = expiry.diff(now, "day");
  if (diff > 0) return `${diff} day(s) left`;
  if (diff === 0) return "Expires today";
  return `Expired ${Math.abs(diff)} day(s) ago`;
}