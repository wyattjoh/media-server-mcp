/**
 * Integration test for health check functionality
 * 
 * This test validates that health checks work correctly and provide
 * accurate status information, and must FAIL until the implementation is complete.
 */

import { assertEquals, assertExists } from "jsr:@std/assert";

Deno.test("Integration: Health endpoint is accessible", async () => {
  // This test will FAIL until health checks are properly implemented
  const response = await fetch("http://localhost:3000/health");
  
  // Should return either 200 (healthy) or 503 (unhealthy)
  assertEquals([200, 503].includes(response.status), true);
  
  const healthData = await response.json();
  assertExists(healthData.serverStatus);
  assertExists(healthData.lastCheck);
  assertExists(healthData.version);
  assertExists(healthData.transportMode);
});

Deno.test("Integration: Health status reflects actual service connections", async () => {
  const response = await fetch("http://localhost:3000/health");
  const healthData = await response.json();
  
  // If we have service connections, they should be properly structured
  if (healthData.serviceConnections && healthData.serviceConnections.length > 0) {
    for (const connection of healthData.serviceConnections) {
      assertEquals(["radarr", "sonarr", "tmdb", "plex"].includes(connection.service), true);
      assertEquals(["connected", "disconnected", "error"].includes(connection.status), true);
      assertExists(connection.lastCheck);
      
      // If status is error, should have error message
      if (connection.status === "error") {
        assertExists(connection.error);
        assertEquals(typeof connection.error, "string");
        assertEquals(connection.error.length > 0, true);
      }
      
      // If status is connected, should have response time
      if (connection.status === "connected") {
        assertExists(connection.responseTime);
        assertEquals(typeof connection.responseTime, "string");
      }
    }
  }
});

Deno.test("Integration: Health check timestamps are recent", async () => {
  const response = await fetch("http://localhost:3000/health");
  const healthData = await response.json();
  
  const lastCheckTime = new Date(healthData.lastCheck).getTime();
  const currentTime = Date.now();
  const timeDiff = currentTime - lastCheckTime;
  
  // Health check should be recent (within last 5 minutes)
  assertEquals(timeDiff < 5 * 60 * 1000, true, 
    `Health check timestamp is ${timeDiff}ms old, should be within 5 minutes`);
});

Deno.test("Integration: Health check response time is reasonable", async () => {
  const startTime = Date.now();
  const response = await fetch("http://localhost:3000/health");
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  // Health check should respond quickly (under 2 seconds)
  assertEquals(responseTime < 2000, true, 
    `Health check took ${responseTime}ms, should be under 2000ms`);
});

Deno.test("Integration: Health status changes appropriately", async () => {
  // Make multiple health check requests to verify consistency
  const responses = [];
  
  for (let i = 0; i < 3; i++) {
    const response = await fetch("http://localhost:3000/health");
    const healthData = await response.json();
    responses.push(healthData);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // All responses should have the same structure
  for (const healthData of responses) {
    assertExists(healthData.serverStatus);
    assertExists(healthData.version);
    assertExists(healthData.transportMode);
    
    // Version should be consistent
    assertEquals(healthData.version, responses[0].version);
    assertEquals(healthData.transportMode, responses[0].transportMode);
  }
});

Deno.test("Integration: Health check handles service failures gracefully", async () => {
  const response = await fetch("http://localhost:3000/health");
  const healthData = await response.json();
  
  // Even if services are failing, health endpoint should still respond
  assertEquals(typeof healthData.serverStatus, "string");
  assertEquals(["healthy", "unhealthy", "starting"].includes(healthData.serverStatus), true);
  
  // If server status is unhealthy, it should still provide information
  if (healthData.serverStatus === "unhealthy") {
    assertExists(healthData.serviceConnections);
    assertEquals(Array.isArray(healthData.serviceConnections), true);
  }
});
