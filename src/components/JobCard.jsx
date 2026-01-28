import { useLang } from "../i18n/LanguageContext";
import {
  money,
  toNum,
  partLineTotal,
  partsTotalOf,
  jobTotalOf,
  formatTimer,
  clockHoursOf,
  calcHoursWithBreak,
} from "../utils/helpers";

export function JobCard({
  job,
  customersById,
  toggleJobOpen,
  clockIn,
  clockOut,
  setEditingJobId,
  setJobModalOpen,
  setConfirm,
  markJobComplete,

  onOpenActions, // ✅ ADD
  hideActions = false, // ✅ ADD THIS LINE
}) {
  const { t } = useLang();

  const c = customersById.get(job.customerId);

  const liveMs =
    job.isRunning && job.clockInAt ? Date.now() - job.clockInAt : 0;

  const hours =
    job.timeMode === "clock"
      ? clockHoursOf(job)
      : calcHoursWithBreak(job.start, job.end, job.breakMinutes);

  const partsTotal = partsTotalOf(job);

  const total = jobTotalOf(job);

  const jobStatusClass = `job-card ${
    job.isCompleted ? "job-completed" : "job-active"
  }`;

  return (
    <div className={jobStatusClass}>
      {/* Folder header row */}
      <div
        className="list-item"
        style={{ gap: 10, cursor: "pointer" }}
        onClick={() => toggleJobOpen(job.id)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="iconLike"
              title={t("folder_toggle_title")}
              onClick={(e) => {
                e.stopPropagation();
                toggleJobOpen(job.id);
              }}
            >
              <i
                className={`fa-solid ${
                  job.isOpen ? "fa-chevron-down" : "fa-chevron-right"
                }`}
              />
            </button>

            <strong>{c ? `${c.name} ${c.surname}` : t("unknown")}</strong>

            <span
              className={`job-status-badge ${
                job.isCompleted ? "debt" : "active"
              }`}
            >
              {job.isCompleted ? t("job_status_debt") : t("job_status_active")}
            </span>

            {job.isRunning && <span className="badge">{t("working")}</span>}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
            {job.isRunning ? (
              <>
                <i className="fa-solid fa-clock"></i> {t("duration")}:{" "}
                <strong style={{ color: "var(--text)" }}>
                  {formatTimer(liveMs)}
                </strong>
              </>
            ) : (
              <>
                <span>{job.date || t("no_date")}</span> |{" "}
                {job.timeMode === "fixed" ? (
                  <span> {t("fixed_price")}</span>
                ) : (
                  <>
                    <span>
                      {job.start || "--:--"} - {job.end || "--:--"}
                    </span>{" "}
                    |{" "}
                    <span>
                      {hours.toFixed(2)} {t("duration_hours")}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            minWidth: 180,
          }}
        >
          {/* 1) Clock in  Clock out  */}
          {job.timeMode === "clock" && !job.isCompleted && (
            <>
              {!job.isRunning ? (
                <button
                  className="due-dismiss-btn start"
                  onClick={(e) => {
                    e.stopPropagation();
                    clockIn(job.id);
                  }}
                >
                  <i className="fa-solid fa-play"></i>
                  <span>{t("start")}</span>
                </button>
              ) : (
                <button
                  className="due-dismiss-btn stop"
                  onClick={(e) => {
                    e.stopPropagation();
                    clockOut(job.id);
                  }}
                >
                  <i className="fa-solid fa-stop"></i>
                  <span>{t("stop")}</span>
                </button>
              )}
            </>
          )}

          {/* 2) ⋮ menu */}
          {!hideActions && onOpenActions && (
            <button
              className="job-options-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenActions(job.id);
              }}
            >
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </button>
          )}

          {/* 3) price */}
          <strong className="job-amount" style={{ whiteSpace: "nowrap" }}>
            {money(total, c?.currency)}
          </strong>
        </div>
      </div>

      {job.isOpen && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            {job.timeMode === "fixed" ? (
              <div className="miniRow">
                <span>{t("fixed_price")}:</span>
                <strong>{money(job.fixedPrice, c?.currency)}</strong>
              </div>
            ) : (
              <>
                <div className="miniRow">
                  <span>{t("hourly_rate")}:</span>
                  <strong>{money(job.rate, c?.currency)}</strong>
                </div>

                <div className="miniRow">
                  <span>{t("labor")}:</span>
                  <strong>{money(hours * toNum(job.rate), c?.currency)}</strong>
                </div>
              </>
            )}

            <div className="miniRow">
              <span>{t("parts")}:</span>
              <strong>{money(partsTotal, c?.currency)}</strong>
            </div>

            {job.parts?.length ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {t("used_parts")}
                </div>

                {job.parts.map((p) => (
                  <div key={p.id} className="partLine">
                    <span>
                      {p.name || t("part_generic")}{" "}
                      {p.qty != null ? `× ${p.qty}` : ""}
                    </span>
                    <span>{money(partLineTotal(p), c?.currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {" "}
                {t("no_parts")}
              </div>
            )}

            {job.notes && (
              <div style={{ marginTop: 8, color: "var(--text)" }}>
                <strong>{t("note_label")}:</strong> {job.notes}
              </div>
            )}

            {/* ⏱️ CLOCK IN / OUT HISTORY */}
            {job.timeMode === "clock" && (job.sessions || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  <i className="fa-solid fa-clock"></i> {t("work_history")}
                </div>

                {(job.sessions || []).map((s, i) => {
                  const start = new Date(s.inAt);
                  const end = new Date(s.outAt);
                  const h = ((s.outAt - s.inAt) / 36e5).toFixed(2);

                  return (
                    <div
                      key={s.id || i}
                      className="miniRow"
                      style={{ fontSize: 12, color: "var(--muted)" }}
                    >
                      <span>
                        #{i + 1} •{" "}
                        {start.toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        →{" "}
                        {end.toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <strong>
                        {h} {t("duration_hours")}
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              {!job.isCompleted && (
                <button
                  className="btn btn-save"
                  onClick={(e) => {
                    e.stopPropagation(); // ✅ ADD THIS
                    markJobComplete(job.id);
                  }}
                >
                  {t("complete_job_add_debt")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
