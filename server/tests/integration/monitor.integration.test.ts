import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { TestAppServer } from "../../src/test-server";

describe("Monitor Integration Tests", () => {
  let authToken: string;
  let monitorId: string;
  let testServer: TestAppServer;
  const testEmail = `test-monitor-${Date.now()}@example.com`;

  beforeAll(async () => {
    testServer = new TestAppServer(3004);
    await testServer.start();

    // First register a user and login to get token
    await request(testServer.app)
      .post("/api/auth/register")
      .send({
        email: testEmail,
        name: "Test User",
        password: "password123",
      });

    const loginResponse = await request(testServer.app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: "password123" });
    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await testServer.stop();
  });

  it("should create a new monitor", async () => {
    const response = await request(testServer.app)
      .post("/api/monitors")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Monitor",
        type: "HTTP",
        target: "https://example.com",
        interval: 300,
        timeout: 5000,
      });
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeDefined();
    monitorId = response.body.data.id;
  });

  it("should get monitor list", async () => {
    const response = await request(testServer.app)
      .get("/api/monitors")
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.items).toBeDefined();
  });

  it("should get monitor by id", async () => {
    const response = await request(testServer.app)
      .get(`/api/monitors/${monitorId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(monitorId);
  });

  it("should update monitor", async () => {
    const response = await request(testServer.app)
      .put(`/api/monitors/${monitorId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Updated Monitor Name" });
    expect(response.status).toBe(200);
  });

  it("should delete monitor", async () => {
    const response = await request(testServer.app)
      .delete(`/api/monitors/${monitorId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(200);
  });
});
