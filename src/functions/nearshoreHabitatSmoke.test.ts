import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { nearshoreHabitat } from "./nearshoreHabitat.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof nearshoreHabitat).toBe("function");
  });
  test("nearshoreHabitat - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await nearshoreHabitat(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "nearshoreHabitat", example.properties.name);
    }
  }, 60_000);
});
