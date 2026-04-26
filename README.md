# Lexentra Nexus - Backend (`lexendra-service`)

Backend de asistencia legal inteligente con:

- chat legal con memoria conversacional,
- consultas multimodales (texto + archivo),
- RAG sobre documentos legales,
- streaming de respuestas en tiempo real,
- módulos de análisis legal.

## Base clave del proyecto

- **Arquitectura modular en TypeScript**: controladores, servicios, módulos y capa de infraestructura separados.
- **Memoria de contexto documental por `chatId`**: permite continuidad en preguntas sucesivas sobre el mismo documento.
- **RAG con LightRAG**: búsqueda híbrida + reranking + compresión de contexto antes de responder.
- **Procesamiento documental multimodal**: PDF, DOCX, XLSX, PPTX e imágenes.
- **Fallback de proveedor LLM**: DeepSeek como primario y OpenAI como respaldo.

## Stack técnico

- Node.js + TypeScript
- Express
- ChromaDB (vector store)
- OpenAI / DeepSeek
- Multer (upload)
- Pino (logging)

## Estructura principal

```txt
src/
├── app.ts
├── index.ts
├── controllers/
│   ├── chat.controller.ts
│   ├── document.controller.ts
│   ├── ingest.controller.ts
│   └── analysis.controller.ts
├── routes/
│   ├── chat.routes.ts
│   ├── upload.routes.ts
│   ├── ingest.routes.ts
│   └── analysis.routes.ts
├── services/
│   ├── chat.service.ts
│   ├── llm.service.ts
│   ├── rag.service.ts
│   ├── document.service.ts
│   ├── embedding.service.ts
│   ├── streaming.service.ts
│   └── analysis.service.ts
├── modules/
│   ├── chat/
│   ├── documents/
│   ├── rag/
│   ├── lightRag/
│   ├── streaming/
│   └── analysis/
├── infrastructure/
│   ├── llm/
│   └── vectorDB/
├── config/
├── middlewares/
├── types/
└── utils/
```

## Requisitos

- Node.js 18+
- ChromaDB disponible en `http://localhost:8000`
- API key de DeepSeek y/o OpenAI

## Instalación

```bash
cd lexendra-service
npm install
```

## Variables de entorno

Crea `lexendra-service/.env`:

```env
PORT=3001
LOG_LEVEL=info

OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_API_URL=https://api.deepseek.com

CHROMA_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
DATABASE_URL=
```

## Scripts

```bash
# desarrollo
npm run dev

# build
npm run build

# run build
npm start
```

## Endpoints principales

### Chat

- `POST /api/chat/query`
- `POST /api/chat/query/stream`
- `POST /api/chat/query-multimodal`
- `POST /api/chat/query-multimodal/stream`
- `GET /api/chat/:chatId`
- `DELETE /api/chat/:chatId`

### Documentos

- `POST /api/upload`
- `POST /api/upload/batch`
- `GET /api/upload`
- `GET /api/upload/search`
- `GET /api/upload/:id`
- `DELETE /api/upload/:id`

Compatibilidad con frontend:

- `POST /api/documents`
- `POST /api/documents/batch`
- `GET /api/documents`
- `GET /api/documents/search`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`

### Ingestión y análisis

- `POST /api/ingest/batch`
- `GET /api/ingest/status`
- `POST /api/analysis/analyze`
- `POST /api/analysis/report`
- `GET /api/analysis/types`

### Salud

- `GET /health`

## Flujo funcional (alto nivel)

1. El usuario envía una pregunta con o sin archivo.
2. Si hay archivo, se extrae texto y se genera contexto documental.
3. Si no hay archivo, se usa contexto documental previo del `chatId` o se consulta RAG.
4. Se arma prompt legal con reglas de respuesta y memoria.
5. DeepSeek genera respuesta (con fallback a OpenAI si aplica).
6. Se guarda sesión y mensajes para continuidad.

## Guía rápida de prueba

Subir documento:

```bash
curl -X POST -F "file=@./ejemplo.pdf" http://localhost:3001/api/documents
```

Consultar chat:

```bash
curl -X POST http://localhost:3001/api/chat/query \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"¿Qué establece el artículo 4?\",\"chatId\":\"demo-1\"}"
```

## Troubleshooting rápido

- **Respuestas vacías o genéricas**: validar que se envíe `chatId` y que exista contexto documental.
- **Error de embeddings/RAG**: verificar `CHROMA_URL` y estado de ChromaDB.
- **No responde DeepSeek**: validar `DEEPSEEK_API_KEY` y `DEEPSEEK_API_URL`.
- **Fallback constante a OpenAI**: revisar logs de `deepseek.ts`.

## Notas

- El backend está optimizado para continuidad legal en conversación.
- Redis y Postgres están preparados en configuración, pero no son obligatorios para ejecutar el flujo base actual.