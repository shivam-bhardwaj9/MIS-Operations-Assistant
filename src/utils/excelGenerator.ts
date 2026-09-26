import ExcelJS from 'exceljs';
import {
  AppSettings,
  DatasetSession,
  ReconciliationResult,
  UniversalProcessedRow,
} from '../types/mis';
import { DEFAULT_SETTINGS } from './formatters';
import { runDynamicGroupByAnalysis } from './misEngine';

export async function generateFormattedMISWorkbook(
  session: DatasetSession,
  reconciliation?: ReconciliationResult | null,
  filteredRows?: UniversalProcessedRow[],
  reportTitle = 'Executive MIS Operations & Data Quality Report',
  periodLabel = 'All Dataset Records',
  settings: AppSettings = DEFAULT_SETTINGS
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.preparedBy || 'MIS Operations Assistant';
  workbook.company = settings.organizationName || 'MIS Operations Platform';
  workbook.created = new Date();
  workbook.modified = new Date();

  const currencyFormat =
    settings.currencySymbol === '₹' ? '₹#,##,##0.00' : '$#,##0.00';

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const applyHeaderStyle = (row: ExcelJS.Row) => {
    row.height = 24;
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = thinBorder;
    });
  };

  const applySemanticColor = (cell: ExcelJS.Cell, text: string) => {
    const v = (text || '').trim().toLowerCase();
    if (
      [
        'valid',
        'ok',
        'success',
        'completed',
        'active',
        'resolved',
        'closed',
        'in stock',
        'matched',
      ].includes(v)
    ) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' },
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } };
    } else if (
      [
        'warning',
        'review',
        'review needed',
        'pending',
        'processing',
        'in progress',
        'open',
        'on leave',
        'probation',
        'low stock',
        'value mismatch',
      ].includes(v)
    ) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
    } else if (
      [
        'error',
        'invalid',
        'failed',
        'cancelled',
        'escalated',
        'out of stock',
        'inactive',
        'duplicate',
        'missing in file a',
        'missing in file b',
      ].includes(v)
    ) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' },
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
    }
  };

  const activeRows = filteredRows ?? session.processedRows;
  const { validationSummary, datasetProfile } = session;

  // ============================================================================
  // SHEET 1: Executive Summary
  // ============================================================================
  const wsExec = workbook.addWorksheet('Executive Summary', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  wsExec.columns = [
    { key: 'colA', width: 34 },
    { key: 'colB', width: 26 },
    { key: 'colC', width: 28 },
    { key: 'colD', width: 42 },
  ];

  const titleRow = wsExec.addRow([reportTitle, '', '', '']);
  titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  titleRow.height = 28;

  wsExec.addRow([
    'Source File:',
    `${session.fileName} (${session.activeSheetName})`,
    'Generated At:',
    new Date().toLocaleString('en-IN'),
  ]);
  wsExec.addRow([
    'Reporting Scope:',
    periodLabel,
    'Prepared By:',
    settings.preparedBy,
  ]);
  wsExec.addRow([]);

  const kpiHeader = wsExec.addRow([
    'Executive Metric / KPI',
    'Value',
    'Formula / Definition',
    'Operational Context',
  ]);
  applyHeaderStyle(kpiHeader);

  for (const kpi of session.dynamicKPIs) {
    const r = wsExec.addRow([
      kpi.label,
      kpi.formattedValue,
      kpi.formula || 'Deterministic Calculation',
      kpi.subLabel,
    ]);
    r.height = 20;
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
    r.getCell(2).font = { name: 'Calibri', size: 10, bold: true };
    r.getCell(2).alignment = { horizontal: 'right' };
    r.eachCell((c) => {
      c.border = thinBorder;
    });
  }

  wsExec.addRow([]);
  const insightHeader = wsExec.addRow([
    'Deterministic Operational Insights',
    '',
    '',
    '',
  ]);
  applyHeaderStyle(insightHeader);

  for (const insight of session.deterministicInsights) {
    const r = wsExec.addRow([insight, '', '', '']);
    r.height = 20;
    r.getCell(1).font = { name: 'Calibri', size: 10 };
  }

  // ============================================================================
  // SHEET 2: Dataset Profile
  // ============================================================================
  const wsProfile = workbook.addWorksheet('Dataset Profile', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  wsProfile.columns = [
    { header: 'Column Name', key: 'name', width: 26 },
    { header: 'Detected Data Type', key: 'dataType', width: 18 },
    { header: 'Semantic Role', key: 'semanticRole', width: 18 },
    { header: 'Total Rows', key: 'totalCount', width: 14 },
    { header: 'Missing / Nulls', key: 'nullCount', width: 16 },
    { header: 'Missing %', key: 'missingPercentage', width: 14 },
    { header: 'Unique Values', key: 'uniqueCount', width: 16 },
    { header: 'Duplicate Values', key: 'duplicateCount', width: 16 },
    { header: 'Sum (Numeric)', key: 'sum', width: 18 },
    { header: 'Average', key: 'average', width: 16 },
    { header: 'Min / Earliest', key: 'min', width: 16 },
    { header: 'Max / Latest', key: 'max', width: 16 },
    { header: 'Example Values', key: 'examples', width: 42 },
  ];
  applyHeaderStyle(wsProfile.getRow(1));
  wsProfile.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 13 },
  };

  for (const col of session.columnProfiles) {
    const r = wsProfile.addRow({
      name: col.name,
      dataType: col.dataType.toUpperCase(),
      semanticRole: col.semanticRole,
      totalCount: col.totalCount,
      nullCount: col.nullCount,
      missingPercentage: `${col.missingPercentage}%`,
      uniqueCount: col.uniqueCount,
      duplicateCount: col.duplicateCount,
      sum: col.sum !== undefined ? col.sum : '—',
      average: col.average !== undefined ? col.average : '—',
      min: col.min !== undefined ? col.min : col.earliestDate || '—',
      max: col.max !== undefined ? col.max : col.latestDate || '—',
      examples: col.exampleValues.join(' | '),
    });
    r.height = 19;
    r.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Calibri', size: 10 };
    });
    if (col.semanticRole === 'Currency' && typeof col.sum === 'number') {
      r.getCell(9).numFmt = currencyFormat;
      r.getCell(10).numFmt = currencyFormat;
    }
  }

  // ============================================================================
  // SHEET 3: Raw Data
  // ============================================================================
  const wsRaw = workbook.addWorksheet('Raw Data', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const cols = session.uploadedColumns;
  wsRaw.columns = cols.map((c) => ({
    header: c,
    key: c,
    width: Math.max(c.length + 6, 18),
  }));
  applyHeaderStyle(wsRaw.getRow(1));
  if (cols.length > 0) {
    wsRaw.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: cols.length },
    };
  }

  for (const rawRow of session.rawRecords) {
    const r = wsRaw.addRow(cols.map((c) => String(rawRow[c] ?? '')));
    r.height = 19;
    r.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Calibri', size: 10 };
    });
  }

  // ============================================================================
  // SHEET 4: Clean Data (with Separated Data Validation & Business Status)
  // ============================================================================
  const wsClean = workbook.addWorksheet('Clean Data', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const cleanHeaders = [
    { header: 'Row #', key: '__row', width: 9 },
    ...cols.map((c) => ({
      header: c,
      key: c,
      width: Math.max(c.length + 6, 18),
    })),
    { header: 'Data Validation', key: '__dataVal', width: 18 },
    { header: 'Business Status', key: '__bizStatus', width: 18 },
    { header: 'Status Check', key: '__statusCheck', width: 18 },
    { header: 'Validation / Audit Notes', key: '__issues', width: 38 },
  ];

  wsClean.columns = cleanHeaders;
  applyHeaderStyle(wsClean.getRow(1));
  wsClean.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: cleanHeaders.length },
  };

  for (const row of activeRows) {
    const values: (string | number)[] = [row.rowIndex];
    for (const c of cols) {
      const val = row.cleanCells[c];
      values.push(val !== null && val !== undefined ? val : '');
    }
    values.push(
      row.dataValidation,
      row.businessStatus,
      row.statusCheck,
      row.issues.length > 0 ? row.issues.map((i) => i.message).join('; ') : 'None'
    );

    const r = wsClean.addRow(values);
    r.height = 19;
    r.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Calibri', size: 10 };
    });

    const dataValColIdx = cols.length + 2;
    const bizStatusColIdx = cols.length + 3;
    const statusCheckColIdx = cols.length + 4;

    applySemanticColor(r.getCell(dataValColIdx), row.dataValidation);
    applySemanticColor(r.getCell(bizStatusColIdx), row.businessStatus);
    applySemanticColor(r.getCell(statusCheckColIdx), row.statusCheck);
  }

  // ============================================================================
  // SHEET 5: Data Quality
  // ============================================================================
  const wsQuality = workbook.addWorksheet('Data Quality', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  wsQuality.columns = [
    { key: 'metric', width: 36 },
    { key: 'count', width: 18 },
    { key: 'severity', width: 18 },
    { key: 'notes', width: 46 },
  ];

  const qHeader1 = wsQuality.addRow([
    'Data Quality & Validation Dimension',
    'Record Count',
    'Classification',
    'Operational Rule Explanation',
  ]);
  applyHeaderStyle(qHeader1);

  const qualitySummaryRows: [string, number, string, string][] = [
    ['Total Uploaded Records', validationSummary.totalRecords, 'INFO', 'All rows parsed from active worksheet'],
    ['Structurally Valid Records', validationSummary.validRecords, 'VALID', 'Passed all data type, required field, and uniqueness rules'],
    ['Structurally Invalid Records (Data Errors)', validationSummary.invalidRecords, 'ERROR', 'Contains missing required fields, duplicate IDs, or invalid values'],
    ['Valid Records Requiring Business Review', validationSummary.businessReviewCount, 'REVIEW', 'Valid data whose business status is Pending, Failed, Open, etc.'],
    ['Duplicate Identifier Records', validationSummary.duplicatesCount, 'ERROR', 'Non-unique primary identifier values'],
    ['Rows With Missing Required Fields', validationSummary.missingFieldsCount, 'ERROR', 'Blank cells in non-optional columns'],
    ['Invalid / Negative Numeric Values', validationSummary.invalidAmountsCount, 'ERROR', 'Non-numeric text or negative numbers in positive metrics'],
    ['Invalid Calendar Dates', validationSummary.invalidDatesCount, 'ERROR', 'Unparseable or out-of-range calendar dates'],
  ];

  for (const [label, cnt, sev, desc] of qualitySummaryRows) {
    const r = wsQuality.addRow([label, cnt, sev, desc]);
    r.height = 20;
    r.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Calibri', size: 10 };
    });
    applySemanticColor(r.getCell(3), sev);
  }

  // ============================================================================
  // SHEET 6: Dynamic Analysis
  // ============================================================================
  const wsAnalysis = workbook.addWorksheet('Dynamic Analysis', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  wsAnalysis.columns = [
    { key: 'group', width: 32 },
    { key: 'count', width: 18 },
    { key: 'validCount', width: 18 },
    { key: 'share', width: 16 },
    { key: 'aggVal', width: 24 },
  ];

  const groupCol =
    datasetProfile.primaryCategoryCol ||
    datasetProfile.primaryStatusCol ||
    session.uploadedColumns[0] ||
    'Category';
  const metricCol =
    datasetProfile.primaryNumericCol || session.uploadedColumns[0] || 'Count';

  const pivotResult = runDynamicGroupByAnalysis(
    session,
    groupCol,
    metricCol,
    datasetProfile.primaryNumericCol ? 'SUM' : 'COUNT'
  );

  const aHeader = wsAnalysis.addRow([
    `${groupCol} (Group By)`,
    'Total Records',
    'Valid Records',
    'Share (%)',
    datasetProfile.primaryNumericCol ? `SUM(${metricCol})` : 'Count',
  ]);
  applyHeaderStyle(aHeader);

  for (const item of pivotResult.rows) {
    const r = wsAnalysis.addRow([
      item.groupValue,
      item.recordCount,
      item.validCount,
      `${item.sharePercentage}%`,
      item.aggregatedValue,
    ]);
    r.height = 20;
    r.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Calibri', size: 10 };
    });
  }

  // ============================================================================
  // SHEET 7: Exceptions (ERROR, WARNING, and REVIEW Records)
  // ============================================================================
  const wsExc = workbook.addWorksheet('Exceptions', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  wsExc.columns = [
    { header: 'Row #', key: 'rowIdx', width: 10 },
    { header: datasetProfile.primaryIdentifierCol || 'Identifier', key: 'id', width: 22 },
    { header: datasetProfile.primaryNameCol || 'Name / Label', key: 'name', width: 28 },
    { header: 'Data Validation', key: 'dataVal', width: 18 },
    { header: 'Business Status', key: 'bizStatus', width: 18 },
    { header: 'Status Check', key: 'statusCheck', width: 18 },
    { header: 'Reason Category', key: 'reasonCat', width: 22 },
    { header: 'Detailed Audit Explanation', key: 'explanation', width: 48 },
  ];
  applyHeaderStyle(wsExc.getRow(1));
  wsExc.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 8 },
  };

  const exceptionRows = activeRows.filter(
    (r) => !r.isValid || r.statusCheck === 'Review Needed'
  );

  for (const row of exceptionRows) {
    const idVal = datasetProfile.primaryIdentifierCol
      ? String(row.cleanCells[datasetProfile.primaryIdentifierCol] ?? '(Missing ID)')
      : `Row ${row.rowIndex}`;
    const nameVal = datasetProfile.primaryNameCol
      ? String(row.cleanCells[datasetProfile.primaryNameCol] ?? '(Missing)')
      : '—';
    const explanation =
      row.issues.length > 0
        ? row.issues.map((i) => `[${i.severity}] ${i.message}`).join('; ')
        : `Valid data record with actionable Business Status: "${row.businessStatus}"`;

    const r = wsExc.addRow({
      rowIdx: row.rowIndex,
      id: idVal,
      name: nameVal,
      dataVal: row.dataValidation,
      bizStatus: row.businessStatus,
      statusCheck: row.statusCheck,
      reasonCat: row.statusCheckReason,
      explanation,
    });
    r.height = 19;
    r.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Calibri', size: 10 };
    });
    applySemanticColor(r.getCell(4), row.dataValidation);
    applySemanticColor(r.getCell(5), row.businessStatus);
    applySemanticColor(r.getCell(6), row.statusCheck);
  }

  // ============================================================================
  // SHEET 8: Reconciliation (Only generated when reconciliation was performed!)
  // ============================================================================
  if (reconciliation && reconciliation.items.length > 0) {
    const wsRecon = workbook.addWorksheet('Reconciliation', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    wsRecon.columns = [
      { header: 'Matching Key', key: 'keyValue', width: 22 },
      { header: 'Reconciliation Status', key: 'category', width: 22 },
      { header: 'Label / Counterparty', key: 'label', width: 28 },
      { header: 'File A Date', key: 'dateA', width: 16 },
      { header: 'File B Date', key: 'dateB', width: 16 },
      { header: 'File A Value', key: 'valueA', width: 18 },
      { header: 'File B Value', key: 'valueB', width: 18 },
      { header: 'Variance (Δ)', key: 'variance', width: 18 },
      { header: 'Audit Explanation', key: 'explanation', width: 50 },
    ];
    applyHeaderStyle(wsRecon.getRow(1));
    wsRecon.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 9 },
    };

    for (const item of reconciliation.items) {
      const r = wsRecon.addRow({
        keyValue: item.keyValue,
        category: item.category,
        label: item.label,
        dateA: item.dateA ?? '—',
        dateB: item.dateB ?? '—',
        valueA: item.valueA ?? 0,
        valueB: item.valueB ?? 0,
        variance: item.variance ?? 0,
        explanation: item.explanation,
      });
      r.height = 19;
      r.eachCell((c) => {
        c.border = thinBorder;
        c.font = { name: 'Calibri', size: 10 };
      });
      applySemanticColor(r.getCell(2), item.category);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
