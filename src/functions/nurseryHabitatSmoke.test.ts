import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { nurseryHabitat } from "./nurseryHabitat.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof nurseryHabitat).toBe("function");
  });
  test("nurseryHabitat - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await nurseryHabitat(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "nurseryHabitat", example.properties.name);
    }
  }, 60_000);
});
