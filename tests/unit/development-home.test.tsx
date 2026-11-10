import { notFound } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import DevelopmentHomePage from "@/app/dev/home/page";
import { HomePage } from "@/components/home-page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("development home preview", () => {
  it("renders the shared main page during development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(DevelopmentHomePage()).toEqual(<HomePage />);
    expect(notFound).not.toHaveBeenCalled();
  });

  it("returns not found outside development", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => DevelopmentHomePage()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });
});
