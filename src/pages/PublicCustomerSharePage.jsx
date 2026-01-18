import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// helpers (same ones you already use in App.jsx)
import {
  computeCustomerBalance,
  money,
  toNum,
  calcHours,
  partsTotalOf,
  jobTotalOf,
  partLineTotal,
  clockHoursOf,
} from "../utils/helpers";

export default function PublicCustomerSharePage() {
  const { id } = useParams();
  const [snap, setSnap] = useState(null);
  const [loading, setLoading] = useState(true);

  const printRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const ref = doc(db, "public_customers", id);
        const s = await getDoc(ref);

        if (!s.exists()) {
          setSnap(null);
          setLoading(false);
          return;
        }

        setSnap(s.data());
      } catch (e) {
        console.error(e);
        setSnap(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  if (!snap) return <div style={{ padding: 20 }}>Müşteri bulunamadı.</div>;

  const customer = snap.customer;
  const jobs = snap.jobs || [];
  const payments = (snap.payments || []).filter((p) => p.source !== "job");

  const currency = snap.currency || "TRY";
  const balance = computeCustomerBalance(customer.id, jobs, payments);

  const totalPayment = payments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + toNum(p.amount), 0);

  const totalDebt =
    payments
      .filter((p) => p.type === "debt")
      .reduce((sum, p) => sum + toNum(p.amount), 0) +
    jobs.reduce((sum, j) => sum + jobTotalOf(j), 0);

  // ✅ MIX jobs + payments into ONE historic timeline
  const unifiedHistory = [
    ...payments.map((p) => ({
      kind: "payment",
      id: `p_${p.id}`,
      sortKey: p.createdAt || new Date(p.date || 0).getTime() || 0,
      data: p,
    })),
    ...jobs.map((j) => ({
      kind: "job",
      id: `j_${j.id}`,
      sortKey: j.createdAt || new Date(j.date || 0).getTime() || 0,
      data: j,
    })),
  ].sort((a, b) => b.sortKey - a.sortKey);

  function printPage() {
    const html = printRef.current?.innerHTML;
    if (!html) return;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup engellendi");
      return;
    }

    w.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Müşteri İş Dökümü</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI; padding: 24px; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="
          margin-bottom:16px;
          padding:10px 14px;
          background:#2563eb;
          color:white;
          border:none;
          border-radius:8px;
          font-weight:600;
          cursor:pointer;">
          Yazdır / PDF Kaydet
        </button>
        ${html}
      </body>
      </html>
    `);

    w.document.close();
    w.focus();
  }

  function renderJobForPrint(job, currency) {
    const hours =
      job.timeMode === "clock"
        ? clockHoursOf(job)
        : job.timeMode === "manual"
          ? calcHours(job.start, job.end)
          : 0;

    const laborTotal =
      job.timeMode === "fixed"
        ? toNum(job.fixedPrice)
        : hours * toNum(job.rate);

    const partsTotal = partsTotalOf(job);
    const grandTotal = laborTotal + partsTotal;

    return `
      <div class="card">
        <strong>🛠 İş</strong>
        <div>${job.date || "-"}</div>
        <div><b>${money(grandTotal, currency)}</b></div>
      </div>
    `;
  }

  return (
    <>
      {/* HEADER */}
      <div
        className="header"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        <div>
          <h2>Müşteri İş Geçmişi</h2>
          <div>
            <strong>
              {customer.name} {customer.surname}
            </strong>{" "}
            — <strong>{money(balance, currency)}</strong>
          </div>
        </div>

        <button onClick={printPage}>
          <i className="fa-solid fa-print"></i> Yazdır
        </button>
      </div>

      {/* SUMMARY */}
      <div className="container">
        <div ref={printRef}>
          {unifiedHistory.length === 0 ? (
            <div className="card">Kayıt yok.</div>
          ) : (
            unifiedHistory.map((item) =>
              item.kind === "payment" ? (
                <div key={item.id} className="card">
                  {money(item.data.amount, currency)}
                </div>
              ) : (
                <div
                  key={item.id}
                  dangerouslySetInnerHTML={{
                    __html: renderJobForPrint(item.data, currency),
                  }}
                />
              ),
            )
          )}
        </div>
      </div>
    </>
  );
}
