// All money VALUES come from the backend as pre-computed, fixed 2-decimal
// strings (see server/src/services/financeService.js) — this file only
// formats them for display. It never adds, subtracts, or otherwise does
// arithmetic on money, so there is no floating-point risk on the client.

const CURRENCY_SYMBOLS = { ILS: '₪' };

export function formatMoney(value, currency = 'ILS') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  const num = Number(value);
  const formatted = Number.isFinite(num)
    ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value;
  return `${symbol}${formatted}`;
}
