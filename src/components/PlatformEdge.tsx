import React from "react";
import { useTranslation } from "react-i18next";
import {
  Collapse,
  Column,
  GroupCircleRow,
  KeySection,
  LayerToggle,
  ReportError,
  ResultsCard,
  SmallReportTableStyled,
  Table,
  useSketchProperties,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  GroupMetricAgg,
  GroupMetricSketchAgg,
  Metric,
  NullSketch,
  ReportResult,
  Sketch,
  capitalize,
  firstMatchingMetric,
  flattenByGroupAllClass,
  groupBy,
  isSketchCollection,
  keyBy,
  metricsForSketch,
  percentWithEdge,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";

const fishingActivities = [
  "FISH_COLLECT_REC",
  "FISH_COLLECT_LOCAL",
  "FISH_AQUA_INDUSTRIAL",
];

const breakMap: Record<string, number> = {
  definite: fishingActivities.length,
  partial: 1,
  no: 0,
};

/**
 * PlatformEdge component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const PlatformEdge: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("platformEdge", t);
  const precalcMetrics = project.getPrecalcMetrics(
    metricGroup,
    "area",
    curGeography.geographyId,
  );

  // Labels
  const titleLabel = t("Pelagic Fisheries Access - Platform Edge");
  const mapLabel = t("Map");
  const withinLabel = t("Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("units");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="platformEdge"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        const sketches = toNullSketchArray(data.sketch);
        const sketchesById = keyBy(sketches, (sk) => sk.properties.id);
        const classId = metricGroup.classes[0].classId;

        // Build class percent metrics (non-group)
        const classPercMetrics = toPercentMetric(
          data.metrics.filter((m) => !m.groupId && m.classId === classId),
          precalcMetrics,
        );
        const classPercMetric = firstMatchingMetric(
          classPercMetrics,
          (m) =>
            m.sketchId === data.sketch.properties.id && m.classId === classId,
        )!;

        const singleClassMetrics = metricsForSketch(
          data.metrics,
          sketches,
        ).filter((m) => !m.groupId);
        const singleClassEdgeMetrics = singleClassMetrics.map((smp) =>
          toEdgeSketchMetric(smp),
        );

        // Count total number of sketches with overlap
        const overlapCount = singleClassEdgeMetrics.reduce(
          (sumSoFar, sm) => (sm?.extra?.overlapEdge ? sumSoFar + 1 : sumSoFar),
          0,
        );

        // Create map of groupId => overlap count for group
        const numGroupsMap = singleClassEdgeMetrics.reduce<
          Record<string, number>
        >((soFar, sm) => {
          const breakGroup = getBreakGroup(
            breakMap,
            sm.extra.numFishingRestricted,
            sm.extra.overlapEdge,
          );
          return {
            ...soFar,
            [breakGroup]: soFar[breakGroup] ? soFar[breakGroup] + 1 : 1,
          };
        }, {});

        const highestGroup = Object.keys(numGroupsMap).find(
          (groupName) => numGroupsMap[groupName] > 0,
        );
        if (!highestGroup) throw new Error("No highest group map");

        let keySection: JSX.Element;
        if (isCollection) {
          keySection = (
            <>
              This plan would create <b>{overlapCount}</b> breaks in pelagic
              fisheries access.
            </>
          );
          if (highestGroup !== "no") {
            keySection = (
              <>
                {keySection} It overlaps with{" "}
                <b>{percentWithEdge(classPercMetric.value)}</b> of the nearshore
                pelagic fishing zone.
              </>
            );
          }
        } else {
          keySection = (
            <>
              This MPA would create {highestGroup !== "no" ? " a " : ""}{" "}
              <b>{highestGroup}</b> break in pelagic fisheries access.
            </>
          );
          if (highestGroup !== "no") {
            keySection = (
              <>
                {keySection}{" "}
                <b>{classPercMetric?.extra?.numFishingRestricted}</b> fishing
                activities are restricted and it overlaps with{" "}
                <b>{percentWithEdge(classPercMetric.value)}</b> of the nearshore
                pelagic fishing zone.
              </>
            );
          }
        }

        let groupRows: GroupMetricAgg[] = [];
        let sketchRows: GroupMetricSketchAgg[] = [];
        if (isCollection && isSketchCollection(data.sketch)) {
          const groupMetrics = data.metrics.filter((m) => m.groupId);

          // Build agg group objects with percValue for each class
          groupRows = flattenByGroupAllClass(
            data.sketch,
            groupMetrics,
            precalcMetrics,
          );

          // Build agg sketch group objects with percValue for each class
          // groupId, sketchId, class1, class2, ..., total
          console.log(sketches);
          console.log(groupMetrics);
          sketchRows = flattenByGroupSketchAllClass(
            sketches,
            groupMetrics,
            precalcMetrics,
          );
        }

        return (
          <ReportError>
            <p>
              Plans should allow for spatial continuity of fishing for pelagic
              species in the Nearshore Pelagic Fisheries Zone, defined as depths
              greater than 55 meters out to 2000 meters including the edge of
              the Bermuda platform and the outlying banks.
            </p>
            <LayerToggle
              label="Show Pelagic Fishing Zone Layer"
              layerId={metricGroup.layerId}
            />
            <VerticalSpacer />
            <KeySection>{keySection}</KeySection>
            {isCollection && genGroupTable(groupRows)}
            {isCollection && (
              <>
                <Collapse title="Show by MPA">
                  {genSketchTable(sketchesById, sketchRows)}
                </Collapse>
              </>
            )}
            <Collapse title="Learn more">
              <p>
                A <b>break</b> in access is defined as any MPA where at least
                one fishing activity is restricted, and the boundary overlaps
                with the 55-2000m fishing zone of the platform.
              </p>
              <p>Fishing activities that breaks are assessed for include:</p>
              <ul>
                <li>Fishing/collection: recreational (sustainable)</li>
                <li>
                  Fishing/collection: local fishing (sustainable) Industrial
                </li>
                <li>Fishing, industrial scale aquaculture</li>
              </ul>
              Fishing activities that breaks are not assessed for include:
              <ul>
                <li>Traditional fishing/collection</li>
              </ul>
              <p>Breaks are further broken down into 3 levels:</p>
              <ul>
                <li>
                  <b>Definite</b> break: all 3 fishing activities restricted
                </li>
                <li>
                  <b>Partial</b> break: 1-2 fishing activities restricted
                </li>
                <li>
                  <b>No</b> break: 0 fishing activities restricted
                </li>
              </ul>
              <p>
                In addition, if MPA boundaries within a given break category
                overlap with each other, the overlap is only counted once
                towards % fishing zone overlap. If overlapping MPAs fall under
                different break types, the higher break type applies and the
                overlap is counted under it.
              </p>
            </Collapse>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

const genGroupTable = (groupRows: GroupMetricAgg[]) => {
  const breakTextByGroup = (groupId: string, numSketches: number) => {
    const singleOrPlural = numSketches === 1 ? "MPA" : "MPAs";
    const groupMap: Record<string, JSX.Element> = {
      definite: (
        <>
          <b>Definite</b> break {singleOrPlural}{" "}
          <span
            style={{
              color: "#aaa",
              fontStyle: "italic",
              fontSize: "11px",
              paddingLeft: 10,
            }}
          >
            (3 fishing activities restricted)
          </span>
        </>
      ),
      partial: (
        <>
          <b>Partial</b> break {singleOrPlural}{" "}
          <span
            style={{
              color: "#aaa",
              fontStyle: "italic",
              fontSize: "11px",
              paddingLeft: 10,
            }}
          >
            (1-2 fishing activities restricted)
          </span>
        </>
      ),
      no: (
        <>
          <b>No</b> break {singleOrPlural}{" "}
          <span
            style={{
              color: "#aaa",
              fontStyle: "italic",
              fontSize: "11px",
              paddingLeft: 10,
            }}
          >
            (0 overlap or fishing restricted)
          </span>
        </>
      ),
    };
    return groupMap[groupId];
  };

  const columns: Column<GroupMetricAgg>[] = [
    {
      Header: "By Break Type:",
      accessor: (row) => (
        <GroupCircleRow
          group={row.groupId}
          groupColorMap={{
            definite: "#F7A6B4",
            partial: "#FFE1A3",
            no: "#BEE4BE",
          }}
          circleText={`${row.numSketches}`}
          rowText={breakTextByGroup(row.groupId, row.numSketches as number)}
        />
      ),
    },
    {
      Header: "% Fishing Zone Overlap",
      accessor: (row) => percentWithEdge(row.percValue),
      style: { width: "25%" },
    },
  ];

  return (
    <SmallReportTableStyled>
      <Table className="styled" columns={columns} data={groupRows} />
    </SmallReportTableStyled>
  );
};

const genSketchTable = (
  sketchesById: Record<string, NullSketch>,
  sketchRows: GroupMetricSketchAgg[],
) => {
  const columns: Column<GroupMetricSketchAgg>[] = [
    {
      Header: "MPA:",
      accessor: (row) => (
        <GroupCircleRow
          group={row.groupId}
          groupColorMap={{
            definite: "#F7A6B4",
            partial: "#FFE1A3",
            no: "#BEE4BE",
          }}
          rowText={sketchesById[row.sketchId].properties.name}
        />
      ),
    },
    {
      Header: "Break Type",
      accessor: (row) => capitalize(row.groupId),
      style: { width: "20%" },
    },
    {
      Header: "% Fishing Zone Overlap",
      accessor: (row) => percentWithEdge(row.percValue),
      style: { width: "25%" },
    },
  ];

  return (
    <SmallReportTableStyled>
      <Table className="styled" columns={columns} data={sketchRows} />
    </SmallReportTableStyled>
  );
};

export interface EdgeSketchMetric extends Metric {
  extra: {
    numFishingRestricted: number;
    overlapEdge: boolean;
  };
}

const toEdgeSketchMetric = (metric: Metric): EdgeSketchMetric => {
  if (
    metric?.extra?.numFishingRestricted !== undefined &&
    metric?.extra?.overlapEdge !== undefined
  ) {
    return metric as EdgeSketchMetric;
  } else {
    throw new Error("Not an EdgeSketchmetric");
  }
};

/**
 * Return break group that has at least min number of restricted activities
 * non-overlapping are always 'no' group
 */
export const getBreakGroup = (
  breakMap: Record<string, number>,
  numFishingRestricted?: number,
  overlap?: boolean,
): string => {
  if (numFishingRestricted === undefined || numFishingRestricted === null)
    throw new Error("Missing numFishingRestricted");
  if (overlap === undefined) throw new Error("Missing overlap");
  if (overlap === false) return "no";
  const breakGroup = Object.keys(breakMap).find(
    (breakGroup) => numFishingRestricted >= breakMap[breakGroup],
  );
  if (!breakGroup)
    throw new Error(
      "getBreakGroup - could not find breakGroup, something is wrong",
    );
  return breakGroup;
};

/**
 * Flattens group class metrics, one for each group and sketch.
 * Each object includes the percValue for each class, and the total percValue with classes combined
 * groupId, sketchId, class1, class2, ..., total
 * @param groupMetrics - group metric data
 * @param totalValue - total value with classes combined
 * @param classes - class config
 */
export const flattenByGroupSketchAllClass = (
  /** ToDo: is this needed? can the caller just pre-filter groupMetrics? */
  sketches: Sketch[] | NullSketch[],
  /** Group metrics for collection and its child sketches */
  groupMetrics: Metric[],
  /** Totals by class */
  totals: Metric[],
): GroupMetricSketchAgg[] => {
  const sketchIds = new Set(sketches.map((sk) => sk.properties.id));
  const sketchRows: GroupMetricSketchAgg[] = [];

  // Stratify in order by Group -> Sketch -> Class. Then flatten

  const metricsByGroup = groupBy(groupMetrics, (m) => m.groupId || "undefined");

  for (const curGroupId of Object.keys(metricsByGroup)) {
    const groupSketchMetrics = metricsByGroup[curGroupId].filter(
      (m) => m.sketchId && sketchIds.has(m.sketchId),
    );
    const groupSketchMetricsByClass = groupBy(
      groupSketchMetrics,
      (m) => m.classId || "undefined",
    );
    const groupSketchMetricIds = Object.keys(
      groupBy(groupSketchMetrics, (m) => m.sketchId || "missing"),
    );

    for (const curSketchId of groupSketchMetricIds) {
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

      const groupTotal = firstMatchingMetric(totals, (m) => !m.groupId).value;
      sketchRows.push({
        groupId: curGroupId,
        sketchId: curSketchId,
        value: classAgg.value,
        percValue: classAgg.value / groupTotal,
        ...classAgg,
      });
    }
  }
  return sketchRows;
};
