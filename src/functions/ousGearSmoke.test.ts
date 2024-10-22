import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { ousGear } from "./ousGear.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ousGear).toBe("function");
  });
  test("ousGear - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ousGear(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "ousGear", example.properties.name);
    }
  }, 60_000);
});
