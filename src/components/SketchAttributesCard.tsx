import { Card, useSketchProperties } from "@seasketch/geoprocessing/client-ui";
import { array } from "prop-types";
import React from "react";
import { useTranslation } from "react-i18next";

export interface SketchAttributesCardProps {
  title?: string;
  autoHide?: boolean;
  /** Map from value IDs to human readable for one or more exportIds */
  mappings?: { [exportId: string]: { [value: string]: string } };
}

export const SketchAttributesCard = ({
  title,
  autoHide,
  mappings,
}: SketchAttributesCardProps) => {
  const titleStyle: React.CSSProperties = {
    fontSize: "1em",
    fontWeight: 500,
    color: "#6C7282",
    marginBottom: "1.5em",
  };

  const [properties] = useSketchProperties();
  const { t, i18n } = useTranslation();

  const attributesLabel = t("Attributes");

  if (autoHide === true && properties.userAttributes.length === 0) {
    return null;
  }
  if (properties) {
    return (
      <Card titleStyle={titleStyle} title={title || attributesLabel}>
        <table style={{ width: "100%" }}>
          <tbody>
            {properties.userAttributes.map((attr) => {
              let label; // label: "Designation"
              let valueLabel; // valueLabel: "Fully Protected",

              if (attr.label) {
                label = attr.label;

                // If language not english, override with translation if available
                if (i18n.language === "en") {
                  label = attr.label;
                } else if (
                  attr.alternateLanguages &&
                  Object.keys(attr.alternateLanguages).includes(i18n.language)
                ) {
                  // Swap in translation
                  label = attr.alternateLanguages[i18n.language].label;
                }
              }

              if (attr.valueLabel) {
                valueLabel = attr.valueLabel;

                // If language not english, override with translation if available
                if (
                  i18n.language !== "en" &&
                  attr.alternateLanguages &&
                  Object.keys(attr.alternateLanguages).includes(i18n.language)
                ) {
                  // Swap in translation
                  valueLabel =
                    attr.alternateLanguages[i18n.language].valueLabel;
                }
              }

              console.log(valueLabel);

              return (
                <tr key={attr.exportId} style={{ verticalAlign: "top" }}>
                  <td
                    style={{
                      padding: 0,
                      paddingRight: 4,
                      borderBottom: "1px solid #f5f5f5",
                      paddingBottom: 6,
                      paddingTop: 6,
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f5f5f5",
                      paddingBottom: 6,
                      paddingTop: 6,
                      paddingLeft: 6,
                    }}
                  >
                    {!valueLabel
                      ? "N/A"
                      : Array.isArray(valueLabel)
                        ? valueLabel.map((v, index) => (
                            <React.Fragment key={index}>
                              {t(v)}
                              <br />
                            </React.Fragment>
                          ))
                        : t(valueLabel as string)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    );
  } else {
    return (
      <Card titleStyle={titleStyle} title={title || attributesLabel}>
        <p>{t("No attributes found")}</p>
      </Card>
    );
  }
};

export default SketchAttributesCard;
