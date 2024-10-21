import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  Feature,
  isVectorDatasource,
  overlapFeatures,
  overlapFeaturesGroupMetrics,
} from "@seasketch/geoprocessing";
import { bbox } from "@turf/turf";
import project from "../../project/projectClient.js";
import {
  Geography,
  getIucnLevelNameForSketches,
  iucnLevels,
  Metric,
  MetricGroup,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";

/**
 * nurseryHabitatWorker: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function nurseryHabitatWorker(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: {
    metricGroup: MetricGroup;
    classId: string;
    geography: Geography;
  },
) {
  console.log("nurseryHabitatWorker", extraParams);
  const metricGroup = extraParams.metricGroup;
  const curClass = metricGroup.classes.find(
    (c) => c.classId === extraParams.classId,
  )!;

  // Calculate overlap metrics for each class in metric group
  const featuresByClass: Record<string, Feature<Polygon>[]> = {};

  if (!curClass.datasourceId)
    throw new Error(`Expected datasourceId for ${curClass.classId}`);

  const ds = project.getDatasourceById(curClass.datasourceId);
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  console.log("Fetching features from", url);
  // Fetch features overlapping with sketch, pull from cache if already fetched
  const features = await fgbFetchAll<Feature<Polygon>>(
    url,
    sketch.bbox || bbox(sketch),
  );

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
  featuresByClass[curClass.classId] = finalFeatures;

  // Calculate overlap metrics
  console.log("Calculating overlap metrics for", curClass.classId);
  const overlapResult = await overlapFeatures(
    metricGroup.metricId,
    finalFeatures,
    sketch,
  );

  const metrics = overlapResult.map(
    (metric): Metric => ({
      ...metric,
      classId: curClass.classId,
    }),
  );

  // Calculate group metrics - from individual sketch metrics
  const sketchCategoryMap = getIucnLevelNameForSketches(toSketchArray(sketch));
  const metricToGroup = (sketchMetric: Metric) =>
    sketchCategoryMap[sketchMetric.sketchId!];

  console.log("Calculating group metrics for", curClass.classId);
  const groupMetrics = await overlapFeaturesGroupMetrics({
    metricId: metricGroup.metricId,
    groupIds: iucnLevels,
    sketch: sketch as Sketch<Polygon> | SketchCollection<Polygon>,
    metricToGroup,
    metrics: metrics,
    featuresByClass,
  });

  return [...metrics, ...groupMetrics];
}

export default new GeoprocessingHandler(nurseryHabitatWorker, {
  title: "nurseryHabitatWorker",
  description: "",
  timeout: 900, // seconds
  memory: 2048, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
