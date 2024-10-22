import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  rasterMetrics,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  Geography,
  isRasterDatasource,
  Metric,
  MetricGroup,
} from "@seasketch/geoprocessing/client-core";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";

/**
 * ousGearWorker: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function ousGearWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: {
    metricGroup: MetricGroup;
    classId: string;
    geography: Geography;
  },
) {
  const geography = extraParams.geography;
  const metricGroup = extraParams.metricGroup;
  const curClass = metricGroup.classes.find(
    (c) => c.classId === extraParams.classId,
  )!;

  // Get geography features, falling back to geography assigned to default-boundary group
  const curGeography = project.getGeographyById(geography.geographyId, {
    fallbackGroup: "default-boundary",
  });

  if (!curClass.datasourceId)
    throw new Error(`Expected datasourceId for ${curClass.classId}`);

  const ds = project.getDatasourceById(curClass.datasourceId);
  if (!isRasterDatasource(ds))
    throw new Error(`Expected raster datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  // Start raster load and move on in loop while awaiting finish
  const raster = await loadCog(url);

  // Start analysis when raster load finishes
  const overlapResult = await rasterMetrics(raster, {
    metricId: metricGroup.metricId,
    feature: sketch,
    ...(ds.measurementType === "quantitative" && { stats: ["sum"] }),
  });

  return overlapResult.map(
    (metrics): Metric => ({
      ...metrics,
      classId: curClass.classId,
      geographyId: curGeography.geographyId,
    }),
  );
}

export default new GeoprocessingHandler(ousGearWorker, {
  title: "ousGearWorker",
  description: "",
  timeout: 500, // seconds
  memory: 2048, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
