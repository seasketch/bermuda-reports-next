import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { existingProtections } from "./existingProtections.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof existingProtections).toBe("function");
  });
  test("existingProtections - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await existingProtections(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "existingProtections", example.properties.name);
    }
  }, 60_000);
});
