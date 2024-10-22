import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { ousSector } from "./ousSector.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ousSector).toBe("function");
  });
  test("ousSector - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ousSector(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "ousSector", example.properties.name);
    }
  }, 60_000);
});
