/**
 * Docker integration types for media-server-mcp
 * 
 * This file contains TypeScript type definitions for Docker container management,
 * environment configuration, health monitoring, and volume management.
 */

// Container status enumeration (public contract)
export type ContainerStatus = "running" | "stopped" | "restarting" | "exited";

// Internal container status enumeration (includes transitional states)
export type InternalContainerStatus = ContainerStatus | "starting" | "stopping";
// Health status enumeration
export type HealthStatus = "healthy" | "unhealthy" | "starting";

// Transport mode enumeration
export type TransportMode = "stdio" | "sse";

// Service type enumeration
export type ServiceType = "radarr" | "sonarr" | "tmdb" | "plex";

// Service connection status enumeration
export type ServiceConnectionStatus = "connected" | "disconnected" | "error";

// Volume type enumeration
export type VolumeType = "logs" | "config" | "data";

// Network protocol enumeration
export type NetworkProtocol = "tcp" | "udp";

/**
 * Docker Container entity
 * Represents the isolated runtime environment for media-server-mcp
 */
export interface DockerContainer {
  /** Docker image identifier (e.g., "media-server-mcp:latest") */
  image: string;
  
  /** Unique container identifier */
  containerId: string;
  
  /** Container state */
  status: ContainerStatus;
  
  /** Network port mappings */
  ports: PortMapping[];
  
  /** Persistent storage mounts */
  volumes: VolumeMount[];
  
  /** Configuration variables */
  environment: EnvironmentVariable[];
  
  /** Health check status */
  healthStatus: HealthStatus;
}

/**
 * Port mapping for container networking
 */
export interface PortMapping {
  /** Container port number */
  containerPort: number;
  
  /** Host port number */
  hostPort: number;
  
  /** Network protocol */
  protocol: NetworkProtocol;
}

/**
 * Volume mount for persistent storage
 */
export interface VolumeMount {
  /** Volume name */
  name: string;
  
  /** Container mount point */
  mountPath: string;
  
  /** Volume type */
  type: VolumeType;
  
  /** Host path for bind mounts (optional) */
  hostPath: string | undefined;
  
  /** Volume size limit (optional) */
  size: string | undefined;
}

/**
 * Environment variable configuration
 */
export interface EnvironmentVariable {
  /** Environment variable name */
  name: string;
  
  /** Environment variable value */
  value: string;
  
  /** Whether the value contains sensitive information */
  sensitive?: boolean;
}

/**
 * Environment Configuration entity
 * Service connection settings passed to container
 */
export interface EnvironmentConfiguration {
  /** Radarr service URL (optional) */
  radarrUrl: string | undefined;
  
  /** Radarr API authentication key (optional) */
  radarrApiKey: string | undefined;
  
  /** Sonarr service URL (optional) */
  sonarrUrl: string | undefined;
  
  /** Sonarr API authentication key (optional) */
  sonarrApiKey: string | undefined;
  
  /** TMDB API authentication key (optional) */
  tmdbApiKey: string | undefined;
  
  /** Plex service URL (optional) */
  plexUrl: string | undefined;
  
  /** Plex API authentication key (optional) */
  plexApiKey: string | undefined;
  
  /** MCP authentication token for SSE mode (optional) */
  mcpAuthToken: string | undefined;
  
  /** Tool configuration profile (optional) */
  toolProfile: string | undefined;
  
  /** Enable debug logging */
  debugMode: boolean;
}

/**
 * Health Status entity
 * Current state and availability of MCP server and services
 */
export interface HealthStatusEntity {
  /** MCP server state */
  serverStatus: HealthStatus;
  
  /** Individual service health */
  serviceConnections: ServiceConnection[];
  
  /** Last health check time */
  lastCheck: string; // ISO 8601 timestamp
  
  /** Server uptime */
  uptime: string; // ISO 8601 duration
  
  /** Application version */
  version: string;
  
  /** Active transport mode */
  transportMode: TransportMode;
}

/**
 * Service Connection entity
 * Individual service connectivity status
 */
export interface ServiceConnection {
  /** Service type */
  service: ServiceType;
  
  /** Connection state */
  status: ServiceConnectionStatus;
  
  /** Last connection attempt */
  lastCheck: string; // ISO 8601 timestamp
  
  /** Error message if connection failed (optional) */
  error?: string;
  
  /** Last successful response time (optional) */
  responseTime?: string; // Duration in milliseconds
}

/**
 * Docker Volume entity
 * Persistent storage for container data
 */
export interface DockerVolume {
  /** Volume identifier */
  name: string;
  
  /** Volume type */
  type: VolumeType;
  
  /** Container mount point */
  mountPath: string;
  
  /** Host path for bind mounts (optional) */
  hostPath: string | undefined;
  
  /** Volume size limit (optional) */
  size: string | undefined;
  
  /** Storage driver (default: local) */
  driver: string;
}

/**
 * Container status response
 * Detailed container and service status
 */
export interface ContainerStatusResponse {
  /** Docker container identifier */
  containerId: string;
  
  /** Container state */
  status: ContainerStatus;
  
  /** Docker image identifier */
  image: string;
  
  /** Network port mappings */
  ports: PortMapping[];
  
  /** Volume mounts */
  volumes: VolumeMount[];
  
  /** Environment variables */
  environment: EnvironmentVariable[];
  
  /** Container health status */
  healthStatus: HealthStatus;
}

/**
 * Health check response
 * Health status of the MCP server and connected services
 */
export interface HealthCheckResponse {
  /** Overall server health status */
  serverStatus: HealthStatus;
  
  /** Individual service connection status */
  serviceConnections: ServiceConnection[];
  
  /** Last health check timestamp */
  lastCheck: string; // ISO 8601 timestamp
  
  /** Server uptime */
  uptime: string; // ISO 8601 duration
  
  /** Application version */
  version: string;
  
  /** Active transport mode */
  transportMode: TransportMode;
}
