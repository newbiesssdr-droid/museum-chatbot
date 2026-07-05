// backend/utils/bookingHelper.js
export const generateBookingCode = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const parts = formatter.formatToParts(now);
  const getVal = (type) => parts.find(p => p.type === type).value;

  const yyyy = getVal("year");
  const month = getVal("month");
  const dd = getVal("day");
  const hh = getVal("hour");
  const mm = getVal("minute");
  const ss = getVal("second");

  const hhNormalized = hh === "24" ? "00" : hh;

  return `BKG-${hhNormalized}${mm}${ss}${dd}${month}${yyyy}`;
};
