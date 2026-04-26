import { config } from './env.js';

export const dbConfig = {
  vector: {
    chroma: {
      url: config.chromaUrl
    }
  },
  relational: {
    postgres: {
      url: config.databaseUrl
    }
  },
  cache: {
    redis: {
      url: config.redisUrl
    }
  }
};