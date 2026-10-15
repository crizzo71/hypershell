import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";

import type { FleetData } from "../../../domain/fleet";
import type { Plane } from "../../../domain/plane";
import type { PromotionData } from "../../../domain/promotion";
import type {
  FleetApi,
  InstancesData,
  TopologyData,
} from "../../../application/ports";
import { FleetApiProvider } from "../../query/api-context";
import { App } from "../app";

function plane<T>(data: T): Plane<T> {
  return {
    data,
    generatedAt: "2026-01-01T00:00:00Z",
    stale: false,
    error: null,
  };
}

// Server-supplied delivery/Argo fields every PromotionEnvironment carries.
const envExtras = {
  activeDigest: null,
  proposedDigest: null,
  role: null,
  provider: null,
  envLabel: null,
  cluster: null,
  argoHealth: null,
  argoSync: null,
  consoleUrl: null,
  grafanaUrl: null,
  argoUrl: null,
  prState: null,
  prUrl: null,
  analysisUrl: null,
  upToDate: false,
} as const;

function renderApp(): void {
  const promotion: PromotionData = {
    order: ["int", "staging", "prod"],
    environments: {
      int: {
        name: "int",
        activeRelease: "v2025",
        proposedRelease: null,
        gates: [],
        ...envExtras,
        envLabel: "int",
        role: "hub",
      },
      staging: {
        name: "staging",
        activeRelease: "v2025",
        proposedRelease: null,
        gates: [],
        ...envExtras,
        envLabel: "staging",
        role: "hub",
      },
      prod: {
        name: "prod",
        activeRelease: "v2025",
        proposedRelease: null,
        gates: [],
        ...envExtras,
        envLabel: "prod",
        role: "hub",
      },
    },
    releases: ["v2025"],
    releaseByDigest: {},
    frontier: null,
  };
  const api = {
    getFleet: () => Promise.resolve(plane<FleetData>({ instances: [] })),
    getPromotion: () => Promise.resolve(plane(promotion)),
    getTopology: () => Promise.resolve(plane<TopologyData>({})),
    getInstances: () =>
      Promise.resolve(plane<InstancesData>({ instances: [] })),
  } satisfies FleetApi;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <IntlProvider locale="en" defaultLocale="en">
      <QueryClientProvider client={queryClient}>
        <FleetApiProvider value={api}>
          <App />
        </FleetApiProvider>
      </QueryClientProvider>
    </IntlProvider>,
  );
}

describe("TopologyMap details drawer", () => {
  it("left-aligns the first environment label and centers later labels", async () => {
    renderApp();

    const intLabel = await screen.findByText("INT");
    expect(intLabel.getAttribute("text-anchor")).toBe("start");
    expect(intLabel.getAttribute("x")).toBe("210");
    expect(screen.getByText("STAGING").getAttribute("x")).toBe("625");
    expect(screen.getByText("PROD").getAttribute("x")).toBe("965");
  });

  it("closes on Escape when open, and leaves Escape inert when closed", async () => {
    renderApp();

    // Open the drawer by selecting a map node (the <g role="button"> labelled
    // with the node id).
    const [node] = await screen.findAllByRole("button", { name: "staging" });
    if (!node) {
      throw new Error("expected a selectable 'staging' map node");
    }
    fireEvent.click(node);

    // The drawer is open: its close button is present.
    expect(
      await screen.findByRole("button", { name: "Close details" }),
    ).toBeDefined();

    // Escape closes it.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Close details" })).toBeNull();

    // With the drawer already closed, Escape is a no-op (no throw, still closed).
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Close details" })).toBeNull();
  });
});
