import {
  Sketch,
  SketchCollection,
  Polygon,
  MultiPolygon,
  GeoprocessingHandler,
  DefaultExtraParams,
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
  getJsonUserAttribute,
  isSketchCollection,
  keyBy,
  rekeyMetrics,
  sortMetrics,
  toNullSketch,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";

const fishingActivities = [
  "FISH_COLLECT_REC",
  "FISH_COLLECT_LOCAL",
  "FISH_AQUA_INDUSTRIAL",
];

const breakMap: Record<string, number> = {
  definite: fishingActivities.length,
  partial: 1,
  no: 0,
};

/**
 * platformEdge: A geoprocessing function that calculates overlap metrics
 * @param sketch - A sketch or collection of sketches
 * @param extraParams
 * @returns Calculated metrics and a null sketch
 */
export async function platformEdge(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {},
): Promise<ReportResult> {
  const sketches = toSketchArray(sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);
  const box = sketch.bbox || bbox(sketch);

  const metricGroup = project.getMetricGroup("platformEdge");
  const classId = metricGroup.classes[0].classId;
  const ds = project.getDatasourceById(metricGroup.datasourceId!);
  if (!isVectorDatasource(ds))
    throw new Error(`Expected vector datasource for ${ds.datasourceId}`);
  const url = project.getDatasourceUrl(ds);
  const features = await fgbFetchAll<Feature<Polygon>>(url, box);

  // Calc area sketch metrics
  const classMetrics: Metric[] = (
    await overlapFeatures(metricGroup.metricId, features, sketch)
  ).map((sm) => {
    if (isSketchCollection(sketch) && sm.sketchId === sketch.properties.id) {
      return {
        ...sm,
        classId: classId,
      };
    }

    // Add extra numFishingRestriced and overlap to individual sketches
    const sketchActivities: string[] = getJsonUserAttribute(
      sketchesById[sm.sketchId!],
      "ACTIVITIES",
      [],
    );
    const numFishingActivities = fishingActivities.reduce(
      (hasFishingSoFar, fishingActivity) =>
        sketchActivities.includes(fishingActivity)
          ? hasFishingSoFar + 1
          : hasFishingSoFar,
      0,
    );

    return {
      ...sm,
      classId: classId,
      extra: {
        ...sm.extra,
        numFishingRestricted: fishingActivities.length - numFishingActivities,
        overlapEdge:
          sm.value > 0 && numFishingActivities < fishingActivities.length,
      },
    };
  });

  // Match sketch to first break group where it has at least min number of restricted activities
  // If no overlap then it's always no break
  // Return true if matches current group
  const metricToGroup = (sketchMetric: Metric) =>
    getBreakGroup(
      breakMap,
      sketchMetric?.extra?.numFishingRestricted as number,
      sketchMetric?.extra?.overlapEdge as boolean,
    );

  const sketchMetrics = (() => {
    if (isSketchCollection(sketch)) {
      return classMetrics.filter((sm) => sm.sketchId !== sketch.properties.id);
    } else {
      return classMetrics.filter((sm) => sm.sketchId === sketch.properties.id);
    }
  })();

  const groupMetrics: Metric[] = await overlapFeaturesGroupMetrics({
    metricId: metricGroup.metricId,
    groupIds: Object.keys(breakMap),
    sketch: sketch as Sketch<Polygon> | SketchCollection<Polygon>,
    metricToGroup,
    metrics: sketchMetrics,
    featuresByClass: { [classId]: features },
  });

  return {
    metrics: sortMetrics(rekeyMetrics([...classMetrics, ...groupMetrics])),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(platformEdge, {
  title: "platformEdge",
  description: "",
  timeout: 500, // seconds
  memory: 1024, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});

/**
 * Return break group that has at least min number of restricted activities
 * non-overlapping are always 'no' group
 */
export const getBreakGroup = (
  breakMap: Record<string, number>,
  numFishingRestricted?: number,
  overlap?: boolean,
): string => {
  if (numFishingRestricted === undefined || numFishingRestricted === null)
    throw new Error("Missing numFishingRestricted");
  if (overlap === undefined) throw new Error("Missing overlap");
  if (overlap === false) return "no";
  const breakGroup = Object.keys(breakMap).find(
    (breakGroup) => numFishingRestricted >= breakMap[breakGroup],
  );
  if (!breakGroup)
    throw new Error(
      "getBreakGroup - could not find breakGroup, something is wrong",
    );
  return breakGroup;
};
