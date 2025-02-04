import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  ReportError,
  ResultsCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  ReportResult,
  metricsWithSketchId,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { genSketchTable } from "../util/genSketchTable.js";

/**
 * RenewableEnergy component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const RenewableEnergy: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("renewableEnergy", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "sum",
    curGeography.geographyId,
  );

  // Labels
  const titleLabel = t("Renewable Energy");
  const mapLabel = t("Map");
  const percWithinLabel = t("% Within Plan");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="renewableEnergy"
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
            <p>
              <Trans i18nKey="RenewableEnergy 1">
                Potential energy production zones were identified for 4 types of
                renewable energy. This report summarizes the percentage of each
                potential use area within this plan.
              </Trans>
            </p>

            <ClassTable
              rows={metrics}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: t("Type"),
                  type: "class",
                  width: 30,
                },
                {
                  columnLabel: percWithinLabel,
                  type: "metricChart",
                  metricId: percMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: {
                    showTitle: true,
                  },
                  width: 40,
                },
                {
                  columnLabel: mapLabel,
                  type: "layerToggle",
                  width: 10,
                },
              ]}
            />

            {isCollection && (
              <Collapse title={t("Show by MPA")}>
                {genSketchTable(
                  data,
                  metricGroup,
                  precalcMetrics,
                  childProperties || [],
                )}
              </Collapse>
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="RenewableEnergy - learn more">
                <p>
                  Objective: Identify potential energy production zones that
                  recognize the physical characteristics and criteria that
                  should be considered when placing ocean renewable technologies
                  for the purpose of delineating the broadest areas where these
                  technologies could be implemented in Bermuda’s EEZ with the
                  lowest potential impact to ecosystem function.
                </p>
                <p>
                  Calculation: the Bermuda EEZ is divided into a grid and for
                  each renewable technology a suitability value is calculated.
                  The results forms a heatmap. The higher a cells value, the
                  higher the potential for using that area for energy
                  production. The percentage of potential use area within this
                  plan is then assessed. For each of the 4 renewable
                  technologies, the value of all of the grid cells within the
                  boundaries of this plan are summed, and then divided by the
                  total value of all cells in the EEZ.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
