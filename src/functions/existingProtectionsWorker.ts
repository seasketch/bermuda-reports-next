import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  splitSketchAntimeridian,
  Feature,
  isVectorDatasource,
  overlapFeatures,
} from "@seasketch/geoprocessing";
import { bbox } from "@turf/turf";
import project from "../../project/projectClient.js";
import {
  Geography,
  Metric,
  MetricGroup,
} from "@seasketch/geoprocessing/client-core";
import { clipToGeography } from "../util/clipToGeography.js";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";

/**
 * existingProtectionsWorker: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function existingProtectionsWorker(
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

  // Support sketches crossing antimeridian
  const splitSketch = splitSketchAntimeridian(sketch);

  // Clip to portion of sketch within current geography
  const clippedSketch = await clipToGeography(splitSketch, curGeography);

  // Get bounding box of sketch remainder
  const sketchBox = clippedSketch.bbox || bbox(clippedSketch);

  // Chached features
  const cachedFeatures: Record<string, Feature<Polygon | MultiPolygon>[]> = {};

  // Calculate overlap metrics for each class in metric group
  const datasourceId = metricGroup.datasourceId || curClass.datasourceId;
  if (!datasourceId)
    throw new Error(`Expected datasourceId for ${curClass.classId}`);

  const ds = project.getDatasourceById(datasourceId);
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);

  const url = project.getDatasourceUrl(ds);

  // Fetch features overlapping with sketch, pull from cache if already fetched
  const features =
    cachedFeatures[datasourceId] ||
    (await fgbFetchAll<Feature<Polygon | MultiPolygon>>(url, sketchBox));
  cachedFeatures[datasourceId] = features;

  // If this is a sub-class, filter by class name
  const finalFeatures =
    curClass.classKey && curClass.classId !== `${ds.datasourceId}_all`
      ? features.filter((feat) => {
          return (
            feat.geometry &&
            feat.properties![curClass.classKey!] === curClass.classId
          );
        })
      : features;

  // Calculate overlap metrics
  const overlapResult = await overlapFeatures(
    metricGroup.metricId,
    finalFeatures,
    clippedSketch,
  );

  return overlapResult.map(
    (metric): Metric => ({
      ...metric,
      classId: curClass.classId,
      geographyId: curGeography.geographyId,
    }),
  );
}

export default new GeoprocessingHandler(existingProtectionsWorker, {
  title: "existingProtectionsWorker",
  description: "",
  timeout: 500, // seconds
  memory: 2048, // megabytes
  executionMode: "sync",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
