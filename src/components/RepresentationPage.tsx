import React from "react";
import { NurseryHabitat } from "./NurseryHabitat.js";
import { NearshoreHabitat } from "./NearshoreHabitat.js";
import { OffshoreHabitat } from "./OffshoreHabitat.js";

const ReportPage = () => {
  return (
    <>
      <NearshoreHabitat />
      <OffshoreHabitat />
      <NurseryHabitat />
    </>
  );
};

export default ReportPage;
