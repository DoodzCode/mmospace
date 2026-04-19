import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import "dotenv/config";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const server = Fastify({ logger: true });

await server.register(fastifyWebsocket);

server.get("/health", async () => {
  return { status: "ok" };
});

server.register(async (app) => {
  app.get("/ws", { websocket: true }, (socket) => {
    server.log.info("WebSocket client connected");
    socket.on("close", () => {
      server.log.info("WebSocket client disconnected");
    });
  });
});

const shutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await server.listen({ port: PORT, host: "0.0.0.0" });
