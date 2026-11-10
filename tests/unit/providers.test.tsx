import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Providers } from "@/app/providers";

describe("Providers", () => {
  it("creates an isolated QueryClient for each provider tree", () => {
    const clients: QueryClient[] = [];
    function Capture() {
      clients.push(useQueryClient());
      return null;
    }

    render(
      <>
        <Providers><Capture /></Providers>
        <Providers><Capture /></Providers>
      </>,
    );

    expect(clients).toHaveLength(2);
    expect(clients[0]).toBeInstanceOf(QueryClient);
    expect(clients[0]).not.toBe(clients[1]);
  });
});
