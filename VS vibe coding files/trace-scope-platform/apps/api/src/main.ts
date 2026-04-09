import { buildServer } from "./app/buildServer.js";
import { loadConfig } from "./app/config.js";

const run = async () => {
  const config = loadConfig();
  const server = buildServer();

  try {
    await server.listen({ host: config.host, port: config.port });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

void run();
