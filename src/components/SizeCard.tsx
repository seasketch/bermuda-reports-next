import React from "react";
import {
  ReportResult,
  percentWithEdge,
  keyBy,
  toNullSketchArray,
  nestMetrics,
  valueFormatter,
  toPercentMetric,
  sortMetricsDisplayOrder,
  MetricGroup,
  GeogProp,
  createMetric,
  Metric,
  squareMeterToMile,
} from "@seasketch/geoprocessing/client-core";
import {
  ClassTable,
  Collapse,
  Column,
  ReportTableStyled,
  ResultsCard,
  Table,
  useSketchProperties,
  ToolbarCard,
  DataDownload,
  LayerToggle,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import { styled } from "styled-components";
import project from "../../project/projectClient.js";
import Translator from "../components/TranslatorAsync.js";
import { Trans, useTranslation } from "react-i18next";
import { TFunction } from "i18next";

const Number = new Intl.NumberFormat("en", { style: "decimal" });
const STUDY_REGION_AREA_SQ_METERS = 465737168307.9038;
const NEARSHORE_AREA_SQ_METERS = 2587739629.079098;
const OFFSHORE_AREA_SQ_METERS =
  STUDY_REGION_AREA_SQ_METERS - NEARSHORE_AREA_SQ_METERS;

const BaseSketchTableStyled = styled(ReportTableStyled)`
  & {
    width: 100%;
    overflow-x: scroll;
    font-size: 12px;
  }

  & th:first-child,
  & td:first-child {
    min-width: 140px;
    position: sticky;
    left: 0;
    text-align: left;
    background: #efefef;
  }

  th,
  tr,
  td {
    text-align: center;
  }

  td:not(:first-child),
  th {
    white-space: nowrap;
  }

  tr:nth-child(1) > th:not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

export const AreaSketchTableStyled = styled(BaseSketchTableStyled)`
  tr:nth-child(2) > th:nth-child(2n - 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(2n - 1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;

export const SizeCard: React.FunctionComponent<GeogProp> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });
  const metricGroup = project.getMetricGroup("boundaryAreaOverlap", t);
  const precalcMetrics: Metric[] = [
    createMetric({
      metricId: metricGroup.metricId,
      classId: "eez",
      value: STUDY_REGION_AREA_SQ_METERS,
    }),
    createMetric({
      metricId: metricGroup.metricId,
      classId: "nearshore",
      value: NEARSHORE_AREA_SQ_METERS,
    }),
    createMetric({
      metricId: metricGroup.metricId,
      classId: "offshore",
      value: OFFSHORE_AREA_SQ_METERS,
    }),
  ];

  const notFoundString = t("Results not found");

  /* i18next-extract-disable-next-line */
  const planningUnitName = t(project.basic.planningAreaName);
  return (
    <ResultsCard
      title={t("Size")}
      functionName="boundaryAreaOverlap"
      useChildCard
    >
      {(data: ReportResult) => {
        if (Object.keys(data).length === 0) throw new Error(notFoundString);

        return (
          <>
            <ToolbarCard
              title={t("Size")}
              items={
                <>
                  <DataDownload
                    filename="size"
                    data={data.metrics}
                    formats={["csv", "json"]}
                    placement="left-end"
                  />
                </>
              }
            >
              <p>
                <Trans i18nKey="SizeCard- introduction">
                  Plans should be large enough to sustain focal species within
                  their boundaries during their adult and juvenile life history
                  phases. This report summarizes the size and proportion of this
                  plan within the Bermuda EEZ, the nearshore (0-2,000m depth)
                  and offshore (2,000m+ depth).
                </Trans>
              </p>
              <LayerToggle
                layerId={metricGroup.layerId}
                label="View Nearshore 0-2000m Boundary Layer"
              />
              <VerticalSpacer />
              {genSingleSizeTable(data, precalcMetrics, metricGroup, t)}
              {isCollection && (
                <Collapse title={t("Show by MPA")}>
                  {genNetworkSizeTable(data, precalcMetrics, metricGroup, t)}
                </Collapse>
              )}

              <Collapse title={t("Learn more")}>
                <Trans i18nKey="SizeCard- learn more">
                  <p>
                    The Exclusive Economic Zone EEZ extends from the shoreline
                    out to 200 nautical miles. The EEZ is further split up into
                    two distinct subregions, nearshore which extends from
                    0-2,000 meters depth (6,562 feet) and offshore, which
                    extends from 2,000 meters depth and up.
                  </p>
                  <p>
                    Guidance on recommended size: Marine management areas must
                    be large enough to sustain focal species within their
                    boundaries during their adult and juvenile life history
                    phases. Different species move different distances as adults
                    and juveniles, so larger areas may include more species.
                  </p>
                  <p>
                    If MPA boundaries overlap with each other, the overlap is
                    only counted once when calculating the total size of the
                    network.
                  </p>
                </Trans>
              </Collapse>
            </ToolbarCard>
          </>
        );
      }}
    </ResultsCard>
  );
};

const genSingleSizeTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: TFunction,
) => {
  const boundaryLabel = t("Boundary");
  const areaWithinLabel = t("Area Within Plan");
  const percWithinLabel = t("% Within Plan");
  const sqKmLabel = t("mi²");

  const singleMetrics = data.metrics.filter(
    (m) => m.sketchId === data.sketch.properties.id,
  );

  const finalMetrics = sortMetricsDisplayOrder(
    [
      ...singleMetrics,
      ...toPercentMetric(singleMetrics, precalcMetrics, {
        metricIdOverride: project.getMetricGroupPercId(mg),
      }),
    ],
    "classId",
    ["eez", "offshore", "contiguous"],
  );

  return (
    <>
      <ClassTable
        rows={finalMetrics}
        metricGroup={mg}
        columnConfig={[
          {
            columnLabel: boundaryLabel,
            type: "class",
            width: 30,
          },
          {
            columnLabel: areaWithinLabel,
            type: "metricValue",
            metricId: mg.metricId,
            valueFormatter: (val: string | number) =>
              Number.format(
                Math.round(
                  squareMeterToMile(
                    typeof val === "string" ? parseInt(val) : val,
                  ),
                ),
              ),
            colStyle: { textAlign: "center" },
            valueLabel: sqKmLabel,
            width: 30,
          },
          {
            columnLabel: percWithinLabel,
            type: "metricChart",
            metricId: project.getMetricGroupPercId(mg),
            valueFormatter: "percent",
            chartOptions: {
              showTitle: true,
              showTargetLabel: true,
              targetLabelPosition: "bottom",
              targetLabelStyle: "tight",
              barHeight: 11,
            },
            width: 40,
            targetValueFormatter: (_value: number, row: number) => {
              if (row === 0) {
                return (value: number) =>
                  `${valueFormatter(value / 100, "percent0dig")} ${t(
                    "Target",
                  )}`;
              } else {
                return (value: number) =>
                  `${valueFormatter(value / 100, "percent0dig")}`;
              }
            },
          },
        ]}
      />
    </>
  );
};

const genNetworkSizeTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: TFunction,
) => {
  const sketches = toNullSketchArray(data.sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);
  const sketchIds = new Set(sketches.map((sk) => sk.properties.id));
  const sketchMetrics = data.metrics.filter(
    (m) => m.sketchId && sketchIds.has(m.sketchId),
  );
  const finalMetrics = [
    ...sketchMetrics,
    ...toPercentMetric(sketchMetrics, precalcMetrics, {
      metricIdOverride: project.getMetricGroupPercId(mg),
    }),
  ];

  const aggMetrics = nestMetrics(finalMetrics, [
    "sketchId",
    "classId",
    "metricId",
  ]);
  // Use sketch ID for each table row, index into aggMetrics
  const rows = Object.keys(aggMetrics).map((sketchId) => ({
    sketchId,
  }));

  const classColumns: Column<{ sketchId: string }>[] = mg.classes.map(
    (curClass, index) => {
      /* i18next-extract-disable-next-line */
      const transString = t(curClass.display);
      return {
        Header: transString,
        style: { color: "#777" },
        columns: [
          {
            Header: t("Area") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value;
              return (
                Number.format(Math.round(squareMeterToMile(value))) +
                " " +
                t("mi²")
              );
            },
          },
          {
            Header: t("% Area") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  project.getMetricGroupPercId(mg)
                ][0].value;
              return percentWithEdge(value);
            },
          },
        ],
      };
    },
  );

  const columns: Column<any>[] = [
    {
      Header: " ",
      accessor: (row) => <b>{sketchesById[row.sketchId].properties.name}</b>,
    },
    ...(classColumns as Column<any>[]),
  ];

  return (
    <AreaSketchTableStyled>
      <Table columns={columns} data={rows} />
    </AreaSketchTableStyled>
  );
};

/**
 * SizeCard as a top-level report client
 */
export const SizeCardReportClient = () => {
  return (
    <Translator>
      <SizeCard />
    </Translator>
  );
};
