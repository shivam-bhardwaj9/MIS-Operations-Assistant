export type RawRecord = Record<string, unknown>;

export type DetectedDataType =
  | 'date'
  | 'numeric'
  | 'categorical'
  | 'identifier'
  | 'text'
  | 'boolean'
  | 'email'
  | 'phone';

export type SemanticRole =
  | 'Identifier'
  | 'Name'
  | 'Date'
  | 'Currency'
  | 'Number'
  | 'Percentage'
  | 'Category'
  | 'Status'
  | 'Type'
  | 'Mode'
  | 'Text'
  | 'Boolean'
  | 'Email'
  | 'Phone'
  | 'Location'
  | 'Duration'
  | 'Unknown';

export type ValidationSeverity = 'VALID' | 'WARNING' | 'ERROR' | 'REVIEW';

export interface ColumnProfile {
  name: string;
  dataType: DetectedDataType;
  semanticRole: SemanticRole;
  totalCount: number;
  nullCount: number;
  missingPercentage: number;
  uniqueCount: number;
  duplicateCount: number;
  exampleValues: string[];
  // Numeric stats (when dataType === 'numeric')
  sum?: number;
  average?: number;
  min?: number;
  max?: number;
  median?: number;
  allowNegative?: boolean;
  // Date stats (when dataType === 'date')
  earliestDate?: string;
  latestDate?: string;
  // Categorical stats
  topValues?: { value: string; count: number; percentage: number }[];
  expectedAllowedValues?: string[];
}

export interface DatasetProfileSummary {
  totalRows: number;
  totalColumns: number;
  missingValuesCount: number;
  duplicateRowsCount: number;
  duplicateIdentifiersCount: number;
  uniqueValuesCount: number;
  numericColumnsCount: number;
  dateColumnsCount: number;
  categoricalColumnsCount: number;
  identifierColumnsCount: number;
  primaryIdentifierCol: string | null;
  primaryDateCol: string | null;
  primaryNumericCol: string | null;
  primaryStatusCol: string | null;
  primaryTypeCol: string | null;
  primaryCategoryCol: string | null;
  primaryNameCol: string | null;
}

export interface RowIssue {
  column: string;
  severity: 'ERROR' | 'WARNING' | 'REVIEW';
  code: string;
  message: string;
}

export interface CleaningChange {
  column: string;
  originalValue: string;
  cleanedValue: string;
  reason: string;
}

export interface UniversalProcessedRow {
  rowIndex: number;
  rawCells: Record<string, string>;
  cleanCells: Record<string, string | number | null>;
  isoDates: Record<string, string>; // column -> YYYY-MM-DD
  numericValues: Record<string, number | null>; // column -> parsed number
  // Strict separation between Data Validity and Business Status
  dataValidation: 'VALID' | 'WARNING' | 'ERROR';
  isValid: boolean; // true when dataValidation !== 'ERROR'
  isDuplicateRow: boolean;
  isDuplicateIdentifier: boolean;
  businessStatus: string; // e.g., 'Success', 'Pending', 'Failed', 'Active', 'Open', or '—'
  statusCheck: 'OK' | 'Review Needed';
  statusCheckReason: 'OK' | 'Business Status' | 'Data Quality Error' | 'Warning / Anomaly';
  issues: RowIssue[];
  cleaningChanges: CleaningChange[];
}

export interface DynamicKPI {
  id: string;
  label: string;
  value: string | number;
  formattedValue: string;
  subLabel: string;
  formula?: string;
  tone: 'neutral' | 'emerald' | 'amber' | 'rose' | 'blue';
  category: 'health' | 'metric' | 'status' | 'dimension';
}

export interface DynamicChartSpec {
  id: string;
  title: string;
  subtitle: string;
  chartType: 'pie' | 'area' | 'bar' | 'grouped_bar' | 'scatter';
  xKey: string;
  yKeys: {
    key: string;
    label: string;
    color: string;
    isCurrency?: boolean;
  }[];
  data: Record<string, string | number>[];
}

export interface ValidationSummary {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warningRecords: number;
  missingFieldsCount: number; // rows with missing required/core fields
  totalMissingCells: number; // total blank cells across dataset
  duplicatesCount: number;
  invalidAmountsCount: number;
  invalidDatesCount: number;
  invalidCategoryCount: number;
  normalizableCount: number;
  businessReviewCount: number; // valid records whose business status requires review (e.g. Pending/Failed)
  recordsRequiringReview: number; // total records requiring attention (invalid + business review)
  issueBreakdown: {
    issue: string;
    severity: 'ERROR' | 'WARNING' | 'REVIEW';
    count: number;
  }[];
}

export interface MISSummaryMetrics {
  totalTransactions: number;
  validTransactions: number;
  invalidTransactions: number;
  totalAmount: number;
  successfulTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  otherStatusTransactions: number;
  creditAmount: number;
  debitAmount: number;
  creditCount: number;
  debitCount: number;
  successRate: number; // successful / valid or total with status
  validRate: number; // valid / total * 100
  duplicateRecords: number;
  businessReviewRecords: number;
  recordsRequiringReview: number;
  averageTransactionAmount: number;
  medianTransactionAmount: number;
  highestTransaction: number;
  lowestTransaction: number;
}

export interface StatusDistributionPoint {
  name: string;
  count: number;
  validCount: number;
  amount: number;
  percentage: number;
  isBusinessReview: boolean;
}

export interface CategoryDistributionPoint {
  category: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface DailyMetricPoint {
  date: string; // DD-MM-YYYY
  isoDate: string; // YYYY-MM-DD
  totalAmount: number;
  transactionCount: number;
  creditAmount: number;
  debitAmount: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
}

export interface DatasetSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  sheetNames: string[];
  activeSheetName: string;
  uploadedColumns: string[];
  columnProfiles: ColumnProfile[];
  datasetProfile: DatasetProfileSummary;
  isCleaned: boolean;
  rawRecords: RawRecord[];
  processedRows: UniversalProcessedRow[];
  validationSummary: ValidationSummary;
  misSummary: MISSummaryMetrics;
  dynamicKPIs: DynamicKPI[];
  dynamicCharts: DynamicChartSpec[];
  deterministicInsights: string[];
  statusDistribution: StatusDistributionPoint[];
  typeDistribution: CategoryDistributionPoint[];
  modeDistribution: CategoryDistributionPoint[];
  dailyMetrics: DailyMetricPoint[];
}

export type AggregationType = 'SUM' | 'AVERAGE' | 'COUNT' | 'MIN' | 'MAX' | 'MEDIAN';

export interface DynamicAnalysisResult {
  groupByColumn: string;
  metricColumn: string;
  aggregation: AggregationType;
  rows: {
    groupValue: string;
    recordCount: number;
    validCount: number;
    aggregatedValue: number;
    sharePercentage: number;
  }[];
  totalAggregatedValue: number;
}

export interface ReconcileConfig {
  keyColumnA: string;
  keyColumnB: string;
  valueColumnA: string;
  valueColumnB: string;
  dateColumnA?: string;
  dateColumnB?: string;
  statusColumnA?: string;
  statusColumnB?: string;
  labelColumnA?: string;
  labelColumnB?: string;
}

export type ReconcileCategory =
  | 'Matched'
  | 'Missing in File A'
  | 'Missing in File B'
  | 'Value Mismatch'
  | 'Duplicate';

export interface ReconciliationItem {
  id: string;
  keyValue: string;
  category: ReconcileCategory;
  dateA: string | null;
  dateB: string | null;
  valueA: number | null;
  valueB: number | null;
  variance: number | null;
  statusA: string | null;
  statusB: string | null;
  label: string;
  dateMatched: boolean;
  explanation: string;
}

export interface ReconciliationSummary {
  totalFileA: number;
  totalFileB: number;
  matchedCount: number;
  matchedValue: number;
  missingInACount: number;
  missingInAValue: number;
  missingInBCount: number;
  missingInBValue: number;
  valueMismatchCount: number;
  totalVarianceValue: number;
  duplicateCount: number;
  reconciliationRate: number;
}

export interface ReconciliationResult {
  fileAName: string;
  fileBName: string;
  reconciledAt: string;
  config: ReconcileConfig;
  summary: ReconciliationSummary;
  items: ReconciliationItem[];
}

export type ReportPeriodType = 'all' | 'daily' | 'weekly' | 'custom';

export interface AppSettings {
  currencySymbol: '₹' | '$';
  numberFormat: 'en-IN' | 'en-US';
  strictDateValidation: boolean;
  autoTrimWhitespace: boolean;
  treatZeroAmountAsInvalid: boolean;
  organizationName: string;
  preparedBy: string;
}
