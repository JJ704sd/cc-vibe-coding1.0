import Fastify from "fastify";

export const buildServer = () => {
  const server = Fastify();

  server.get("/health", async () => {
    return { status: "ok" };
  });

  return server;
};
