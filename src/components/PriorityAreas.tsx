import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Collapse,
  Column,
  GreenPill,
  IucnLevelCircleRow,
  LayerToggle,
  Pill,
  ReportError,
  ReportTableStyled,
  ResultsCard,
  SmallReportTableStyled,
  Table,
  useSketchProperties,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import {
  GeogProp,
  Metric,
  NullSketch,
  ReportResult,
  UserAttribute,
  capitalize,
  firstMatchingMetric,
  isSketchCollection,
  keyBy,
  percentWithEdge,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project/projectClient.js";
import {
  flattenByGroupAllClassNoTotal,
  flattenByGroupSketchAllClassNoTotal,
  GroupMetricAggNoTotal,
  GroupMetricSketchAggNoTotal,
} from "../util/helpers.js";

const metricGroup = project.getMetricGroup("priorityAreas");

/**
 * PriorityAreas component
 *
 * @param props - geographyId
 * @returns A react component which displays an overlap report
 */
export const PriorityAreas: React.FunctionComponent<GeogProp> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection, userAttributes }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  // Labels
  const titleLabel = t("Priority Areas");

  return (
    <ResultsCard
      title={titleLabel}
      functionName="priorityAreas"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: ReportResult) => {
        return (
          <ReportError>
            <p>
              <Trans i18nKey="PriorityAreas 1">
                Areas have been pre-identified using a prioritization modeling
                approach that meets multiple objectives of this planning
                process. Consider including these areas in order to achieve
                planning goals. This report summarizes the percentage of the
                areas that overlap with this plan.
              </Trans>
            </p>
            <LayerToggle
              layerId={metricGroup.layerId}
              label={`Show Priority Areas`}
            />
            <VerticalSpacer />
            {isCollection ? genNetwork(data) : genSingle(data, userAttributes)}
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
const genSingle = (data: ReportResult, userAttributes: UserAttribute[]) => {
  const precalcTotals = project.getPrecalcMetrics(metricGroup, "area", "world");

  // Class metrics
  const classPercMetrics = toPercentMetric(
    data.metrics.filter(
      (m) =>
        m.classId && !m.groupId && m.sketchId === data.sketch.properties.id,
    ),
    precalcTotals,
  );

  // Class aggregate by group - only one group can have value > 0 per sketch
  const groupMetrics = data.metrics.filter(
    (m) => !!m.groupId && m.sketchId === data.sketch.properties.id,
  );
  const groupAggs = flattenByGroupSketchAllClassNoTotal(
    toNullSketchArray(data.sketch),
    groupMetrics,
    precalcTotals,
  );
  const groupAgg = groupAggs.find((agg) => agg.value > 0);
  const groupValue = groupAgg ? groupAgg.percValue : 0;

  return (
    <p>
      <b>
        This MPA contains{" "}
        <Pill>{percentWithEdge(classPercMetrics[0].value)}</Pill> of priority
        areas.
      </b>
    </p>
  );
};

const genNetwork = (data: ReportResult) => {
  const precalcTotals = project.getPrecalcMetrics(metricGroup, "area", "world");

  const totalPriorityPerc = toPercentMetric(
    [
      firstMatchingMetric(
        data.metrics,
        (m) => m.sketchId === data.sketch.properties.id && m.groupId === null,
      ),
    ],
    precalcTotals,
  )[0];

  const sketches = toNullSketchArray(data.sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);

  let groupAggs: GroupMetricAggNoTotal[] = [];
  let sketchAggs: GroupMetricSketchAggNoTotal[] = [];
  if (isSketchCollection(data.sketch)) {
    const groupMetrics = data.metrics.filter((m) => m.groupId);

    // Build agg group objects with percValue for each class
    groupAggs = flattenByGroupAllClassNoTotal(
      data.sketch,
      groupMetrics,
      precalcTotals,
    );

    // Build agg sketch group objects with percValue for each class
    // groupId, sketchId, class1, class2, ..., total
    sketchAggs = flattenByGroupSketchAllClassNoTotal(
      sketches,
      groupMetrics,
      precalcTotals,
    );
  }

  return (
    <>
      <p>
        <b>
          This plan contains{" "}
          <Pill>{percentWithEdge(totalPriorityPerc.value)}</Pill> of priority
          areas.
        </b>
      </p>
      {genGroupTable(groupAggs)}
      <Collapse title="Show by MPA">
        {genSketchTable(sketchesById, sketchAggs)}
      </Collapse>
      {genHelp()}
    </>
  );
};

const genSketchTable = (
  sketchesById: Record<string, NullSketch>,
  sketchRows: GroupMetricSketchAggNoTotal[],
) => {
  const classColumns: Column<GroupMetricSketchAggNoTotal>[] =
    metricGroup.classes.map((curClass) => ({
      Header: "Within Plan",
      accessor: (row) => percentWithEdge(row[curClass.classId] as number),
    }));

  const columns: Column<GroupMetricSketchAggNoTotal>[] = [
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

const genGroupTable = (groupRows: GroupMetricAggNoTotal[]) => {
  const classColumns: Column<GroupMetricAggNoTotal>[] = metricGroup.classes.map(
    (curClass) => ({
      Header: "Within Plan",
      accessor: (row) => percentWithEdge(row[curClass.classId] as number),
      style: { width: "10%" },
    }),
  );

  const columns: Column<GroupMetricAggNoTotal>[] = [
    {
      Header: "By Protection Level:",
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

const genHelp = () => (
  <>
    <Collapse title="Learn More">
      <span>
        ℹ️ Overview: A prioritization model was used to find optimal areas to
        meet planning objectives. The model was designed to meet the following
        targets:
        <ul>
          <li>Habitat zones: 20% of each habitat zones</li>
          <li>
            Coral/ benthic data: 30% of the total value of each of the coral/
            benthic data layers
          </li>
          <li>Fish: 30% of the total value of each of the fish data layers</li>
          <li>Seagrass: 50% of the total seagrass index value</li>
          <li>Mangroves: 50% of mangrove area</li>
          <li>Nursery reef: 50% of the nursery reef area</li>
        </ul>{" "}
      </span>
      <p>
        🎯 Planning Objective: there is no specific objective for including
        these priority areas in your plan, but they can be used to guide
        discussion.{" "}
      </p>
      <p>
        📈 Report: Percentages are calculated by summing the portion of priority
        areas found within the plans MPAs, and dividing it by the sum of all
        priority areas. If the plan includes multiple MPAs that overlap, the
        overlap is only counted once.
      </p>
    </Collapse>
  </>
);

/**
 * Represents a single class of data.
 * Used to access the data, and calculate metrics based on them.
 */
export interface DataClass {
  /** Unique name for class */
  classId: string;
  /** Name of class suitable for user display */
  display: string;
  /** Optional filename of dataset used for metric class, sans extension. */
  baseFilename?: string;
  /** Optional filename of dataset for metric class for use by GP function, with extension. */
  filename?: string;
  /** Optional unique number used by some datasets (e.g. raster) to represent data class instead of string */
  numericClassId?: number;
  /** Optional ID of map layer associated with this class */
  layerId?: string;
  /** Optional nodata value used by raster dataset */
  noDataValue?: number;
  /** Optional project specific goal value for this class */
  goalValue?: number;
}

/**
 * Represents a group of data classes.
 * Used to access the data, and calcualte metrics based on them.
 * This interface is murky but it supports a variety of scenarios:
 * - Vector dataset with one feature class
 * - Vector dataset with multiple feature class, each with their own file datasource, and possibly only one layerId to display them all
 * - Vector dataset with multiple feature classes, all in one file datasource, each class with its own layerId
 * - Raster with multiple feature classes represented by unique integer values that map to class names
 */
export interface DataGroup {
  /** data classes used by group */
  classes: DataClass[];
  /** Identifier for datasource */
  datasourceId?: string;
  /** Optional name of feature property containing class ID */
  classProperty?: string;
  /** Optional filename of dataset, sans extension. May contain data for one or more classes */
  baseFilename?: string;
  /** Optional filename of dataset for use by GP function, with extension */
  filename?: string;
  /** Optional ID of map layer associated with this metric */
  layerId?: string;
}

export interface ClassTableProps {
  /** Table row objects, each expected to have a classId and value. Defaults to "Class" */
  rows: Metric[];
  /** Data class definitions. if group has layerId at top-level, will display one toggle for whole group */
  dataGroup: DataGroup;
  /** Whether to format metric value and goal value as a percent.  Defaults to false */
  formatPerc?: boolean;
  /** Text to display for class name column.  Defaults to "Class" */
  titleText?: string;
  /** Whether to show map layer toggle column.  Data classes must have layerId defined */
  showLayerToggle?: boolean;
  /** Text to display for layer toggle column.  Defaults to "Show Map" */
  layerColText?: string;
  /** Whether to show goal column.  Data classes must have a goalValue defined. Defaults to false */
  showGoal?: boolean;
  /** Text to display for value column.  Defaults to "Within Plan" */
  valueColText?: string;
  /** Text to display for goal column.  Defaults to "Goal" */
  goalColText?: string;
  /** Override column widths */
  options?: {
    classColWidth?: string;
    percColWidth?: string;
    showMapWidth?: string;
    goalWidth?: string;
  };
}

/**
 * Table displaying class metrics, one class per table row
 */
export const ClassTable: React.FunctionComponent<ClassTableProps> = ({
  titleText = "Class",
  rows,
  dataGroup,
  formatPerc = false,
  valueColText = "Within Plan",
  showLayerToggle = false,
  layerColText = "Show Map",
  showGoal = false,
  goalColText = "Goal",
  options,
}) => {
  // Use user-defined width, otherwise sane default depending on whether goal
  const colWidths = {
    classColWidth: options?.classColWidth
      ? options?.classColWidth
      : showGoal
        ? "30%"
        : "50%",
    percColWidth: options?.percColWidth
      ? options?.percColWidth
      : showGoal
        ? "30%"
        : "30%",
    showMapWidth: options?.showMapWidth
      ? options?.showMapWidth
      : showGoal
        ? "20%"
        : "20%",
    goalWidth: options?.goalWidth
      ? options?.goalWidth
      : showGoal
        ? "20%"
        : "50%",
  };
  const classesByName = keyBy(
    dataGroup.classes,
    (curClass) => curClass.classId,
  );
  const columns: Column<Metric>[] = [
    {
      Header: titleText,
      accessor: (row) =>
        classesByName[row.classId || "missing"]?.display || "missing",
      style: { width: colWidths.classColWidth },
    },
    {
      Header: valueColText,
      style: { textAlign: "right", width: colWidths.percColWidth },
      accessor: (row) => {
        const valueDisplay = formatPerc
          ? percentWithEdge(row.value)
          : row.value;
        const goal =
          dataGroup.classes.find((curClass) => curClass.classId === row.classId)
            ?.goalValue || 0;
        if (showGoal && row.value > goal) {
          return <GreenPill>{valueDisplay}</GreenPill>;
        } else {
          return valueDisplay;
        }
      },
    },
  ];

  // Optionally insert layer toggle column
  if (showLayerToggle) {
    columns.push({
      Header: layerColText,
      accessor: (row, index) => {
        const isSimpleGroup = dataGroup.layerId ? false : true;
        const layerId =
          dataGroup.layerId || classesByName[row.classId!].layerId;
        if (isSimpleGroup && layerId) {
          return (
            <LayerToggle
              simple
              layerId={layerId}
              style={{ marginTop: 0, marginLeft: 15 }}
            />
          );
        } else if (!isSimpleGroup && layerId && index === 0) {
          return (
            <LayerToggle
              simple
              layerId={layerId}
              style={{ marginTop: 0, marginLeft: 15 }}
            />
          );
        } else {
          return <></>;
        }
      },
      style: { width: colWidths.showMapWidth },
    });
  }

  // Optionally insert goal column
  if (showGoal) {
    columns.splice(columns.length - (showLayerToggle ? 1 : 0), 0, {
      Header: goalColText,
      style: { textAlign: "right", width: colWidths.goalWidth },
      accessor: (row) => {
        const goalValue = dataGroup.classes.find(
          (curClass) => curClass.classId === row.classId,
        )?.goalValue;
        if (!goalValue)
          throw new Error(`Goal value not found for ${row.classId}`);
        return formatPerc ? percentWithEdge(goalValue) : goalValue;
      },
    });
  }

  return (
    <ReportTableStyled>
      <Table className="styled" columns={columns} data={rows} />
    </ReportTableStyled>
  );
};
