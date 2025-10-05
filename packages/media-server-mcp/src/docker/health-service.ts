/**
 * Health service for Docker integration
 * 
 * Provides health check functionality for the MCP server and connected services
 * following the Docker API contract specifications.
 */

import { getLogger } from "../logging.ts";
import type { 
  HealthCheckResponse, 
  ServiceConnection, 
  HealthStatus,
  ServiceType,
  ServiceConnectionStatus,
  TransportMode 
} from "../types/docker-types.ts";
import type { RadarrConfig } from "@wyattjoh/radarr";
import type { SonarrConfig } from "@wyattjoh/sonarr";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import type { PlexConfig } from "@wyattjoh/plex";
import { testConnection as testRadarrConnection } from "@wyattjoh/radarr";
import { testConnection as testSonarrConnection } from "@wyattjoh/sonarr";
import { testConnection as testTMDBConnection } from "@wyattjoh/tmdb";
import { testConnection as testPlexConnection } from "@wyattjoh/plex";

interface ServiceConfigs {
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  tmdbConfig?: TMDBConfig;
  plexConfig?: PlexConfig;
}

interface HealthServiceOptions {
  serviceConfigs: ServiceConfigs;
  transportMode: TransportMode;
  version: string;
  startTime: Date;
}

/**
 * Health service for monitoring MCP server and service connections
 */
export function createHealthService(options: HealthServiceOptions) {
  const logger = getLogger(["media-server-mcp", "health"]);
  const { serviceConfigs, transportMode, version, startTime } = options;

  /**
   * Get current uptime in ISO 8601 duration format
   */
  function getUptime(): string {
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Format as ISO 8601 duration (P[n]DT[n]H[n]M[n]S format)
    let duration = "P";
    if (diffDays > 0) {
      duration += `${diffDays}D`;
    }
    // Collect time components
    const hours = diffHours % 24;
    const minutes = diffMinutes % 60;
    const seconds = diffSeconds % 60;
    if (hours > 0 || minutes > 0 || seconds > 0) {
      duration += "T";
      if (hours > 0) {
        duration += `${hours}H`;
      }
      if (minutes > 0) {
        duration += `${minutes}M`;
      }
      if (seconds > 0) {
        duration += `${seconds}S`;
      }
    }
    // If duration is just "P", return "PT0S" (zero duration)
    return duration === "P" ? "PT0S" : duration;
  }

  /**
   * Test connection to a specific service
   */
  async function testServiceConnection(
    service: ServiceType,
    config: RadarrConfig | SonarrConfig | TMDBConfig | PlexConfig,
  ): Promise<ServiceConnection> {
    const requestStartTime = Date.now();
    const lastCheck = new Date().toISOString();

    try {
      let result: { success: boolean; error?: string };
      
      switch (service) {
        case "radarr":
          result = await testRadarrConnection(config as RadarrConfig);
          break;
        case "sonarr":
          result = await testSonarrConnection(config as SonarrConfig);
          break;
        case "tmdb":
          result = await testTMDBConnection(config as TMDBConfig);
          break;
        case "plex":
          result = await testPlexConnection(config as PlexConfig);
          break;
        default:
          throw new Error(`Unknown service type: ${service}`);
      }

      const responseTime = Date.now() - requestStartTime;

      if (result.success) {
        return {
          service,
          status: "connected" as ServiceConnectionStatus,
          lastCheck,
          responseTime: `${responseTime}ms`,
        };
      } else {
        return {
          service,
          status: "error" as ServiceConnectionStatus,
          lastCheck,
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Service connection test failed", { service, error: errorMessage });
      
      return {
        service,
        status: "error" as ServiceConnectionStatus,
        lastCheck,
        error: errorMessage,
      };
    }
  }

  /**
   * Get health status for all configured services
   */
  async function getServiceConnections(): Promise<ServiceConnection[]> {
    const connections: ServiceConnection[] = [];
    const lastCheck = new Date().toISOString();

    // Test each configured service
    const serviceTests: Promise<ServiceConnection>[] = [];

    if (serviceConfigs.radarrConfig) {
      serviceTests.push(testServiceConnection("radarr", serviceConfigs.radarrConfig));
    } else {
      connections.push({
        service: "radarr",
        status: "disconnected",
        lastCheck,
      });
    }

    if (serviceConfigs.sonarrConfig) {
      serviceTests.push(testServiceConnection("sonarr", serviceConfigs.sonarrConfig));
    } else {
      connections.push({
        service: "sonarr",
        status: "disconnected",
        lastCheck,
      });
    }

    if (serviceConfigs.tmdbConfig) {
      serviceTests.push(testServiceConnection("tmdb", serviceConfigs.tmdbConfig));
    } else {
      connections.push({
        service: "tmdb",
        status: "disconnected",
        lastCheck,
      });
    }

    if (serviceConfigs.plexConfig) {
      serviceTests.push(testServiceConnection("plex", serviceConfigs.plexConfig));
    } else {
      connections.push({
        service: "plex",
        status: "disconnected",
        lastCheck,
      });
    }

    // Wait for all service tests to complete
    const testResults = await Promise.all(serviceTests);
    connections.push(...testResults);

    return connections;
  }

  /**
   * Determine overall server health status
   */
  function determineServerStatus(serviceConnections: ServiceConnection[]): HealthStatus {
    const connectedServices = serviceConnections.filter(conn => conn.status === "connected");
    const errorServices = serviceConnections.filter(conn => conn.status === "error");
    const configuredServices = serviceConnections.filter(conn => conn.status !== "disconnected");

    // If no services are configured, consider healthy
    if (configuredServices.length === 0) {
      return "healthy";
    }

    // If any configured service has an error, consider unhealthy
    if (errorServices.length > 0) {
      return "unhealthy";
    }

    // If all configured services are connected, consider healthy
    if (connectedServices.length === configuredServices.length) {
      return "healthy";
    }

    // Otherwise, starting (some services not yet tested)
    return "starting";
  }

  /**
   * Get comprehensive health status
   */
  async function getHealthStatus(): Promise<HealthCheckResponse> {
    logger.debug("Generating health status");
    
    const serviceConnections = await getServiceConnections();
    const serverStatus = determineServerStatus(serviceConnections);
    const lastCheck = new Date().toISOString();

    const healthStatus: HealthCheckResponse = {
      serverStatus,
      serviceConnections,
      lastCheck,
      uptime: getUptime(),
      version,
      transportMode,
    };

    logger.debug("Health status generated", { 
      serverStatus, 
      connectedServices: serviceConnections.filter(s => s.status === "connected").length,
      totalServices: serviceConnections.length 
    });

    return healthStatus;
  }

  /**
   * Get quick health status without service testing
   */
  function getQuickHealthStatus(): HealthCheckResponse {
    const lastCheck = new Date().toISOString();
    
    return {
      serverStatus: "healthy",
      serviceConnections: [],
      lastCheck,
      uptime: getUptime(),
      version,
      transportMode,
    };
  }

  return {
    getHealthStatus,
    getQuickHealthStatus,
    testServiceConnection,
    getServiceConnections,
  };
}

export type HealthService = ReturnType<typeof createHealthService>;
