import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/index";

describe("Auth Integration Tests", () => {
  let authToken: string;

  it("should register a new user", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should login with valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "password123",
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    authToken = response.body.data.token;
  });

  it("should fail login with invalid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "wrongpassword",
      });
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
