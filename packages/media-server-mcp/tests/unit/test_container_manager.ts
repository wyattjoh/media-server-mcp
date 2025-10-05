/**
 * Unit tests for container manager
 * 
 * Tests container lifecycle management functionality including
 * startup, shutdown, health monitoring, and configuration validation.
 */

import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { createContainerManager, type ContainerManager } from "../../src/docker/container-manager.ts";
import type { PortMapping, VolumeMount, EnvironmentVariable } from "../../src/types/docker-types.ts";

// Mock environment for testing
const originalEnv = Deno.env.get("HOSTNAME");
Deno.env.set("HOSTNAME", "test-container-123");

// Test data
const testPortMapping: PortMapping = {
  containerPort: 3000,
  hostPort: 3000,
  protocol: "tcp"
};

const testVolumeMount: VolumeMount = {
  name: "media-server-mcp-logs",
  mountPath: "/app/logs",
  type: "logs",
  hostPath: undefined,
  size: undefined
};

const testEnvironmentVariable: EnvironmentVariable = {
  name: "RADARR_URL",
  value: "http://localhost:7878",
  sensitive: false
};

const validContainerOptions = {
  image: "media-server-mcp:latest",
  ports: [testPortMapping],
  volumes: [testVolumeMount],
  environment: [testEnvironmentVariable]
};

Deno.test("Container manager - create with valid options", () => {
  const manager = createContainerManager(validContainerOptions);
  
  assertExists(manager);
  assertEquals(typeof manager.getContainerInfo, "function");
  assertEquals(typeof manager.getStatus, "function");
  assertEquals(typeof manager.getHealthStatus, "function");
  assertEquals(typeof manager.initializeStartup, "function");
  assertEquals(typeof manager.markRunning, "function");
  assertEquals(typeof manager.validateConfiguration, "function");
});

Deno.test("Container manager - initial state", () => {
  const manager = createContainerManager(validContainerOptions);
  
  assertEquals(manager.getStatus(), "running");
  assertEquals(manager.getHealthStatus(), "starting");
});

Deno.test("Container manager - get container info", () => {
  const manager = createContainerManager(validContainerOptions);
  const info = manager.getContainerInfo();
  
  assertEquals(info.image, "media-server-mcp:latest");
  assertEquals(info.containerId, "test-container-123");
  assertEquals(info.status, "running");
  assertEquals(info.ports.length, 1);
  assertEquals(info.volumes.length, 1);
  assertEquals(info.environment.length, 1);
  assertEquals(info.healthStatus, "starting");
});

Deno.test("Container manager - get container info with custom container ID", () => {
  const optionsWithId = {
    ...validContainerOptions,
    containerId: "custom-container-456"
  };
  const manager = createContainerManager(optionsWithId);
  const info = manager.getContainerInfo();
  
  assertEquals(info.containerId, "custom-container-456");
});

Deno.test("Container manager - update health status", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Initial state
  assertEquals(manager.getHealthStatus(), "starting");
  
  // Update to healthy
  manager.updateHealthStatus("healthy");
  assertEquals(manager.getHealthStatus(), "healthy");
  
  // Update to unhealthy
  manager.updateHealthStatus("unhealthy");
  assertEquals(manager.getHealthStatus(), "unhealthy");
});

Deno.test("Container manager - update container status", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Initial state
  assertEquals(manager.getStatus(), "running");
  
  // Update to stopping
  manager.updateStatus("stopping");
  assertEquals(manager.getStatus(), "stopping");
  
  // Update to stopped
  manager.updateStatus("stopped");
  assertEquals(manager.getStatus(), "stopped");
});

Deno.test("Container manager - initialize startup", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Initialize startup
  manager.initializeStartup();
  
  assertEquals(manager.getStatus(), "starting");
  assertEquals(manager.getHealthStatus(), "starting");
});

Deno.test("Container manager - mark running", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Initialize startup first
  manager.initializeStartup();
  assertEquals(manager.getStatus(), "starting");
  assertEquals(manager.getHealthStatus(), "starting");
  
  // Mark as running
  manager.markRunning();
  assertEquals(manager.getStatus(), "running");
  assertEquals(manager.getHealthStatus(), "healthy");
});

Deno.test("Container manager - mark unhealthy", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Start healthy
  manager.updateHealthStatus("healthy");
  assertEquals(manager.getHealthStatus(), "healthy");
  
  // Mark unhealthy with reason
  manager.markUnhealthy("Service connection failed");
  assertEquals(manager.getHealthStatus(), "unhealthy");
});

Deno.test("Container manager - mark unhealthy without reason", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Start healthy
  manager.updateHealthStatus("healthy");
  assertEquals(manager.getHealthStatus(), "healthy");
  
  // Mark unhealthy without reason
  manager.markUnhealthy();
  assertEquals(manager.getHealthStatus(), "unhealthy");
});

Deno.test("Container manager - initiate shutdown", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Start running
  manager.markRunning();
  assertEquals(manager.getStatus(), "running");
  assertEquals(manager.getHealthStatus(), "healthy");
  
  // Initiate shutdown
  manager.initiateShutdown();
  assertEquals(manager.getStatus(), "stopping");
  assertEquals(manager.getHealthStatus(), "unhealthy");
});

Deno.test("Container manager - complete shutdown", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Start running
  manager.markRunning();
  assertEquals(manager.getStatus(), "running");
  
  // Initiate shutdown
  manager.initiateShutdown();
  assertEquals(manager.getStatus(), "stopping");
  
  // Complete shutdown
  manager.completeShutdown();
  assertEquals(manager.getStatus(), "stopped");
  assertEquals(manager.getHealthStatus(), "unhealthy");
});

Deno.test("Container manager - handle restart", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Start running
  manager.markRunning();
  assertEquals(manager.getStatus(), "running");
  assertEquals(manager.getHealthStatus(), "healthy");
  
  // Handle restart
  manager.handleRestart();
  assertEquals(manager.getStatus(), "restarting");
  assertEquals(manager.getHealthStatus(), "starting");
});

Deno.test("Container manager - get uptime", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Get initial uptime
  const uptime1 = manager.getUptime();
  assert(uptime1 >= 0);
  
  // Wait a bit and get uptime again
  const start = Date.now();
  while (Date.now() - start < 10) {
    // Small delay
  }
  const uptime2 = manager.getUptime();
  assert(uptime2 >= uptime1);
});

Deno.test("Container manager - get uptime duration", () => {
  const manager = createContainerManager(validContainerOptions);
  
  const duration = manager.getUptimeDuration();
  assertExists(duration);
  assertEquals(typeof duration, "string");
  assert(duration.startsWith("PT"));
});

Deno.test("Container manager - validate configuration with valid options", () => {
  const manager = createContainerManager(validContainerOptions);
  const validation = manager.validateConfiguration();
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("Container manager - validate configuration with invalid image", () => {
  const invalidOptions = {
    ...validContainerOptions,
    image: ""
  };
  const manager = createContainerManager(invalidOptions);
  const validation = manager.validateConfiguration();
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assertEquals(validation.errors[0], "Container image is required");
});

Deno.test("Container manager - validate configuration with invalid ports", () => {
  const invalidPortMapping: PortMapping = {
    containerPort: 0, // Invalid port
    hostPort: 70000, // Invalid port
    protocol: "tcp"
  };
  
  const invalidOptions = {
    ...validContainerOptions,
    ports: [invalidPortMapping]
  };
  const manager = createContainerManager(invalidOptions);
  const validation = manager.validateConfiguration();
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 2);
  assert(validation.errors.includes("Invalid container port: 0"));
  assert(validation.errors.includes("Invalid host port: 70000"));
});

Deno.test("Container manager - validate configuration with invalid volumes", () => {
  const invalidVolumeMount: VolumeMount = {
    name: "", // Invalid name
    mountPath: "relative/path", // Invalid path (not absolute)
    type: "logs",
    hostPath: undefined,
    size: undefined
  };
  
  const invalidOptions = {
    ...validContainerOptions,
    volumes: [invalidVolumeMount]
  };
  const manager = createContainerManager(invalidOptions);
  const validation = manager.validateConfiguration();
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 2);
  assert(validation.errors.includes("Volume name is required"));
  assert(validation.errors.includes("Invalid mount path: relative/path"));
});

Deno.test("Container manager - validate configuration with invalid environment", () => {
  const invalidEnvironmentVariable: EnvironmentVariable = {
    name: "", // Invalid name
    value: "http://localhost:7878",
    sensitive: false
  };
  
  const invalidOptions = {
    ...validContainerOptions,
    environment: [invalidEnvironmentVariable]
  };
  const manager = createContainerManager(invalidOptions);
  const validation = manager.validateConfiguration();
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assertEquals(validation.errors[0], "Environment variable name is required");
});

Deno.test("Container manager - get metrics", () => {
  const manager = createContainerManager(validContainerOptions);
  const metrics = manager.getMetrics();
  
  assertExists(metrics);
  assertEquals(typeof metrics.uptime, "number");
  assertEquals(typeof metrics.uptimeDuration, "string");
  assertEquals(typeof metrics.status, "string");
  assertEquals(typeof metrics.healthStatus, "string");
  assertEquals(typeof metrics.portCount, "number");
  assertEquals(typeof metrics.volumeCount, "number");
  assertEquals(typeof metrics.environmentCount, "number");
  
  assertEquals(metrics.portCount, 1);
  assertEquals(metrics.volumeCount, 1);
  assertEquals(metrics.environmentCount, 1);
  assertEquals(metrics.status, "running");
  assertEquals(metrics.healthStatus, "starting");
});

Deno.test("Container manager - lifecycle flow", () => {
  const manager = createContainerManager(validContainerOptions);
  
  // Initial state
  assertEquals(manager.getStatus(), "running");
  assertEquals(manager.getHealthStatus(), "starting");
  
  // Initialize startup
  manager.initializeStartup();
  assertEquals(manager.getStatus(), "starting");
  assertEquals(manager.getHealthStatus(), "starting");
  
  // Mark running
  manager.markRunning();
  assertEquals(manager.getStatus(), "running");
  assertEquals(manager.getHealthStatus(), "healthy");
  
  // Mark unhealthy
  manager.markUnhealthy("Service failure");
  assertEquals(manager.getStatus(), "running");
  assertEquals(manager.getHealthStatus(), "unhealthy");
  
  // Restart
  manager.handleRestart();
  assertEquals(manager.getStatus(), "restarting");
  assertEquals(manager.getHealthStatus(), "starting");
  
  // Mark running again
  manager.markRunning();
  assertEquals(manager.getStatus(), "running");
  assertEquals(manager.getHealthStatus(), "healthy");
  
  // Shutdown
  manager.initiateShutdown();
  assertEquals(manager.getStatus(), "stopping");
  assertEquals(manager.getHealthStatus(), "unhealthy");
  
  // Complete shutdown
  manager.completeShutdown();
  assertEquals(manager.getStatus(), "stopped");
  assertEquals(manager.getHealthStatus(), "unhealthy");
});

// Cleanup
Deno.test({
  name: "Container manager - cleanup",
  fn: () => {
    // Restore original environment
    if (originalEnv) {
      Deno.env.set("HOSTNAME", originalEnv);
    } else {
      Deno.env.delete("HOSTNAME");
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
