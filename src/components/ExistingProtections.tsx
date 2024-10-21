import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
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
  metricsWithSketchId,
  roundDecimal,
  roundLower,
  squareMeterToMile,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { AreaSketchTableStyled } from "./SizeCard.js";

/**
 * ExistingProtections component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const ExistingProtections: React.FunctionComponent<GeogProp> = (
  props,
) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("existingProtections", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId,
  );

  // Labels
  const titleLabel = t("Existing Protections");
  const mapLabel = t("Map");
  const colLabel = t("Area Type");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="existingProtections"
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
            <p>
              <Trans i18nKey="ExistingProtections 1">
                Plans should consider and optimize for overlap with existing
                protected areas. This report summarizes the percentage of
                currently legislated areas that overlap with this plan.
              </Trans>
            </p>

            <LayerToggle
              layerId={metricGroup.layerId}
              label="Show Legislated Areas On Map"
            />

            <ClassTable
              rows={metrics}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: colLabel,
                  type: "class",
                  width: 50,
                },
                {
                  columnLabel: withinLabel,
                  type: "metricValue",
                  metricId: metricGroup.metricId,
                  valueFormatter: (num) =>
                    roundDecimal(squareMeterToMile(Number(num))),
                  valueLabel: unitsLabel,
                  chartOptions: {
                    showTitle: true,
                  },
                  colStyle: { textAlign: "center" },
                  width: 20,
                },
                {
                  columnLabel: percWithinLabel,
                  type: "metricChart",
                  metricId: percMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 30,
                },
              ]}
            />

            {isCollection && (
              <Collapse title={t("Show by MPA")}>
                {genSketchTable(data, metricGroup, precalcMetrics)}
              </Collapse>
            )}
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

const genSketchTable = (
  data: ReportResult,
  metricGroup: MetricGroup,
  precalcMetrics: Metric[],
) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
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
    childSketches,
  );
  return (
    <SketchClassTable rows={sketchRows} metricGroup={metricGroup} formatPerc />
  );
};
