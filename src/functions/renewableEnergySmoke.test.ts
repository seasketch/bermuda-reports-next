import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { renewableEnergy } from "./renewableEnergy.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof renewableEnergy).toBe("function");
  });
  test("renewableEnergy - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await renewableEnergy(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "renewableEnergy", example.properties.name);
    }
  }, 60_000);
});
