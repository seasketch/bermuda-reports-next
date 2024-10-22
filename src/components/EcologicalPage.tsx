import React from "react";
import { NurseryHabitat } from "./NurseryHabitat.js";
import { NearshoreHabitat } from "./NearshoreHabitat.js";
import { OffshoreHabitat } from "./OffshoreHabitat.js";
import { SpeciesProtection } from "./SpeciesProtection.js";
import { HabitatRestoration } from "./HabitatRestoration.js";

const ReportPage = () => {
  return (
    <>
      <NearshoreHabitat />
      <OffshoreHabitat />
      <SpeciesProtection />
      <NurseryHabitat />
      <HabitatRestoration />
    </>
  );
};

export default ReportPage;
