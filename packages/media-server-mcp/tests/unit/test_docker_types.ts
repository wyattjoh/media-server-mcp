/**
 * Unit tests for Docker types
 * 
 * Tests TypeScript type definitions, interfaces, and type validation
 * for Docker integration functionality.
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  type ContainerStatus,
  type HealthStatus,
  type TransportMode,
  type ServiceType,
  type ServiceConnectionStatus,
  type VolumeType,
  type NetworkProtocol,
  type DockerContainer,
  type PortMapping,
  type VolumeMount,
  type EnvironmentVariable,
  type EnvironmentConfiguration,
  type HealthStatusEntity,
  type ServiceConnection,
  type DockerVolume,
  type ContainerStatusResponse,
  type HealthCheckResponse,
} from "../../src/types/docker-types.ts";

Deno.test("Docker types - Container status enumeration", () => {
  const validStatuses: ContainerStatus[] = ["running", "stopped", "restarting", "exited"];
  
  validStatuses.forEach(status => {
    assertExists(status);
    assertEquals(typeof status, "string");
  });
});

Deno.test("Docker types - Health status enumeration", () => {
  const validStatuses: HealthStatus[] = ["healthy", "unhealthy", "starting"];
  
  validStatuses.forEach(status => {
    assertExists(status);
    assertEquals(typeof status, "string");
  });
});

Deno.test("Docker types - Transport mode enumeration", () => {
  const validModes: TransportMode[] = ["stdio", "sse"];
  
  validModes.forEach(mode => {
    assertExists(mode);
    assertEquals(typeof mode, "string");
  });
});

Deno.test("Docker types - Service type enumeration", () => {
  const validServices: ServiceType[] = ["radarr", "sonarr", "tmdb", "plex"];
  
  validServices.forEach(service => {
    assertExists(service);
    assertEquals(typeof service, "string");
  });
});

Deno.test("Docker types - Service connection status enumeration", () => {
  const validStatuses: ServiceConnectionStatus[] = ["connected", "disconnected", "error"];
  
  validStatuses.forEach(status => {
    assertExists(status);
    assertEquals(typeof status, "string");
  });
});

Deno.test("Docker types - Volume type enumeration", () => {
  const validTypes: VolumeType[] = ["logs", "config", "data"];
  
  validTypes.forEach(type => {
    assertExists(type);
    assertEquals(typeof type, "string");
  });
});

Deno.test("Docker types - Network protocol enumeration", () => {
  const validProtocols: NetworkProtocol[] = ["tcp", "udp"];
  
  validProtocols.forEach(protocol => {
    assertExists(protocol);
    assertEquals(typeof protocol, "string");
  });
});

Deno.test("Docker types - PortMapping interface", () => {
  const portMapping: PortMapping = {
    containerPort: 3000,
    hostPort: 3000,
    protocol: "tcp"
  };
  
  assertEquals(portMapping.containerPort, 3000);
  assertEquals(portMapping.hostPort, 3000);
  assertEquals(portMapping.protocol, "tcp");
  assertEquals(typeof portMapping.containerPort, "number");
  assertEquals(typeof portMapping.hostPort, "number");
  assertEquals(typeof portMapping.protocol, "string");
});

Deno.test("Docker types - VolumeMount interface", () => {
  const volumeMount: VolumeMount = {
    name: "media-server-mcp-logs",
    mountPath: "/app/logs",
    type: "logs",
    hostPath: "/host/logs",
    size: "1GB"
  };
  
  assertEquals(volumeMount.name, "media-server-mcp-logs");
  assertEquals(volumeMount.mountPath, "/app/logs");
  assertEquals(volumeMount.type, "logs");
  assertEquals(volumeMount.hostPath, "/host/logs");
  assertEquals(volumeMount.size, "1GB");
});

Deno.test("Docker types - VolumeMount interface with optional fields", () => {
  const volumeMount: VolumeMount = {
    name: "media-server-mcp-config",
    mountPath: "/app/config",
    type: "config"
  };
  
  assertEquals(volumeMount.name, "media-server-mcp-config");
  assertEquals(volumeMount.mountPath, "/app/config");
  assertEquals(volumeMount.type, "config");
  assertEquals(volumeMount.hostPath, undefined);
  assertEquals(volumeMount.size, undefined);
});

Deno.test("Docker types - EnvironmentVariable interface", () => {
  const envVar: EnvironmentVariable = {
    name: "RADARR_URL",
    value: "http://localhost:7878",
    sensitive: false
  };
  
  assertEquals(envVar.name, "RADARR_URL");
  assertEquals(envVar.value, "http://localhost:7878");
  assertEquals(envVar.sensitive, false);
});

Deno.test("Docker types - EnvironmentVariable interface with sensitive data", () => {
  const envVar: EnvironmentVariable = {
    name: "RADARR_API_KEY",
    value: "secret-api-key",
    sensitive: true
  };
  
  assertEquals(envVar.name, "RADARR_API_KEY");
  assertEquals(envVar.value, "secret-api-key");
  assertEquals(envVar.sensitive, true);
});

Deno.test("Docker types - EnvironmentConfiguration interface", () => {
  const config: EnvironmentConfiguration = {
    radarrUrl: "http://localhost:7878",
    radarrApiKey: "radarr-key",
    sonarrUrl: "http://localhost:8989",
    sonarrApiKey: "sonarr-key",
    tmdbApiKey: "tmdb-key",
    plexUrl: "http://localhost:32400",
    plexApiKey: "plex-key",
    mcpAuthToken: "auth-token",
    toolProfile: "default",
    debugMode: true
  };
  
  assertEquals(config.radarrUrl, "http://localhost:7878");
  assertEquals(config.radarrApiKey, "radarr-key");
  assertEquals(config.sonarrUrl, "http://localhost:8989");
  assertEquals(config.sonarrApiKey, "sonarr-key");
  assertEquals(config.tmdbApiKey, "tmdb-key");
  assertEquals(config.plexUrl, "http://localhost:32400");
  assertEquals(config.plexApiKey, "plex-key");
  assertEquals(config.mcpAuthToken, "auth-token");
  assertEquals(config.toolProfile, "default");
  assertEquals(config.debugMode, true);
});

Deno.test("Docker types - EnvironmentConfiguration interface with minimal config", () => {
  const config: EnvironmentConfiguration = {
    debugMode: false
  };
  
  assertEquals(config.radarrUrl, undefined);
  assertEquals(config.radarrApiKey, undefined);
  assertEquals(config.sonarrUrl, undefined);
  assertEquals(config.sonarrApiKey, undefined);
  assertEquals(config.tmdbApiKey, undefined);
  assertEquals(config.plexUrl, undefined);
  assertEquals(config.plexApiKey, undefined);
  assertEquals(config.mcpAuthToken, undefined);
  assertEquals(config.toolProfile, undefined);
  assertEquals(config.debugMode, false);
});

Deno.test("Docker types - ServiceConnection interface", () => {
  const connection: ServiceConnection = {
    service: "radarr",
    status: "connected",
    lastCheck: "2024-12-19T10:30:00Z",
    responseTime: "150ms"
  };
  
  assertEquals(connection.service, "radarr");
  assertEquals(connection.status, "connected");
  assertEquals(connection.lastCheck, "2024-12-19T10:30:00Z");
  assertEquals(connection.responseTime, "150ms");
  assertEquals(connection.error, undefined);
});

Deno.test("Docker types - ServiceConnection interface with error", () => {
  const connection: ServiceConnection = {
    service: "sonarr",
    status: "error",
    lastCheck: "2024-12-19T10:30:00Z",
    error: "Connection timeout"
  };
  
  assertEquals(connection.service, "sonarr");
  assertEquals(connection.status, "error");
  assertEquals(connection.lastCheck, "2024-12-19T10:30:00Z");
  assertEquals(connection.error, "Connection timeout");
  assertEquals(connection.responseTime, undefined);
});

Deno.test("Docker types - DockerVolume interface", () => {
  const volume: DockerVolume = {
    name: "media-server-mcp-logs",
    type: "logs",
    mountPath: "/app/logs",
    hostPath: "/host/logs",
    size: "1GB",
    driver: "local"
  };
  
  assertEquals(volume.name, "media-server-mcp-logs");
  assertEquals(volume.type, "logs");
  assertEquals(volume.mountPath, "/app/logs");
  assertEquals(volume.hostPath, "/host/logs");
  assertEquals(volume.size, "1GB");
  assertEquals(volume.driver, "local");
});

Deno.test("Docker types - DockerVolume interface with minimal config", () => {
  const volume: DockerVolume = {
    name: "media-server-mcp-config",
    type: "config",
    mountPath: "/app/config",
    driver: "local"
  };
  
  assertEquals(volume.name, "media-server-mcp-config");
  assertEquals(volume.type, "config");
  assertEquals(volume.mountPath, "/app/config");
  assertEquals(volume.hostPath, undefined);
  assertEquals(volume.size, undefined);
  assertEquals(volume.driver, "local");
});

Deno.test("Docker types - HealthStatusEntity interface", () => {
  const healthStatus: HealthStatusEntity = {
    serverStatus: "healthy",
    serviceConnections: [
      {
        service: "radarr",
        status: "connected",
        lastCheck: "2024-12-19T10:30:00Z",
        responseTime: "150ms"
      }
    ],
    lastCheck: "2024-12-19T10:30:00Z",
    uptime: "PT2H30M",
    version: "1.0.0",
    transportMode: "sse"
  };
  
  assertEquals(healthStatus.serverStatus, "healthy");
  assertEquals(healthStatus.serviceConnections.length, 1);
  assertEquals(healthStatus.serviceConnections[0].service, "radarr");
  assertEquals(healthStatus.serviceConnections[0].status, "connected");
  assertEquals(healthStatus.lastCheck, "2024-12-19T10:30:00Z");
  assertEquals(healthStatus.uptime, "PT2H30M");
  assertEquals(healthStatus.version, "1.0.0");
  assertEquals(healthStatus.transportMode, "sse");
});

Deno.test("Docker types - DockerContainer interface", () => {
  const container: DockerContainer = {
    image: "media-server-mcp:latest",
    containerId: "abc123def456",
    status: "running",
    ports: [
      {
        containerPort: 3000,
        hostPort: 3000,
        protocol: "tcp"
      }
    ],
    volumes: [
      {
        name: "media-server-mcp-logs",
        mountPath: "/app/logs",
        type: "logs"
      }
    ],
    environment: [
      {
        name: "RADARR_URL",
        value: "http://localhost:7878",
        sensitive: false
      }
    ],
    healthStatus: "healthy"
  };
  
  assertEquals(container.image, "media-server-mcp:latest");
  assertEquals(container.containerId, "abc123def456");
  assertEquals(container.status, "running");
  assertEquals(container.ports.length, 1);
  assertEquals(container.volumes.length, 1);
  assertEquals(container.environment.length, 1);
  assertEquals(container.healthStatus, "healthy");
});

Deno.test("Docker types - ContainerStatusResponse interface", () => {
  const statusResponse: ContainerStatusResponse = {
    containerId: "abc123def456",
    status: "running",
    image: "media-server-mcp:latest",
    ports: [
      {
        containerPort: 3000,
        hostPort: 3000,
        protocol: "tcp"
      }
    ],
    volumes: [
      {
        name: "media-server-mcp-logs",
        mountPath: "/app/logs",
        type: "logs"
      }
    ],
    environment: [
      {
        name: "RADARR_URL",
        value: "http://localhost:7878",
        sensitive: false
      }
    ],
    healthStatus: "healthy"
  };
  
  assertEquals(statusResponse.containerId, "abc123def456");
  assertEquals(statusResponse.status, "running");
  assertEquals(statusResponse.image, "media-server-mcp:latest");
  assertEquals(statusResponse.ports.length, 1);
  assertEquals(statusResponse.volumes.length, 1);
  assertEquals(statusResponse.environment.length, 1);
  assertEquals(statusResponse.healthStatus, "healthy");
});

Deno.test("Docker types - HealthCheckResponse interface", () => {
  const healthResponse: HealthCheckResponse = {
    serverStatus: "healthy",
    serviceConnections: [
      {
        service: "radarr",
        status: "connected",
        lastCheck: "2024-12-19T10:30:00Z",
        responseTime: "150ms"
      },
      {
        service: "sonarr",
        status: "disconnected",
        lastCheck: "2024-12-19T10:30:00Z"
      }
    ],
    lastCheck: "2024-12-19T10:30:00Z",
    uptime: "PT2H30M",
    version: "1.0.0",
    transportMode: "sse"
  };
  
  assertEquals(healthResponse.serverStatus, "healthy");
  assertEquals(healthResponse.serviceConnections.length, 2);
  assertEquals(healthResponse.serviceConnections[0].service, "radarr");
  assertEquals(healthResponse.serviceConnections[0].status, "connected");
  assertEquals(healthResponse.serviceConnections[1].service, "sonarr");
  assertEquals(healthResponse.serviceConnections[1].status, "disconnected");
  assertEquals(healthResponse.lastCheck, "2024-12-19T10:30:00Z");
  assertEquals(healthResponse.uptime, "PT2H30M");
  assertEquals(healthResponse.version, "1.0.0");
  assertEquals(healthResponse.transportMode, "sse");
});
