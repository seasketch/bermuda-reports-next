import React from "react";
import { useTranslation } from "react-i18next";
import {
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
  SketchProperties,
  flattenBySketchAllClass,
  isMetricArray,
  metricsWithSketchId,
  percentWithEdge,
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
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("shipwrecks", t);
  if (!isMetricArray(precalcMetrics))
    throw new Error("Invalid precalc metrics");

  // Labels
  const titleLabel = t("Shipwrecks");

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
          [id],
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
                {genSketchTable(
                  data.metrics,
                  metricGroup,
                  childProperties || [],
                )}
              </Collapse>
            )}
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

const genSketchTable = (
  metrics: Metric[],
  metricGroup: MetricGroup,
  childProperties: SketchProperties[],
) => {
  const childSketchIds = childProperties
    ? childProperties.map((skp) => skp.id)
    : [];
  const childSketchMetrics = metricsWithSketchId(
    metrics.filter((m) => m.metricId === metricGroup.metricId),
    childSketchIds,
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childProperties,
  );
  return <SketchClassTable rows={sketchRows} metricGroup={metricGroup} />;
};
