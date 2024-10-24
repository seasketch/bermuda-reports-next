import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { shipwrecks } from "./shipwrecks.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof shipwrecks).toBe("function");
  });
  test("shipwrecks - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await shipwrecks(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "shipwrecks", example.properties.name);
    }
  }, 60_000);
});
