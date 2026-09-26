import express from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  AggregationType,
  DatasetSession,
  RawRecord,
  ReconcileConfig,
  ReconciliationResult,
} from './src/types/mis';
import { generateFormattedMISWorkbook } from './src/utils/excelGenerator';
import { DEFAULT_SETTINGS } from './src/utils/formatters';
import {
  processUniversalDataset,
  runDynamicGroupByAnalysis,
  runUniversalReconciliation,
} from './src/utils/misEngine';
import { parseWorkbookFromData } from './src/utils/spreadsheetParser';

const PORT = 3000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const sessions = new Map<string, DatasetSession>();
const reconciliations = new Map<string, ReconciliationResult>();

function validateFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
    throw new Error(
      `Unsupported file format "${ext}". Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.`
    );
  }
  return ext;
}

function safeRemoveTempFile(tempFilePath: string | null): void {
  if (!tempFilePath) return;
  try {
    const resolved = path.resolve(tempFilePath);
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  } catch {
    // Ignore cleanup errors if already removed
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'MIS Operations Assistant FastAPI Backend',
      activeSessions: sessions.size,
    });
  });

  // Universal Excel/CSV Upload with Smart Sheet & Header Detection & Temporary File Cleanup
  app.post('/api/upload', upload.single('file'), (req, res) => {
    let tempUploadPath: string | null = null;
    try {
      if (!req.file) {
        res.status(400).json({
          detail: 'No file provided in upload request.',
          error: 'No file provided in upload request.',
        });
        return;
      }

      const ext = validateFileExtension(req.file.originalname);
      const sessionId = (req.body?.sessionId as string) || `session-${Date.now()}`;
      const preferredSheet = req.body?.sheetName as string | undefined;

      tempUploadPath = path.join(
        os.tmpdir(),
        `mis_upload_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
      );
      fs.writeFileSync(tempUploadPath, req.file.buffer);
      const fileBufferFromDisk = fs.readFileSync(tempUploadPath);

      const parsed = parseWorkbookFromData(fileBufferFromDisk, preferredSheet);

      sessions.delete(sessionId);
      if (!preferredSheet) {
        reconciliations.delete(sessionId);
      }

      const sessionData = processUniversalDataset(parsed.rawRecords, {
        applyCleaning: true,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        sessionId,
        sheetNames: parsed.sheetNames,
        activeSheetName: parsed.activeSheetName,
      });

      sessions.set(sessionId, sessionData);
      res.json(sessionData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse uploaded file.';
      res.status(400).json({ detail: message, error: message });
    } finally {
      safeRemoveTempFile(tempUploadPath);
    }
  });

  // Validate Dataset (compatible with FastAPI ValidateRequest)
  app.post('/api/validate', (req, res) => {
    try {
      const { sessionId, rawRecords, fileName, fileSize } = req.body as {
        sessionId: string;
        rawRecords?: RawRecord[];
        fileName?: string;
        fileSize?: number;
      };

      const existing = sessions.get(sessionId);
      const sourceRaw = rawRecords || existing?.rawRecords;

      if (!sourceRaw || sourceRaw.length === 0) {
        res.status(400).json({
          detail: 'No dataset found in session.',
          error: 'No dataset found in session.',
        });
        return;
      }

      const updated = processUniversalDataset(sourceRaw, {
        applyCleaning: false,
        fileName: fileName || existing?.fileName || 'Dataset.xlsx',
        fileSize: fileSize ?? existing?.fileSize ?? 0,
        sessionId,
        sheetNames: existing?.sheetNames || ['Sheet1'],
        activeSheetName: existing?.activeSheetName || 'Sheet1',
      });

      sessions.set(sessionId, updated);
      res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Validation failed.';
      res.status(400).json({ detail: message, error: message });
    }
  });

  // Clean Dataset (compatible with FastAPI CleanRequest)
  app.post('/api/clean', (req, res) => {
    try {
      const { sessionId, rawRecords, fileName, fileSize, applyCleaning = true } = req.body as {
        sessionId: string;
        rawRecords?: RawRecord[];
        fileName?: string;
        fileSize?: number;
        applyCleaning?: boolean;
      };

      const existing = sessions.get(sessionId);
      const sourceRaw = rawRecords || existing?.rawRecords;

      if (!sourceRaw || sourceRaw.length === 0) {
        res.status(400).json({
          detail: 'No dataset found in session.',
          error: 'No dataset found in session.',
        });
        return;
      }

      const updated = processUniversalDataset(sourceRaw, {
        applyCleaning,
        fileName: fileName || existing?.fileName || 'Dataset.xlsx',
        fileSize: fileSize ?? existing?.fileSize ?? 0,
        sessionId,
        sheetNames: existing?.sheetNames || ['Sheet1'],
        activeSheetName: existing?.activeSheetName || 'Sheet1',
      });

      sessions.set(sessionId, updated);
      res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cleaning / validation failed.';
      res.status(400).json({ detail: message, error: message });
    }
  });

  // Dynamic Group-By Analysis endpoint
  app.post('/api/analyze', (req, res) => {
    try {
      const { sessionId, groupByColumn, metricColumn, aggregation } = req.body as {
        sessionId: string;
        groupByColumn: string;
        metricColumn: string;
        aggregation: AggregationType;
      };

      const existing = sessions.get(sessionId);
      if (!existing) {
        res.status(400).json({
          detail: 'Active session not found.',
          error: 'Active session not found.',
        });
        return;
      }

      const analysis = runDynamicGroupByAnalysis(
        existing,
        groupByColumn,
        metricColumn,
        aggregation
      );
      res.json(analysis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed.';
      res.status(400).json({ detail: message, error: message });
    }
  });

  // Universal Reconciliation endpoint (requires real File A and File B records)
  app.post('/api/reconcile', (req, res) => {
    try {
      const sessionId = (req.body?.sessionId as string) || 'default';
      const fileARecords: RawRecord[] =
        req.body?.fileARecords || req.body?.internalRecords || [];
      const fileBRecords: RawRecord[] =
        req.body?.fileBRecords || req.body?.externalRecords || [];

      if (!fileARecords.length || !fileBRecords.length) {
        res.status(400).json({
          detail: 'Both File A and File B records are required.',
          error: 'Both File A and File B records are required.',
        });
        return;
      }

      const intMap = req.body?.internalMapping || {};
      const extMap = req.body?.externalMapping || {};

      const config: ReconcileConfig = req.body?.config || {
        keyColumnA: intMap.transactionId || '',
        keyColumnB: extMap.transactionId || '',
        valueColumnA: intMap.amount || '',
        valueColumnB: extMap.amount || '',
        dateColumnA: intMap.date || '',
        dateColumnB: extMap.date || '',
        labelColumnA: intMap.partyName || '',
        labelColumnB: extMap.partyName || '',
      };

      const fileAName =
        req.body?.fileAName || req.body?.internalFileName || 'Internal_Transactions.xlsx';
      const fileBName =
        req.body?.fileBName || req.body?.externalFileName || 'Bank_Statement.xlsx';

      const result = runUniversalReconciliation(
        fileARecords,
        fileBRecords,
        config,
        fileAName,
        fileBName
      );
      reconciliations.set(sessionId, result);

      res.json({
        result,
        fileAColumns: Object.keys(fileARecords[0] || {}),
        fileBColumns: Object.keys(fileBRecords[0] || {}),
        config,
        fileARecords,
        fileBRecords,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reconciliation failed.';
      res.status(400).json({ detail: message, error: message });
    }
  });

  // Multi-Sheet Excel Report Generator with Temporary Report File Cleanup
  app.post('/api/report', async (req, res) => {
    let tempReportPath: string | null = null;
    try {
      const {
        sessionId,
        session: bodySession,
        reconciliation: bodyRecon,
        filteredRows,
        reportTitle,
        periodLabel,
        settings,
      } = req.body;

      const activeSession: DatasetSession | undefined =
        bodySession || sessions.get(sessionId);

      if (!activeSession) {
        res.status(400).json({
          detail: 'No active dataset found to export.',
          error: 'No active dataset found to export.',
        });
        return;
      }

      const activeRecon: ReconciliationResult | null =
        bodyRecon || reconciliations.get(sessionId) || null;

      const buffer = await generateFormattedMISWorkbook(
        activeSession,
        activeRecon,
        filteredRows,
        reportTitle || 'Executive MIS Operations Report',
        periodLabel || 'All Dataset Records',
        settings || DEFAULT_SETTINGS
      );

      tempReportPath = path.join(
        os.tmpdir(),
        `mis_report_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`
      );
      fs.writeFileSync(tempReportPath, Buffer.from(buffer));
      const reportBytes = fs.readFileSync(tempReportPath);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="MIS_Operations_Report.xlsx"'
      );
      res.send(reportBytes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate Excel report.';
      res.status(500).json({ detail: message, error: message });
    } finally {
      safeRemoveTempFile(tempReportPath);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Universal MIS Operations Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
