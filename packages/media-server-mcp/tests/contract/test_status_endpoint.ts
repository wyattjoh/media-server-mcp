/**
 * Contract test for GET /status endpoint
 * 
 * This test validates the status endpoint contract as defined in docker-api.yaml
 * and must FAIL until the implementation is complete.
 */

import { assertEquals, assertExists } from "jsr:@std/assert";

// Types based on docker-api.yaml contract
interface PortMapping {
  containerPort: number;
  hostPort: number;
  protocol: "tcp" | "udp";
}

interface VolumeMount {
  name: string;
  mountPath: string;
  type: "logs" | "config" | "data";
  hostPath?: string;
  size?: string;
}

interface EnvironmentVariable {
  name: string;
  value: string;
  sensitive?: boolean;
}

interface ContainerStatus {
  containerId: string;
  status: "running" | "stopped" | "restarting" | "exited";
  image: string;
  ports: PortMapping[];
  volumes: VolumeMount[];
  environment: EnvironmentVariable[];
  healthStatus: "healthy" | "unhealthy" | "starting";
}

Deno.test("Contract: GET /status endpoint returns valid ContainerStatus", async () => {
  // This test will FAIL until the status endpoint is implemented
  const response = await fetch("http://localhost:3000/status");
  
  assertEquals(response.status, 200);
  
  const containerStatus: ContainerStatus = await response.json();
  
  // Validate required fields
  assertExists(containerStatus.containerId);
  assertExists(containerStatus.status);
  assertExists(containerStatus.image);
  assertExists(containerStatus.ports);
  assertExists(containerStatus.volumes);
  assertExists(containerStatus.environment);
  assertExists(containerStatus.healthStatus);
  
  // Validate enum values
  assertEquals(["running", "stopped", "restarting", "exited"].includes(containerStatus.status), true);
  assertEquals(["healthy", "unhealthy", "starting"].includes(containerStatus.healthStatus), true);
  
  // Validate container ID format (Docker container IDs are typically 64 hex chars, but can be shorter)
  assertEquals(typeof containerStatus.containerId, "string");
  assertEquals(containerStatus.containerId.length > 0, true);
  
  // Validate image name
  assertEquals(typeof containerStatus.image, "string");
  assertEquals(containerStatus.image.length > 0, true);
  
  // Validate ports array
  for (const port of containerStatus.ports) {
    assertEquals(typeof port.containerPort, "number");
    assertEquals(typeof port.hostPort, "number");
    assertEquals(port.containerPort >= 1 && port.containerPort <= 65535, true);
    assertEquals(port.hostPort >= 1 && port.hostPort <= 65535, true);
    assertEquals(["tcp", "udp"].includes(port.protocol), true);
  }
  
  // Validate volumes array
  for (const volume of containerStatus.volumes) {
    assertEquals(typeof volume.name, "string");
    assertEquals(typeof volume.mountPath, "string");
    assertEquals(["logs", "config", "data"].includes(volume.type), true);
    assertEquals(volume.name.length > 0, true);
    assertEquals(volume.mountPath.length > 0, true);
  }
  
  // Validate environment variables array
  for (const env of containerStatus.environment) {
    assertEquals(typeof env.name, "string");
    assertEquals(typeof env.value, "string");
    assertEquals(env.name.length > 0, true);
  }
});

Deno.test("Contract: GET /status endpoint includes expected volumes", async () => {
  const response = await fetch("http://localhost:3000/status");
  const containerStatus: ContainerStatus = await response.json();
  
  // Should include logs and config volumes
  const volumeTypes = containerStatus.volumes.map(v => v.type);
  assertEquals(volumeTypes.includes("logs"), true);
  assertEquals(volumeTypes.includes("config"), true);
});

Deno.test("Contract: GET /status endpoint includes port 3000 for SSE mode", async () => {
  const response = await fetch("http://localhost:3000/status");
  const containerStatus: ContainerStatus = await response.json();
  
  // Should expose port 3000 for SSE mode
  const port3000 = containerStatus.ports.find(p => p.containerPort === 3000);
  assertExists(port3000);
  assertEquals(port3000.protocol, "tcp");
});
