import { AppSettings } from '../types/mis';

export const DEFAULT_SETTINGS: AppSettings = {
  currencySymbol: '₹',
  numberFormat: 'en-IN',
  strictDateValidation: true,
  autoTrimWhitespace: true,
  treatZeroAmountAsInvalid: true,
  organizationName: 'Apex Operations & MIS Division',
  preparedBy: 'MIS Operations Intern',
};

export function formatCurrency(
  amount: number | null | undefined,
  settings: AppSettings = DEFAULT_SETTINGS,
  showDecimals = false
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '—';
  }
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString(settings.numberFormat, {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${settings.currencySymbol}${formatted}`;
}

export function formatNumber(
  value: number | null | undefined,
  settings: AppSettings = DEFAULT_SETTINGS
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0';
  }
  return value.toLocaleString(settings.numberFormat);
}
