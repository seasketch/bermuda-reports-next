import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  getFirstFromParam,
  DefaultExtraParams,
  splitSketchAntimeridian,
  Feature,
  isVectorDatasource,
  overlapFeatures,
} from "@seasketch/geoprocessing";
import bbox from "@turf/bbox";
import project from "../../project/projectClient.js";
import {
  Metric,
  ReportResult,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
} from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";

/**
 * shipwrecks: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function shipwrecks(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
): Promise<ReportResult> {
  const shipwreckSumProperty = "NumberOfRe";

  // Get bounding box of sketch remainder
  const sketchBox = sketch.bbox || bbox(sketch);

  const metricGroup = project.getMetricGroup("shipwrecks");
  if (!metricGroup.datasourceId)
    throw new Error(`Expected datasourceId for ${metricGroup.datasourceId}`);
  const ds = project.getDatasourceById(metricGroup.datasourceId);
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);
  const features = await fgbFetchAll<Feature<Polygon | MultiPolygon>>(
    url,
    sketchBox,
  );

  const overlapResult = await overlapFeatures(
    metricGroup.metricId,
    features,
    sketch,
    { sumProperty: shipwreckSumProperty, operation: "sum" },
  );

  const metrics = overlapResult.map(
    (metric): Metric => ({
      ...metric,
      classId: metricGroup.metricId,
    }),
  );

  // Return a report result with metrics and a null sketch
  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(shipwrecks, {
  title: "shipwrecks",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
