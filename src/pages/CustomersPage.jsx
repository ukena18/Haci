import React from "react";

export default function CustomersPage({
  // data
  state,
  currency,
  filteredCustomers,
  visibleCustomerList,

  // pagination / search
  search,
  visibleCustomers,
  setVisibleCustomers,

  // ui
  setSelectedCustomerId,
  setCustDetailOpen,

  // helpers
  computeCustomerBalance,
}) {
  return (
    <div id="page-customers">
      <div id="customer-list">
        {filteredCustomers.length === 0 ? (
          <div className="card">Henüz müşteri yok.</div>
        ) : (
          visibleCustomerList.map((c) => {
            const balance = computeCustomerBalance(
              c.id,
              state.jobs,
              state.payments,
            );

            return (
              <div
                key={c.id}
                className="card list-item"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setCustDetailOpen(true);
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  {/* LEFT */}
                  <div>
                    <strong>
                      {c.name} {c.surname}
                    </strong>
                    <br />
                    <small>{c.phone || "Telefon yok"}</small>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#666",
                      }}
                    >
                      ID:{" "}
                      <span style={{ fontFamily: "monospace" }}>{c.id}</span>
                    </div>
                  </div>

                  {/* RIGHT — BAKİYE */}
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: balance >= 0 ? "#16a34a" : "#dc2626",
                      minWidth: 90,
                      textAlign: "right",
                    }}
                  >
                    {balance >= 0 ? "+" : "-"}
                    {Math.abs(balance).toFixed(2)} {currency}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* LOAD MORE */}
      {!search && visibleCustomers < filteredCustomers.length && (
        <button
          className="load-more-btn"
          onClick={() => setVisibleCustomers((n) => n + 10)}
        >
          Daha fazla yükle
        </button>
      )}
    </div>
  );
}
