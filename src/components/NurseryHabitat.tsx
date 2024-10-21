import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ClassTable,
  Collapse,
  Column,
  IucnLevelCircleRow,
  IucnLevelPill,
  LayerToggle,
  ObjectiveStatus,
  Pill,
  ReportError,
  ResultsCard,
  SketchClassTable,
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
  MetricGroup,
  NullSketch,
  NullSketchCollection,
  ReportResult,
  SketchCollection,
  UserAttribute,
  capitalize,
  createMetric,
  firstMatchingMetric,
  flattenByGroupSketchAllClass,
  getIucnCategoryForActivities,
  groupBy,
  isSketchCollection,
  keyBy,
  metricsWithSketchId,
  percentGoalWithEdge,
  percentWithEdge,
  roundDecimal,
  squareMeterToMile,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";

/**
 * NurseryHabitat component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const NurseryHabitat: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection, userAttributes }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Metrics
  const metricGroup = project.getMetricGroup("nurseryHabitat", t);
  const precalcMetrics = project
    .getPrecalcMetrics(metricGroup, "area", curGeography.geographyId)
    .concat([
      createMetric({
        metricId: metricGroup.metricId,
        value: project
          .getPrecalcMetrics(metricGroup, "area", curGeography.geographyId)
          .reduce((sumSoFar, metric) => sumSoFar + metric.value, 0),
      }),
    ]);

  // Labels
  const titleLabel = t("Key Nursery Habitat");
  const mapLabel = t("Map");
  const withinLabel = t("Area Within Plan");
  const percWithinLabel = t("% Within Plan");
  const unitsLabel = t("mi²");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="nurseryHabitat"
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
            {isCollection
              ? genNetwork(data, precalcMetrics, metricGroup)
              : genSingle(data, userAttributes, precalcMetrics, metricGroup)}

            {!isCollection && (
              <ClassTable
                rows={metrics}
                metricGroup={metricGroup}
                objective={objectives}
                columnConfig={[
                  {
                    columnLabel: t("Nursery Habitat"),
                    type: "class",
                    width: 25,
                  },
                  {
                    columnLabel: withinLabel,
                    type: "metricValue",
                    metricId: metricGroup.metricId,
                    valueFormatter: (num) =>
                      roundDecimal(squareMeterToMile(Number(num)), 3),
                    valueLabel: unitsLabel,
                    colStyle: { textAlign: "center" },
                    chartOptions: {
                      showTitle: true,
                    },
                    width: 25,
                  },
                  {
                    columnLabel: percWithinLabel,
                    type: "metricChart",
                    metricId: percMetricIdName,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                    },
                    width: 35,
                  },
                ]}
              />
            )}

            <Collapse title={t("Learn More")}>
              <Trans i18nKey="NurseryHabitat - learn more">
                <p>
                  Objective: Identify and protect 50% of coastal habitats that
                  appear to be juvenile fish nursery habitats and/or used by
                  protected marine species.
                </p>
                <p>
                  To achieve the objective, increase enough MPAs in the plan to
                  full protection. Or discuss appropriate implementation
                  measures that will ensure the objective can still be met under
                  a high protection level.
                </p>
                <p>
                  Strategy: The effectiveness of a plan increases when its MPAs
                  contain a mosaic of habitats (two or more types). Strive to
                  include multiple habitat types in MPA boundaries.
                </p>
              </Trans>
            </Collapse>

            <VerticalSpacer />

            {metricGroup.classes.map((curClass) => (
              <>
                <LayerToggle
                  layerId={curClass.layerId}
                  key={curClass.classId}
                  label={"Show " + curClass.display + " On Map"}
                  size="small"
                />
              </>
            ))}
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

const genSingle = (
  data: ReportResult,
  userAttributes: UserAttribute[],
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
) => {
  // Lookup group ID
  const activityProp = userAttributes.find(
    (a) => a.exportId === "ACTIVITIES",
  ) as UserAttribute | undefined;
  if (!activityProp)
    throw new Error("Missing activities in sketch, something is not right");
  const activities =
    typeof activityProp.value === "string"
      ? activityProp.value === ""
        ? []
        : JSON.parse(activityProp.value)
      : activityProp.value;
  const groupId = getIucnCategoryForActivities(activities).level;

  // Class metrics
  const classPercMetrics = toPercentMetric(
    data.metrics.filter(
      (m) =>
        m.classId && !m.groupId && m.sketchId === data.sketch.properties.id,
    ),
    precalcMetrics,
  );

  // Class aggregate by group - only one group can have value > 0 per sketch
  const groupMetrics = data.metrics.filter(
    (m) => !!m.groupId && m.sketchId === data.sketch.properties.id,
  );
  const groupAggs = flattenByGroupSketchAllClass(
    toNullSketchArray(data.sketch),
    groupMetrics,
    precalcMetrics,
  );
  const groupAgg = groupAggs.find((agg) => agg.value > 0);
  const groupValue = groupAgg ? groupAgg.percValue : 0;

  return <>{genSingleObjective(groupId, groupValue, 0.5)}</>;
};

/**
 * Single objective status component
 */
const genSingleObjective = (
  groupId: string,
  actual: number,
  objective: number,
) => {
  let objectiveCmp;
  switch (groupId) {
    case "full":
      objectiveCmp = (
        <ObjectiveStatus
          status="yes"
          msg={
            <>
              This full protection MPA contains{" "}
              <b>
                {percentWithEdge(actual, {
                  digits: 0,
                  lower: 0.001,
                  upperBound: objective,
                  upper: objective - 0.001,
                })}
              </b>{" "}
              of known key nursery habitat and counts toward protecting{" "}
              <b>{percentWithEdge(objective, { digits: 0, lower: 0.001 })}</b>{" "}
            </>
          }
        />
      );
      break;
    case "high":
      objectiveCmp = (
        <ObjectiveStatus
          status="maybe"
          msg={
            <>
              This high protection MPA contains{" "}
              <b>
                {percentWithEdge(actual, {
                  digits: 0,
                  lower: 0.001,
                  upperBound: objective,
                  upper: objective - 0.001,
                })}
              </b>{" "}
              of known key nursery habitat and <b>may</b> count towards
              protecting{" "}
              <b>{percentWithEdge(objective, { digits: 0, lower: 0.001 })}</b>{" "}
            </>
          }
        />
      );
      break;
    default:
      objectiveCmp = (
        <ObjectiveStatus
          status="no"
          msg={
            <>
              This low protection MPA contains{" "}
              <b>
                {percentWithEdge(actual, {
                  digits: 0,
                  lower: 0.001,
                  upperBound: objective,
                  upper: objective - 0.001,
                })}
              </b>{" "}
              of known key nursery habitat and <b>does not</b> count towards
              protecting{" "}
              <b>{percentWithEdge(objective, { digits: 0, lower: 0.001 })}</b>{" "}
            </>
          }
        />
      );
  }
  return <div>{objectiveCmp}</div>;
};

const genNetwork = (
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
) => {
  const sketches = toNullSketchArray(data.sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);

  let groupAggs: GroupMetricAgg[] = [];
  let sketchAggs: GroupMetricSketchAgg[] = [];
  if (isSketchCollection(data.sketch)) {
    const groupMetrics = data.metrics.filter((m) => m.groupId);

    // Build agg group objects with percValue for each class
    groupAggs = flattenByGroupAllClass(
      data.sketch,
      groupMetrics,
      precalcMetrics,
    );

    // Build agg sketch group objects with percValue for each class
    // groupId, sketchId, class1, class2, ..., total
    sketchAggs = flattenByGroupSketchAllClass(
      sketches,
      groupMetrics,
      precalcMetrics,
    );
  }

  return (
    <>
      {genNetworkObjective(groupAggs, 0.5)}
      {genGroupTable(groupAggs, metricGroup)}
      <Collapse title="Show by MPA">
        {genSketchTable(sketchesById, sketchAggs, metricGroup)}
      </Collapse>
    </>
  );
};

const genNetworkObjective = (
  aggMetrics: GroupMetricAgg[],
  objective: number,
) => {
  const aggMetricsByGroup = keyBy(aggMetrics, (am) => am.groupId);
  const fullPerc = aggMetricsByGroup["full"].percValue;
  const highPerc = aggMetricsByGroup["high"].percValue;
  const needed = objective - fullPerc - highPerc;

  const fullPercDisplay = percentGoalWithEdge(fullPerc, objective);
  const highPercDisplay = percentGoalWithEdge(highPerc, objective);
  const combinedPercDisplay = percentGoalWithEdge(
    fullPerc + highPerc,
    objective,
  );

  const progressMsg = (
    <>
      <div style={{ display: "flex", paddingTop: 15 }}>
        <span style={{ paddingBottom: 15, width: 100 }}>So far:</span>
        <span>
          <IucnLevelPill level="full">{fullPercDisplay} Full</IucnLevelPill> +{" "}
          <IucnLevelPill level="high">{highPercDisplay} High</IucnLevelPill> ={" "}
          <Pill>{combinedPercDisplay}</Pill>
        </span>
      </div>
      {needed > 0 && (
        <div style={{ display: "flex" }}>
          <span style={{ width: 100 }}>Still needs:</span>
          <span>
            <Pill>{percentWithEdge(needed, { lower: 0.1, digits: 1 })}</Pill>
          </span>
        </div>
      )}
    </>
  );

  let objectiveCmp;
  if (fullPerc > objective) {
    objectiveCmp = (
      <ObjectiveStatus
        status="yes"
        msg={
          <>
            This plan meets the objective of protecting{" "}
            <b>{percentWithEdge(objective)}</b> of key nursery habitat.
          </>
        }
      />
    );
  } else if (fullPerc + highPerc > objective) {
    objectiveCmp = (
      <ObjectiveStatus
        status="maybe"
        msg={
          <>
            <div>
              This plan <b>may</b> meet the objective of protecting{" "}
              <b>{percentWithEdge(objective)}</b> of key nursery habitat.
            </div>
            {progressMsg}
          </>
        }
      />
    );
  } else {
    objectiveCmp = (
      <ObjectiveStatus
        status="no"
        msg={
          <>
            <div>
              This plan <b>does not</b> meet the objective of protecting{" "}
              <b>{percentWithEdge(objective)}</b> of key nursery habitat.
            </div>
            {progressMsg}
          </>
        }
      />
    );
  }

  return (
    <div>
      {objectiveCmp}
      <VerticalSpacer />
    </div>
  );
};

const genGroupTable = (
  groupRows: GroupMetricAgg[],
  metricGroup: MetricGroup,
) => {
  const classColumns: Column<GroupMetricAgg>[] = metricGroup.classes.map(
    (curClass) => ({
      Header: curClass.display,
      accessor: (row) => percentWithEdge(row[curClass.classId] as number),
      style: { width: "10%" },
    }),
  );

  const columns: Column<GroupMetricAgg>[] = [
    {
      Header: "By Protection Level",
      accessor: (row) => (
        <IucnLevelCircleRow
          level={row.groupId}
          circleText={`${row.numSketches}`}
          rowText={
            <>
              <b>{capitalize(row.groupId)}</b> Protection MPA
              {row.numSketches === 1 ? "" : "s"}
            </>
          }
        />
      ),
    },
    ...classColumns,
    {
      Header: "Total",
      accessor: (row) => {
        return (
          <IucnLevelPill level={row.groupId}>
            {percentWithEdge(row.percValue as number)}
          </IucnLevelPill>
        );
      },
    },
  ];

  return (
    <SmallReportTableStyled>
      <Table
        className="styled"
        columns={columns}
        data={groupRows.sort((a, b) => a.groupId.localeCompare(b.groupId))}
      />
    </SmallReportTableStyled>
  );
};

const genSketchTable = (
  sketchesById: Record<string, NullSketch>,
  sketchRows: GroupMetricSketchAgg[],
  metricGroup: MetricGroup,
) => {
  const classColumns: Column<GroupMetricSketchAgg>[] = metricGroup.classes.map(
    (curClass) => ({
      Header: curClass.display,
      accessor: (row) => percentWithEdge(row[curClass.classId] as number),
    }),
  );

  const columns: Column<GroupMetricSketchAgg>[] = [
    {
      Header: "MPA",
      accessor: (row) => (
        <IucnLevelCircleRow
          level={row.groupId}
          rowText={sketchesById[row.sketchId].properties.name}
          circleText={capitalize(row.groupId[0])}
        />
      ),
    },
    ...classColumns,
    {
      Header: "Total",
      accessor: (row) => {
        return (
          <IucnLevelPill level={row.groupId}>
            {percentWithEdge(row.percValue as number)}
          </IucnLevelPill>
        );
      },
    },
  ];

  return (
    <SmallReportTableStyled>
      <Table
        className="styled"
        columns={columns}
        data={sketchRows.sort((a, b) => a.groupId.localeCompare(b.groupId))}
      />
    </SmallReportTableStyled>
  );
};

export const flattenByGroupAllClass = (
  collection: SketchCollection | NullSketchCollection,
  groupMetrics: Metric[],
  totalMetrics: Metric[],
): {
  value: number;
  groupId: string;
  percValue: number;
}[] => {
  // Stratify in order by Group -> Collection -> Class. Then flatten
  const metricsByGroup = groupBy(groupMetrics, (m) => m.groupId || "undefined");

  return Object.keys(metricsByGroup).map((curGroupId) => {
    const collGroupMetrics = metricsByGroup[curGroupId].filter(
      (m) =>
        m.sketchId === collection.properties.id && m.groupId === curGroupId,
    );
    const collGroupMetricsByClass = keyBy(
      collGroupMetrics,
      (m) => m.classId || "undefined",
    );

    const classAgg = Object.keys(collGroupMetricsByClass).reduce(
      (rowsSoFar, curClassId) => {
        const groupClassSketchMetrics = groupMetrics.filter(
          (m) =>
            m.sketchId !== collection.properties.id &&
            m.groupId === curGroupId &&
            m.classId === curClassId,
        );

        const curValue = collGroupMetricsByClass[curClassId]?.value;

        const classTotal = firstMatchingMetric(
          totalMetrics,
          (totalMetric) => totalMetric.classId === curClassId,
        ).value;

        return {
          ...rowsSoFar,
          [curClassId]: curValue / classTotal,
          numSketches: groupClassSketchMetrics.length,
          value: rowsSoFar.value + curValue,
        };
      },
      { value: 0 },
    );

    const groupTotal = firstMatchingMetric(
      totalMetrics,
      (m) => !m.classId, // null classId identifies group total metric
    ).value;
    return {
      groupId: curGroupId,
      percValue: classAgg.value / groupTotal,
      ...classAgg,
    };
  });
};
