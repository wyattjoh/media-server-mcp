/**
 * Container lifecycle management for Docker integration
 * 
 * Provides functionality for managing Docker container lifecycle,
 * including startup, shutdown, and health monitoring.
 */

import { getLogger } from "../logging.ts";
import type { 
  DockerContainer, 
  ContainerStatus, 
  HealthStatus,
  PortMapping,
  VolumeMount,
  EnvironmentVariable 
} from "../types/docker-types.ts";

interface ContainerManagerOptions {
  containerId?: string;
  image: string;
  ports: PortMapping[];
  volumes: VolumeMount[];
  environment: EnvironmentVariable[];
}

/**
 * Container lifecycle manager
 */
export function createContainerManager(options: ContainerManagerOptions) {
  const logger = getLogger(["media-server-mcp", "docker", "container"]);
  const { containerId, image, ports, volumes, environment } = options;

  // Container state tracking
  let currentStatus: ContainerStatus = "running";
  let healthStatus: HealthStatus = "starting";
  let startTime = new Date();

  /**
   * Get current container information
   */
  function getContainerInfo(): DockerContainer {
    return {
      image,
      containerId: containerId || Deno.env.get("HOSTNAME") || "unknown",
      status: currentStatus,
      ports,
      volumes,
      environment,
      healthStatus,
    };
  }

  /**
   * Get container status
   */
  function getStatus(): ContainerStatus {
    return currentStatus;
  }

  /**
   * Get health status
   */
  function getHealthStatus(): HealthStatus {
    return healthStatus;
  }

  /**
   * Update health status
   */
  function updateHealthStatus(status: HealthStatus): void {
    const previousStatus = healthStatus;
    healthStatus = status;
    
    if (previousStatus !== status) {
      logger.info("Health status changed", { 
        from: previousStatus, 
        to: status,
        containerId: containerId || "unknown"
      });
    }
  }

  /**
   * Update container status
   */
  function updateStatus(status: ContainerStatus): void {
    const previousStatus = currentStatus;
    currentStatus = status;
    
    if (previousStatus !== status) {
      logger.info("Container status changed", { 
        from: previousStatus, 
        to: status,
        containerId: containerId || "unknown"
      });
    }
  }

  /**
   * Initialize container startup
   */
  function initializeStartup(): void {
    logger.info("Initializing container startup", {
      containerId: containerId || "unknown",
      image,
      portCount: ports.length,
      volumeCount: volumes.length,
      environmentCount: environment.length,
    });

    startTime = new Date();
    currentStatus = "starting";
    healthStatus = "starting";

    // Log startup information
    logger.info("Container configuration", {
      ports: ports.map(p => `${p.hostPort}:${p.containerPort}/${p.protocol}`),
      volumes: volumes.map(v => `${v.name}:${v.mountPath} (${v.type})`),
      environment: environment
        .filter(e => !e.sensitive)
        .map(e => `${e.name}=${e.value}`),
    });
  }

  /**
   * Mark container as running
   */
  function markRunning(): void {
    updateStatus("running");
    updateHealthStatus("healthy");
    
    const startupTime = Date.now() - startTime.getTime();
    logger.info("Container startup completed", {
      containerId: containerId || "unknown",
      startupTimeMs: startupTime,
      startupTimeSeconds: Math.round(startupTime / 1000),
    });
  }

  /**
   * Mark container as unhealthy
   */
  function markUnhealthy(reason?: string): void {
    updateHealthStatus("unhealthy");
    
    logger.warn("Container marked as unhealthy", {
      containerId: containerId || "unknown",
      reason: reason || "Unknown reason",
    });
  }

  /**
   * Handle graceful shutdown
   */
  function initiateShutdown(): void {
    logger.info("Initiating graceful shutdown", {
      containerId: containerId || "unknown",
    });

    updateStatus("stopping");
    updateHealthStatus("unhealthy");
  }

  /**
   * Complete shutdown
   */
  function completeShutdown(): void {
    updateStatus("stopped");
    updateHealthStatus("unhealthy");
    
    const uptime = Date.now() - startTime.getTime();
    logger.info("Container shutdown completed", {
      containerId: containerId || "unknown",
      uptimeMs: uptime,
      uptimeSeconds: Math.round(uptime / 1000),
    });
  }

  /**
   * Handle restart
   */
  function handleRestart(): void {
    logger.info("Handling container restart", {
      containerId: containerId || "unknown",
    });

    updateStatus("restarting");
    updateHealthStatus("starting");
    
    // Reset startup time for restart
    startTime = new Date();
  }

  /**
   * Get uptime in milliseconds
   */
  function getUptime(): number {
    return Date.now() - startTime.getTime();
  }

  /**
   * Get uptime in ISO 8601 duration format
   */
  function getUptimeDuration(): string {
    const uptimeMs = getUptime();
    const diffSeconds = Math.floor(uptimeMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Format as ISO 8601 duration (PT2H30M format)
    let duration = "PT";
    if (diffDays > 0) {
      duration += `${diffDays}D`;
    }
    if (diffHours % 24 > 0) {
      duration += `${diffHours % 24}H`;
    }
    if (diffMinutes % 60 > 0) {
      duration += `${diffMinutes % 60}M`;
    }
    if (diffSeconds % 60 > 0) {
      duration += `${diffSeconds % 60}S`;
    }
    
    return duration === "PT" ? "PT0S" : duration;
  }

  /**
   * Validate container configuration
   */
  function validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate image
    if (!image || image.trim() === "") {
      errors.push("Container image is required");
    }

    // Validate ports
    for (const port of ports) {
      if (port.containerPort < 1 || port.containerPort > 65535) {
        errors.push(`Invalid container port: ${port.containerPort}`);
      }
      if (port.hostPort < 1 || port.hostPort > 65535) {
        errors.push(`Invalid host port: ${port.hostPort}`);
      }
    }

    // Validate volumes
    for (const volume of volumes) {
      if (!volume.name || volume.name.trim() === "") {
        errors.push("Volume name is required");
      }
      if (!volume.mountPath || !volume.mountPath.startsWith("/")) {
        errors.push(`Invalid mount path: ${volume.mountPath}`);
      }
    }

    // Validate environment variables
    for (const env of environment) {
      if (!env.name || env.name.trim() === "") {
        errors.push("Environment variable name is required");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get container metrics
   */
  function getMetrics(): {
    uptime: number;
    uptimeDuration: string;
    status: ContainerStatus;
    healthStatus: HealthStatus;
    portCount: number;
    volumeCount: number;
    environmentCount: number;
  } {
    return {
      uptime: getUptime(),
      uptimeDuration: getUptimeDuration(),
      status: currentStatus,
      healthStatus,
      portCount: ports.length,
      volumeCount: volumes.length,
      environmentCount: environment.length,
    };
  }

  return {
    getContainerInfo,
    getStatus,
    getHealthStatus,
    updateHealthStatus,
    updateStatus,
    initializeStartup,
    markRunning,
    markUnhealthy,
    initiateShutdown,
    completeShutdown,
    handleRestart,
    getUptime,
    getUptimeDuration,
    validateConfiguration,
    getMetrics,
  };
}

export type ContainerManager = ReturnType<typeof createContainerManager>;
