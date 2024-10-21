import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { protection } from "./protection.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof protection).toBe("function");
  });
  test("protection - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await protection(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "protection", example.properties.name);
    }
  }, 60_000);
});
