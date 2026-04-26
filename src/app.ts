import express from 'express';
// import cors from 'cors';
import { loggerMiddleware, errorMiddleware } from './middlewares/index.js';
import chatRoutes from './routes/chat.routes.js';
import ingestRoutes from './routes/ingest.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import { documentController, upload } from './controllers/document.controller.js';

const app = express();

// Middlewares
// app.use(cors()); // Temporalmente desactivado
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json());
app.use(loggerMiddleware);

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/upload', uploadRoutes);

// Rutas directas de documentos para compatibilidad con frontend
app.post('/api/documents', upload.single('file'), documentController.uploadDocument.bind(documentController));
app.post('/api/documents/batch', upload.array('files', 10), documentController.uploadBatch.bind(documentController));
app.get('/api/documents', documentController.getDocuments.bind(documentController));
app.get('/api/documents/search', documentController.searchDocuments.bind(documentController));
app.get('/api/documents/:id', documentController.getDocument.bind(documentController));
app.delete('/api/documents/:id', documentController.deleteDocument.bind(documentController));

app.use('/api/analysis', analysisRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorMiddleware);

export default app;