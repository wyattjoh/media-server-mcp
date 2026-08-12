import { assertEquals, assertExists } from "@std/assert";
import { McpServer } from "@modelcontextprotocol/server";
import { createRadarrConfig } from "@wyattjoh/radarr";
import { createSonarrConfig } from "@wyattjoh/sonarr";
import { createAddMoviePrompt } from "../../src/prompts/add-movie-prompt.ts";
import { createAddSeriesPrompt } from "../../src/prompts/add-series-prompt.ts";
import { createLibraryReportPrompt } from "../../src/prompts/library-report-prompt.ts";
import { createRecommendationsPrompt } from "../../src/prompts/recommendations-prompt.ts";

function makeServer(): McpServer {
  return new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { prompts: {} } },
  );
}

Deno.test("createAddMoviePrompt - registers without errors", () => {
  const server = makeServer();
  const config = createRadarrConfig("http://localhost:7878", "test-key");

  // Should not throw
  createAddMoviePrompt(server, config);
});

Deno.test("createAddSeriesPrompt - registers without errors", () => {
  const server = makeServer();
  const config = createSonarrConfig("http://localhost:8989", "test-key");

  // Should not throw
  createAddSeriesPrompt(server, config);
});

Deno.test("createLibraryReportPrompt - registers without errors", () => {
  const server = makeServer();

  // Should not throw
  createLibraryReportPrompt(server);
});

Deno.test("createRecommendationsPrompt - registers without errors", () => {
  const server = makeServer();

  // Should not throw
  createRecommendationsPrompt(server);
});

Deno.test("createLibraryReportPrompt - returns valid messages", async () => {
  const server = makeServer();
  createLibraryReportPrompt(server);

  // Access the registered prompt via the server's internal prompt registry
  // and invoke the handler the SDK uses for prompts/get.
  const registered = (server as unknown as {
    _registeredPrompts: Record<string, {
      handler: (
        args: Record<string, never>,
        context: never,
      ) => Promise<unknown>;
    }>;
  })._registeredPrompts;

  assertExists(registered, "Expected _registeredPrompts to exist on server");

  const prompt = registered["library-report"];
  assertExists(prompt, "Expected library-report prompt to be registered");

  const result = await prompt.handler({}, {} as never);
  const { messages } = result as {
    messages: Array<{ role: string; content: { type: string; text: string } }>;
  };

  assertExists(messages, "Expected messages array");
  assertEquals(messages.length, 1);
  assertEquals(messages[0].role, "user");
  assertEquals(messages[0].content.type, "text");
  assertEquals(typeof messages[0].content.text, "string");
});

Deno.test("createRecommendationsPrompt - returns valid messages", async () => {
  const server = makeServer();
  createRecommendationsPrompt(server);

  const registered = (server as unknown as {
    _registeredPrompts: Record<string, {
      handler: (
        args: Record<string, never>,
        context: never,
      ) => Promise<unknown>;
    }>;
  })._registeredPrompts;

  assertExists(registered);

  const prompt = registered["recommendations"];
  assertExists(prompt, "Expected recommendations prompt to be registered");

  const result = await prompt.handler({}, {} as never);
  const { messages } = result as {
    messages: Array<{ role: string; content: { type: string; text: string } }>;
  };

  assertExists(messages);
  assertEquals(messages.length, 1);
  assertEquals(messages[0].role, "user");
  assertEquals(messages[0].content.type, "text");
  assertEquals(typeof messages[0].content.text, "string");
});
