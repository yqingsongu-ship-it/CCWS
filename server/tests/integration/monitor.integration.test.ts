import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/index";

describe("Monitor Integration Tests", () => {
  let authToken: string;
  let monitorId: string;

  beforeAll(async () => {
    // Login to get token
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });
    authToken = loginResponse.body.data.token;
  });

  it("should create a new monitor", async () => {
    const response = await request(app)
      .post("/api/monitors")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Monitor",
        type: "HTTP",
        target: "https://example.com",
        interval: 300,
        timeout: 5000,
      });
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBeDefined();
    monitorId = response.body.data.id;
  });

  it("should get monitor list", async () => {
    const response = await request(app)
      .get("/api/monitors")
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.items).toBeDefined();
  });

  it("should get monitor by id", async () => {
    const response = await request(app)
      .get(`/api/monitors/${monitorId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(monitorId);
  });

  it("should update monitor", async () => {
    const response = await request(app)
      .put(`/api/monitors/${monitorId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Updated Monitor Name" });
    expect(response.status).toBe(200);
  });

  it("should delete monitor", async () => {
    const response = await request(app)
      .delete(`/api/monitors/${monitorId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(200);
  });
});
