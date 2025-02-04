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
  valueFormatter,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { genSketchTable } from "../util/genSketchTable.js";

/**
 * SpeciesProtection component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const SpeciesProtection: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("speciesProtection", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "sum",
    curGeography.geographyId,
  );

  // Labels
  const titleLabel = t("Species Protection");
  const mapLabel = t("Map");
  const percWithinLabel = t("% Within Plan");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="speciesProtection"
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
              <Trans i18nKey="SpeciesProtection 1">
                Plans should prioritize areas of high quality habitat used by
                unique, rare, and/or threatened species named in the Protected
                Species Act. High quality habitat areas have been determined
                using 9 different measures of reef health. This report
                summarizes the proportion of high quality habitat within this
                plan for each measure.
              </Trans>
            </p>

            <ClassTable
              rows={metrics}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: t("Indicator"),
                  type: "class",
                  width: 50,
                },
                {
                  columnLabel: percWithinLabel,
                  type: "metricChart",
                  metricId: percMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: {
                    showTitle: true,
                  },
                  targetValueFormatter: (
                    value: number,
                    row: number,
                    numRows: number,
                  ) => {
                    return (value: number) =>
                      `${valueFormatter(value / 100, "percent0dig")}`;
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
              <Trans i18nKey="SpeciesProtection - learn more">
                <p>
                  Objective: When designing marine protected areas, prioritize
                  those areas that seek to protect habitat used by unique, rare,
                  and/or threatened species named in the Protected Species Act.
                </p>
                <p>
                  A reef index has been developed that identifies the best
                  habitat based on 9 different measures of reef health. Goals
                  have been established for each measure to prioritize
                  representative coverage of different high quality habitat
                  types.
                </p>
                <p>
                  There are areas that will score high for multiple measures of
                  reef health and may be good candidates for inclusion in a
                  plan.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
