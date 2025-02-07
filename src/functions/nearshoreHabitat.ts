import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  getFirstFromParam,
  DefaultExtraParams,
  splitSketchAntimeridian,
  rasterMetrics,
  isRasterDatasource,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  Metric,
  ReportResult,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
} from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";

/**
 * nearshoreHabitat: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function nearshoreHabitat(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
): Promise<ReportResult> {
  // Use caller-provided geographyId if provided
  const geographyId = getFirstFromParam("geographyIds", extraParams);

  // Get geography features, falling back to geography assigned to default-boundary group
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Support sketches crossing antimeridian
  const splitSketch = splitSketchAntimeridian(sketch);

  // Clip to portion of sketch within current geography
  const clippedSketch = await clipToGeography(splitSketch, curGeography);

  // Get bounding box of sketch remainder
  // const sketchBox = clippedSketch.bbox || bbox(clippedSketch);

  // Calculate overlap metrics for each class in metric group
  const metricGroup = project.getMetricGroup("nearshoreHabitat");
  if (!metricGroup.datasourceId)
    throw new Error(`Expected datasourceId for ${metricGroup.datasourceId}`);

  const ds = project.getDatasourceById(metricGroup.datasourceId);
  if (!isRasterDatasource(ds))
    throw new Error(`Expected raster datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  // Start raster load and move on in loop while awaiting finish
  const raster = await loadCog(url);

  // Start analysis when raster load finishes
  const overlapResult = await rasterMetrics(raster, {
    metricId: metricGroup.metricId,
    feature: clippedSketch,
    ...(ds.measurementType === "quantitative" && { stats: ["valid"] }),
    ...(ds.measurementType === "categorical" && {
      categorical: true,
      categoryMetricValues: metricGroup.classes.map((c) => c.classId),
    }),
  });

  const metrics = overlapResult.map(
    (metrics): Metric => ({
      ...metrics,
      geographyId: curGeography.geographyId,
    }),
  );

  // Return a report result with metrics and a null sketch
  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(nearshoreHabitat, {
  title: "nearshoreHabitat",
  description: "Nearshore habitat reports",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
