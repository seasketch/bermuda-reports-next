import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  KeySection,
  LayerToggle,
  ReportError,
  ResultsCard,
  SketchClassTable,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  MetricGroup,
  ReportResult,
  flattenBySketchAllClass,
  isMetricArray,
  metricsWithSketchId,
  percentWithEdge,
  roundLower,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import precalcMetrics from "../../data/bin/shipwrecksPrecalc.json";

/**
 * Shipwrecks component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const Shipwrecks: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("shipwrecks", t);
  if (!isMetricArray(precalcMetrics))
    throw new Error("Invalid precalc metrics");

  // Labels
  const titleLabel = t("Shipwrecks");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("units");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="shipwrecks"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const percMetricIdName = `${metricGroup.metricId}Perc`;

        const valueMetrics = metricsWithSketchId(
          data.metrics.filter((m) => m.metricId === metricGroup.metricId),
          [data.sketch.properties.id],
        );
        const percentMetrics = toPercentMetric(valueMetrics, precalcMetrics, {
          metricIdOverride: percMetricIdName,
        });
        const metrics = [...valueMetrics, ...percentMetrics];

        const objectives = (() => {
          const objectives = project.getMetricGroupObjectives(metricGroup, t);
          if (objectives.length) {
            return objectives;
          } else {
            return;
          }
        })();

        return (
          <ReportError>
            <KeySection>
              This plan contains approximately <b>{valueMetrics[0].value}</b>{" "}
              shipwrecks, <b>{percentWithEdge(percentMetrics[0].value)}</b> of
              the total.
            </KeySection>
            <LayerToggle
              layerId={metricGroup.layerId}
              label="View Shipwreck Heatmap Layer"
            />

            {isCollection && (
              <Collapse title={t("Show by MPA")}>
                {genSketchTable(data, metricGroup)}
              </Collapse>
            )}
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

const genSketchTable = (data: ReportResult, metricGroup: MetricGroup) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = metricsWithSketchId(
    data.metrics.filter((m) => m.metricId === metricGroup.metricId),
    childSketchIds,
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches,
  );
  return <SketchClassTable rows={sketchRows} metricGroup={metricGroup} />;
};
