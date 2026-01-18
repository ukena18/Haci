import React from "react";

export default function HomePage({
  // ===== values =====
  currency,
  financialSummary,
  paymentWatchList,
  customersById,
  activeJobs,
  activeJobsByCustomer,
  completedJobs,
  openCustomerFolders,

  // ===== UI state =====
  paymentOpen,
  activeOpen,
  completedOpen,

  // ===== setters / handlers =====
  setPaymentOpen,
  setActiveOpen,
  setCompletedOpen,
  setState,
  toggleCustomerFolder,
  toggleJobOpen,
  clockIn,
  clockOut,
  markJobComplete,
  setEditingJobId,
  setJobModalOpen,
  setConfirm,

  // ===== helpers =====
  money,
  calcHours,
  toNum,
  partsTotalOf,
  jobTotalOf,

  // ===== persistence/auth =====
  auth,
  saveUserData,

  // ===== components =====
  JobCard,
}) {
  return (
    <div id="page-home">
      {/* 📊 FINANSAL ÖZET */}
      <div className="card" style={{ marginBottom: 16 }}>
        {/* NUMBERS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 14,
            fontSize: 12,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#fef2f2",
              textAlign: "center",
            }}
          >
            {/* Total debt  */}
            <div
              style={{
                color: "#7f1d1d",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Toplam Borç
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#dc2626",
                fontSize: 16,
              }}
            >
              {money(financialSummary.totalDebt, currency)}
            </div>
          </div>

          {/* Total payment  */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#f0fdf4",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#166534",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Toplam Tahsilat
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#16a34a",
                fontSize: 16,
              }}
            >
              {money(financialSummary.totalPayment, currency)}
            </div>
          </div>
        </div>

        {/* NET */}
        <div
          style={{
            marginTop: 8,
            padding: 14,
            borderRadius: 12,
            background: financialSummary.net < 0 ? "#fef2f2" : "#f0fdf4",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              marginBottom: 4,
              color: financialSummary.net < 0 ? "#7f1d1d" : "#166534",
            }}
          >
            Net Durum
          </div>

          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: financialSummary.net < 0 ? "#dc2626" : "#16a34a",
            }}
          >
            {money(financialSummary.net, currency)}
          </div>
        </div>
      </div>

      <div id="job-list">
        {/* 🔔 30 GÜNLÜK ÖDEME TAKİBİ */}
        <div className="card">
          <div
            className="list-item section-header due-header"
            onClick={() => setPaymentOpen((o) => !o)}
          >
            <strong>
              <i className="fa-solid fa-bell"></i> 30 Günlük Ödeme Takibi (
              {paymentWatchList.length})
            </strong>
            <i
              className={`fa-solid fa-chevron-${
                paymentOpen ? "down" : "right"
              } due-arrow`}
            />
          </div>
        </div>

        {paymentOpen &&
          (paymentWatchList.length === 0 ? (
            <div className="card" style={{ fontSize: 12, color: "#666" }}>
              Takip edilecek aktif iş yok.
            </div>
          ) : (
            paymentWatchList.map(({ job, daysLeft, dueDate }) => {
              const c = customersById.get(job.customerId);

              return (
                <div
                  key={job.id}
                  className="card list-item"
                  style={{
                    background:
                      daysLeft <= 0
                        ? "#fee2e2"
                        : daysLeft <= 5
                          ? "#fef3c7"
                          : "white",
                    borderLeft:
                      daysLeft <= 0
                        ? "6px solid #dc2626"
                        : daysLeft <= 5
                          ? "6px solid #f59e0b"
                          : "6px solid #16a34a",
                  }}
                >
                  <div>
                    <strong>
                      {c ? `${c.name} ${c.surname}` : "Bilinmeyen"}
                    </strong>
                    <br />
                    <small>
                      {daysLeft <= 0
                        ? `⛔ ${Math.abs(daysLeft)} gün gecikmiş`
                        : `⏳ ${daysLeft} gün kaldı`}
                      <br />
                      Son Ödeme: <b>{dueDate.toLocaleDateString("tr-TR")}</b>
                    </small>
                  </div>

                  <div style={{ fontWeight: 700 }}>
                    <button
                      className="due-dismiss-btn"
                      onClick={(e) => {
                        e.stopPropagation();

                        setState((s) => {
                          const nextJobs = s.jobs.map((j) =>
                            j.id === job.id
                              ? { ...j, dueDismissed: true } // ✅ SAVE FLAG
                              : j,
                          );

                          const nextState = {
                            ...s,
                            jobs: nextJobs,
                          };

                          // 🔒 persist immediately
                          saveUserData(auth.currentUser.uid, nextState);

                          return nextState;
                        });
                      }}
                    >
                      ✓ Takipten Kaldır
                    </button>

                    {(() => {
                      const totalMs = job.workedMs || 0;
                      const hours =
                        job.timeMode === "clock"
                          ? totalMs / 36e5
                          : calcHours(job.start, job.end);

                      return money(
                        hours * toNum(job.rate) + partsTotalOf(job),
                        currency,
                      );
                    })()}
                  </div>
                </div>
              );
            })
          ))}

        {/* ACTIVE JOBS FOLDER */}
        <div className="card">
          <div
            className="list-item"
            style={{ cursor: "pointer" }}
            onClick={() => {
              const next = !activeOpen;
              setActiveOpen(next);

              // collapse active jobs ONLY when opening
              if (next) {
                setState((s) => ({
                  ...s,
                  jobs: s.jobs.map((j) =>
                    !j.isCompleted ? { ...j, isOpen: false } : j,
                  ),
                }));
              }
            }}
          >
            <strong>🟢 Aktif İşler ({activeJobs.length})</strong>
            <span>{activeOpen ? "▾" : "▸"}</span>
          </div>
        </div>

        {activeOpen &&
          (activeJobsByCustomer.size === 0 ? (
            <div className="card">Aktif iş yok.</div>
          ) : (
            Array.from(activeJobsByCustomer.entries()).map(
              ([customerId, jobs]) => {
                const customer = customersById.get(customerId);

                const isOpen = openCustomerFolders[customerId] ?? false;

                const totalAmount = jobs.reduce(
                  (sum, j) => sum + jobTotalOf(j),
                  0,
                );

                return (
                  <div key={customerId}>
                    {/* CUSTOMER FOLDER HEADER */}
                    <div
                      className="card list-item"
                      style={{
                        cursor: "pointer",
                        background: "#f8fafc",
                      }}
                      onClick={() => toggleCustomerFolder(customerId)}
                    >
                      <div>
                        <strong>
                          {customer
                            ? `${customer.name} ${customer.surname}`
                            : "Bilinmeyen"}
                        </strong>

                        <div style={{ fontSize: 12, color: "#666" }}>
                          {jobs.length} aktif iş
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <strong style={{ color: "var(--primary)" }}>
                          {money(totalAmount, currency)}
                        </strong>

                        <span
                          className={`folder-arrow ${isOpen ? "open" : ""}`}
                        >
                          ▸
                        </span>
                      </div>
                    </div>

                    {/* JOBS */}
                    <div className={`job-folder ${isOpen ? "open" : ""}`}>
                      {jobs.map((job) => (
                        <div key={job.id} className="job-folder-item">
                          <JobCard
                            job={job}
                            customersById={customersById}
                            toggleJobOpen={toggleJobOpen}
                            clockIn={clockIn}
                            clockOut={clockOut}
                            currency={currency}
                            markJobComplete={markJobComplete}
                            onOpenActions={(jobId) => {
                              setEditingJobId(jobId);
                              setJobModalOpen(true);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              },
            )
          ))}

        {/* COMPLETED JOBS FOLDER */}
        <div className="card" style={{ marginTop: 10 }}>
          <div
            className="list-item"
            style={{ cursor: "pointer" }}
            onClick={() => {
              const next = !completedOpen;
              setCompletedOpen(next);

              // collapse completed jobs ONLY when opening
              if (next) {
                setState((s) => ({
                  ...s,
                  jobs: s.jobs.map((j) =>
                    j.isCompleted ? { ...j, isOpen: false } : j,
                  ),
                }));
              }
            }}
          >
            <strong>✅ Tamamlanan İşler ({completedJobs.length})</strong>
            <span>{completedOpen ? "▾" : "▸"}</span>
          </div>
        </div>

        {completedOpen &&
          (completedJobs.length === 0 ? (
            <div className="card">Tamamlanan iş yok.</div>
          ) : (
            completedJobs
              .slice()
              .sort((a, b) => {
                const at = a.createdAt || new Date(a.date || 0).getTime() || 0;
                const bt = b.createdAt || new Date(b.date || 0).getTime() || 0;
                return bt - at; // newest first
              })
              .slice(0, 10)
              .map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  customersById={customersById}
                  toggleJobOpen={toggleJobOpen}
                  clockIn={clockIn}
                  clockOut={clockOut}
                  setEditingJobId={setEditingJobId}
                  setJobModalOpen={setJobModalOpen}
                  setConfirm={setConfirm}
                  markJobComplete={markJobComplete}
                  currency={currency}
                  onOpenActions={(jobId) => {
                    setEditingJobId(jobId);
                    setJobModalOpen(true);
                  }}
                />
              ))
          ))}
      </div>
    </div>
  );
}
