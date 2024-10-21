import {
  Sketch,
  Feature,
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  overlapFeatures,
  rekeyMetrics,
  sortMetrics,
  getFirstFromParam,
  DefaultExtraParams,
  splitSketchAntimeridian,
  isVectorDatasource,
  FeatureCollection,
  MultiPolygon,
  GeoJsonProperties,
} from "@seasketch/geoprocessing";
import { getFeatures } from "@seasketch/geoprocessing/dataproviders";
import { bbox, difference, featureCollection } from "@turf/turf";
import project from "../../project/projectClient.js";
import { clipToGeography } from "../util/clipToGeography.js";

const metricGroup = project.getMetricGroup("boundaryAreaOverlap");

export async function boundaryAreaOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
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
  const sketchBox = clippedSketch.bbox || bbox(clippedSketch);

  // Fetch boundary features indexed by classId
  // Fetch boundary features indexed by classId
  const worldDs = project.getDatasourceById("world");
  if (!isVectorDatasource(worldDs)) {
    throw new Error(`Expected vector datasource for ${worldDs.datasourceId}`);
  }
  const worldURL = project.getDatasourceUrl(worldDs);
  const worldPolys = await getFeatures(worldDs, worldURL, {
    bbox: sketchBox,
  });

  const nearshoreDs = project.getDatasourceById("nearshore_dissolved");
  if (!isVectorDatasource(nearshoreDs)) {
    throw new Error(
      `Expected vector datasource for ${nearshoreDs.datasourceId}`,
    );
  }
  const nearshoreURL = project.getDatasourceUrl(nearshoreDs);
  const nearshorePolys = await getFeatures(nearshoreDs, nearshoreURL, {
    bbox: sketchBox,
  });

  const offshorePolys = difference(
    featureCollection([...worldPolys, ...nearshorePolys]) as FeatureCollection<
      Polygon | MultiPolygon,
      GeoJsonProperties
    >,
  );

  const polysByBoundary: Record<string, Feature[]> = {
    eez: worldPolys,
    nearshore: nearshorePolys,
    offshore: [offshorePolys!],
  };

  const metrics: Metric[] = // calculate area overlap metrics for each class
    (
      await Promise.all(
        metricGroup.classes.map(async (curClass) => {
          const overlapResult = await overlapFeatures(
            metricGroup.metricId,
            polysByBoundary[curClass.classId] as Feature<Polygon>[],
            clippedSketch,
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

  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(boundaryAreaOverlap, {
  title: "boundaryAreaOverlap",
  description: "Calculate sketch overlap with boundary polygons",
  executionMode: "async",
  timeout: 500,
  requiresProperties: [],
  memory: 1024,
});
