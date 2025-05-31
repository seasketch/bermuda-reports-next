import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  getFirstFromParam,
  DefaultExtraParams,
  loadCog,
  rasterMetrics,
} from "@seasketch/geoprocessing";
import project from "../../project/projectClient.js";
import {
  GeoprocessingRequestModel,
  Metric,
  ReportResult,
  isRasterDatasource,
  rekeyMetrics,
  sortMetrics,
} from "@seasketch/geoprocessing/client-core";

/**
 * ousGear: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function ousGear(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
  request?: GeoprocessingRequestModel<Polygon | MultiPolygon>,
): Promise<ReportResult> {
  // Use caller-provided geographyId if provided
  const geographyId = getFirstFromParam("geographyIds", extraParams);

  // Get geography features, falling back to geography assigned to default-boundary group
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  const metricGroup = project.getMetricGroup("ousGear");

  const metrics = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass.classId}`);

        const ds = project.getDatasourceById(curClass.datasourceId);
        if (!isRasterDatasource(ds))
          throw new Error(`Expected raster datasource for ${ds.datasourceId}`);

        const url = project.getDatasourceUrl(ds);

        const raster = await loadCog(url);
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
      }),
    )
  ).flat();

  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
  };
}

export default new GeoprocessingHandler(ousGear, {
  title: "ousGear",
  description: "Overlap with OUS by sector",
  timeout: 900, // seconds
  memory: 4096, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  workers: [],
});
