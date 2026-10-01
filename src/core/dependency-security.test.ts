/**
 * Regression checks for security boundaries provided by upgraded dependencies.
 */
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import Fastify from "fastify";
import { simpleGit } from "simple-git";
import { describe, expect, it } from "vitest";

describe("dependency security boundaries", () => {
  it("keeps embedded quotes inside PostgreSQL identifiers", () => {
    const dialect = new PgDialect();
    const identifier = 'name"; SELECT pg_sleep(10); --';

    expect(dialect.sqlToQuery(sql`SELECT ${sql.identifier(identifier)}`).sql).toBe(
      'SELECT "name""; SELECT pg_sleep(10); --"',
    );
  });

  it.each([["--config=protocol.ext.allow=always"], ["-c", "protocol.ext.allow=always"]])(
    "rejects unsafe long-form Git configuration: %j",
    async (...options) => {
      // --version is harmless even if a future dependency regresses this guard.
      await expect(simpleGit().raw([...options, "--version"])).rejects.toMatchObject({
        plugin: "unsafe",
      });
    },
  );

  it("serves Swagger UI assets with the upgraded Fastify plugins", async () => {
    const app = Fastify();
    try {
      await app.register(swagger, { openapi: { info: { title: "Test", version: "1" } } });
      await app.register(swaggerUi, { routePrefix: "/docs" });

      const response = await app.inject("/docs/static/swagger-ui.css");
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/css");
    } finally {
      await app.close();
    }
  });
});
