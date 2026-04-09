export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  publicBaseUrl: string;
  maxUploadBytes: number;
};

const DEFAULT_PUBLIC_BASE_URL = "http://localhost:3001/uploads";
const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_PORT = 3001;

const parsePositiveInteger = (rawValue: string | undefined, fieldName: string, fallback: number): number => {
  if (rawValue === undefined) {
    return fallback;
  }

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsedValue;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const port = parsePositiveInteger(env.PORT, "PORT", DEFAULT_PORT);
  const maxUploadBytes = parsePositiveInteger(
    env.MAX_UPLOAD_BYTES,
    "MAX_UPLOAD_BYTES",
    DEFAULT_MAX_UPLOAD_BYTES
  );

  return {
    nodeEnv: env.NODE_ENV ?? "development",
    host: env.HOST ?? "0.0.0.0",
    port,
    publicBaseUrl: env.PUBLIC_BASE_URL ?? DEFAULT_PUBLIC_BASE_URL,
    maxUploadBytes
  };
};
