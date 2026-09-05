import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  UserRound,
  ShieldAlert,
  Eye,
  X,
} from "lucide-react";

import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";
import { getCases } from "../services/api";

export default function Escalations() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");

      const cases = await getCases();

      setItems(
        cases.filter(
          x =>
            x.escalation_level === "MANUAL_REVIEW" &&
            x.status === "ATTENTION"
        )
      );
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "Could not load escalations."
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const amount = (x) =>
    Number(
      x.amount ??
        x.transaction_amount ??
        x.recovery_amount ??
        0
    ).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <SectionHeader
        eyebrow="HUMAN-IN-THE-LOOP"
        title="Escalations"
        action={
          <div className="summary-chip">
            <AlertTriangle size={15} />
            {items.length} need attention
          </div>
        }
      />

      <p className="page-intro">
        The agent stops when confidence, policy or risk
        boundaries are exceeded. A human reviewer must
        make the final decision.
      </p>

      {error && (
        <div className="audit-proof">
          ⚠ {error}
        </div>
      )}

      {/* ======================================================
          ESCALATION TABLE
      ====================================================== */}

      <section className="panel">

        <div className="table-scroll">

          <table>

            <thead>
              <tr>
                <th>Case</th>
                <th>Amount at risk</th>
                <th>Trigger</th>
                <th>Reason</th>
                <th>AI probability</th>
                <th>Updated</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Review</th>
              </tr>
            </thead>

            <tbody>

              {items.slice(0, 100).map((x) => {

                const probability =
                  Number(x.ml_probability ?? 0) * 100;

                return (
                  <tr key={x.id}>

                    {/* CASE */}

                    <td>
                      <strong>#{x.id}</strong>

                      <small>
                        Txn #{x.transaction_id}
                      </small>
                    </td>

                    {/* AMOUNT */}

                    <td>
                      <strong>
                        ₹{amount(x)}
                      </strong>
                    </td>

                    {/* TRIGGER */}

                    <td>
                      <StatusBadge type="warning">
                        <ShieldAlert size={11} />
                        {x.escalation_level}
                      </StatusBadge>
                    </td>

                    {/* REASON */}

                    <td>
                      <strong>
                        {x.diagnosis || "Policy boundary"}
                      </strong>

                      <small>
                        {x.stopping_rule ||
                          "Manual review required"}
                      </small>
                    </td>

                    {/* AI PROBABILITY */}

                    <td>
                      <strong>
                        {probability.toFixed(2)}%
                      </strong>
                    </td>

                    {/* UPDATED */}

                    <td>
                      {x.updated_at
                        ? new Date(
                            x.updated_at
                          ).toLocaleString("en-IN")
                        : "—"}
                    </td>

                    {/* STATUS */}

                    <td>
                      <StatusBadge
                        type={
                          x.status === "RECOVERED"
                            ? "success"
                            : "danger"
                        }
                      >
                        {x.status}
                      </StatusBadge>
                    </td>

                    {/* OWNER */}

                    <td>
                      <UserRound size={16} />
                    </td>

                    {/* REVIEW */}

                    <td>
                      <button
                        className="small-btn"
                        onClick={() => setSelected(x)}
                      >
                        <Eye size={13} />
                        Review
                      </button>
                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          HUMAN REVIEW MODAL
      ====================================================== */}

      {selected && (
        <div
          className="review-overlay"
          onClick={() => setSelected(null)}
        >

          <div
            className="review-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}

            <div className="review-header">

              <div>

                <div className="review-eyebrow">
                  HUMAN REVIEW
                </div>

                <h2>
                  Case #{selected.id}
                </h2>

                <p>
                  Automatic recovery has been stopped
                  for this transaction.
                </p>

              </div>

              <button
                className="review-close"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>

            </div>


            {/* ==================================================
                DETAILS

                IMPORTANT:
                review-item class is required here.
            ================================================== */}

            <div className="review-grid">

              {/* TRANSACTION */}

              <div className="review-item">

                <span>
                  Transaction ID
                </span>

                <strong>
                  #{selected.transaction_id}
                </strong>

              </div>


              {/* AMOUNT */}

              <div className="review-item">

                <span>
                  Amount at risk
                </span>

                <strong>
                  ₹{amount(selected)}
                </strong>

              </div>


              {/* RISK SCORE */}

              <div className="review-item">

                <span>
                  Risk score
                </span>

                <strong>
                  {Math.round(
                    Number(
                      selected.risk_score ?? 0
                    ) * 100
                  )}
                </strong>

              </div>


              {/* ML PROBABILITY */}

              <div className="review-item">

                <span>
                  ML probability
                </span>

                <strong>
                  {(
                    Number(
                      selected.ml_probability ?? 0
                    ) * 100
                  ).toFixed(2)}
                  %
                </strong>

              </div>


              {/* AI DECISION */}

              <div className="review-item">

                <span>
                  AI decision
                </span>

                <strong>
                  {selected.ml_decision ||
                    "MANUAL_REVIEW"}
                </strong>

              </div>


              {/* ESCALATION */}

              <div className="review-item">

                <span>
                  Escalation
                </span>

                <strong>
                  {selected.escalation_level ||
                    "MANUAL_REVIEW"}
                </strong>

              </div>

            </div>


            {/* ==================================================
                STOPPING RULE
            ================================================== */}

            <div className="review-section">

              <h3>
                <ShieldAlert size={15} />
                Automatic recovery stopped
              </h3>

              <div className="review-stop">
                {selected.stopping_rule ||
                  "Manual review required."}
              </div>

            </div>


            {/* ==================================================
                AI DIAGNOSIS
            ================================================== */}

            <div className="review-section">

              <h3>
                <AlertTriangle size={15} />
                AI diagnosis
              </h3>

              <div className="review-reason">
                {selected.diagnosis ||
                  "No diagnosis available."}
              </div>

            </div>


            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="review-footer">

              <button
                className="secondary-btn"
                onClick={() => setSelected(null)}
              >
                Close
              </button>

              <StatusBadge type="warning">
                <UserRound size={12} />
                Human approval required
              </StatusBadge>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}