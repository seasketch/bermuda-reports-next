import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  getFirstFromParam,
  DefaultExtraParams,
  runLambdaWorker,
  parseLambdaResponse,
} from "@seasketch/geoprocessing";
import bbox from "@turf/bbox";
import project from "../../project/projectClient.js";
import {
  GeoprocessingRequestModel,
  Metric,
  ReportResult,
  isMetricArray,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
} from "@seasketch/geoprocessing/client-core";
import { existingProtectionsWorker } from "./existingProtectionsWorker.js";

/**
 * existingProtections: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function existingProtections(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>,
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("existingProtections");
  // Use caller-provided geographyId if provided
  const geographyId = getFirstFromParam("geographyIds", extraParams);

  // Get geography features, falling back to geography assigned to default-boundary group
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  const metrics = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        const parameters = {
          ...extraParams,
          geography: curGeography,
          metricGroup,
          classId: curClass.classId,
        };

        return process.env.NODE_ENV === "test"
          ? existingProtectionsWorker(sketch, parameters)
          : runLambdaWorker(
              sketch,
              project.package.name,
              "existingProtectionsWorker",
              project.geoprocessing.region,
              parameters,
              request!,
            );
      }),
    )
  ).reduce<Metric[]>(
    (metrics, result) =>
      metrics.concat(
        isMetricArray(result)
          ? result
          : (parseLambdaResponse(result) as Metric[]),
      ),
    [],
  );

  // Return a report result with metrics and a null sketch
  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(existingProtections, {
  title: "existingProtections",
  description: "existing protection overlap",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  workers: ["existingProtectionsWorker"],
});
