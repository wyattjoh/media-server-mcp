/**
 * Contract test for GET /health endpoint
 * 
 * This test validates the health endpoint contract as defined in docker-api.yaml
 * and must FAIL until the implementation is complete.
 */

import { assertEquals, assertExists } from "jsr:@std/assert";

// Types based on docker-api.yaml contract
interface ServiceConnection {
  service: "radarr" | "sonarr" | "tmdb" | "plex";
  status: "connected" | "disconnected" | "error";
  lastCheck: string; // ISO 8601 date-time
  error?: string;
  responseTime?: string;
}

interface HealthStatus {
  serverStatus: "healthy" | "unhealthy" | "starting";
  serviceConnections?: ServiceConnection[];
  lastCheck: string; // ISO 8601 date-time
  uptime?: string; // ISO 8601 duration
  version: string;
  transportMode: "stdio" | "sse";
}

Deno.test("Contract: GET /health endpoint returns valid HealthStatus", async () => {
  // This test will FAIL until the health endpoint is implemented
  const response = await fetch("http://localhost:3000/health");
  
  // Should return 200 for healthy status or 503 for unhealthy
  assertEquals([200, 503].includes(response.status), true);
  
  const healthStatus: HealthStatus = await response.json();
  
  // Validate required fields
  assertExists(healthStatus.serverStatus);
  assertExists(healthStatus.lastCheck);
  assertExists(healthStatus.version);
  assertExists(healthStatus.transportMode);
  
  // Validate enum values
  assertEquals(["healthy", "unhealthy", "starting"].includes(healthStatus.serverStatus), true);
  assertEquals(["stdio", "sse"].includes(healthStatus.transportMode), true);
  
  // Validate timestamp format
  assertEquals(typeof healthStatus.lastCheck, "string");
  assertEquals(Date.parse(healthStatus.lastCheck) > 0, true);
  
  // Validate service connections if present
  if (healthStatus.serviceConnections) {
    for (const connection of healthStatus.serviceConnections) {
      assertEquals(["radarr", "sonarr", "tmdb", "plex"].includes(connection.service), true);
      assertEquals(["connected", "disconnected", "error"].includes(connection.status), true);
      assertEquals(Date.parse(connection.lastCheck) > 0, true);
      
      if (connection.status === "error") {
        assertExists(connection.error);
      }
      
      if (connection.status === "connected") {
        assertExists(connection.responseTime);
      }
    }
  }
});

Deno.test("Contract: GET /health endpoint returns 503 for unhealthy status", async () => {
  // This test validates the 503 response for unhealthy services
  const response = await fetch("http://localhost:3000/health");
  
  if (response.status === 503) {
    const healthStatus: HealthStatus = await response.json();
    assertEquals(healthStatus.serverStatus, "unhealthy");
  }
});

Deno.test("Contract: GET /health endpoint response time is reasonable", async () => {
  // Health endpoint should respond quickly
  const startTime = Date.now();
  const response = await fetch("http://localhost:3000/health");
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  // Should respond within 5 seconds
  assertEquals(responseTime < 5000, true);
});

