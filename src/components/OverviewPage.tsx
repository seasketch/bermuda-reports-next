import React from "react";
import { SizeCard } from "./SizeCard.js";
import { ExistingProtections } from "./ExistingProtections.js";
import { Protection } from "./Protection.js";
import { PriorityAreas } from "./PriorityAreas.js";
import SketchAttributesCard from "./SketchAttributesCard.js";

const ReportPage = () => {
  return (
    <>
      <SizeCard />
      <Protection />
      <ExistingProtections />
      <PriorityAreas />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
