import fs from "fs";
import {
  FeatureCollection,
  Polygon,
  ReportResultBase,
  createMetric,
} from "@seasketch/geoprocessing";
import shipwrecks from "../dist/shipwrecks.json";

const DATASET = `shipwrecks`;
const DEST_PATH = `data/bin/${DATASET}Precalc.json`;

const wrecks = shipwrecks as FeatureCollection<Polygon>;

async function main() {
  const sumWrecks = wrecks.features.reduce(
    (sumSoFar: number, feat) => sumSoFar + feat!.properties!.NumberOfRe,
    0,
  );

  const result = [
    createMetric({
      classId: DATASET,
      metricId: DATASET,
      value: sumWrecks,
    }),
  ];

  fs.writeFile(DEST_PATH, JSON.stringify(result, null, 2), (err) =>
    err
      ? console.error("Error", err)
      : console.info(`Successfully wrote ${DEST_PATH}`),
  );
}

main();
