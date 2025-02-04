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
  squareMeterToMile,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import { genSketchTable } from "../util/genSketchTable.js";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * HabitatRestoration component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const HabitatRestoration: React.FunctionComponent<GeogProp> = (
  props,
) => {
  const { t } = useTranslation();
  const [{ isCollection, id, childProperties }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("habitatRestoration", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId,
  );

  // Labels
  const titleLabel = t("Habitat Restoration");
  const mapLabel = t("Map");
  const withinLabel = t("Area Within Plan");
  const percWithinLabel = t("% Area Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="habitatRestoration"
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
              <Trans i18nKey="HabitatRestoration 1">
                Areas with restoration potential have been identified for
                multiple habitat types with the objective of identifying and
                restoring these areas. This report summarizes the amount of
                potential restoration area within this plan. It is for
                informational purposes and not a requirement for inclusion in
                MPAs.
              </Trans>
            </p>

            <ClassTable
              rows={metrics}
              metricGroup={metricGroup}
              objective={objectives}
              columnConfig={[
                {
                  columnLabel: t("Restoration Type"),
                  type: "class",
                  width: 30,
                },
                {
                  columnLabel: withinLabel,
                  type: "metricValue",
                  metricId: metricGroup.metricId,
                  valueFormatter: (val) =>
                    Number.format(
                      squareMeterToMile(
                        typeof val === "string" ? parseInt(val) : val,
                      ),
                    ),
                  valueLabel: unitsLabel,
                  chartOptions: {
                    showTitle: true,
                  },
                  colStyle: { textAlign: "center" },
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
                  width: 30,
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
              <Trans i18nKey="HabitatRestoration - learn more">
                <p>
                  A suitability analysis was conducted for multiple habitat
                  types and identified areas with restoration potential.
                </p>
                <p>🎯 Planning Objectives:</p>
                <p>
                  • Establish active restoration of areas that were formerly
                  seagrass habitats (100m2) through turtle exclusion.
                </p>
                <p>
                  • Inventory and assess past, present and potential salt marsh
                  and mangrove habitat areas and develop a strategic plan for
                  conservation and restoration.
                </p>
                <p>
                  • Initiate active restoration of threatened mangrove habitats.
                </p>
                <p>
                  • Initiate active restoration of damaged and/or degraded coral
                  habitats in protected areas.
                </p>
              </Trans>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
