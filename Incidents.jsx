import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  ArrowUpRight,
  X,
} from "lucide-react";

import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";
import { getCases } from "../services/api";

export default function Incidents() {
  const [cases, setCases] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // FILTER STATE
  // ============================================================

  const [showFilters, setShowFilters] = useState(false);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  // ============================================================
  // CASE DETAILS
  // ============================================================

  const [selectedCase, setSelectedCase] = useState(null);

  // ============================================================
  // LOAD CASES
  // ============================================================

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    try {
      setError("");

      const data = await getCases();

      setCases(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load incidents:", e);

      setError(
        e?.response?.data?.detail ||
        "Could not load cases."
      );
    }
  }

  // ============================================================
  // FILTER OPTIONS
  // ============================================================

  const statuses = useMemo(() => {
    return [
      ...new Set(
        cases
          .map((c) => c.status)
          .filter(Boolean)
      ),
    ];
  }, [cases]);

  const actions = useMemo(() => {
    return [
      ...new Set(
        cases
          .map((c) => c.recommended_action)
          .filter(Boolean)
      ),
    ];
  }, [cases]);

  // ============================================================
  // FILTER CASES
  // ============================================================

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cases.filter((c) => {
      // ----------------------------
      // SEARCH
      // ----------------------------

      const matchesSearch =
        !q ||
        JSON.stringify(c)
          .toLowerCase()
          .includes(q);

      if (!matchesSearch) {
        return false;
      }

      // ----------------------------
      // STATUS
      // ----------------------------

      if (
        statusFilter !== "ALL" &&
        c.status !== statusFilter
      ) {
        return false;
      }

      // ----------------------------
      // RISK
      // ----------------------------

      const riskScore =
        Number(c.risk_score ?? 0);

      if (
        riskFilter === "HIGH" &&
        riskScore < 0.75
      ) {
        return false;
      }

      if (
        riskFilter === "MEDIUM" &&
        (
          riskScore < 0.40 ||
          riskScore >= 0.75
        )
      ) {
        return false;
      }

      if (
        riskFilter === "LOW" &&
        riskScore >= 0.40
      ) {
        return false;
      }

      // ----------------------------
      // ACTION
      // ----------------------------

      if (
        actionFilter !== "ALL" &&
        c.recommended_action !== actionFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    cases,
    query,
    statusFilter,
    riskFilter,
    actionFilter,
  ]);

  // ============================================================
  // HIGH RISK COUNT
  // ============================================================

  const highRisk = cases.filter(
    (c) =>
      Number(c.risk_score ?? 0) >= 0.75
  ).length;

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  function clearFilters() {
    setStatusFilter("ALL");
    setRiskFilter("ALL");
    setActionFilter("ALL");
  }

  const filtersActive =
    statusFilter !== "ALL" ||
    riskFilter !== "ALL" ||
    actionFilter !== "ALL";

  // ============================================================
  // FORMAT AMOUNT
  // ============================================================

  function formatAmount(value) {
    return Number(value ?? 0).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="page">

      <SectionHeader
        eyebrow="DETECTION LAYER"
        title="Revenue incidents"
        action={
          <button
            className={`secondary-btn ${
              filtersActive
                ? "filter-active"
                : ""
            }`}
            onClick={() =>
              setShowFilters((prev) => !prev)
            }
          >
            <Filter size={15} />
            Filters

            {filtersActive && (
              <span className="filter-count">
                !
              </span>
            )}
          </button>
        }
      />

      <p className="page-intro">
        Every revenue-loss signal is scored before the recovery agent can act.
      </p>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="audit-proof">
          {error}
        </div>
      )}

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <div className="toolbar">

        <div className="search">
          <Search size={16} />

          <input
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            placeholder="Search transaction ID or reason..."
          />
        </div>

        <div className="filter-pill">
          All incidents{" "}
          <span>{cases.length}</span>
        </div>

        <div className="filter-pill">
          High risk{" "}
          <span>{highRisk}</span>
        </div>

      </div>

      {/* ======================================================
          FILTER PANEL
      ====================================================== */}

      {showFilters && (
        <div className="incident-filter-panel">

          <div className="incident-filter-header">

            <div>
              <strong>
                Filter incidents
              </strong>

              <small>
                Narrow the recovery incident queue
              </small>
            </div>

            <button
              className="icon-btn"
              onClick={() =>
                setShowFilters(false)
              }
              title="Close filters"
            >
              <X size={17} />
            </button>

          </div>

          <div className="incident-filter-grid">

            {/* STATUS */}

            <label>
              <span>Status</span>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="ALL">
                  All statuses
                </option>

                {statuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </label>

            {/* RISK */}

            <label>
              <span>Risk level</span>

              <select
                value={riskFilter}
                onChange={(e) =>
                  setRiskFilter(e.target.value)
                }
              >
                <option value="ALL">
                  All risk levels
                </option>

                <option value="HIGH">
                  High risk
                </option>

                <option value="MEDIUM">
                  Medium risk
                </option>

                <option value="LOW">
                  Low risk
                </option>
              </select>
            </label>

            {/* ACTION */}

            <label>
              <span>Recovery action</span>

              <select
                value={actionFilter}
                onChange={(e) =>
                  setActionFilter(e.target.value)
                }
              >
                <option value="ALL">
                  All actions
                </option>

                {actions.map((action) => (
                  <option
                    key={action}
                    value={action}
                  >
                    {action}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <div className="incident-filter-footer">

            <span>
              Showing{" "}
              <strong>
                {filtered.length}
              </strong>{" "}
              of{" "}
              <strong>
                {cases.length}
              </strong>{" "}
              incidents
            </span>

            <button
              className="secondary-btn"
              onClick={clearFilters}
            >
              Clear filters
            </button>

          </div>

        </div>
      )}

      {/* ======================================================
          TABLE
      ====================================================== */}

      <section className="panel">

        <div className="table-scroll">

          <table>

            <thead>
              <tr>
                <th>Case</th>
                <th>Detected issue</th>
                <th>Amount at risk</th>
                <th>Risk score</th>
                <th>ML confidence</th>
                <th>Detected</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {filtered
                .slice(0, 100)
                .map((c) => {

                  const amount =
                    Number(c.amount ?? 0);

                  const riskScore =
                    Math.round(
                      Number(
                        c.risk_score ?? 0
                      ) * 100
                    );

                  const mlConfidence =
                    Math.round(
                      Number(
                        c.ml_probability ?? 0
                      ) * 100
                    );

                  return (
                    <tr key={c.id}>

                      {/* CASE */}

                      <td>
                        <strong>
                          Case #{c.id}
                        </strong>

                        <small>
                          Txn #{c.transaction_id}
                        </small>
                      </td>

                      {/* DETECTED ISSUE */}

                      <td>
                        <strong>
                          {c.diagnosis ||
                            "Payment issue"}
                        </strong>

                        <small>
                          {c.recommended_action ||
                            "—"}
                        </small>
                      </td>

                      {/* AMOUNT */}

                      <td>
                        <strong>
                          ₹{formatAmount(amount)}
                        </strong>
                      </td>

                      {/* RISK */}

                      <td>
                        <span
                          className={`risk-number ${
                            riskScore >= 75
                              ? "high"
                              : ""
                          }`}
                        >
                          {riskScore}
                        </span>
                      </td>

                      {/* ML */}

                      <td>
                        <span
                          className={`risk-number ${
                            mlConfidence >= 90
                              ? "high"
                              : ""
                          }`}
                        >
                          {mlConfidence}%
                        </span>
                      </td>

                      {/* DETECTED */}

                      <td>
                        {c.created_at
                          ? new Date(
                              c.created_at
                            ).toLocaleString(
                              "en-IN"
                            )
                          : "—"}
                      </td>

                      {/* STATUS */}

                      <td>
                        <StatusBadge
                          type={
                            c.status ===
                            "RECOVERED"
                              ? "success"
                              : c.escalation_level !==
                                "NONE"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {c.status}
                        </StatusBadge>
                      </td>

                      {/* DETAILS ARROW */}

                      <td>

                        <button
                          className="incident-open-btn"
                          onClick={() =>
                            setSelectedCase(c)
                          }
                          title="View case details"
                        >
                          <ArrowUpRight
                            size={16}
                          />
                        </button>

                      </td>

                    </tr>
                  );
                })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                    }}
                  >
                    No incidents match the
                    selected filters.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* ======================================================
          CASE DETAILS MODAL
      ====================================================== */}

      {selectedCase && (
        <div
          className="incident-modal-overlay"
          onClick={() =>
            setSelectedCase(null)
          }
        >

          <div
            className="incident-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="incident-modal-header">

              <div>
                <span className="eyebrow">
                  RECOVERY INCIDENT
                </span>

                <h2>
                  Case #{selectedCase.id}
                </h2>

                <small>
                  Transaction #
                  {selectedCase.transaction_id}
                </small>
              </div>

              <button
                className="icon-btn"
                onClick={() =>
                  setSelectedCase(null)
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="incident-detail-grid">

              <div>
                <span>
                  Amount at risk
                </span>

                <strong>
                  ₹
                  {formatAmount(
                    selectedCase.amount
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Risk score
                </span>

                <strong>
                  {Math.round(
                    Number(
                      selectedCase.risk_score ??
                        0
                    ) * 100
                  )}
                </strong>
              </div>

              <div>
                <span>
                  ML confidence
                </span>

                <strong>
                  {Math.round(
                    Number(
                      selectedCase.ml_probability ??
                        0
                    ) * 100
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {selectedCase.status}
                </strong>
              </div>

            </div>

            <div className="incident-detail-section">

              <span>
                Detected issue
              </span>

              <strong>
                {selectedCase.diagnosis ||
                  "Payment issue"}
              </strong>

            </div>

            <div className="incident-detail-section">

              <span>
                Recommended action
              </span>

              <strong>
                {selectedCase.recommended_action ||
                  "—"}
              </strong>

            </div>

            <div className="incident-detail-section">

              <span>
                Escalation level
              </span>

              <strong>
                {selectedCase.escalation_level ||
                  "NONE"}
              </strong>

            </div>

            <div className="incident-detail-section">

              <span>
                Stopping rule
              </span>

              <strong>
                {selectedCase.stopping_rule ||
                  "None"}
              </strong>

            </div>

            <div className="incident-detail-section">

              <span>
                ML decision
              </span>

              <strong>
                {selectedCase.ml_decision ||
                  "—"}
              </strong>

            </div>

            <div className="incident-modal-footer">

              <button
                className="secondary-btn"
                onClick={() =>
                  setSelectedCase(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}