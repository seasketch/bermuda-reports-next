import React, { useState } from "react";
import { SegmentControl, ReportPage } from "@seasketch/geoprocessing/client-ui";
import OverviewPage from "../components/OverviewPage.js";
import EcologicalPage from "../components/EcologicalPage.js";
import { useTranslation } from "react-i18next";
import { Translator } from "../components/TranslatorAsync.js";

const enableAllTabs = false;

const BaseReport = () => {
  const { t } = useTranslation();
  const overviewId = "overview";
  const ecologicalId = "ecological";
  const segments = [
    { id: overviewId, label: t("Overview") },
    { id: ecologicalId, label: t("Ecological") },
  ];
  const [tab, setTab] = useState<string>(overviewId);
  return (
    <>
      <div style={{ marginTop: 5 }}>
        <SegmentControl
          value={tab}
          onClick={(segment) => setTab(segment)}
          segments={segments}
        />
      </div>
      <ReportPage hidden={!enableAllTabs && tab !== overviewId}>
        <OverviewPage />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== ecologicalId}>
        <EcologicalPage />
      </ReportPage>
    </>
  );
};

// Named export loaded by storybook
export const MpaTabReport = () => {
  // Translator must be in parent FunctionComponent in order for ReportClient to use useTranslate hook
  return (
    <Translator>
      <BaseReport />
    </Translator>
  );
};

// Default export lazy-loaded by top-level ReportApp
export default MpaTabReport;
