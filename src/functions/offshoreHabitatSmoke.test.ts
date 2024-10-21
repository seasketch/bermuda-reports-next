import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { offshoreHabitat } from "./offshoreHabitat.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof offshoreHabitat).toBe("function");
  });
  test("offshoreHabitat - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await offshoreHabitat(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "offshoreHabitat", example.properties.name);
    }
  }, 60_000);
});
