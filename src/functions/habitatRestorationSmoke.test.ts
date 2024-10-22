import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { habitatRestoration } from "./habitatRestoration.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof habitatRestoration).toBe("function");
  });
  test("habitatRestoration - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await habitatRestoration(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "habitatRestoration", example.properties.name);
    }
  }, 60_000);
});
