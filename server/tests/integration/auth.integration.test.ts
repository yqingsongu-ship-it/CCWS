import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { TestAppServer } from "../../src/test-server";

describe("Auth Integration Tests", () => {
  let authToken: string;
  let testServer: TestAppServer;
  const testEmail = `test-auth-${Date.now()}@example.com`;

  beforeAll(async () => {
    testServer = new TestAppServer(3003);
    await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  it("should register a new user", async () => {
    const response = await request(testServer.app)
      .post("/api/auth/register")
      .send({
        email: testEmail,
        name: "Test User",
        password: "password123",
      });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
  });

  it("should login with valid credentials", async () => {
    // First register a user
    await request(testServer.app)
      .post("/api/auth/register")
      .send({
        email: testEmail + "login",
        name: "Test User Login",
        password: "password123",
      });

    const response = await request(testServer.app)
      .post("/api/auth/login")
      .send({
        email: testEmail + "login",
        password: "password123",
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    authToken = response.body.data.accessToken;
  });

  it("should fail login with invalid credentials", async () => {
    const response = await request(testServer.app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: "wrongpassword",
      });
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
