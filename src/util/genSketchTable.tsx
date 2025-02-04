import React from "react";
import {
  flattenBySketchAllClass,
  Metric,
  MetricGroup,
  metricsWithSketchId,
  ReportResult,
  SketchProperties,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import { SketchClassTable } from "@seasketch/geoprocessing/client-ui";

export const genSketchTable = (
  data: ReportResult,
  metricGroup: MetricGroup,
  precalcMetrics: Metric[],
  childProperties: SketchProperties[],
) => {
  const childSketchIds = childProperties
    ? childProperties.map((skp) => skp.id)
    : [];
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === metricGroup.metricId),
      childSketchIds,
    ),
    precalcMetrics,
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childProperties,
  );
  return (
    <SketchClassTable rows={sketchRows} metricGroup={metricGroup} formatPerc />
  );
};
