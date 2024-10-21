import {
  firstMatchingMetric,
  Sketch,
  SketchCollection,
  NullSketch,
  NullSketchCollection,
  Metric,
  keyBy,
  groupBy,
} from "@seasketch/geoprocessing/client-core";

/**
 * Single flattened metric with class values keyed by class name
 * Useful for rendering table rows with the values of multiple classes for a group
 */
export type GroupMetricAggNoTotal = {
  groupId: string;
  value: number;
  [className: string]: string | number;
};

export type GroupMetricSketchAggNoTotal = GroupMetricAggNoTotal & {
  sketchId: string;
};

/**
 * Returns one aggregate object for every groupId present in metrics
 * Each object includes following properties:
 * numSketches - count of child sketches in the group
 * [classId] - a percValue for each classId present in metrics for group
 * value - sum of value across all classIds present in metrics for group
 * percValue - given sum value across all classIds, contains ratio of total sum across all class IDs
 */
export const flattenByGroupAllClassNoTotal = (
  collection: SketchCollection | NullSketchCollection,
  /** Group metrics for collection and its child sketches */
  groupMetrics: Metric[],
  /** Totals by class */
  totalMetrics: Metric[],
): {
  value: number;
  groupId: string;
}[] => {
  // Stratify in order by Group -> Collection -> Class. Then flatten
  const metricsByGroup = groupBy(groupMetrics, (m) => m.groupId || "undefined");

  return Object.keys(metricsByGroup).map((curGroupId) => {
    const collGroupMetrics = metricsByGroup[curGroupId].filter(
      (m) =>
        m.sketchId === collection.properties.id && m.groupId === curGroupId,
    );
    const collGroupMetricsByClass = keyBy(
      collGroupMetrics,
      (m) => m.classId || "undefined",
    );

    const classAgg = Object.keys(collGroupMetricsByClass).reduce(
      (rowsSoFar, curClassId) => {
        const groupClassSketchMetrics = groupMetrics.filter(
          (m) =>
            m.sketchId !== collection.properties.id &&
            m.groupId === curGroupId &&
            m.classId === curClassId,
        );

        const curValue = collGroupMetricsByClass[curClassId]?.value;

        const classTotal = firstMatchingMetric(
          totalMetrics,
          (totalMetric) => totalMetric.classId === curClassId,
        ).value;

        return {
          ...rowsSoFar,
          [curClassId]: curValue / classTotal,
          numSketches: groupClassSketchMetrics.length,
          value: rowsSoFar.value + curValue,
        };
      },
      { value: 0 },
    );

    return {
      groupId: curGroupId,
      ...classAgg,
    };
  });
};

/**
 * Flattens group class metrics, one for each group and sketch.
 * Each object includes the percValue for each class, and the total percValue with classes combined
 * groupId, sketchId, class1, class2, ...
 * @param groupMetrics - group metric data
 * @param totalValue - total value with classes combined
 * @param classes - class config
 */
export const flattenByGroupSketchAllClassNoTotal = (
  /** ToDo: is this needed? can the caller just pre-filter groupMetrics? */
  sketches: Sketch[] | NullSketch[],
  /** Group metrics for collection and its child sketches */
  groupMetrics: Metric[],
  /** Totals by class */
  totals: Metric[],
): GroupMetricSketchAggNoTotal[] => {
  const sketchIds = sketches.map((sk) => sk.properties.id);
  let sketchRows: GroupMetricSketchAggNoTotal[] = [];

  // Stratify in order by Group -> Sketch -> Class. Then flatten

  const metricsByGroup = groupBy(groupMetrics, (m) => m.groupId || "undefined");

  Object.keys(metricsByGroup).forEach((curGroupId) => {
    const groupSketchMetrics = metricsByGroup[curGroupId].filter(
      (m) => m.sketchId && sketchIds.includes(m.sketchId),
    );
    const groupSketchMetricsByClass = groupBy(
      groupSketchMetrics,
      (m) => m.classId || "undefined",
    );
    const groupSketchMetricIds = Object.keys(
      groupBy(groupSketchMetrics, (m) => m.sketchId || "missing"),
    );

    groupSketchMetricIds.forEach((curSketchId) => {
      const classAgg = Object.keys(groupSketchMetricsByClass).reduce<
        Record<string, number>
      >(
        (classAggSoFar, curClassId) => {
          const classMetric = firstMatchingMetric(
            groupSketchMetricsByClass[curClassId],
            (m) => m.sketchId === curSketchId,
          );
          const classTotal = firstMatchingMetric(
            totals,
            (totalMetric) => totalMetric.classId === curClassId,
          ).value;

          return {
            ...classAggSoFar,
            value: classAggSoFar.value + classMetric.value,
            [curClassId]: classMetric.value / classTotal,
          };
        },
        { value: 0 },
      );

      sketchRows.push({
        groupId: curGroupId,
        sketchId: curSketchId,
        value: classAgg.value,
        ...classAgg,
      });
    });
  });
  return sketchRows;
};
