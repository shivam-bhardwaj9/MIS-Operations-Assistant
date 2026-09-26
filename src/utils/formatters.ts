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

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function getFileTypeLabel(fileName: string): 'XLSX' | 'XLS' | 'CSV' | 'FILE' {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.xlsx')) return 'XLSX';
  if (lower.endsWith('.xls')) return 'XLS';
  if (lower.endsWith('.csv')) return 'CSV';
  return 'XLSX';
}
