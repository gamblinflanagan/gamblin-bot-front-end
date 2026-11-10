import { describe, expect, it } from "vitest";
import { checkVersions, getResolvedVersions } from "@/scripts/check-versions.mjs";

describe("version floors", () => {
  it("accepts the installed versions", () => {
    expect(() => checkVersions(getResolvedVersions())).not.toThrow();
  });

  it("rejects Next.js below the security floor", () => {
    expect(() => checkVersions({ next: "15.5.27", react: "19.3.1", reactDom: "19.3.1" })).toThrow(
      /15\.5\.28/,
    );
  });

  it("rejects the wrong Next.js major and prereleases", () => {
    expect(() => checkVersions({ next: "16.0.0", react: "19.3.1", reactDom: "19.3.1" })).toThrow(/15\.x/);
    expect(() => checkVersions({ next: "15.6.0-canary.1", react: "19.3.1", reactDom: "19.3.1" })).toThrow(
      /stable exact/,
    );
  });

  it("rejects React below the security floor or on the wrong major", () => {
    expect(() => checkVersions({ next: "15.5.29", react: "19.2.0", reactDom: "19.2.0" })).toThrow(
      /19\.2\.1/,
    );
    expect(() => checkVersions({ next: "15.5.29", react: "20.0.0", reactDom: "20.0.0" })).toThrow(/19\.x/);
  });

  it("rejects mismatched React and React DOM", () => {
    expect(() => checkVersions({ next: "15.5.29", react: "19.3.1", reactDom: "19.3.0" })).toThrow(/must match/);
  });
});
