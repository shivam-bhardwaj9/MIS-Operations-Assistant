import express from 'express';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  AggregationType,
  DatasetSession,
  RawRecord,
  ReconcileConfig,
  ReconciliationResult,
  SampleDatasetId,
} from './src/types/mis';
import { generateFormattedMISWorkbook } from './src/utils/excelGenerator';
import { DEFAULT_SETTINGS } from './src/utils/formatters';
import {
  generateUniversalSampleReconciliation,
  getSampleDatasetById,
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
const workbookBuffers = new Map<string, { buffer: Buffer; fileName: string; fileSize: number }>();
const reconciliations = new Map<string, ReconciliationResult>();

function validateFileExtension(filename: string): void {
  const ext = path.extname(filename).toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
    throw new Error(
      `Unsupported file format "${ext}". Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.`
    );
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'Universal MIS Operations & Reporting Platform API',
      timestamp: new Date().toISOString(),
      activeSessions: sessions.size,
    });
  });

  // Load any of the 5 multi-domain sample datasets
  app.post('/api/sample', (req, res) => {
    try {
      const sessionId = (req.body?.sessionId as string) || `session-${Date.now()}`;
      const datasetId = (req.body?.datasetId as SampleDatasetId) || 'transactions';
      const applyCleaning = req.body?.applyCleaning !== undefined ? Boolean(req.body.applyCleaning) : true;

      const { fileName, rawRecords } = getSampleDatasetById(datasetId);
      const sessionData = processUniversalDataset(rawRecords, {
        applyCleaning,
        fileName,
        fileSize: 24576,
        sessionId,
        sheetNames: ['Data'],
        activeSheetName: 'Data',
      });

      sessions.set(sessionId, sessionData);
      res.json(sessionData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load sample dataset.';
      res.status(500).json({ error: message });
    }
  });

  // Universal Excel/CSV Upload with Smart Sheet & Header Detection
  app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided in upload request.' });
        return;
      }

      validateFileExtension(req.file.originalname);
      const sessionId = (req.body?.sessionId as string) || `session-${Date.now()}`;
      const preferredSheet = req.body?.sheetName as string | undefined;

      const parsed = parseWorkbookFromData(req.file.buffer, preferredSheet);
      workbookBuffers.set(sessionId, {
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      });

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
      res.status(400).json({ error: message });
    }
  });

  // Switch active worksheet in a multi-sheet workbook
  app.post('/api/select-sheet', (req, res) => {
    try {
      const { sessionId, sheetName } = req.body as { sessionId: string; sheetName: string };
      const savedWb = workbookBuffers.get(sessionId);
      if (!savedWb) {
        res.status(400).json({ error: 'Workbook buffer not found in session. Please re-upload file.' });
        return;
      }

      const parsed = parseWorkbookFromData(savedWb.buffer, sheetName);
      const sessionData = processUniversalDataset(parsed.rawRecords, {
        applyCleaning: true,
        fileName: savedWb.fileName,
        fileSize: savedWb.fileSize,
        sessionId,
        sheetNames: parsed.sheetNames,
        activeSheetName: parsed.activeSheetName,
      });

      sessions.set(sessionId, sessionData);
      res.json(sessionData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch sheet.';
      res.status(400).json({ error: message });
    }
  });

  // Re-validate / Clean Dataset
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
        res.status(400).json({ error: 'No dataset found in session.' });
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
      res.status(400).json({ error: message });
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
        res.status(400).json({ error: 'Active session not found.' });
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
      res.status(400).json({ error: message });
    }
  });

  // Universal Reconciliation endpoint
  app.post('/api/reconcile', (req, res) => {
    try {
      if (req.body?.useSampleReconciliation) {
        const sample = generateUniversalSampleReconciliation();
        const result = runUniversalReconciliation(
          sample.fileARecords,
          sample.fileBRecords,
          sample.config,
          sample.fileAName,
          sample.fileBName
        );
        const sessionId = (req.body?.sessionId as string) || 'default';
        reconciliations.set(sessionId, result);
        res.json({
          result,
          fileAColumns: Object.keys(sample.fileARecords[0] || {}),
          fileBColumns: Object.keys(sample.fileBRecords[0] || {}),
          config: sample.config,
          fileARecords: sample.fileARecords,
          fileBRecords: sample.fileBRecords,
        });
        return;
      }

      const {
        sessionId = 'default',
        fileARecords,
        fileBRecords,
        config,
        fileAName = 'File_A.xlsx',
        fileBName = 'File_B.xlsx',
      } = req.body as {
        sessionId: string;
        fileARecords: RawRecord[];
        fileBRecords: RawRecord[];
        config: ReconcileConfig;
        fileAName: string;
        fileBName: string;
      };

      if (!fileARecords?.length || !fileBRecords?.length) {
        res.status(400).json({ error: 'Both File A and File B datasets are required.' });
        return;
      }

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
      res.status(400).json({ error: message });
    }
  });

  // Multi-Sheet Excel Report Generator
  app.post('/api/report', async (req, res) => {
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
        res.status(400).json({ error: 'No active dataset found to export.' });
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

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="MIS_Operations_Report.xlsx"'
      );
      res.send(Buffer.from(buffer));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate Excel report.';
      res.status(500).json({ error: message });
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
