import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { speciesProtection } from "./speciesProtection.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof speciesProtection).toBe("function");
  });
  test("speciesProtection - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await speciesProtection(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "speciesProtection", example.properties.name);
    }
  }, 60_000);
});
