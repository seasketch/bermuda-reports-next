import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { platformEdge } from "./platformEdge.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof platformEdge).toBe("function");
  });
  test("platformEdge - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await platformEdge(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "platformEdge", example.properties.name);
    }
  }, 60_000);
});
