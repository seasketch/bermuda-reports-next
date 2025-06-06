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
 * OffshoreHabitat component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const OffshoreHabitat: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("offshoreHabitat", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "valid",
    curGeography.geographyId,
  );

  // Labels
  const titleLabel = t("Habitat Protection - Offshore");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="offshoreHabitat"
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
              <Trans i18nKey="OffshoreHabitat 1">
                Plans should ensure the representative coverage of each key
                habitat type. This report summarizes the percentage of each
                offshore habitat that overlaps with this plan.
              </Trans>
            </p>

            <ClassTable
              rows={metrics}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: t("Habitat"),
                  type: "class",
                  width: 30,
                },
                {
                  columnLabel: percWithinLabel,
                  type: "metricChart",
                  metricId: percMetricIdName,
                  valueFormatter: "percent",
                  chartOptions: {
                    targetLabelPosition: "bottom",
                    targetLabelStyle: "tight",
                  },
                  targetValueFormatter: (
                    value: number,
                    row: number,
                    numRows: number,
                  ) => {
                    return (value: number) =>
                      `${valueFormatter(value / 100, "percent0dig")}`;
                  },
                  width: 60,
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
              <Trans i18nKey="OffshoreHabitat - learn more">
                <p>
                  The Steering Committee approved the objective of ensuring a
                  20% representative coverage of each key habitat type when
                  designating fully protected MPAs, and higher coverage as
                  needed to satisfy other objectives. Only MPAs with a Full
                  Protection designation count towards meeting this objective.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
