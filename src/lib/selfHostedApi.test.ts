import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  selfHostedFetch,
  selfHostedGet,
  selfHostedPost,
  selfHostedPut,
  selfHostedPatch,
  selfHostedDelete,
  getAuthToken,
  SELF_HOSTED_API,
  DEFAULT_RETRY_CONFIG,
} from "./selfHostedApi";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Import after mock
import { supabase } from "@/integrations/supabase/client";

describe("selfHostedApi", () => {
  const mockToken = "test-jwt-token";
  const mockSession = { access_token: mockToken };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constants", () => {
    it("exports SELF_HOSTED_API URL", () => {
      expect(SELF_HOSTED_API).toBe("https://api.academyos.ru/functions/v1");
    });

    it("exports DEFAULT_RETRY_CONFIG", () => {
      expect(DEFAULT_RETRY_CONFIG).toEqual({
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        retryableStatuses: [408, 429, 500, 502, 503, 504],
      });
    });
  });

  describe("getAuthToken", () => {
    it("returns token when session exists", async () => {
      const token = await getAuthToken();
      expect(token).toBe(mockToken);
    });

    it("returns null when no session", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const token = await getAuthToken();
      expect(token).toBeNull();
    });
  });

  describe("selfHostedFetch", () => {
    it("makes authenticated GET request by default", async () => {
      const mockData = { id: 1, name: "test" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockData),
      });

      const result = await selfHostedFetch("test-endpoint");

      expect(fetch).toHaveBeenCalledWith(
        `${SELF_HOSTED_API}/test-endpoint`,
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result).toEqual({
        success: true,
        data: mockData,
        status: 200,
        retryCount: 0,
      });
    });

    it("makes unauthenticated request when requireAuth is false", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await selfHostedFetch("public-endpoint", { requireAuth: false });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });

    it("returns 401 error when auth required but no session", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await selfHostedFetch("protected-endpoint");

      expect(result).toEqual({
        success: false,
        error: "Необходима авторизация",
        status: 401,
        retryCount: 0,
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it("handles full URL endpoints", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await selfHostedFetch("https://custom-api.com/endpoint");

      expect(fetch).toHaveBeenCalledWith(
        "https://custom-api.com/endpoint",
        expect.any(Object)
      );
    });

    it("strips leading slash from endpoint", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await selfHostedFetch("/test-endpoint");

      expect(fetch).toHaveBeenCalledWith(
        `${SELF_HOSTED_API}/test-endpoint`,
        expect.any(Object)
      );
    });

    it("sends POST body as JSON", async () => {
      const body = { foo: "bar", count: 42 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await selfHostedFetch("test-endpoint", { method: "POST", body });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    });

    it("handles non-JSON response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/plain" }),
        json: () => Promise.reject(new Error("Not JSON")),
      });

      const result = await selfHostedFetch("test-endpoint");

      expect(result).toEqual({
        success: true,
        data: undefined,
        status: 200,
        retryCount: 0,
      });
    });

    it("handles HTTP error response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ error: "Bad request" }),
      });

      const result = await selfHostedFetch("test-endpoint", {
        retry: { noRetry: true },
      });

      expect(result).toEqual({
        success: false,
        error: "Bad request",
        data: { error: "Bad request" },
        status: 400,
        retryCount: 0,
      });
    });

    it("extracts error message from response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ message: "Validation failed" }),
      });

      const result = await selfHostedFetch("test-endpoint", {
        retry: { noRetry: true },
      });

      expect(result.error).toBe("Validation failed");
    });

    it("uses HTTP status as fallback error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      const result = await selfHostedFetch("test-endpoint", {
        retry: { noRetry: true },
      });

      expect(result.error).toBe("HTTP 404");
    });
  });

  describe("retry logic", () => {
    it("retries on 500 status", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            headers: new Headers({ "content-type": "application/json" }),
            json: () => Promise.resolve({ error: "Server error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ success: true }),
        });
      });

      const result = await selfHostedFetch("test-endpoint", {
        retry: { baseDelayMs: 10, maxDelayMs: 20 },
      });

      expect(callCount).toBe(3);
      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
    });

    it("does not retry on 400 status", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 400,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ error: "Bad request" }),
        });
      });

      const result = await selfHostedFetch("test-endpoint", {
        retry: { baseDelayMs: 10 },
      });

      expect(callCount).toBe(1);
      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(0);
    });

    it("respects maxRetries config", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 503,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ error: "Service unavailable" }),
        });
      });

      const result = await selfHostedFetch("test-endpoint", {
        retry: { maxRetries: 2, baseDelayMs: 10 },
      });

      expect(callCount).toBe(3); // Initial + 2 retries
      expect(result.retryCount).toBe(2);
    });

    it("disables retry when noRetry is true", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 500,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ error: "Server error" }),
        });
      });

      await selfHostedFetch("test-endpoint", {
        retry: { noRetry: true },
      });

      expect(callCount).toBe(1);
    });

    it("calls onRetry callback", async () => {
      const onRetry = vi.fn();
      let callCount = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            headers: new Headers({ "content-type": "application/json" }),
            json: () => Promise.resolve({ error: "Error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({}),
        });
      });

      await selfHostedFetch("test-endpoint", {
        retry: { baseDelayMs: 10, onRetry },
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, 3, "Error");
    });

    it("calls onSuccess callback with retry count", async () => {
      const onSuccess = vi.fn();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await selfHostedFetch("test-endpoint", {
        retry: { onSuccess },
      });

      expect(onSuccess).toHaveBeenCalledWith(0);
    });

    it("calls onFailed callback when all retries exhausted", async () => {
      const onFailed = vi.fn();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ error: "Persistent error" }),
      });

      await selfHostedFetch("test-endpoint", {
        retry: { maxRetries: 1, baseDelayMs: 10, onFailed },
      });

      expect(onFailed).toHaveBeenCalledWith(1, "Persistent error");
    });

    it("retries on network error", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ data: "success" }),
        });
      });

      const result = await selfHostedFetch("test-endpoint", {
        retry: { baseDelayMs: 10 },
      });

      expect(callCount).toBe(2);
      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
    });
  });

  describe("HTTP method shorthands", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ result: "ok" }),
      });
    });

    it("selfHostedGet makes GET request", async () => {
      await selfHostedGet("endpoint");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("endpoint"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("selfHostedPost makes POST request with body", async () => {
      const body = { data: "test" };
      await selfHostedPost("endpoint", body);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("endpoint"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    });

    it("selfHostedPut makes PUT request with body", async () => {
      const body = { id: 1 };
      await selfHostedPut("endpoint", body);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("endpoint"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(body),
        })
      );
    });

    it("selfHostedPatch makes PATCH request with body", async () => {
      const body = { field: "value" };
      await selfHostedPatch("endpoint", body);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("endpoint"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(body),
        })
      );
    });

    it("selfHostedDelete makes DELETE request", async () => {
      await selfHostedDelete("endpoint");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("endpoint"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("shorthands pass options correctly", async () => {
      await selfHostedGet("endpoint", { requireAuth: false });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe("type safety", () => {
    it("returns typed data", async () => {
      interface User {
        id: number;
        name: string;
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ id: 1, name: "Test User" }),
      });

      const result = await selfHostedGet<User>("users/1");

      expect(result.data?.id).toBe(1);
      expect(result.data?.name).toBe("Test User");
    });
  });
});
