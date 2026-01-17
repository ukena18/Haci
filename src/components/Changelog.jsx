import React, { useState } from "react";
import { CHANGELOG } from "../data/changelog";

export default function Changelog({ language = "tr" }) {
  const [openVersions, setOpenVersions] = useState({});

  function toggle(version) {
    setOpenVersions((s) => ({
      ...s,
      [version]: !s[version],
    }));
  }

  return (
    <div style={{ marginTop: 16 }}>
      {CHANGELOG.map((release) => {
        const isOpen = openVersions[release.version];

        return (
          <div
            key={release.version}
            className="card"
            style={{ marginBottom: 12 }}
          >
            {/* HEADER */}
            <div
              className="list-item"
              style={{ cursor: "pointer" }}
              onClick={() => toggle(release.version)}
            >
              <div>
                <strong>v{release.version}</strong>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {release.title?.[language]}
                </div>
              </div>

              <i
                className={`fa-solid fa-chevron-${isOpen ? "down" : "right"}`}
              />
            </div>

            {/* BODY */}
            {isOpen && (
              <div style={{ marginTop: 12, fontSize: 13 }}>
                {release.sections.map((section, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      {section.label?.[language]}
                    </strong>

                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {section.items?.[language]?.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
