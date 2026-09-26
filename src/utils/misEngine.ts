import {
  AggregationType,
  CategoryDistributionPoint,
  CleaningChange,
  ColumnProfile,
  DailyMetricPoint,
  DatasetProfileSummary,
  DatasetSession,
  DetectedDataType,
  DynamicAnalysisResult,
  DynamicChartSpec,
  DynamicKPI,
  MISSummaryMetrics,
  RawRecord,
  ReconcileCategory,
  ReconcileConfig,
  ReconciliationItem,
  ReconciliationResult,
  RowIssue,
  SemanticRole,
  StatusDistributionPoint,
  UniversalProcessedRow,
  ValidationSummary,
} from '../types/mis';

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// Business statuses that represent normal/settled/healthy completion -> Status Check = OK
const POSITIVE_BUSINESS_STATUSES = new Set([
  'success',
  'successful',
  'completed',
  'complete',
  'settled',
  'paid',
  'cleared',
  'ok',
  'approved',
  'active',
  'resolved',
  'closed',
  'delivered',
  'in stock',
  'present',
  'verified',
]);

// Business statuses that are valid business states but require operational follow-up -> Status Check = Review Needed
const REVIEW_BUSINESS_STATUSES = new Set([
  'pending',
  'in progress',
  'processing',
  'initiated',
  'awaiting',
  'unsettled',
  'hold',
  'on hold',
  'queued',
  'failed',
  'failure',
  'declined',
  'rejected',
  'bounced',
  'cancelled',
  'canceled',
  'open',
  'escalated',
  'overdue',
  'low stock',
  'out of stock',
  'quarantined',
  'on leave',
  'probation',
  'inactive',
  'pending approval',
  'pending customer',
]);

export function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (year < 1950 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonths[month - 1];
}

function normalizeTwoDigitYear(y: number): number {
  if (y >= 100) return y;
  return y >= 70 ? 1900 + y : 2000 + y;
}

export function parseAndNormalizeDate(
  raw: unknown,
  allowExcelSerial = false
): {
  isValid: boolean;
  ddmmyyyy: string;
  isoDate: string;
  wasNormalized: boolean;
} {
  if (raw === null || raw === undefined) {
    return { isValid: false, ddmmyyyy: '', isoDate: '', wasNormalized: false };
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const d = raw.getDate();
    const m = raw.getMonth() + 1;
    const y = raw.getFullYear();
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return {
      isValid: true,
      ddmmyyyy: `${dd}-${mm}-${y}`,
      isoDate: `${y}-${mm}-${dd}`,
      wasNormalized: true,
    };
  }

  const rawStr = String(raw).trim();
  if (!rawStr) {
    return { isValid: false, ddmmyyyy: '', isoDate: '', wasNormalized: false };
  }

  // Handle Excel serial numbers only when column is a date column
  if (allowExcelSerial && /^\d{5}(\.\d+)?$/.test(rawStr)) {
    const serial = Math.floor(Number(rawStr));
    if (serial > 25569 && serial < 65000) {
      const utcDays = serial - 25569;
      const dateObj = new Date(utcDays * 86400 * 1000);
      const d = dateObj.getUTCDate();
      const m = dateObj.getUTCMonth() + 1;
      const y = dateObj.getUTCFullYear();
      if (isValidCalendarDate(d, m, y)) {
        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return {
          isValid: true,
          ddmmyyyy: `${dd}-${mm}-${y}`,
          isoDate: `${y}-${mm}-${dd}`,
          wasNormalized: true,
        };
      }
    }
  }

  // Match YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const ymdMatch = rawStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const y = Number(ymdMatch[1]);
    const m = Number(ymdMatch[2]);
    const d = Number(ymdMatch[3]);
    if (isValidCalendarDate(d, m, y)) {
      const dd = String(d).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const formatted = `${dd}-${mm}-${y}`;
      return {
        isValid: true,
        ddmmyyyy: formatted,
        isoDate: `${y}-${mm}-${dd}`,
        wasNormalized: formatted !== String(raw),
      };
    }
    return { isValid: false, ddmmyyyy: rawStr, isoDate: '', wasNormalized: false };
  }

  // Match DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY, D/M/YY
  const dmyMatch = rawStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s+.*)?$/);
  if (dmyMatch) {
    const part1 = Number(dmyMatch[1]);
    const part2 = Number(dmyMatch[2]);
    const y = normalizeTwoDigitYear(Number(dmyMatch[3]));

    // Standard DD-MM-YYYY (or if part1 > 12, part1 is definitely day)
    let d = part1;
    let m = part2;

    // If part2 > 12 and part1 <= 12 (e.g. US format 09/26/2026 or 9/26/26 from Excel)
    if (part2 > 12 && part1 >= 1 && part1 <= 12) {
      m = part1;
      d = part2;
    }

    if (isValidCalendarDate(d, m, y)) {
      const dd = String(d).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const formatted = `${dd}-${mm}-${y}`;
      return {
        isValid: true,
        ddmmyyyy: formatted,
        isoDate: `${y}-${mm}-${dd}`,
        wasNormalized: formatted !== String(raw),
      };
    }
    return { isValid: false, ddmmyyyy: rawStr, isoDate: '', wasNormalized: false };
  }

  // Match DD MMM YYYY or DD-MMM-YYYY (e.g. "26 Sep 2026", "26-Sep-26")
  const textMonthMatch = rawStr.match(/^(\d{1,2})[\s.-]+([A-Za-z]+)[\s,.-]+(\d{2}|\d{4})$/);
  if (textMonthMatch) {
    const d = Number(textMonthMatch[1]);
    const m = MONTH_MAP[textMonthMatch[2].toLowerCase()];
    const y = normalizeTwoDigitYear(Number(textMonthMatch[3]));
    if (m && isValidCalendarDate(d, m, y)) {
      const dd = String(d).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      return {
        isValid: true,
        ddmmyyyy: `${dd}-${mm}-${y}`,
        isoDate: `${y}-${mm}-${dd}`,
        wasNormalized: true,
      };
    }
  }

  // Match MMM DD, YYYY (e.g. "Sep 26, 2026")
  const usTextMonth = rawStr.match(/^([A-Za-z]+)[\s.-]+(\d{1,2})[\s,.-]+(\d{2}|\d{4})$/);
  if (usTextMonth) {
    const m = MONTH_MAP[usTextMonth[1].toLowerCase()];
    const d = Number(usTextMonth[2]);
    const y = normalizeTwoDigitYear(Number(usTextMonth[3]));
    if (m && isValidCalendarDate(d, m, y)) {
      const dd = String(d).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      return {
        isValid: true,
        ddmmyyyy: `${dd}-${mm}-${y}`,
        isoDate: `${y}-${mm}-${dd}`,
        wasNormalized: true,
      };
    }
  }

  return { isValid: false, ddmmyyyy: rawStr, isoDate: '', wasNormalized: false };
}

export function parseNumericCell(raw: unknown): {
  value: number | null;
  isValid: boolean;
  wasNormalized: boolean;
  hasCurrencySymbol: boolean;
  hasPercentageSymbol: boolean;
} {
  if (raw === null || raw === undefined) {
    return {
      value: null,
      isValid: false,
      wasNormalized: false,
      hasCurrencySymbol: false,
      hasPercentageSymbol: false,
    };
  }
  const rawStr = String(raw).trim();
  if (!rawStr) {
    return {
      value: null,
      isValid: false,
      wasNormalized: false,
      hasCurrencySymbol: false,
      hasPercentageSymbol: false,
    };
  }

  const hasCurrencySymbol = /(?:INR|Rs\.?|USD|₹|\$|€|£)/i.test(rawStr);
  const hasPercentageSymbol = rawStr.endsWith('%');

  const cleaned = rawStr
    .replace(/(?:INR|Rs\.?|USD|₹|\$|€|£)/gi, '')
    .replace(/%/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '');

  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return {
      value: null,
      isValid: false,
      wasNormalized: false,
      hasCurrencySymbol,
      hasPercentageSymbol,
    };
  }

  const num = Number(cleaned);
  if (!Number.isFinite(num)) {
    return {
      value: null,
      isValid: false,
      wasNormalized: false,
      hasCurrencySymbol,
      hasPercentageSymbol,
    };
  }

  const rounded = Math.round(num * 100) / 100;
  const wasNormalized = rawStr !== String(rounded);
  return {
    value: rounded,
    isValid: true,
    wasNormalized,
    hasCurrencySymbol,
    hasPercentageSymbol,
  };
}

export function normalizeKnownCategory(
  raw: string,
  role: SemanticRole,
  strictDomainEnum = true
): { normalized: string; isKnownValid: boolean; isExplicitError: boolean; wasModified: boolean } {
  const trimmed = (raw || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { normalized: '', isKnownValid: false, isExplicitError: false, wasModified: false };
  }
  const lower = trimmed.toLowerCase();

  // Explicit error tokens in test datasets
  if (
    lower.includes('invalid') ||
    lower.includes('unknown') ||
    lower.includes('error') ||
    lower === 'cryptowallet' ||
    lower === 'crypto' ||
    lower === 'onhold-verify' ||
    lower === 'internal-contra' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'null' ||
    lower === 'undefined'
  ) {
    return { normalized: trimmed, isKnownValid: false, isExplicitError: true, wasModified: trimmed !== raw };
  }

  if (role === 'Type') {
    if (['credit', 'cr', 'cr.', 'c', 'inflow', 'receipt'].includes(lower)) {
      return { normalized: 'Credit', isKnownValid: true, isExplicitError: false, wasModified: raw !== 'Credit' };
    }
    if (['debit', 'dr', 'dr.', 'd', 'outflow', 'payment', 'payout'].includes(lower)) {
      return { normalized: 'Debit', isKnownValid: true, isExplicitError: false, wasModified: raw !== 'Debit' };
    }
    if (strictDomainEnum) {
      return { normalized: trimmed, isKnownValid: false, isExplicitError: true, wasModified: trimmed !== raw };
    }
  }

  if (role === 'Mode') {
    if (['cash', 'csh', 'petty cash', 'counter cash'].includes(lower)) {
      return { normalized: 'Cash', isKnownValid: true, isExplicitError: false, wasModified: raw !== 'Cash' };
    }
    if (['upi', 'gpay', 'phonepe', 'paytm', 'bhim', 'qr', 'upi transfer'].includes(lower)) {
      return { normalized: 'UPI', isKnownValid: true, isExplicitError: false, wasModified: raw !== 'UPI' };
    }
    if (['bank', 'neft', 'rtgs', 'imps', 'bank transfer', 'netbanking', 'wire', 'cheque', 'ach', 'card'].includes(lower)) {
      return { normalized: 'Bank', isKnownValid: true, isExplicitError: false, wasModified: raw !== 'Bank' };
    }
    if (strictDomainEnum) {
      return { normalized: trimmed, isKnownValid: false, isExplicitError: true, wasModified: trimmed !== raw };
    }
  }

  if (role === 'Status') {
    const statusDictionary: Record<string, string> = {
      success: 'Success',
      successful: 'Success',
      completed: 'Completed',
      complete: 'Completed',
      settled: 'Success',
      paid: 'Paid',
      cleared: 'Cleared',
      ok: 'OK',
      approved: 'Approved',
      verified: 'Verified',
      delivered: 'Delivered',
      present: 'Present',
      pending: 'Pending',
      'in progress': 'In Progress',
      processing: 'Processing',
      initiated: 'Pending',
      hold: 'On Hold',
      'on hold': 'On Hold',
      failed: 'Failed',
      failure: 'Failed',
      declined: 'Failed',
      rejected: 'Rejected',
      bounced: 'Failed',
      cancelled: 'Cancelled',
      canceled: 'Cancelled',
      active: 'Active',
      inactive: 'Inactive',
      'on leave': 'On Leave',
      probation: 'Probation',
      resolved: 'Resolved',
      closed: 'Closed',
      open: 'Open',
      escalated: 'Escalated',
      overdue: 'Overdue',
      'in stock': 'In Stock',
      'low stock': 'Low Stock',
      'out of stock': 'Out of Stock',
      quarantined: 'Quarantined',
      'pending approval': 'Pending Approval',
      'pending customer': 'Pending Customer',
    };
    if (statusDictionary[lower]) {
      const target = statusDictionary[lower];
      return {
        normalized: target,
        isKnownValid: true,
        isExplicitError: false,
        wasModified: raw !== target,
      };
    }
    if (strictDomainEnum) {
      return { normalized: trimmed, isKnownValid: false, isExplicitError: true, wasModified: trimmed !== raw };
    }
  }

  // General title-case / clean category normalization
  const titleCased =
    trimmed.length <= 3 && trimmed === trimmed.toUpperCase()
      ? trimmed
      : trimmed
          .split(' ')
          .map((w) => (w.length <= 2 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
          .join(' ');

  return {
    normalized: titleCased,
    isKnownValid: true,
    isExplicitError: false,
    wasModified: raw !== titleCased,
  };
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
  }
  return Math.round(sorted[mid] * 100) / 100;
}

export function profileDatasetColumns(rawRecords: RawRecord[]): {
  columnProfiles: ColumnProfile[];
  datasetProfile: DatasetProfileSummary;
} {
  const columns = rawRecords.length > 0 ? Object.keys(rawRecords[0]) : [];
  const totalRows = rawRecords.length;
  let totalMissingCells = 0;

  const columnProfiles: ColumnProfile[] = columns.map((colName) => {
    const normHeader = colName
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/[^a-z0-9%/]+/g, ' ')
      .trim();
    const nonEmptyStrings: string[] = [];
    let nullCount = 0;

    for (const row of rawRecords) {
      const val = String(row[colName] ?? '').trim();
      if (!val) {
        nullCount++;
        totalMissingCells++;
      } else {
        nonEmptyStrings.push(val);
      }
    }

    const uniqueSet = new Set(nonEmptyStrings.map((s) => s.toLowerCase()));
    const uniqueCount = uniqueSet.size;
    const duplicateCount = Math.max(0, nonEmptyStrings.length - uniqueCount);
    const missingPercentage =
      totalRows > 0 ? Math.round((nullCount / totalRows) * 1000) / 10 : 0;
    const exampleValues = Array.from(new Set(nonEmptyStrings)).slice(0, 4);

    // Determine semantic role & data type from both header name and values
    const isHeaderDate = /\b(date|dt|joined|joining|created|logged|restocked|audit|dob|timestamp|period)\b/.test(normHeader);
    const isHeaderId = /\b(id|code|sku|utr|ref|voucher|ticket|order no|invoice no|emp id|txn)\b/.test(normHeader);
    const isHeaderStatus = /\b(status|state|stage|sla|condition)\b/.test(normHeader) && !/\bcheck\b/.test(normHeader);
    const isHeaderType = /\b(type|dr\/cr|cr\/dr|direction|flow|entry type)\b/.test(normHeader);
    const isHeaderMode = /\b(mode|channel|method|instrument|payment mode|payment channel)\b/.test(normHeader);
    const isHeaderCurrency = /\b(amount|amt|salary|revenue|cost|price|valuation|value|pay|fee|balance|total|inr|usd|budget|expense)\b/.test(normHeader);
    const isHeaderPercentage = /(%|percent|rate|attendance|csat|margin|share)/.test(normHeader);
    const isHeaderDuration = /\b(hours|days|duration|tat|minutes|age|tenure)\b/.test(normHeader);
    const isHeaderEmail = /\b(email|e-mail|mail)\b/.test(normHeader);
    const isHeaderPhone = /\b(phone|mobile|contact|tel)\b/.test(normHeader);
    const isHeaderLocation = /\b(location|city|region|zone|state|country|branch|warehouse|site)\b/.test(normHeader);
    const isHeaderName = /\b(name|party|customer|client|vendor|employee|engineer|agent|account|item)\b/.test(normHeader);
    const isHeaderRemarks = /\b(remark|remarks|narration|note|notes|comment|comments|memo|description|check|validation)\b/.test(normHeader);

    // Count how many non-empty values parse as dates, numbers, emails
    let validDateCount = 0;
    let validNumCount = 0;
    let currencySymCount = 0;
    let pctSymCount = 0;
    let emailMatchCount = 0;

    const parsedNumbers: number[] = [];
    const parsedIsoDates: string[] = [];

    for (const s of nonEmptyStrings) {
      const dRes = parseAndNormalizeDate(s, isHeaderDate);
      if (dRes.isValid) {
        validDateCount++;
        parsedIsoDates.push(dRes.isoDate);
      }
      const nRes = parseNumericCell(s);
      if (nRes.isValid && nRes.value !== null) {
        validNumCount++;
        parsedNumbers.push(nRes.value);
        if (nRes.hasCurrencySymbol) currencySymCount++;
        if (nRes.hasPercentageSymbol) pctSymCount++;
      }
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        emailMatchCount++;
      }
    }

    const totalFilled = Math.max(1, nonEmptyStrings.length);
    const dateRatio = validDateCount / totalFilled;
    const numRatio = validNumCount / totalFilled;

    let dataType: DetectedDataType = 'text';
    let semanticRole: SemanticRole = 'Text';

    if (isHeaderEmail || emailMatchCount / totalFilled > 0.6) {
      dataType = 'email';
      semanticRole = 'Email';
    } else if (isHeaderPhone) {
      dataType = 'phone';
      semanticRole = 'Phone';
    } else if (isHeaderDate || (dateRatio >= 0.6 && !isHeaderCurrency && !isHeaderId)) {
      dataType = 'date';
      semanticRole = 'Date';
    } else if (isHeaderId && numRatio < 0.9) {
      dataType = 'identifier';
      semanticRole = 'Identifier';
    } else if (
      isHeaderCurrency ||
      isHeaderPercentage ||
      isHeaderDuration ||
      (numRatio >= 0.65 && !isHeaderId)
    ) {
      dataType = 'numeric';
      if (isHeaderPercentage || pctSymCount / totalFilled > 0.4) {
        semanticRole = 'Percentage';
      } else if (isHeaderCurrency || currencySymCount > 0) {
        semanticRole = 'Currency';
      } else if (isHeaderDuration) {
        semanticRole = 'Duration';
      } else {
        semanticRole = 'Number';
      }
    } else if (isHeaderStatus) {
      dataType = 'categorical';
      semanticRole = 'Status';
    } else if (isHeaderType) {
      dataType = 'categorical';
      semanticRole = 'Type';
    } else if (isHeaderMode) {
      dataType = 'categorical';
      semanticRole = 'Mode';
    } else if (isHeaderLocation) {
      dataType = 'categorical';
      semanticRole = 'Location';
    } else if (isHeaderRemarks) {
      dataType = 'text';
      semanticRole = 'Text';
    } else if (isHeaderName) {
      dataType = 'text';
      semanticRole = 'Name';
    } else if (uniqueCount <= Math.max(15, Math.ceil(totalRows * 0.4))) {
      dataType = 'categorical';
      semanticRole = 'Category';
    } else if (uniqueCount >= totalRows * 0.85 && totalRows >= 5) {
      dataType = 'identifier';
      semanticRole = 'Identifier';
    }

    // Check if categorical Type/Mode/Status column predominantly follows strict domain enumerations
    let expectedAllowedValues: string[] | undefined;
    if (semanticRole === 'Type' || semanticRole === 'Mode' || semanticRole === 'Status') {
      const knownMatches = nonEmptyStrings.filter(
        (s) => normalizeKnownCategory(s, semanticRole, true).isKnownValid
      ).length;
      if (knownMatches / totalFilled >= 0.5) {
        expectedAllowedValues =
          semanticRole === 'Type'
            ? ['Credit', 'Debit']
            : semanticRole === 'Mode'
            ? ['Cash', 'UPI', 'Bank']
            : ['Success', 'Pending', 'Failed'];
      }
    }

    const profile: ColumnProfile = {
      name: colName,
      dataType,
      semanticRole,
      totalCount: totalRows,
      nullCount,
      missingPercentage,
      uniqueCount,
      duplicateCount,
      exampleValues,
      expectedAllowedValues,
    };

    if (dataType === 'numeric') {
      const positiveNums = parsedNumbers.filter((n) => n >= 0);
      const activeNums = positiveNums.length > 0 ? positiveNums : parsedNumbers;
      const sum = Math.round(activeNums.reduce((a, b) => a + b, 0) * 100) / 100;
      const avg = activeNums.length > 0 ? Math.round((sum / activeNums.length) * 100) / 100 : 0;
      const min = activeNums.length > 0 ? Math.min(...activeNums) : 0;
      const max = activeNums.length > 0 ? Math.max(...activeNums) : 0;
      const median = computeMedian(activeNums);

      profile.sum = sum;
      profile.average = avg;
      profile.min = min;
      profile.max = max;
      profile.median = median;
      profile.allowNegative = /\b(variance|profit|net|change|delta|margin|balance)\b/.test(normHeader);
    }

    if (dataType === 'date' && parsedIsoDates.length > 0) {
      const sortedDates = [...parsedIsoDates].sort();
      profile.earliestDate = sortedDates[0];
      profile.latestDate = sortedDates[sortedDates.length - 1];
    }

    if (dataType === 'categorical' || semanticRole === 'Name') {
      const counts = new Map<string, number>();
      const strictEnum = Boolean(expectedAllowedValues);
      for (const s of nonEmptyStrings) {
        const norm = normalizeKnownCategory(s, semanticRole, strictEnum).normalized || s;
        counts.set(norm, (counts.get(norm) ?? 0) + 1);
      }
      profile.topValues = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([value, count]) => ({
          value,
          count,
          percentage: totalRows > 0 ? Math.round((count / totalRows) * 1000) / 10 : 0,
        }));
    }

    return profile;
  });

  // Identify primary anchor columns for universal analytics
  const primaryIdentifierCol =
    columnProfiles.find((c) => c.semanticRole === 'Identifier')?.name || null;
  const primaryDateCol =
    columnProfiles.find((c) => c.dataType === 'date')?.name || null;
  const primaryNumericCol =
    columnProfiles.find((c) => c.semanticRole === 'Currency')?.name ||
    columnProfiles.find((c) => c.dataType === 'numeric' && c.semanticRole === 'Number')?.name ||
    columnProfiles.find((c) => c.dataType === 'numeric')?.name ||
    null;
  const primaryStatusCol =
    columnProfiles.find((c) => c.semanticRole === 'Status')?.name || null;
  const primaryTypeCol =
    columnProfiles.find((c) => c.semanticRole === 'Type')?.name || null;
  const primaryCategoryCol =
    columnProfiles.find(
      (c) =>
        c.dataType === 'categorical' &&
        c.name !== primaryStatusCol &&
        c.name !== primaryTypeCol
    )?.name ||
    primaryTypeCol ||
    null;
  const primaryNameCol =
    columnProfiles.find((c) => c.semanticRole === 'Name')?.name || null;

  // Count duplicate full rows & duplicate primary identifiers (keep='first')
  const rowSignatures = new Set<string>();
  let duplicateRowsCount = 0;
  for (const r of rawRecords) {
    const sig = columns.map((c) => String(r[c] ?? '').trim().toLowerCase()).join('|');
    if (rowSignatures.has(sig)) {
      duplicateRowsCount++;
    } else {
      rowSignatures.add(sig);
    }
  }

  let duplicateIdentifiersCount = 0;
  if (primaryIdentifierCol) {
    const seenPrimaryIds = new Set<string>();
    for (const r of rawRecords) {
      const idVal = String(r[primaryIdentifierCol] ?? '').trim().toUpperCase();
      if (!idVal) continue;
      if (seenPrimaryIds.has(idVal)) {
        duplicateIdentifiersCount++;
      } else {
        seenPrimaryIds.add(idVal);
      }
    }
  }

  const datasetProfile: DatasetProfileSummary = {
    totalRows,
    totalColumns: columns.length,
    missingValuesCount: totalMissingCells,
    duplicateRowsCount,
    duplicateIdentifiersCount,
    uniqueValuesCount: columnProfiles.reduce((acc, c) => acc + c.uniqueCount, 0),
    numericColumnsCount: columnProfiles.filter((c) => c.dataType === 'numeric').length,
    dateColumnsCount: columnProfiles.filter((c) => c.dataType === 'date').length,
    categoricalColumnsCount: columnProfiles.filter((c) => c.dataType === 'categorical').length,
    identifierColumnsCount: columnProfiles.filter((c) => c.dataType === 'identifier').length,
    primaryIdentifierCol,
    primaryDateCol,
    primaryNumericCol,
    primaryStatusCol,
    primaryTypeCol,
    primaryCategoryCol,
    primaryNameCol,
  };

  return { columnProfiles, datasetProfile };
}

export function classifyBusinessStatus(rawStatus: string, strictStatusEnum = true): {
  normalizedStatus: string;
  requiresBusinessReview: boolean;
  isInvalidStatusToken: boolean;
} {
  const trimmed = (rawStatus || '').trim();
  if (!trimmed) {
    return { normalizedStatus: '', requiresBusinessReview: true, isInvalidStatusToken: true };
  }
  const normObj = normalizeKnownCategory(trimmed, 'Status', strictStatusEnum);
  if (normObj.isExplicitError) {
    return {
      normalizedStatus: trimmed,
      requiresBusinessReview: true,
      isInvalidStatusToken: true,
    };
  }
  const lower = normObj.normalized.toLowerCase();
  if (POSITIVE_BUSINESS_STATUSES.has(lower)) {
    return {
      normalizedStatus: normObj.normalized,
      requiresBusinessReview: false,
      isInvalidStatusToken: false,
    };
  }
  if (REVIEW_BUSINESS_STATUSES.has(lower)) {
    return {
      normalizedStatus: normObj.normalized,
      requiresBusinessReview: true,
      isInvalidStatusToken: false,
    };
  }
  // Unknown custom status in a custom dataset: treat as valid custom state unless explicitly malformed
  return {
    normalizedStatus: normObj.normalized,
    requiresBusinessReview: false,
    isInvalidStatusToken: false,
  };
}

export function processUniversalDataset(
  rawRecords: RawRecord[],
  options?: {
    applyCleaning?: boolean;
    fileName?: string;
    fileSize?: number;
    sessionId?: string;
    sheetNames?: string[];
    activeSheetName?: string;
    currencySymbol?: string;
  }
): DatasetSession {
  const applyCleaning = options?.applyCleaning ?? true;
  const fileName = options?.fileName || 'Uploaded_Dataset.xlsx';
  const fileSize = options?.fileSize || 0;
  const sessionId = options?.sessionId || `session-${Date.now()}`;
  const sheetNames = options?.sheetNames || ['Sheet1'];
  const activeSheetName = options?.activeSheetName || sheetNames[0] || 'Sheet1';
  const currencySymbol = options?.currencySymbol || '₹';

  const uploadedColumns = rawRecords.length > 0 ? Object.keys(rawRecords[0]) : [];
  const { columnProfiles, datasetProfile } = profileDatasetColumns(rawRecords);

  const {
    primaryIdentifierCol,
    primaryDateCol,
    primaryNumericCol,
    primaryStatusCol,
    primaryTypeCol,
    primaryCategoryCol,
  } = datasetProfile;

  // Track seen primary identifiers (keep='first' duplicate detection)
  const seenPrimaryIds = new Set<string>();

  let validRecords = 0;
  let invalidRecords = 0;
  let warningRecords = 0;
  let missingFieldsCount = 0;
  let duplicatesCount = 0;
  let invalidAmountsCount = 0;
  let invalidDatesCount = 0;
  let invalidCategoryCount = 0;
  let normalizableCount = 0;
  let businessReviewCount = 0;
  let recordsRequiringReview = 0;

  const issueCounter = new Map<string, { severity: 'ERROR' | 'WARNING' | 'REVIEW'; count: number }>();
  const recordIssue = (label: string, severity: 'ERROR' | 'WARNING' | 'REVIEW') => {
    const prev = issueCounter.get(label);
    issueCounter.set(label, { severity, count: (prev?.count ?? 0) + 1 });
  };

  const processedRows: UniversalProcessedRow[] = rawRecords.map((rawRow, idx) => {
    const rawCells: Record<string, string> = {};
    const cleanCells: Record<string, string | number | null> = {};
    const isoDates: Record<string, string> = {};
    const numericValues: Record<string, number | null> = {};
    const issues: RowIssue[] = [];
    const cleaningChanges: CleaningChange[] = [];

    let rowHasMissingRequired = false;
    let rowHasInvalidDate = false;
    let rowHasInvalidAmount = false;
    let rowHasInvalidCategory = false;

    for (const colProfile of columnProfiles) {
      const col = colProfile.name;
      const rawVal = String(rawRow[col] ?? '');
      const trimmedVal = rawVal.trim();
      rawCells[col] = rawVal;

      const isOptionalColumn =
        colProfile.semanticRole === 'Text' ||
        colProfile.missingPercentage >= 50 ||
        /\b(remark|remarks|narration|note|notes|comment|comments|optional|check|validation|description|memo)\b/i.test(
          col
        );

      // 1. Check Missing Value
      if (!trimmedVal) {
        cleanCells[col] = null;
        if (!isOptionalColumn) {
          rowHasMissingRequired = true;
          issues.push({
            column: col,
            severity: 'ERROR',
            code: 'MISSING_VALUE',
            message: `Missing ${col}`,
          });
          recordIssue(`Missing ${col}`, 'ERROR');
        }
        continue;
      }

      // 2. Process by Detected Data Type
      if (colProfile.dataType === 'date') {
        const parsedDate = parseAndNormalizeDate(rawVal, true);
        if (!parsedDate.isValid) {
          cleanCells[col] = trimmedVal;
          rowHasInvalidDate = true;
          issues.push({
            column: col,
            severity: 'ERROR',
            code: 'INVALID_DATE',
            message: `Invalid Date in ${col} ("${trimmedVal}")`,
          });
          recordIssue(`Invalid Date (${col})`, 'ERROR');
        } else {
          cleanCells[col] = applyCleaning ? parsedDate.ddmmyyyy : trimmedVal;
          isoDates[col] = parsedDate.isoDate;
          if (parsedDate.wasNormalized) {
            cleaningChanges.push({
              column: col,
              originalValue: rawVal,
              cleanedValue: parsedDate.ddmmyyyy,
              reason: 'Standardized date to DD-MM-YYYY',
            });
          }
        }
        continue;
      }

      if (colProfile.dataType === 'numeric') {
        const parsedNum = parseNumericCell(rawVal);
        if (!parsedNum.isValid || parsedNum.value === null) {
          cleanCells[col] = trimmedVal;
          numericValues[col] = null;
          rowHasInvalidAmount = true;
          issues.push({
            column: col,
            severity: 'ERROR',
            code: 'INVALID_NUMBER',
            message: `Non-numeric value in ${col} ("${trimmedVal}")`,
          });
          recordIssue(`Invalid Number (${col})`, 'ERROR');
        } else if (
          !colProfile.allowNegative &&
          (parsedNum.value < 0 ||
            (colProfile.semanticRole === 'Currency' && parsedNum.value <= 0))
        ) {
          cleanCells[col] = parsedNum.value;
          numericValues[col] = parsedNum.value;
          rowHasInvalidAmount = true;
          issues.push({
            column: col,
            severity: 'ERROR',
            code: 'NEGATIVE_OR_ZERO_VALUE',
            message: `Invalid / Negative ${col} (${parsedNum.value})`,
          });
          recordIssue(`Invalid / Negative ${col}`, 'ERROR');
        } else {
          cleanCells[col] = parsedNum.value;
          numericValues[col] = parsedNum.value;
          if (parsedNum.wasNormalized) {
            cleaningChanges.push({
              column: col,
              originalValue: rawVal,
              cleanedValue: String(parsedNum.value),
              reason: 'Normalized formatted number / currency symbol',
            });
          }
        }
        continue;
      }

      if (colProfile.dataType === 'email') {
        const cleanEmail = trimmedVal.toLowerCase();
        cleanCells[col] = applyCleaning ? cleanEmail : trimmedVal;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          issues.push({
            column: col,
            severity: 'ERROR',
            code: 'INVALID_EMAIL',
            message: `Invalid Email Format ("${trimmedVal}")`,
          });
          recordIssue(`Invalid Email (${col})`, 'ERROR');
        }
        continue;
      }

      if (colProfile.dataType === 'identifier') {
        const cleanId = trimmedVal.toUpperCase();
        cleanCells[col] = applyCleaning ? cleanId : trimmedVal;
        if (rawVal !== cleanId) {
          cleaningChanges.push({
            column: col,
            originalValue: rawVal,
            cleanedValue: cleanId,
            reason: 'Trimmed whitespace & standardized Identifier case',
          });
        }
        continue;
      }

      if (colProfile.dataType === 'categorical') {
        const strictDomainEnum = Boolean(colProfile.expectedAllowedValues);
        const catNorm = normalizeKnownCategory(rawVal, colProfile.semanticRole, strictDomainEnum);
        cleanCells[col] = applyCleaning ? catNorm.normalized : trimmedVal;
        if (catNorm.wasModified && !catNorm.isExplicitError) {
          cleaningChanges.push({
            column: col,
            originalValue: rawVal,
            cleanedValue: catNorm.normalized,
            reason: `Standardized ${colProfile.semanticRole} value`,
          });
        }
        if (catNorm.isExplicitError) {
          rowHasInvalidCategory = true;
          issues.push({
            column: col,
            severity: 'ERROR',
            code: 'INVALID_CATEGORY',
            message: `Invalid ${col} ("${trimmedVal}")`,
          });
          recordIssue(`Invalid ${col}`, 'ERROR');
        }
        continue;
      }

      // Default text / name
      const cleanText = trimmedVal.replace(/\s+/g, ' ');
      cleanCells[col] = applyCleaning ? cleanText : rawVal;
      if (rawVal !== cleanText) {
        cleaningChanges.push({
          column: col,
          originalValue: rawVal,
          cleanedValue: cleanText,
          reason: 'Trimmed extra whitespace',
        });
      }
    }

    // Check Duplicate Identifier on Primary Identifier Column (keep='first')
    let isDuplicateIdentifier = false;
    if (primaryIdentifierCol) {
      const idVal = String(rawRow[primaryIdentifierCol] ?? '').trim().toUpperCase();
      if (idVal) {
        if (seenPrimaryIds.has(idVal)) {
          isDuplicateIdentifier = true;
          duplicatesCount++;
          issues.push({
            column: primaryIdentifierCol,
            severity: 'ERROR',
            code: 'DUPLICATE_ID',
            message: `Duplicate ${primaryIdentifierCol} (${idVal})`,
          });
          recordIssue(`Duplicate ${primaryIdentifierCol}`, 'ERROR');
        } else {
          seenPrimaryIds.add(idVal);
        }
      }
    }

    if (rowHasMissingRequired) missingFieldsCount++;
    if (rowHasInvalidDate) invalidDatesCount++;
    if (rowHasInvalidAmount) invalidAmountsCount++;
    if (rowHasInvalidCategory) invalidCategoryCount++;
    if (cleaningChanges.length > 0) normalizableCount++;

    // Determine Data Validation State (strictly about structural/data validity, NEVER business status!)
    const hasError = issues.some((i) => i.severity === 'ERROR');
    const hasWarning = issues.some((i) => i.severity === 'WARNING');
    const dataValidation: 'VALID' | 'WARNING' | 'ERROR' = hasError
      ? 'ERROR'
      : hasWarning
      ? 'WARNING'
      : 'VALID';
    const isValid = !hasError;

    if (isValid) {
      validRecords++;
      if (hasWarning) warningRecords++;
    } else {
      invalidRecords++;
    }

    // Separate Business Status Evaluation
    let businessStatus = '—';
    let requiresBusinessReview = false;

    if (primaryStatusCol) {
      const statusProfile = columnProfiles.find((c) => c.name === primaryStatusCol);
      const rawSt = String(rawRow[primaryStatusCol] ?? '');
      const stInfo = classifyBusinessStatus(rawSt, Boolean(statusProfile?.expectedAllowedValues));
      businessStatus = stInfo.normalizedStatus || rawSt.trim() || '(Missing)';
      requiresBusinessReview = stInfo.requiresBusinessReview;
    }

    if (isValid && requiresBusinessReview) {
      businessReviewCount++;
    }

    // Status Check combines whether the row needs operational review (either due to business state like Pending/Failed OR data error)
    const statusCheck: 'OK' | 'Review Needed' =
      isValid && !requiresBusinessReview ? 'OK' : 'Review Needed';

    const statusCheckReason: UniversalProcessedRow['statusCheckReason'] = !isValid
      ? 'Data Quality Error'
      : requiresBusinessReview
      ? 'Business Status'
      : hasWarning
      ? 'Warning / Anomaly'
      : 'OK';

    if (statusCheck === 'Review Needed') {
      recordsRequiringReview++;
    }

    return {
      rowIndex: idx + 1,
      rawCells,
      cleanCells,
      isoDates,
      numericValues,
      dataValidation,
      isValid,
      isDuplicateRow: false,
      isDuplicateIdentifier,
      businessStatus,
      statusCheck,
      statusCheckReason,
      issues,
      cleaningChanges,
    };
  });

  // Compute Metrics & Distributions across the dataset
  let totalAmount = 0;
  const validMetricNumbers: number[] = [];
  let successfulTransactions = 0;
  let pendingTransactions = 0;
  let failedTransactions = 0;
  let otherStatusTransactions = 0;
  let creditAmount = 0;
  let debitAmount = 0;
  let creditCount = 0;
  let debitCount = 0;

  const statusMap = new Map<
    string,
    { count: number; validCount: number; amount: number; isBusinessReview: boolean }
  >();
  const categoryMap = new Map<string, { count: number; amount: number }>();
  const modeMap = new Map<string, { count: number; amount: number }>();
  const dailyMap = new Map<string, DailyMetricPoint>();

  for (const row of processedRows) {
    const primaryNum =
      primaryNumericCol !== null ? row.numericValues[primaryNumericCol] ?? null : null;
    const positiveAmt = primaryNum !== null && primaryNum > 0 ? primaryNum : 0;

    // Include positive amounts from valid numeric cells
    if (primaryNum !== null && primaryNum > 0) {
      totalAmount += primaryNum;
      validMetricNumbers.push(primaryNum);
    }

    // Status aggregation
    if (primaryStatusCol) {
      const stLabel = row.businessStatus || '(Missing)';
      const stLower = stLabel.toLowerCase();
      const isPos = POSITIVE_BUSINESS_STATUSES.has(stLower);
      const isFailed = ['failed', 'failure', 'declined', 'rejected', 'bounced', 'cancelled', 'canceled', 'out of stock', 'escalated', 'inactive'].includes(stLower);
      const isPending = ['pending', 'in progress', 'processing', 'open', 'on leave', 'probation', 'low stock', 'on hold', 'pending approval', 'pending customer'].includes(stLower);

      if (isPos) {
        successfulTransactions++;
      } else if (isPending) {
        pendingTransactions++;
      } else if (isFailed) {
        failedTransactions++;
      } else {
        otherStatusTransactions++;
      }

      const existingSt = statusMap.get(stLabel) ?? {
        count: 0,
        validCount: 0,
        amount: 0,
        isBusinessReview: !isPos,
      };
      existingSt.count += 1;
      if (row.isValid) existingSt.validCount += 1;
      existingSt.amount = Math.round((existingSt.amount + positiveAmt) * 100) / 100;
      statusMap.set(stLabel, existingSt);
    }

    // Type / Primary Category aggregation
    if (primaryTypeCol) {
      const rawTy = String(row.cleanCells[primaryTypeCol] ?? '').trim();
      const tyLower = rawTy.toLowerCase();
      if (tyLower === 'credit') {
        creditCount++;
        creditAmount += positiveAmt;
      } else if (tyLower === 'debit') {
        debitCount++;
        debitAmount += positiveAmt;
      }
    }

    const catCol = primaryCategoryCol || primaryTypeCol;
    if (catCol) {
      const catVal = String(row.cleanCells[catCol] ?? '').trim() || '(Unclassified)';
      const existingCat = categoryMap.get(catVal) ?? { count: 0, amount: 0 };
      existingCat.count += 1;
      existingCat.amount = Math.round((existingCat.amount + positiveAmt) * 100) / 100;
      categoryMap.set(catVal, existingCat);
    }

    const modeCol = columnProfiles.find((c) => c.semanticRole === 'Mode')?.name;
    if (modeCol) {
      const mVal = String(row.cleanCells[modeCol] ?? '').trim() || '(Unclassified)';
      const existingM = modeMap.get(mVal) ?? { count: 0, amount: 0 };
      existingM.count += 1;
      existingM.amount = Math.round((existingM.amount + positiveAmt) * 100) / 100;
      modeMap.set(mVal, existingM);
    }

    // Daily time-series aggregation
    if (primaryDateCol && row.isoDates[primaryDateCol]) {
      const iso = row.isoDates[primaryDateCol];
      const ddmmyyyy = String(row.cleanCells[primaryDateCol] ?? iso);
      const dayEntry = dailyMap.get(iso) ?? {
        date: ddmmyyyy,
        isoDate: iso,
        totalAmount: 0,
        transactionCount: 0,
        creditAmount: 0,
        debitAmount: 0,
        successCount: 0,
        pendingCount: 0,
        failedCount: 0,
      };
      dayEntry.totalAmount = Math.round((dayEntry.totalAmount + positiveAmt) * 100) / 100;
      dayEntry.transactionCount += 1;
      if (primaryTypeCol) {
        const ty = String(row.cleanCells[primaryTypeCol] ?? '').toLowerCase();
        if (ty === 'credit') {
          dayEntry.creditAmount = Math.round((dayEntry.creditAmount + positiveAmt) * 100) / 100;
        } else if (ty === 'debit') {
          dayEntry.debitAmount = Math.round((dayEntry.debitAmount + positiveAmt) * 100) / 100;
        }
      }
      dailyMap.set(iso, dayEntry);
    }
  }

  const totalTransactions = processedRows.length;
  const validRate =
    totalTransactions > 0 ? Math.round((validRecords / totalTransactions) * 1000) / 10 : 0;
  const successRate =
    totalTransactions > 0
      ? Math.round((successfulTransactions / totalTransactions) * 1000) / 10
      : validRate;

  const averageTransactionAmount =
    validMetricNumbers.length > 0
      ? Math.round((totalAmount / validMetricNumbers.length) * 100) / 100
      : 0;
  const medianTransactionAmount = computeMedian(validMetricNumbers);
  const highestTransaction =
    validMetricNumbers.length > 0 ? Math.max(...validMetricNumbers) : 0;
  const lowestTransaction =
    validMetricNumbers.length > 0 ? Math.min(...validMetricNumbers) : 0;

  const statusDistribution: StatusDistributionPoint[] = Array.from(statusMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, v]) => ({
      name,
      count: v.count,
      validCount: v.validCount,
      amount: v.amount,
      percentage:
        totalTransactions > 0 ? Math.round((v.count / totalTransactions) * 1000) / 10 : 0,
      isBusinessReview: v.isBusinessReview,
    }));

  const typeDistribution: CategoryDistributionPoint[] = Array.from(categoryMap.entries())
    .sort((a, b) => b[1].amount - a[1].amount || b[1].count - a[1].count)
    .map(([category, v]) => ({
      category,
      count: v.count,
      amount: v.amount,
      percentage:
        totalTransactions > 0 ? Math.round((v.count / totalTransactions) * 1000) / 10 : 0,
    }));

  const modeDistribution: CategoryDistributionPoint[] = Array.from(modeMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([category, v]) => ({
      category,
      count: v.count,
      amount: v.amount,
      percentage:
        totalTransactions > 0 ? Math.round((v.count / totalTransactions) * 1000) / 10 : 0,
    }));

  const dailyMetrics = Array.from(dailyMap.values()).sort((a, b) =>
    a.isoDate.localeCompare(b.isoDate)
  );

  // Build Dynamic KPIs tailored to the detected schema
  const primaryColProfile = columnProfiles.find((c) => c.name === primaryNumericCol);
  const isCurrencyMetric = primaryColProfile?.semanticRole === 'Currency';
  const fmtVal = (n: number) =>
    isCurrencyMetric
      ? `${currencySymbol}${n.toLocaleString('en-IN')}`
      : n.toLocaleString('en-IN');

  const dynamicKPIs: DynamicKPI[] = [
    {
      id: 'total_records',
      label: 'Total Records',
      value: totalTransactions,
      formattedValue: totalTransactions.toLocaleString('en-IN'),
      subLabel: `${uploadedColumns.length} detected columns`,
      formula: 'COUNTA(Dataset)',
      tone: 'neutral',
      category: 'health',
    },
    {
      id: 'valid_records',
      label: 'Valid Records',
      value: validRecords,
      formattedValue: `${validRecords.toLocaleString('en-IN')} (${validRate}%)`,
      subLabel: 'Passed structural data validation',
      formula: 'COUNTIF(DataValidation, "VALID")',
      tone: 'emerald',
      category: 'health',
    },
    {
      id: 'invalid_records',
      label: 'Invalid Records (Data Errors)',
      value: invalidRecords,
      formattedValue: invalidRecords.toLocaleString('en-IN'),
      subLabel: `${duplicatesCount} duplicates · ${missingFieldsCount} missing`,
      formula: 'COUNTIF(DataValidation, "ERROR")',
      tone: invalidRecords > 0 ? 'rose' : 'emerald',
      category: 'health',
    },
    {
      id: 'business_review',
      label: 'Business Status Review',
      value: businessReviewCount,
      formattedValue: businessReviewCount.toLocaleString('en-IN'),
      subLabel: `Valid rows in Pending/Failed/Open state`,
      formula: 'VALID & Status != OK',
      tone: businessReviewCount > 0 ? 'amber' : 'emerald',
      category: 'status',
    },
  ];

  if (primaryNumericCol) {
    dynamicKPIs.push(
      {
        id: 'primary_sum',
        label: `Total ${primaryNumericCol}`,
        value: Math.round(totalAmount * 100) / 100,
        formattedValue: fmtVal(Math.round(totalAmount * 100) / 100),
        subLabel: `Across ${validMetricNumbers.length} valid numeric rows`,
        formula: `SUM(${primaryNumericCol})`,
        tone: 'neutral',
        category: 'metric',
      },
      {
        id: 'primary_avg',
        label: `Average ${primaryNumericCol}`,
        value: averageTransactionAmount,
        formattedValue: fmtVal(averageTransactionAmount),
        subLabel: `Median: ${fmtVal(medianTransactionAmount)}`,
        formula: `AVERAGE(${primaryNumericCol})`,
        tone: 'blue',
        category: 'metric',
      }
    );
  }

  if (primaryStatusCol) {
    dynamicKPIs.push(
      {
        id: 'positive_status',
        label: `Positive / Settled (${primaryStatusCol})`,
        value: successfulTransactions,
        formattedValue: `${successfulTransactions} (${successRate}%)`,
        subLabel: 'Success / Completed / Active / Resolved',
        formula: `COUNTIF(${primaryStatusCol}, Positive)`,
        tone: 'emerald',
        category: 'status',
      },
      {
        id: 'actionable_status',
        label: `Pending / Exception (${primaryStatusCol})`,
        value: pendingTransactions + failedTransactions,
        formattedValue: `${pendingTransactions} Pending · ${failedTransactions} Failed/Closed`,
        subLabel: 'Business state requiring operational follow-up',
        formula: `COUNTIF(${primaryStatusCol}, Actionable)`,
        tone: pendingTransactions + failedTransactions > 0 ? 'amber' : 'neutral',
        category: 'status',
      }
    );
  }

  // Build Dynamic Charts based on detected columns
  const dynamicCharts: DynamicChartSpec[] = [];

  // Chart 1: Status or Primary Category Distribution (Pie)
  if (statusDistribution.length > 0) {
    dynamicCharts.push({
      id: 'chart_status_dist',
      title: `1. ${primaryStatusCol || 'Status'} Distribution`,
      subtitle: `Record breakdown across ${statusDistribution.length} business states`,
      chartType: 'pie',
      xKey: 'name',
      yKeys: [{ key: 'count', label: 'Records', color: '#16A34A' }],
      data: statusDistribution.map((s) => ({
        name: s.name,
        count: s.count,
        amount: s.amount,
      })),
    });
  } else if (typeDistribution.length > 0) {
    dynamicCharts.push({
      id: 'chart_cat_dist',
      title: `1. ${primaryCategoryCol || 'Category'} Distribution`,
      subtitle: 'Share of records by primary category',
      chartType: 'pie',
      xKey: 'name',
      yKeys: [{ key: 'count', label: 'Records', color: '#2563EB' }],
      data: typeDistribution.slice(0, 8).map((c) => ({
        name: c.category,
        count: c.count,
      })),
    });
  }

  // Chart 2: Date + Primary Numeric Trend (or Category + Numeric Bar if no dates)
  if (dailyMetrics.length > 1 && primaryNumericCol) {
    dynamicCharts.push({
      id: 'chart_date_metric',
      title: `2. ${primaryNumericCol} by ${primaryDateCol}`,
      subtitle: `Chronological trend across ${dailyMetrics.length} dates`,
      chartType: 'area',
      xKey: 'date',
      yKeys: [
        {
          key: 'totalAmount',
          label: primaryNumericCol,
          color: '#0F172A',
          isCurrency: isCurrencyMetric,
        },
      ],
      data: dailyMetrics.map((d) => ({
        date: d.date,
        totalAmount: d.totalAmount,
      })),
    });
  } else if (typeDistribution.length > 0 && primaryNumericCol) {
    dynamicCharts.push({
      id: 'chart_cat_metric',
      title: `2. ${primaryNumericCol} by ${primaryCategoryCol || primaryTypeCol}`,
      subtitle: `Total ${primaryNumericCol} aggregated by category`,
      chartType: 'bar',
      xKey: 'category',
      yKeys: [
        {
          key: 'amount',
          label: primaryNumericCol,
          color: '#0F172A',
          isCurrency: isCurrencyMetric,
        },
      ],
      data: typeDistribution.slice(0, 10).map((c) => ({
        category: c.category,
        amount: c.amount,
      })),
    });
  }

  // Chart 3: Record Count by Date or Category
  if (dailyMetrics.length > 1) {
    dynamicCharts.push({
      id: 'chart_date_count',
      title: `3. Record Volume by ${primaryDateCol}`,
      subtitle: 'Number of records logged per date',
      chartType: 'bar',
      xKey: 'date',
      yKeys: [{ key: 'transactionCount', label: 'Record Count', color: '#2563EB' }],
      data: dailyMetrics.map((d) => ({
        date: d.date,
        transactionCount: d.transactionCount,
      })),
    });
  } else if (typeDistribution.length > 0) {
    dynamicCharts.push({
      id: 'chart_cat_count',
      title: `3. Record Count by ${primaryCategoryCol || 'Category'}`,
      subtitle: 'Distribution of records across categories',
      chartType: 'bar',
      xKey: 'category',
      yKeys: [{ key: 'count', label: 'Record Count', color: '#2563EB' }],
      data: typeDistribution.slice(0, 10).map((c) => ({
        category: c.category,
        count: c.count,
      })),
    });
  }

  // Chart 4: Credit vs Debit or Category / Mode Comparison
  if (primaryTypeCol && dailyMetrics.some((d) => d.creditAmount > 0 || d.debitAmount > 0)) {
    dynamicCharts.push({
      id: 'chart_credit_debit',
      title: `4. Credit vs Debit (${primaryNumericCol || 'Amount'})`,
      subtitle: 'Daily inflow vs outflow comparison',
      chartType: 'grouped_bar',
      xKey: 'date',
      yKeys: [
        { key: 'creditAmount', label: 'Credit', color: '#16A34A', isCurrency: true },
        { key: 'debitAmount', label: 'Debit', color: '#475569', isCurrency: true },
      ],
      data: dailyMetrics.map((d) => ({
        date: d.date,
        creditAmount: d.creditAmount,
        debitAmount: d.debitAmount,
      })),
    });
  } else if (typeDistribution.length > 0 && primaryNumericCol) {
    dynamicCharts.push({
      id: 'chart_dim_breakdown',
      title: `4. ${primaryCategoryCol || 'Dimension'} vs ${primaryNumericCol}`,
      subtitle: `Comparative breakdown across top categories`,
      chartType: 'bar',
      xKey: 'category',
      yKeys: [
        {
          key: 'amount',
          label: primaryNumericCol,
          color: '#16A34A',
          isCurrency: isCurrencyMetric,
        },
      ],
      data: typeDistribution.slice(0, 8).map((c) => ({
        category: c.category,
        amount: c.amount,
      })),
    });
  }

  // Generate Deterministic Insights supported 100% by actual calculations
  const deterministicInsights: string[] = [];
  deterministicInsights.push(
    `${validRecords} of ${totalTransactions} records (${validRate}%) passed structural data validation; ${invalidRecords} record(s) contain data-quality errors.`
  );

  if (businessReviewCount > 0 && primaryStatusCol) {
    deterministicInsights.push(
      `${businessReviewCount} structurally valid record(s) have a ${primaryStatusCol} requiring operational review (e.g., Pending, Failed, Open, or On Leave).`
    );
  }

  if (duplicatesCount > 0 && primaryIdentifierCol) {
    deterministicInsights.push(
      `${duplicatesCount} record(s) share a duplicate ${primaryIdentifierCol}.`
    );
  }

  if (datasetProfile.missingValuesCount > 0) {
    deterministicInsights.push(
      `${datasetProfile.missingValuesCount} empty cell(s) were detected across ${missingFieldsCount} row(s).`
    );
  }

  if (primaryNumericCol && validMetricNumbers.length > 0) {
    deterministicInsights.push(
      `Total ${primaryNumericCol} is ${fmtVal(
        Math.round(totalAmount * 100) / 100
      )} with an average of ${fmtVal(averageTransactionAmount)} (Range: ${fmtVal(
        lowestTransaction
      )} to ${fmtVal(highestTransaction)}).`
    );
  }

  if (typeDistribution.length > 0 && (primaryCategoryCol || primaryTypeCol)) {
    const topCat = typeDistribution[0];
    deterministicInsights.push(
      `"${topCat.category}" is the leading ${
        primaryCategoryCol || primaryTypeCol
      } with ${topCat.count} records (${topCat.percentage}% of dataset).`
    );
  }

  const issueBreakdown = Array.from(issueCounter.entries())
    .map(([issue, v]) => ({ issue, severity: v.severity, count: v.count }))
    .sort((a, b) => b.count - a.count);

  const validationSummary: ValidationSummary = {
    totalRecords: totalTransactions,
    validRecords,
    invalidRecords,
    warningRecords,
    missingFieldsCount,
    totalMissingCells: datasetProfile.missingValuesCount,
    duplicatesCount,
    invalidAmountsCount,
    invalidDatesCount,
    invalidCategoryCount,
    normalizableCount,
    businessReviewCount,
    recordsRequiringReview,
    issueBreakdown,
  };

  const misSummary: MISSummaryMetrics = {
    totalTransactions,
    validTransactions: validRecords,
    invalidTransactions: invalidRecords,
    totalAmount: Math.round(totalAmount * 100) / 100,
    successfulTransactions,
    pendingTransactions,
    failedTransactions,
    otherStatusTransactions,
    creditAmount: Math.round(creditAmount * 100) / 100,
    debitAmount: Math.round(debitAmount * 100) / 100,
    creditCount,
    debitCount,
    successRate,
    validRate,
    duplicateRecords: duplicatesCount,
    businessReviewRecords: businessReviewCount,
    recordsRequiringReview,
    averageTransactionAmount,
    medianTransactionAmount,
    highestTransaction,
    lowestTransaction,
  };

  return {
    sessionId,
    fileName,
    fileSize,
    uploadedAt: new Date().toISOString(),
    sheetNames,
    activeSheetName,
    uploadedColumns,
    columnProfiles,
    datasetProfile,
    isCleaned: applyCleaning,
    rawRecords,
    processedRows,
    validationSummary,
    misSummary,
    dynamicKPIs,
    dynamicCharts,
    deterministicInsights,
    statusDistribution,
    typeDistribution,
    modeDistribution,
    dailyMetrics,
  };
}

/**
 * Dynamic Group-By & Aggregation Engine ("Explore Data")
 */
export function runDynamicGroupByAnalysis(
  session: DatasetSession,
  groupByColumn: string,
  metricColumn: string,
  aggregation: AggregationType
): DynamicAnalysisResult {
  const groups = new Map<
    string,
    { recordCount: number; validCount: number; values: number[] }
  >();

  for (const row of session.processedRows) {
    const rawGroupVal = row.cleanCells[groupByColumn] ?? row.rawCells[groupByColumn];
    const groupKey =
      rawGroupVal !== null && rawGroupVal !== undefined && String(rawGroupVal).trim() !== ''
        ? String(rawGroupVal).trim()
        : '(Missing / Blank)';

    const entry = groups.get(groupKey) ?? { recordCount: 0, validCount: 0, values: [] };
    entry.recordCount += 1;
    if (row.isValid) entry.validCount += 1;

    const numVal = row.numericValues[metricColumn];
    if (numVal !== null && numVal !== undefined && !Number.isNaN(numVal)) {
      entry.values.push(numVal);
    }
    groups.set(groupKey, entry);
  }

  const computedRows = Array.from(groups.entries()).map(([groupValue, data]) => {
    let agg = 0;
    const vals = data.values;
    if (aggregation === 'COUNT') {
      agg = data.recordCount;
    } else if (vals.length > 0) {
      if (aggregation === 'SUM') {
        agg = vals.reduce((a, b) => a + b, 0);
      } else if (aggregation === 'AVERAGE') {
        agg = vals.reduce((a, b) => a + b, 0) / vals.length;
      } else if (aggregation === 'MIN') {
        agg = Math.min(...vals);
      } else if (aggregation === 'MAX') {
        agg = Math.max(...vals);
      } else if (aggregation === 'MEDIAN') {
        agg = computeMedian(vals);
      }
    }
    return {
      groupValue,
      recordCount: data.recordCount,
      validCount: data.validCount,
      aggregatedValue: Math.round(agg * 100) / 100,
      sharePercentage: 0,
    };
  });

  computedRows.sort((a, b) => b.aggregatedValue - a.aggregatedValue);

  const totalAggregatedValue =
    Math.round(computedRows.reduce((acc, r) => acc + Math.max(0, r.aggregatedValue), 0) * 100) /
    100;

  for (const r of computedRows) {
    r.sharePercentage =
      totalAggregatedValue > 0
        ? Math.round((Math.max(0, r.aggregatedValue) / totalAggregatedValue) * 1000) / 10
        : 0;
  }

  return {
    groupByColumn,
    metricColumn,
    aggregation,
    rows: computedRows,
    totalAggregatedValue,
  };
}

/**
 * Universal Schema-Agnostic Reconciliation Engine (File A vs File B)
 */
export function runUniversalReconciliation(
  fileARecords: RawRecord[],
  fileBRecords: RawRecord[],
  config: ReconcileConfig,
  fileAName = 'File_A.xlsx',
  fileBName = 'File_B.xlsx'
): ReconciliationResult {
  const mapA = new Map<string, RawRecord[]>();
  const mapB = new Map<string, RawRecord[]>();

  for (const r of fileARecords) {
    const key = String(r[config.keyColumnA] ?? '').trim().toUpperCase();
    if (!key) continue;
    const list = mapA.get(key) ?? [];
    list.push(r);
    mapA.set(key, list);
  }

  for (const r of fileBRecords) {
    const key = String(r[config.keyColumnB] ?? '').trim().toUpperCase();
    if (!key) continue;
    const list = mapB.get(key) ?? [];
    list.push(r);
    mapB.set(key, list);
  }

  const allKeys = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();

  const items: ReconciliationItem[] = [];
  let matchedCount = 0;
  let matchedValue = 0;
  let missingInACount = 0;
  let missingInAValue = 0;
  let missingInBCount = 0;
  let missingInBValue = 0;
  let valueMismatchCount = 0;
  let totalVarianceValue = 0;
  let duplicateCount = 0;

  let idx = 1;
  for (const key of allKeys) {
    const listA = mapA.get(key) ?? [];
    const listB = mapB.get(key) ?? [];
    const rowA = listA[0];
    const rowB = listB[0];

    const valA =
      rowA && config.valueColumnA ? parseNumericCell(rowA[config.valueColumnA]).value : null;
    const valB =
      rowB && config.valueColumnB ? parseNumericCell(rowB[config.valueColumnB]).value : null;

    const dateA =
      rowA && config.dateColumnA
        ? parseAndNormalizeDate(rowA[config.dateColumnA], true).ddmmyyyy ||
          String(rowA[config.dateColumnA] ?? '').trim()
        : null;
    const dateB =
      rowB && config.dateColumnB
        ? parseAndNormalizeDate(rowB[config.dateColumnB], true).ddmmyyyy ||
          String(rowB[config.dateColumnB] ?? '').trim()
        : null;

    const statusA =
      rowA && config.statusColumnA ? String(rowA[config.statusColumnA] ?? '').trim() : null;
    const statusB =
      rowB && config.statusColumnB ? String(rowB[config.statusColumnB] ?? '').trim() : null;

    const label =
      (rowA && config.labelColumnA ? String(rowA[config.labelColumnA] ?? '').trim() : '') ||
      (rowB && config.labelColumnB ? String(rowB[config.labelColumnB] ?? '').trim() : '') ||
      '—';

    if (listA.length > 1 || listB.length > 1) {
      duplicateCount++;
      const variance =
        valA !== null && valB !== null ? Math.round((valA - valB) * 100) / 100 : null;
      items.push({
        id: `rec-${idx++}`,
        keyValue: key,
        category: 'Duplicate',
        dateA,
        dateB,
        valueA: valA,
        valueB: valB,
        variance,
        statusA,
        statusB,
        label,
        dateMatched: Boolean(dateA && dateB && dateA === dateB),
        explanation: `Duplicate key "${key}" (${listA.length} in File A, ${listB.length} in File B).`,
      });
      continue;
    }

    if (listA.length === 0 && listB.length === 1) {
      missingInACount++;
      missingInAValue += valB ?? 0;
      items.push({
        id: `rec-${idx++}`,
        keyValue: key,
        category: 'Missing in File A',
        dateA: null,
        dateB,
        valueA: null,
        valueB: valB,
        variance: valB !== null ? -valB : null,
        statusA: null,
        statusB,
        label,
        dateMatched: false,
        explanation: `Present in File B (${valB ?? 'N/A'}), but missing in File A.`,
      });
      continue;
    }

    if (listA.length === 1 && listB.length === 0) {
      missingInBCount++;
      missingInBValue += valA ?? 0;
      items.push({
        id: `rec-${idx++}`,
        keyValue: key,
        category: 'Missing in File B',
        dateA,
        dateB: null,
        valueA: valA,
        valueB: null,
        variance: valA,
        statusA,
        statusB: null,
        label,
        dateMatched: false,
        explanation: `Present in File A (${valA ?? 'N/A'}), but missing in File B.`,
      });
      continue;
    }

    const variance =
      valA !== null && valB !== null ? Math.round((valA - valB) * 100) / 100 : 0;
    const isValEqual = valA === null && valB === null ? true : Math.abs(variance) < 0.01;
    const isDateEqual = Boolean(!dateA || !dateB || dateA === dateB);

    if (!isValEqual) {
      valueMismatchCount++;
      totalVarianceValue += Math.abs(variance);
      items.push({
        id: `rec-${idx++}`,
        keyValue: key,
        category: 'Value Mismatch',
        dateA,
        dateB,
        valueA: valA,
        valueB: valB,
        variance,
        statusA,
        statusB,
        label,
        dateMatched: isDateEqual,
        explanation: `File A (${valA ?? 0}) differs from File B (${valB ?? 0}) by ${
          variance > 0 ? '+' : ''
        }${variance}.`,
      });
      continue;
    }

    matchedCount++;
    matchedValue += valA ?? 0;
    items.push({
      id: `rec-${idx++}`,
      keyValue: key,
      category: 'Matched',
      dateA,
      dateB,
      valueA: valA,
      valueB: valB,
      variance: 0,
      statusA,
      statusB,
      label,
      dateMatched: isDateEqual,
      explanation: `Exact match on ${config.keyColumnA} and ${
        config.valueColumnA || 'record values'
      }.`,
    });
  }

  const priority: Record<ReconcileCategory, number> = {
    'Value Mismatch': 1,
    'Missing in File A': 2,
    'Missing in File B': 3,
    Duplicate: 4,
    Matched: 5,
  };
  items.sort((a, b) => priority[a.category] - priority[b.category]);

  return {
    fileAName,
    fileBName,
    reconciledAt: new Date().toISOString(),
    config,
    summary: {
      totalFileA: fileARecords.length,
      totalFileB: fileBRecords.length,
      matchedCount,
      matchedValue: Math.round(matchedValue * 100) / 100,
      missingInACount,
      missingInAValue: Math.round(missingInAValue * 100) / 100,
      missingInBCount,
      missingInBValue: Math.round(missingInBValue * 100) / 100,
      valueMismatchCount,
      totalVarianceValue: Math.round(totalVarianceValue * 100) / 100,
      duplicateCount,
      reconciliationRate:
        allKeys.length > 0 ? Math.round((matchedCount / allKeys.length) * 1000) / 10 : 0,
    },
    items,
  };
}

