import React from "react";
import { OusSector } from "./OusSector.js";
import { OusGear } from "./OusGear.js";
import { PlatformEdge } from "./PlatformEdge.js";
import { Shipwrecks } from "./Shipwrecks.js";

const ReportPage = () => {
  return (
    <>
      <OusSector />
      <OusGear />
      <PlatformEdge />
      <Shipwrecks />
    </>
  );
};

export default ReportPage;
