import React from "react";
import { NurseryHabitat } from "./NurseryHabitat.js";
import { NearshoreHabitat } from "./NearshoreHabitat.js";
import { OffshoreHabitat } from "./OffshoreHabitat.js";
import { SpeciesProtection } from "./SpeciesProtection.js";

const ReportPage = () => {
  return (
    <>
      <NearshoreHabitat />
      <OffshoreHabitat />
      <SpeciesProtection />
      <NurseryHabitat />
    </>
  );
};

export default ReportPage;
