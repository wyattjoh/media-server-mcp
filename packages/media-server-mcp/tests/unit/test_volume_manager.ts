/**
 * Unit tests for volume manager
 * 
 * Tests volume mount handling, validation, and directory management
 * for Docker integration functionality.
 */

import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { createVolumeManager, type VolumeManager } from "../../src/docker/volume-manager.ts";
import type { VolumeMount, VolumeType } from "../../src/types/docker-types.ts";

// Test data
const testVolumeMounts: VolumeMount[] = [
  {
    name: "media-server-mcp-logs",
    mountPath: "/app/logs",
    type: "logs"
  },
  {
    name: "media-server-mcp-config",
    mountPath: "/app/config",
    type: "config",
    size: "1GB"
  },
  {
    name: "media-server-mcp-data",
    mountPath: "/app/data",
    type: "data",
    hostPath: "/host/data"
  }
];

const validVolumeOptions = {
  volumes: testVolumeMounts,
  basePath: "/app"
};

Deno.test("Volume manager - create with valid options", () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  assertExists(manager);
  assertEquals(typeof manager.validateVolumeMount, "function");
  assertEquals(typeof manager.validateAllVolumes, "function");
  assertEquals(typeof manager.getVolumeByName, "function");
  assertEquals(typeof manager.getVolumesByType, "function");
  assertEquals(typeof manager.getAllVolumes, "function");
  assertEquals(typeof manager.initializeVolumeDirectories, "function");
});

Deno.test("Volume manager - validate volume mount with valid data", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const validVolume: VolumeMount = {
    name: "test-volume",
    mountPath: "/app/test",
    type: "logs"
  };
  
  const validation = manager.validateVolumeMount(validVolume);
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("Volume manager - validate volume mount with invalid name", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const invalidVolume: VolumeMount = {
    name: "",
    mountPath: "/app/test",
    type: "logs"
  };
  
  const validation = manager.validateVolumeMount(invalidVolume);
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assertEquals(validation.errors[0], "Volume name is required");
});

Deno.test("Volume manager - validate volume mount with invalid name format", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const invalidVolume: VolumeMount = {
    name: "123-invalid-name",
    mountPath: "/app/test",
    type: "logs"
  };
  
  const validation = manager.validateVolumeMount(invalidVolume);
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Invalid volume name"));
});

Deno.test("Volume manager - validate volume mount with invalid mount path", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const invalidVolume: VolumeMount = {
    name: "test-volume",
    mountPath: "relative/path",
    type: "logs"
  };
  
  const validation = manager.validateVolumeMount(invalidVolume);
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Invalid mount path"));
});

Deno.test("Volume manager - validate volume mount with invalid type", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const invalidVolume: VolumeMount = {
    name: "test-volume",
    mountPath: "/app/test",
    type: "invalid" as VolumeType
  };
  
  const validation = manager.validateVolumeMount(invalidVolume);
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Invalid volume type"));
});

Deno.test("Volume manager - validate volume mount with invalid size", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const invalidVolume: VolumeMount = {
    name: "test-volume",
    mountPath: "/app/test",
    type: "logs",
    size: "invalid-size"
  };
  
  const validation = manager.validateVolumeMount(invalidVolume);
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Invalid volume size"));
});

Deno.test("Volume manager - validate volume mount with valid size formats", () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  const validSizes = ["1GB", "500MB", "2TB", "100KB", "50B"];
  
  for (const size of validSizes) {
    const volume: VolumeMount = {
      name: `test-volume-${size}`,
      mountPath: "/app/test",
      type: "logs",
      size
    };
    
    const validation = manager.validateVolumeMount(volume);
    assertEquals(validation.valid, true, `Size ${size} should be valid`);
  }
});

Deno.test("Volume manager - validate all volumes with valid data", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const validation = manager.validateAllVolumes();
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("Volume manager - validate all volumes with duplicates", () => {
  const duplicateVolumes: VolumeMount[] = [
    {
      name: "duplicate-name",
      mountPath: "/app/logs1",
      type: "logs"
    },
    {
      name: "duplicate-name",
      mountPath: "/app/logs2",
      type: "logs"
    }
  ];
  
  const manager = createVolumeManager({ volumes: duplicateVolumes });
  const validation = manager.validateAllVolumes();
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Duplicate volume name"));
});

Deno.test("Volume manager - validate all volumes with duplicate mount paths", () => {
  const duplicateMountPaths: VolumeMount[] = [
    {
      name: "volume1",
      mountPath: "/app/logs",
      type: "logs"
    },
    {
      name: "volume2",
      mountPath: "/app/logs",
      type: "config"
    }
  ];
  
  const manager = createVolumeManager({ volumes: duplicateMountPaths });
  const validation = manager.validateAllVolumes();
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Duplicate mount path"));
});

Deno.test("Volume manager - get volume by name", () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  const volume = manager.getVolumeByName("media-server-mcp-logs");
  assertExists(volume);
  assertEquals(volume.name, "media-server-mcp-logs");
  assertEquals(volume.type, "logs");
});

Deno.test("Volume manager - get volume by name (not found)", () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  const volume = manager.getVolumeByName("non-existent-volume");
  assertEquals(volume, undefined);
});

Deno.test("Volume manager - get volume by mount path", () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  const volume = manager.getVolumeByMountPath("/app/config");
  assertExists(volume);
  assertEquals(volume.name, "media-server-mcp-config");
  assertEquals(volume.type, "config");
});

Deno.test("Volume manager - get volume by mount path (not found)", () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  const volume = manager.getVolumeByMountPath("/non/existent/path");
  assertEquals(volume, undefined);
});

Deno.test("Volume manager - get volumes by type", () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  const logVolumes = manager.getVolumesByType("logs");
  assertEquals(logVolumes.length, 1);
  assertEquals(logVolumes[0].name, "media-server-mcp-logs");
  
  const configVolumes = manager.getVolumesByType("config");
  assertEquals(configVolumes.length, 1);
  assertEquals(configVolumes[0].name, "media-server-mcp-config");
  
  const dataVolumes = manager.getVolumesByType("data");
  assertEquals(dataVolumes.length, 1);
  assertEquals(dataVolumes[0].name, "media-server-mcp-data");
});

Deno.test("Volume manager - get all volumes", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const allVolumes = manager.getAllVolumes();
  
  assertEquals(allVolumes.length, 3);
  
  const logsVolume = allVolumes.find(v => v.type === "logs");
  assertExists(logsVolume);
  assertEquals(logsVolume.name, "media-server-mcp-logs");
  assertEquals(logsVolume.driver, "local");
  
  const configVolume = allVolumes.find(v => v.type === "config");
  assertExists(configVolume);
  assertEquals(configVolume.name, "media-server-mcp-config");
  assertEquals(configVolume.size, "1GB");
  
  const dataVolume = allVolumes.find(v => v.type === "data");
  assertExists(dataVolume);
  assertEquals(dataVolume.name, "media-server-mcp-data");
  assertEquals(dataVolume.hostPath, "/host/data");
});

Deno.test("Volume manager - get configuration summary", () => {
  const manager = createVolumeManager(validVolumeOptions);
  const summary = manager.getConfigurationSummary();
  
  assertEquals(summary.totalVolumes, 3);
  assertEquals(summary.volumesByType.logs, 1);
  assertEquals(summary.volumesByType.config, 1);
  assertEquals(summary.volumesByType.data, 1);
  assertExists(summary.totalSize);
  assertEquals(summary.mountPaths.length, 3);
  assert(summary.mountPaths.includes("/app/logs"));
  assert(summary.mountPaths.includes("/app/config"));
  assert(summary.mountPaths.includes("/app/data"));
});

Deno.test("Volume manager - get configuration summary with no volumes", () => {
  const manager = createVolumeManager({ volumes: [] });
  const summary = manager.getConfigurationSummary();
  
  assertEquals(summary.totalVolumes, 0);
  assertEquals(summary.volumesByType.logs, 0);
  assertEquals(summary.volumesByType.config, 0);
  assertEquals(summary.volumesByType.data, 0);
  assertEquals(summary.totalSize, undefined);
  assertEquals(summary.mountPaths.length, 0);
});

Deno.test("Volume manager - get volume usage (mock test)", async () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  // This test doesn't actually create directories to avoid filesystem dependencies
  // In a real test environment, you would create temporary directories
  const usage = await manager.getVolumeUsage();
  
  assertEquals(usage.length, 3);
  assertEquals(usage[0].volume.name, "media-server-mcp-logs");
  assertEquals(usage[1].volume.name, "media-server-mcp-config");
  assertEquals(usage[2].volume.name, "media-server-mcp-data");
});

Deno.test("Volume manager - initialize volume directories (mock test)", async () => {
  const manager = createVolumeManager(validVolumeOptions);
  
  // This test doesn't actually create directories to avoid filesystem dependencies
  // In a real test environment, you would create temporary directories
  const result = await manager.initializeVolumeDirectories();
  
  // The result will depend on whether the directories actually exist
  assertExists(result);
  assertEquals(typeof result.success, "boolean");
  assertEquals(Array.isArray(result.errors), true);
});

Deno.test("Volume manager - custom base path", () => {
  const customBasePath = "/custom/app";
  const manager = createVolumeManager({
    volumes: testVolumeMounts,
    basePath: customBasePath
  });
  
  const allVolumes = manager.getAllVolumes();
  assertEquals(allVolumes.length, 3);
  
  // The base path is used internally for directory operations
  // but doesn't affect the volume configuration itself
  const summary = manager.getConfigurationSummary();
  assertEquals(summary.totalVolumes, 3);
});

Deno.test("Volume manager - empty volumes array", () => {
  const manager = createVolumeManager({ volumes: [] });
  
  const validation = manager.validateAllVolumes();
  assertEquals(validation.valid, true);
  
  const allVolumes = manager.getAllVolumes();
  assertEquals(allVolumes.length, 0);
  
  const summary = manager.getConfigurationSummary();
  assertEquals(summary.totalVolumes, 0);
});

Deno.test("Volume manager - volume with all optional fields", () => {
  const fullVolume: VolumeMount = {
    name: "full-volume",
    mountPath: "/app/full",
    type: "data",
    hostPath: "/host/full",
    size: "2TB"
  };
  
  const manager = createVolumeManager({ volumes: [fullVolume] });
  const validation = manager.validateVolumeMount(fullVolume);
  
  assertEquals(validation.valid, true);
  
  const allVolumes = manager.getAllVolumes();
  assertEquals(allVolumes.length, 1);
  assertEquals(allVolumes[0].name, "full-volume");
  assertEquals(allVolumes[0].hostPath, "/host/full");
  assertEquals(allVolumes[0].size, "2TB");
});
