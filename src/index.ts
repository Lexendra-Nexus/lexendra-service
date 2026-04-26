import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Lexentra-Service corriendo en puerto ${PORT}`);
});
