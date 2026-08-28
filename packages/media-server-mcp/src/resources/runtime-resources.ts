import type { McpServer } from "@modelcontextprotocol/server";
import type { ServiceConfig } from "../server-factory.ts";
import {
  CODEMODE_CONTRACT_REVISION,
  CODEMODE_LIMITS,
} from "../tools/codemode-executor.ts";

const SERVICE_NAMES = ["radarr", "sonarr", "tmdb", "plex"] as const;

/**
 * Registers the allowlisted identity of the running Code Mode contract.
 *
 * @param server MCP server that receives the resource.
 * @param version Package version embedded in the running server artifact.
 * @param config Service configuration used only to identify configured services.
 */
export function createRuntimeResources(
  server: McpServer,
  version: string,
  config: Readonly<ServiceConfig>,
): void {
  const configuredServices = SERVICE_NAMES.filter((service) =>
    config[`${service}Config`]
  );

  server.registerResource(
    "media-server-mcp-runtime-identity",
    "runtime://media-server-mcp/identity",
    {
      description:
        "Running media-server-mcp release and Code Mode compatibility contract",
      mimeType: "application/json",
    },
    (uri) =>
      Promise.resolve({
        contents: [{
          uri: uri.href,
          text: JSON.stringify({
            server: {
              name: "media-server-mcp",
              version,
            },
            codeMode: {
              contractRevision: CODEMODE_CONTRACT_REVISION,
              configuredServices,
              executionPolicy: "read-only",
              limits: CODEMODE_LIMITS,
            },
          }),
          mimeType: "application/json",
        }],
      }),
  );
}
