import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";

import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";

import {
  getCases,
  getDashboard,
  recoverCase,
  runRecoveryScan,
  approveAndRecover as approveAndRecoverCase,
} from "../services/api";


export default function Recovery() {

  // ==========================================================
  // STATE
  // ==========================================================

  const [cases, setCases] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [busy, setBusy] = useState({});
  const [scanBusy, setScanBusy] = useState(false);

  const [error, setError] = useState("");

  // Selected case for manual review
  const [selectedCase, setSelectedCase] = useState(null);

  // Which table should be displayed
  const [viewMode, setViewMode] = useState("NOT_RECOVERED");


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const load = async () => {

    try {

      setError("");

      const [c, d] = await Promise.all([
        getCases(),
        getDashboard(),
      ]);

      setCases(Array.isArray(c) ? c : []);
      setDashboard(d);

    } catch (e) {

      console.error("Recovery load failed:", e);

      setError(
        e?.response?.data?.detail ||
        "Could not load recovery queue."
      );
    }
  };


  useEffect(() => {
    load();
  }, []);


  // ==========================================================
  // AUTOMATED RECOVERY
  // ==========================================================

  const execute = async (id) => {

    try {

      setError("");

      setBusy((x) => ({
        ...x,
        [id]: true,
      }));

      await recoverCase(id);

      await load();

    } catch (e) {

      console.error("Recovery action failed:", e);

      setError(
        e?.response?.data?.detail ||
        "Recovery action failed."
      );

    } finally {

      setBusy((x) => ({
        ...x,
        [id]: false,
      }));
    }
  };


  // ==========================================================
  // HUMAN APPROVED RECOVERY
  // ==========================================================

  const approveAndRecover = async (id) => {

    try {

      setError("");

      setBusy((x) => ({
        ...x,
        [id]: true,
      }));

      await approveAndRecoverCase(id);

      // Close review modal
      setSelectedCase(null);

      // Reload all data
      await load();

    } catch (e) {

      console.error(
        "Human-approved recovery failed:",
        e
      );

      setError(
        e?.response?.data?.detail ||
        "Human-approved recovery failed."
      );

    } finally {

      setBusy((x) => ({
        ...x,
        [id]: false,
      }));
    }
  };


  // ==========================================================
  // RUN RECOVERY SCAN
  // ==========================================================

  const scan = async () => {

    try {

      setScanBusy(true);

      await runRecoveryScan();

      await load();

    } catch (e) {

      // No user-facing error message for scan.
      console.error(
        "Recovery scan failed:",
        e
      );

    } finally {

      setScanBusy(false);

    }
  };


  // ==========================================================
  // MANUAL REVIEW
  // ==========================================================

  const openReview = (item) => {
    setSelectedCase(item);
  };


  const closeReview = () => {
    setSelectedCase(null);
  };


  // ==========================================================
  // RECOVERY STATUS BREAKDOWN
  // ==========================================================

  const recoveredNoAttention = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.status === "RECOVERED" &&
          c.escalation_level !== "MANUAL_REVIEW" &&
          c.recommended_action !== "MANUAL_REVIEW"
      ),
    [cases]
  );


  const notRecoveredOpen = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.status !== "RECOVERED" &&
          c.escalation_level !== "MANUAL_REVIEW" &&
          c.recommended_action !== "MANUAL_REVIEW"
      ),
    [cases]
  );


  const recoveredAttention = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.status === "RECOVERED" &&
          (
            c.escalation_level === "MANUAL_REVIEW" ||
            c.recommended_action === "MANUAL_REVIEW"
          )
      ),
    [cases]
  );


  const notRecoveredAttention = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.status !== "RECOVERED" &&
          (
            c.escalation_level === "MANUAL_REVIEW" ||
            c.recommended_action === "MANUAL_REVIEW"
          )
      ),
    [cases]
  );


  // ==========================================================
  // FINANCIAL TOTALS
  // ==========================================================

  const totalRecoveredAmount = useMemo(
    () =>
      cases
        .filter(
          (c) => c.status === "RECOVERED"
        )
        .reduce(
          (sum, c) =>
            sum + Number(
              c.recovery_amount || 0
            ),
          0
        ),
    [cases]
  );


  const totalAmountAtRisk = useMemo(
    () =>
      cases
        .filter(
          (c) => c.status !== "RECOVERED"
        )
        .reduce(
          (sum, c) =>
            sum + Number(
              c.amount || 0
            ),
          0
        ),
    [cases]
  );


  // ==========================================================
  // TABLE DATA
  // ==========================================================

  /*
   * The backend now returns ALL recovery cases.
   *
   * The UI only displays the latest 100 cases
   * for the selected category.
   *
   * This means:
   *
   * NOT RECOVERED
   *     → latest 100 non-recovered cases
   *
   * RECOVERED
   *     → latest 100 recovered cases
   *
   * When a case is recovered:
   *
   *     NOT RECOVERED
   *          ↓
   *     RECOVERED
   *
   * The next non-recovered case automatically
   * fills the available position.
   */

  const displayedCases = useMemo(() => {

    const source =
      viewMode === "RECOVERED"
        ? cases.filter(
            (c) =>
              c.status === "RECOVERED"
          )
        : cases.filter(
            (c) =>
              c.status !== "RECOVERED"
          );

    // Maximum 100 rows displayed
    return source.slice(0, 100);

  }, [cases, viewMode]);


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <SectionHeader
        eyebrow="ACTION LAYER"
        title="Recovery queue"
        action={

          <button
            className="primary-btn"
            onClick={scan}
            disabled={scanBusy}
          >

            <Play
              size={15}
              fill="currentColor"
            />

            {scanBusy
              ? "Scanning..."
              : "Run recovery scan"}

          </button>

        }
      />


      <p className="page-intro">

        Actions are gated by policy. The agent can only execute
        interventions that pass the merchant's stopping rules.

      </p>


      {/* ======================================================
          FOUR-WAY RECOVERY STATUS
      ====================================================== */}

      <div
        className="queue-summary"
        style={{
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
        }}
      >

        {/* ====================================================
            RECOVERED — NO ATTENTION
        ==================================================== */}

        <div>

          <strong>
            {recoveredNoAttention.length}
          </strong>

          <span>
            Recovered
          </span>

          <small
            style={{
              display: "block",
              marginTop: "5px",
              opacity: 0.65,
            }}
          >
            No attention
          </small>

        </div>


        {/* ====================================================
            RECOVERED — ATTENTION
        ==================================================== */}

        <div>

          <strong>
            {recoveredAttention.length}
          </strong>

          <span>
            Recovered
          </span>

          <small
            style={{
              display: "block",
              marginTop: "5px",
              opacity: 0.85,
            }}
          >
            Attention
          </small>

        </div>


        {/* ====================================================
            NOT RECOVERED — OPEN
        ==================================================== */}

        <div>

          <strong>
            {notRecoveredOpen.length}
          </strong>

          <span>
            Not recovered
          </span>

          <small
            style={{
              display: "block",
              marginTop: "5px",
              opacity: 0.65,
            }}
          >
            Open
          </small>

        </div>


        {/* ====================================================
            NOT RECOVERED — ATTENTION
        ==================================================== */}

        <div>

          <strong>
            {notRecoveredAttention.length}
          </strong>

          <span>
            Not recovered
          </span>

          <small
            style={{
              display: "block",
              marginTop: "5px",
              opacity: 0.85,
            }}
          >
            Attention
          </small>

        </div>

      </div>


      {/* ======================================================
          FINANCIAL SUMMARY
      ====================================================== */}

      <div className="financial-summary">

        {/* TOTAL RECOVERED */}

        <div className="financial-card">

          <div className="financial-label">
            Total Recovered
          </div>

          <div className="financial-value">

            ₹
            {totalRecoveredAmount.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}

          </div>

          <div className="financial-description">
            Successfully recovered amount
          </div>

        </div>


        {/* AMOUNT AT RISK */}

        <div className="financial-card">

          <div className="financial-label">
            Amount at Risk
          </div>

          <div className="financial-value">

            ₹
            {totalAmountAtRisk.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}

          </div>

          <div className="financial-description">
            Amount still requiring recovery
          </div>

        </div>

      </div>


      {/* ======================================================
          CASE VIEW SWITCHER
      ====================================================== */}

      <div className="recovery-view-switcher">

        <button
          className={
            viewMode === "NOT_RECOVERED"
              ? "recovery-view-btn active"
              : "recovery-view-btn"
          }
          onClick={() =>
            setViewMode("NOT_RECOVERED")
          }
        >

          <AlertTriangle size={14} />

          Not Recovered

          <span>
            {cases.filter(
              (c) =>
                c.status !== "RECOVERED"
            ).length}
          </span>

        </button>


        <button
          className={
            viewMode === "RECOVERED"
              ? "recovery-view-btn active"
              : "recovery-view-btn"
          }
          onClick={() =>
            setViewMode("RECOVERED")
          }
        >

          <Check size={14} />

          Recovered

          <span>
            {cases.filter(
              (c) =>
                c.status === "RECOVERED"
            ).length}
          </span>

        </button>

      </div>


      {/* ======================================================
          CURRENT VIEW INFORMATION
      ====================================================== */}

      <div className="recovery-view-info">

        <strong>

          {viewMode === "RECOVERED"
            ? "Recovered cases"
            : "Not recovered cases"}

        </strong>

        <span>

          Showing latest{" "}
          {Math.min(
            displayedCases.length,
            100
          )}{" "}
          of{" "}
          {viewMode === "RECOVERED"
            ? cases.filter(
                (c) =>
                  c.status === "RECOVERED"
              ).length
            : cases.filter(
                (c) =>
                  c.status !== "RECOVERED"
              ).length}{" "}
          cases

        </span>

      </div>


      {/* ======================================================
          RECOVERY TABLE
      ====================================================== */}

      <section className="panel">

        <div className="table-scroll">

          <table>

            <thead>

              <tr>

                <th>Case</th>

                <th>Risk</th>

                <th>Amount at risk</th>

                <th>Recovered</th>

                <th>AI reasoning</th>

                <th>Policy gate</th>

                <th>Action</th>

              </tr>

            </thead>


            <tbody>

              {displayedCases.length === 0 ? (

                <tr>

                  <td
                    colSpan="7"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      opacity: 0.65,
                    }}
                  >

                    {viewMode === "RECOVERED"
                      ? "No recovered cases yet."
                      : "No open recovery cases."}

                  </td>

                </tr>

              ) : (

                displayedCases.map((r) => {

                  const score =
                    Math.round(
                      Number(
                        r.risk_score ?? 0
                      ) * 100
                    );


                  const recovered =
                    r.status === "RECOVERED";


                  const needsReview =
                    r.escalation_level ===
                      "MANUAL_REVIEW" ||
                    r.recommended_action ===
                      "MANUAL_REVIEW";


                  return (

                    <tr key={r.id}>

                      {/* CASE */}

                      <td>

                        <strong>
                          #{r.id}
                        </strong>

                        <small>
                          Txn #{r.transaction_id}
                        </small>

                      </td>


                      {/* RISK */}

                      <td>

                        <span
                          className={`score-ring ${
                            score >= 75
                              ? "high"
                              : ""
                          }`}
                        >

                          {score}

                        </span>

                      </td>


                      {/* AMOUNT AT RISK */}

                      <td>

                        <strong>

                          ₹
                          {Number(
                            r.amount ?? 0
                          ).toLocaleString(
                            "en-IN"
                          )}

                        </strong>

                      </td>


                      {/* RECOVERED */}

                      <td>

                        <strong>

                          ₹
                          {Number(
                            r.recovery_amount ?? 0
                          ).toLocaleString(
                            "en-IN"
                          )}

                        </strong>

                      </td>


                      {/* AI REASONING */}

                      <td>

                        <div className="reasoning">

                          <Sparkles
                            size={14}
                          />

                          <span>

                            {r.diagnosis ||
                              "Payment issue"}

                            {" · "}

                            {r.recommended_action ||
                              "Review"}

                          </span>

                        </div>

                      </td>


                      {/* POLICY GATE */}

                      <td>

                        {needsReview ? (

                          <StatusBadge
                            type="warning"
                          >

                            <ShieldCheck
                              size={11}
                            />

                            {r.stopping_rule ||
                              "Manual review required"}

                          </StatusBadge>

                        ) : (

                          <StatusBadge
                            type="success"
                          >

                            <ShieldCheck
                              size={11}
                            />

                            Passed

                          </StatusBadge>

                        )}

                      </td>


                      {/* ACTION */}

                      <td>

                        {recovered ? (

                          <StatusBadge
                            type="success"
                          >

                            <Check
                              size={11}
                            />

                            Recovered

                          </StatusBadge>

                        ) : needsReview ? (

                          <button
                            className="small-btn review-btn"
                            onClick={() =>
                              openReview(r)
                            }
                          >

                            <AlertTriangle
                              size={13}
                            />

                            Review

                          </button>

                        ) : (

                          <button
                            className="small-btn"
                            disabled={
                              busy[r.id]
                            }
                            onClick={() =>
                              execute(r.id)
                            }
                          >

                            <RotateCcw
                              size={13}
                            />

                            {busy[r.id]
                              ? "Executing..."
                              : "Execute"}

                          </button>

                        )}

                      </td>

                    </tr>

                  );

                })

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          MANUAL REVIEW MODAL
      ====================================================== */}

      {selectedCase && (

        <div
          className="review-overlay"
          onClick={closeReview}
        >

          <div
            className="review-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="review-header">

              <div>

                <div className="review-eyebrow">
                  HUMAN REVIEW REQUIRED
                </div>

                <h2>
                  Case #{selectedCase.id}
                </h2>

                <p>
                  Automatic recovery has been
                  stopped for this transaction.
                </p>

              </div>


              <button
                className="review-close"
                onClick={closeReview}
              >

                <X size={20} />

              </button>

            </div>


            {/* WARNING */}

            <div className="review-warning">

              <AlertTriangle
                size={19}
              />

              <div>

                <strong>
                  Automatic recovery stopped
                </strong>

                <span>
                  This transaction exceeded an
                  automated recovery boundary.
                  Human approval is required
                  before recovery can proceed.
                </span>

              </div>

            </div>


            {/* DETAILS */}

            <div className="review-grid">

              <div className="review-item">

                <span>
                  Case ID
                </span>

                <strong>
                  #{selectedCase.id}
                </strong>

              </div>


              <div className="review-item">

                <span>
                  Transaction ID
                </span>

                <strong>
                  #{selectedCase.transaction_id}
                </strong>

              </div>


              <div className="review-item">

                <span>
                  Amount at risk
                </span>

                <strong>

                  ₹
                  {Number(
                    selectedCase.amount ?? 0
                  ).toLocaleString(
                    "en-IN"
                  )}

                </strong>

              </div>


              <div className="review-item">

                <span>
                  Recovered amount
                </span>

                <strong>

                  ₹
                  {Number(
                    selectedCase.recovery_amount ?? 0
                  ).toLocaleString(
                    "en-IN"
                  )}

                </strong>

              </div>


              <div className="review-item">

                <span>
                  Risk score
                </span>

                <strong>

                  {Math.round(
                    Number(
                      selectedCase.risk_score ?? 0
                    ) * 100
                  )}

                </strong>

              </div>


              <div className="review-item">

                <span>
                  ML decision
                </span>

                <strong>

                  {selectedCase.ml_decision ||
                    "MANUAL_REVIEW"}

                </strong>

              </div>


              <div className="review-item">

                <span>
                  ML probability
                </span>

                <strong>

                  {selectedCase.ml_probability != null
                    ? `${(
                        Number(
                          selectedCase.ml_probability
                        ) * 100
                      ).toFixed(2)}%`
                    : "—"}

                </strong>

              </div>


              <div className="review-item">

                <span>
                  Status
                </span>

                <StatusBadge
                  type="warning"
                >

                  {selectedCase.status}

                </StatusBadge>

              </div>


              <div className="review-item">

                <span>
                  Escalation
                </span>

                <StatusBadge
                  type="warning"
                >

                  {selectedCase.escalation_level ||
                    "MANUAL_REVIEW"}

                </StatusBadge>

              </div>

            </div>


            {/* AI REASONING */}

            <div className="review-section">

              <h3>

                <Sparkles
                  size={15}
                />

                AI reasoning

              </h3>

              <div className="review-reason">

                {selectedCase.diagnosis ||
                  "Manual review required."}

              </div>

            </div>


            {/* RECOMMENDED ACTION */}

            <div className="review-section">

              <h3>
                Recommended action
              </h3>

              <div className="review-action">

                {selectedCase.recommended_action ||
                  "MANUAL_REVIEW"}

              </div>

            </div>


            {/* STOPPING RULE */}

            <div className="review-section">

              <h3>

                <ShieldCheck
                  size={15}
                />

                Stopping rule

              </h3>

              <div className="review-stop">

                {selectedCase.stopping_rule ||
                  "Manual review required"}

              </div>

            </div>


            {/* FOOTER */}

            <div className="review-footer">

              <button
                className="secondary-btn"
                onClick={closeReview}
              >

                Close

              </button>


              <button
                className="primary-btn approve-recover-btn"
                disabled={
                  busy[selectedCase.id]
                }
                onClick={() =>
                  approveAndRecover(
                    selectedCase.id
                  )
                }
              >

                <Check
                  size={15}
                />

                {busy[selectedCase.id]
                  ? "Recovering..."
                  : `Approve & Recover ₹${Number(
                      selectedCase.amount ?? 0
                    ).toLocaleString(
                      "en-IN"
                    )}`}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}