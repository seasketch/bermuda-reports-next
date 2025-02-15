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
  overlapFeaturesGroupMetrics,
} from "@seasketch/geoprocessing";
import bbox from "@turf/bbox";
import project from "../../project/projectClient.js";
import {
  Metric,
  ReportResult,
  getIucnLevelNameForSketches,
  iucnLevels,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";

/**
 * priorityAreas: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function priorityAreas(
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

  // Get bounding box of sketch remainder
  const sketchBox = sketch.bbox || bbox(sketch);

  // Calculate overlap metrics for each class in metric group
  const metricGroup = project.getMetricGroup("priorityAreas");
  const featuresByClass: Record<string, Feature<Polygon>[]> = {};
  const metrics = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass.classId}`);

        const ds = project.getDatasourceById(curClass.datasourceId);
        if (!isVectorDatasource(ds))
          throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

        const url = project.getDatasourceUrl(ds);

        // Fetch features overlapping with sketch, pull from cache if already fetched
        const features = await fgbFetchAll<Feature<Polygon>>(url, sketchBox);
        featuresByClass[curClass.classId] = features;

        // If this is a sub-class, filter by class name
        const finalFeatures =
          curClass.classKey && curClass.classId !== `${ds.datasourceId}_all`
            ? features.filter((feat) => {
                return (
                  feat.geometry &&
                  feat.properties![ds.classKeys[0]] === curClass.classId
                );
              })
            : features;

        // Calculate overlap metrics
        const overlapResult = await overlapFeatures(
          metricGroup.metricId,
          finalFeatures,
          sketch,
        );

        return overlapResult.map(
          (metric): Metric => ({
            ...metric,
            classId: curClass.classId,
            geographyId: curGeography.geographyId,
          }),
        );
      }),
    )
  ).flat();

  // Calculate group metrics - from individual sketch metrics
  const sketchCategoryMap = getIucnLevelNameForSketches(toSketchArray(sketch));
  const metricToGroup = (sketchMetric: Metric) =>
    sketchCategoryMap[sketchMetric.sketchId!];

  const groupMetrics = await overlapFeaturesGroupMetrics({
    metricId: metricGroup.metricId,
    groupIds: iucnLevels,
    sketch: sketch as Sketch<Polygon> | SketchCollection<Polygon>,
    metricToGroup,
    metrics,
    featuresByClass,
  });

  return {
    metrics: sortMetrics(rekeyMetrics([...metrics, ...groupMetrics])),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(priorityAreas, {
  title: "priorityAreas",
  description: "overlap with priority areas",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
