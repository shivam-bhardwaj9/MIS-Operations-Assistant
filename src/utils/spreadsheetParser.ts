import * as XLSX from 'xlsx';
import { RawRecord } from '../types/mis';

export interface ParsedWorkbookResult {
  sheetNames: string[];
  activeSheetName: string;
  rawRecords: RawRecord[];
  headerRowIndex: number;
}

const INSTRUCTION_SHEET_KEYWORDS = [
  'instruction',
  'readme',
  'cover',
  'guide',
  'notes',
  'about',
  'overview',
  'metadata',
  'task',
  'problem',
  'question',
];

const HEADER_KEYWORDS = new Set([
  'date',
  'dt',
  'transaction',
  'txn',
  'id',
  'code',
  'sku',
  'utr',
  'ref',
  'reference',
  'customer',
  'party',
  'client',
  'vendor',
  'employee',
  'name',
  'type',
  'mode',
  'channel',
  'method',
  'amount',
  'value',
  'revenue',
  'salary',
  'cost',
  'price',
  'total',
  'status',
  'state',
  'stage',
  'remark',
  'remarks',
  'narration',
  'notes',
  'department',
  'designation',
  'role',
  'location',
  'region',
  'zone',
  'city',
  'category',
  'product',
  'item',
  'units',
  'qty',
  'quantity',
  'priority',
  'ticket',
  'order',
  'invoice',
  'attendance',
  'email',
  'phone',
  'csat',
  'hours',
]);

const KNOWN_DATA_VALUES = new Set([
  'success',
  'pending',
  'failed',
  'credit',
  'debit',
  'upi',
  'cash',
  'bank',
  'active',
  'inactive',
  'completed',
  'cancelled',
  'resolved',
  'open',
  'closed',
  'in stock',
  'low stock',
  'out of stock',
]);

function looksLikeDateOrIdOrNumber(val: string): boolean {
  const s = val.trim();
  if (!s) return false;
  // Pure number / currency / percentage
  if (/^-?[₹$€£]?\s*\d[\d,.]*%?$/.test(s)) return true;
  // Date pattern like 26-09-2026 or 2026-09-26
  if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(s)) return true;
  // Alphanumeric record ID like TXN1001, EMP-1001, ORD-9001, SKU-401, TKT-5001
  if (/^[A-Za-z]{2,6}[-_]?\d{3,}$/.test(s)) return true;
  return false;
}

function scoreHeaderRow(row: unknown[], nextRows: unknown[][], rowIndex: number): number {
  const nonEmptyCells = row
    .map((c) => String(c ?? '').trim())
    .filter((s) => s.length > 0);

  if (nonEmptyCells.length < 2) return -100;

  // Check unique labels
  const uniqueLabels = new Set(nonEmptyCells.map((s) => s.toLowerCase()));
  if (uniqueLabels.size < Math.ceil(nonEmptyCells.length * 0.7)) {
    return -50;
  }

  let keywordBonus = 0;
  let dataValuePenalty = 0;

  for (const cell of nonEmptyCells) {
    const lower = cell
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const tokens = lower.split(/\s+/);

    if (tokens.some((t) => HEADER_KEYWORDS.has(t))) {
      keywordBonus += 12;
    }
    if (looksLikeDateOrIdOrNumber(cell) || KNOWN_DATA_VALUES.has(cell.toLowerCase())) {
      dataValuePenalty += 15;
    }
  }

  // Check if subsequent rows have comparable column density
  let subsequentDensity = 0;
  const sampleNext = nextRows.slice(0, 5);
  for (const nxt of sampleNext) {
    if (!Array.isArray(nxt)) continue;
    const filled = nxt.filter((c) => String(c ?? '').trim().length > 0).length;
    if (filled >= Math.max(2, Math.floor(nonEmptyCells.length * 0.4))) {
      subsequentDensity += 3;
    }
  }

  return (
    nonEmptyCells.length * 4 +
    keywordBonus +
    subsequentDensity -
    dataValuePenalty -
    rowIndex * 0.5
  );
}

function extractSheetTable(sheet: XLSX.WorkSheet): {
  records: RawRecord[];
  headerRowIndex: number;
  columnCount: number;
  headerKeywordMatches: number;
} {
  // Read as 2D array with formatted text (raw: false) so dates & numbers keep human-readable strings
  const matrixFormatted = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'dd-mm-yyyy',
    blankrows: false,
  });

  if (!matrixFormatted || matrixFormatted.length === 0) {
    return { records: [], headerRowIndex: 0, columnCount: 0, headerKeywordMatches: 0 };
  }

  // Find the best header row among the first 15 non-empty rows
  const maxScan = Math.min(15, matrixFormatted.length);
  let bestHeaderIdx = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < maxScan; i++) {
    const candidateRow = matrixFormatted[i] || [];
    const nextRows = matrixFormatted.slice(i + 1, i + 8);
    const score = scoreHeaderRow(candidateRow, nextRows, i);
    if (score > bestScore) {
      bestScore = score;
      bestHeaderIdx = i;
    }
  }

  const rawHeaders = (matrixFormatted[bestHeaderIdx] || []).map((cell) =>
    String(cell ?? '').trim()
  );

  // Determine which column indices actually have data in the body
  const dataRows = matrixFormatted.slice(bestHeaderIdx + 1);
  const maxCols = Math.max(
    rawHeaders.length,
    ...dataRows.map((r) => (Array.isArray(r) ? r.length : 0))
  );

  const activeColIndices: number[] = [];
  const columnNames: string[] = [];
  const seenNames = new Map<string, number>();
  let headerKeywordMatches = 0;

  for (let colIdx = 0; colIdx < maxCols; colIdx++) {
    const headerLabel = rawHeaders[colIdx] || '';
    const hasDataInCol = dataRows.some(
      (r) => Array.isArray(r) && String(r[colIdx] ?? '').trim().length > 0
    );

    // Skip columns that have no data in any row (e.g. empty template output columns)
    if (!hasDataInCol) continue;

    const baseName = headerLabel || `Column_${colIdx + 1}`;
    const lowerTokens = baseName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/);
    if (lowerTokens.some((t) => HEADER_KEYWORDS.has(t))) {
      headerKeywordMatches++;
    }

    const count = seenNames.get(baseName) ?? 0;
    seenNames.set(baseName, count + 1);
    const finalName = count === 0 ? baseName : `${baseName}_${count + 1}`;

    activeColIndices.push(colIdx);
    columnNames.push(finalName);
  }

  const records: RawRecord[] = [];
  for (const row of dataRows) {
    if (!Array.isArray(row)) continue;

    let nonEmptyCount = 0;
    let matchesHeaderCount = 0;
    const record: RawRecord = {};

    for (let i = 0; i < activeColIndices.length; i++) {
      const colIdx = activeColIndices[i];
      const colName = columnNames[i];
      const cellVal = String(row[colIdx] ?? '').trim();
      if (cellVal.length > 0) {
        nonEmptyCount++;
        if (cellVal.toLowerCase() === colName.toLowerCase()) {
          matchesHeaderCount++;
        }
      }
      record[colName] =
        row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : '';
    }

    if (nonEmptyCount === 0) continue;

    // Skip accidental repeated header rows in the middle of a sheet
    if (activeColIndices.length >= 3 && matchesHeaderCount >= activeColIndices.length - 1) {
      continue;
    }

    // Skip summary/total footer rows (where first non-empty cell is "Total" / "Grand Total" and most cols are empty)
    const firstColVal = String(record[columnNames[0]] ?? '').trim().toLowerCase();
    if (
      (firstColVal === 'total' || firstColVal === 'grand total' || firstColVal === 'sum') &&
      nonEmptyCount <= Math.max(2, Math.floor(activeColIndices.length * 0.35))
    ) {
      continue;
    }

    records.push(record);
  }

  return {
    records,
    headerRowIndex: bestHeaderIdx,
    columnCount: columnNames.length,
    headerKeywordMatches,
  };
}

export function parseWorkbookFromData(
  data: ArrayBuffer | Buffer,
  preferredSheetName?: string
): ParsedWorkbookResult {
  const isNodeBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(data);
  const workbook = XLSX.read(data, {
    type: isNodeBuffer ? 'buffer' : 'array',
    cellDates: true,
    dateNF: 'dd-mm-yyyy',
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded workbook contains no sheets.');
  }

  const sheetNames = workbook.SheetNames;

  if (preferredSheetName && sheetNames.includes(preferredSheetName)) {
    const parsed = extractSheetTable(workbook.Sheets[preferredSheetName]);
    return {
      sheetNames,
      activeSheetName: preferredSheetName,
      rawRecords: parsed.records,
      headerRowIndex: parsed.headerRowIndex,
    };
  }

  // Evaluate all sheets to pick the best data table sheet automatically
  let bestSheet = sheetNames[0];
  let bestSheetScore = -Infinity;
  let bestParsed = {
    records: [] as RawRecord[],
    headerRowIndex: 0,
    columnCount: 0,
    headerKeywordMatches: 0,
  };

  for (const name of sheetNames) {
    const parsed = extractSheetTable(workbook.Sheets[name]);
    if (parsed.records.length === 0) continue;

    const lowerName = name.toLowerCase();
    const isInstructionTab = INSTRUCTION_SHEET_KEYWORDS.some((kw) =>
      lowerName.includes(kw)
    );

    const score =
      parsed.records.length * 3 +
      parsed.columnCount * 15 +
      parsed.headerKeywordMatches * 25 -
      (isInstructionTab ? 600 : 0);

    if (score > bestSheetScore) {
      bestSheetScore = score;
      bestSheet = name;
      bestParsed = parsed;
    }
  }

  if (bestParsed.records.length === 0) {
    throw new Error('The uploaded file contains no data rows.');
  }

  return {
    sheetNames,
    activeSheetName: bestSheet,
    rawRecords: bestParsed.records,
    headerRowIndex: bestParsed.headerRowIndex,
  };
}
