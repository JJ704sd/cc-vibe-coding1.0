import mysql from 'mysql2/promise';
import type { AppConfig } from '../../app/config.js';

export function createPool(config: AppConfig) {
  return mysql.createPool({
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: 10,
  });
}
