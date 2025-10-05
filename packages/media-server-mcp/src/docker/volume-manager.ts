/**
 * Volume mount handling for Docker integration
 * 
 * Provides functionality for managing Docker volume mounts,
 * including validation, persistence, and mount point management.
 */

import { getLogger } from "../logging.ts";
import type { 
  DockerVolume, 
  VolumeMount, 
  VolumeType 
} from "../types/docker-types.ts";

interface VolumeManagerOptions {
  volumes: VolumeMount[];
  basePath?: string;
}

/**
 * Volume manager for handling Docker volume mounts
 */
export function createVolumeManager(options: VolumeManagerOptions) {
  const logger = getLogger(["media-server-mcp", "docker", "volume"]);
  const { volumes, basePath = "/app" } = options;

  /**
   * Validate volume mount configuration
   */
  function validateVolumeMount(volume: VolumeMount): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate volume name
    if (!volume.name || volume.name.trim() === "") {
      errors.push("Volume name is required");
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(volume.name)) {
      errors.push(`Invalid volume name: ${volume.name}. Must start with alphanumeric character and contain only alphanumeric, underscore, dot, or dash characters`);
    }

    // Validate mount path
    if (!volume.mountPath || !volume.mountPath.startsWith("/")) {
      errors.push(`Invalid mount path: ${volume.mountPath}. Must be an absolute path`);
    }

    // Validate volume type
    const validTypes: VolumeType[] = ["logs", "config", "data"];
    if (!validTypes.includes(volume.type)) {
      errors.push(`Invalid volume type: ${volume.type}. Must be one of: ${validTypes.join(", ")}`);
    }

    // Validate size if provided
    if (volume.size && !isValidDockerSize(volume.size)) {
      errors.push(`Invalid volume size: ${volume.size}. Must be in Docker size format (e.g., '1GB', '500MB')`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Docker size format
   */
  function isValidDockerSize(size: string): boolean {
    const sizeRegex = /^\d+(\.\d+)?[KMGT]?B?$/i;
    return sizeRegex.test(size);
  }

  /**
   * Validate all volume mounts
   */
  function validateAllVolumes(): { valid: boolean; errors: string[] } {
    const allErrors: string[] = [];
    const volumeNames = new Set<string>();
    const mountPaths = new Set<string>();

    for (const volume of volumes) {
      const validation = validateVolumeMount(volume);
      if (!validation.valid) {
        allErrors.push(...validation.errors.map(error => `${volume.name}: ${error}`));
      }

      // Check for duplicate names
      if (volumeNames.has(volume.name)) {
        allErrors.push(`Duplicate volume name: ${volume.name}`);
      } else {
        volumeNames.add(volume.name);
      }

      // Check for duplicate mount paths
      if (mountPaths.has(volume.mountPath)) {
        allErrors.push(`Duplicate mount path: ${volume.mountPath}`);
      } else {
        mountPaths.add(volume.mountPath);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Get volume by name
   */
  function getVolumeByName(name: string): VolumeMount | undefined {
    return volumes.find(volume => volume.name === name);
  }

  /**
   * Get volume by mount path
   */
  function getVolumeByMountPath(mountPath: string): VolumeMount | undefined {
    return volumes.find(volume => volume.mountPath === mountPath);
  }

  /**
   * Get volumes by type
   */
  function getVolumesByType(type: VolumeType): VolumeMount[] {
    return volumes.filter(volume => volume.type === type);
  }

  /**
   * Get all volumes as DockerVolume entities
   */
  function getAllVolumes(): DockerVolume[] {
    return volumes.map(volume => ({
      name: volume.name,
      type: volume.type,
      mountPath: volume.mountPath,
      hostPath: volume.hostPath,
      size: volume.size,
      driver: "local", // Default driver
    }));
  }

  /**
   * Initialize volume directories
   */
  async function initializeVolumeDirectories(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    logger.info("Initializing volume directories", {
      volumeCount: volumes.length,
      basePath,
    });

    for (const volume of volumes) {
      try {
        const fullPath = `${basePath}${volume.mountPath}`;
        
        // Check if directory exists
        try {
          const stat = await Deno.stat(fullPath);
          if (!stat.isDirectory) {
            errors.push(`Path exists but is not a directory: ${fullPath}`);
            continue;
          }
        } catch (error) {
          if (error instanceof Deno.errors.NotFound) {
            // Directory doesn't exist, create it
            try {
              await Deno.mkdir(fullPath, { recursive: true });
              logger.debug("Created volume directory", {
                volume: volume.name,
                path: fullPath,
                type: volume.type,
              });
            } catch (mkdirError) {
              errors.push(`Failed to create directory ${fullPath}: ${mkdirError instanceof Error ? mkdirError.message : String(mkdirError)}`);
            }
          } else {
            errors.push(`Failed to check directory ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Set appropriate permissions based on volume type
        try {
          const fullPath = `${basePath}${volume.mountPath}`;
          const stat = await Deno.stat(fullPath);
          
          // For logs and config volumes, ensure write permissions
          if (volume.type === "logs" || volume.type === "config") {
            // Note: In a real container environment, this would be handled by Docker
            // Here we just log the expected permissions
            logger.debug("Volume permissions", {
              volume: volume.name,
              path: fullPath,
              type: volume.type,
              mode: stat.mode,
            });
          }
        } catch (error) {
          logger.warn("Failed to check volume permissions", {
            volume: volume.name,
            path: fullPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } catch (error) {
        errors.push(`Failed to initialize volume ${volume.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const success = errors.length === 0;
    
    if (success) {
      logger.info("Volume directories initialized successfully", {
        volumeCount: volumes.length,
      });
    } else {
      logger.error("Volume directory initialization failed", {
        errorCount: errors.length,
        errors,
      });
    }

    return { success, errors };
  }

  /**
   * Get volume usage information
   */
  async function getVolumeUsage(): Promise<Array<{
    volume: VolumeMount;
    exists: boolean;
    isDirectory: boolean;
    size?: number;
    error?: string;
  }>> {
    const usage: Array<{
      volume: VolumeMount;
      exists: boolean;
      isDirectory: boolean;
      size?: number;
      error?: string;
    }> = [];

    for (const volume of volumes) {
      try {
        const fullPath = `${basePath}${volume.mountPath}`;
        const stat = await Deno.stat(fullPath);
        
        usage.push({
          volume,
          exists: true,
          isDirectory: stat.isDirectory,
          size: stat.size,
        });
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          usage.push({
            volume,
            exists: false,
            isDirectory: false,
          });
        } else {
          usage.push({
            volume,
            exists: false,
            isDirectory: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return usage;
  }

  /**
   * Get volume configuration summary
   */
  function getConfigurationSummary(): {
    totalVolumes: number;
    volumesByType: Record<VolumeType, number>;
    totalSize: string | undefined;
    mountPaths: string[];
  } {
    const volumesByType: Record<VolumeType, number> = {
      logs: 0,
      config: 0,
      data: 0,
    };

    let totalSizeBytes = 0;
    const mountPaths: string[] = [];

    for (const volume of volumes) {
      volumesByType[volume.type]++;
      mountPaths.push(volume.mountPath);
      
      if (volume.size) {
        const sizeBytes = parseDockerSize(volume.size);
        if (sizeBytes > 0) {
          totalSizeBytes += sizeBytes;
        }
      }
    }

    return {
      totalVolumes: volumes.length,
      volumesByType,
      totalSize: totalSizeBytes > 0 ? formatDockerSize(totalSizeBytes) : undefined,
      mountPaths,
    };
  }

  /**
   * Parse Docker size format to bytes
   */
  function parseDockerSize(size: string): number {
    const match = size.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B?)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case "B":
      case "":
        return value;
      case "KB":
        return value * 1024;
      case "MB":
        return value * 1024 * 1024;
      case "GB":
        return value * 1024 * 1024 * 1024;
      case "TB":
        return value * 1024 * 1024 * 1024 * 1024;
      default:
        return 0;
    }
  }

  /**
   * Format bytes to Docker size format
   */
  function formatDockerSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100}${units[unitIndex]}`;
  }

  return {
    validateVolumeMount,
    validateAllVolumes,
    getVolumeByName,
    getVolumeByMountPath,
    getVolumesByType,
    getAllVolumes,
    initializeVolumeDirectories,
    getVolumeUsage,
    getConfigurationSummary,
  };
}

export type VolumeManager = ReturnType<typeof createVolumeManager>;
