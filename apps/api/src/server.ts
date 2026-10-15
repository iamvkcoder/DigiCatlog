import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 DIGICATLOG API server listening on http://localhost:${env.PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
