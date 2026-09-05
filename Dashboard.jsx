import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";

import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";

import {
  getCases,
  getDashboard,
  runRecoveryScan
} from "../services/api";


const money = (n = 0) =>
  "₹" +
  Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  });


const compactMoney = (n = 0) => {
  const v = Number(n || 0);

  if (v >= 10000000)
    return `₹${(v / 10000000).toFixed(2)}Cr`;

  if (v >= 100000)
    return `₹${(v / 100000).toFixed(2)}L`;

  if (v >= 1000)
    return `₹${(v / 1000).toFixed(1)}k`;

  return money(v);
};


/* =========================================================
   NORMALIZE BACKEND CASE DATA
   ========================================================= */

const normalizeCase = (c) => ({
  id: c.id ?? c.case_id ?? "-",

  transactionId:
    c.transaction_id ??
    c.payment_id ??
    "-",

  /*
   * IMPORTANT:
   * Use the ORIGINAL TRANSACTION AMOUNT.
   *
   * c.amount = failed transaction amount
   * c.recovery_amount = amount already recovered
   *
   * Previously recovery_amount was being preferred,
   * which caused the dashboard to display ₹0.
   */

  amount: Number(c.amount ?? c.recovery_amount ?? 0),

  score: Math.round(
    Number(c.risk_score ?? 0) * 100
  ),

  diagnosis:
    c.diagnosis ??
    c.failure_reason ??
    "Payment issue",

  action:
    c.recommended_action ??
    "REVIEW",

  status:
    c.status ??
    "OPEN",

  escalation:
    c.escalation_level ??
    "NONE",

  time:
    c.updated_at ??
    c.created_at ??
    ""
});


export default function Dashboard() {

  const [dashboard, setDashboard] = useState(null);

  const [cases, setCases] = useState([]);

  const [running, setRunning] = useState(false);

  const [error, setError] = useState("");


  /* =========================================================
     LOAD DASHBOARD DATA
     ========================================================= */

  const load = async () => {

    try {

      setError("");

      const [d, c] = await Promise.all([
        getDashboard(),
        getCases()
      ]);

      setDashboard(d);

      setCases(
        c.map(normalizeCase)
      );

    } catch (e) {

      setError(
        e?.response?.data?.detail ||
        "Could not load backend data."
      );
    }
  };


  useEffect(() => {
    load();
  }, []);


  /* =========================================================
     RUN REVIVEAI RECOVERY AGENT
     ========================================================= */

  const runAgent = async () => {

    try {

      setRunning(true);

      await runRecoveryScan();

      await load();

    } catch (e) {

      setError(
        e?.response?.data?.detail ||
        "Recovery scan failed."
      );

    } finally {

      setRunning(false);

    }
  };


  /* =========================================================
     LIVE CASES
     ========================================================= */

  const liveCases = useMemo(
    () => cases.slice(0, 4),
    [cases]
  );


  /* =========================================================
     DASHBOARD METRICS
     ========================================================= */

  const atRisk =
    Number(
      dashboard?.revenue_at_risk ?? 0
    );

  const recovered =
    Number(
      dashboard?.money_recovered ?? 0
    );

  const rate =
    Number(
      dashboard?.recovery_rate ?? 0
    );

  const active =
    Number(
      dashboard?.active_cases ??
      dashboard?.case_count ??
      0
    );

  const failed =
    Number(
      dashboard?.failed_transactions ?? 0
    );


  /* =========================================================
     CHART DATA
     ========================================================= */

  const chartData = [
    {
      day: "Current",
      risk: Math.round(atRisk / 1000),
      recovered: Math.round(recovered / 1000)
    }
  ];


  const latest = liveCases[0];


  return (
    <>

      {/* =====================================================
          HERO
          ===================================================== */}

      <div className="hero">

        <div>

          <div className="eyebrow">
            <span className="live-dot" />
            AI RECOVERY CONTROL TOWER
          </div>

          <h1>
            Recover revenue.
            <br />
            <em>Automatically.</em>
          </h1>

          <p>
            ReviveAI detects failed or at-risk payments,
            diagnoses the cause, selects a bounded recovery
            action, and records every decision.
          </p>

        </div>


        <button
          className="primary-btn"
          onClick={runAgent}
          disabled={running}
        >

          <Play
            size={16}
            fill="currentColor"
          />

          {running
            ? "Agent running..."
            : "Run recovery scan"}

        </button>

      </div>


      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div
          className="audit-proof"
          style={{ marginBottom: 18 }}
        >
          ⚠ {error}
        </div>
      )}


      {/* =====================================================
          METRIC CARDS
          ===================================================== */}

      <div className="metric-grid">

        <MetricCard
          label="Revenue at risk"
          value={compactMoney(atRisk)}
          sub={`${failed.toLocaleString("en-IN")} failed transactions`}
          icon={CircleDollarSign}
          tone="gold"
        />

        <MetricCard
          label="Money recovered"
          value={compactMoney(recovered)}
          sub={`${rate.toFixed(1)}% recovery rate`}
          icon={TrendingUp}
          tone="green"
        />

        <MetricCard
          label="Active cases"
          value={active.toLocaleString("en-IN")}
          sub={`${dashboard?.attention_cases ?? 0} require attention`}
          icon={Activity}
          tone="blue"
        />

        <MetricCard
          label="Avg. recovery time"
          value={
            dashboard?.avg_recovery_time ??
            "—"
          }
          sub="Live backend metric"
          icon={Clock3}
          tone="purple"
        />

      </div>


      {/* =====================================================
          CHART + AGENT
          ===================================================== */}

      <div className="grid-2 dashboard-row">


        {/* REVENUE CHART */}

        <section className="panel chart-panel">

          <SectionHeader
            eyebrow="LIVE SNAPSHOT"
            title="Revenue recovery performance"
            action={
              <span className="chart-legend">
                <i /> At risk
                <i /> Recovered
              </span>
            }
          />

          <div className="chart-wrap">

            <ResponsiveContainer
              width="100%"
              height={260}
            >

              <AreaChart
                data={chartData}
              >

                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    `₹${v}k`
                  }
                />

                <Tooltip
                  formatter={(v) =>
                    [`₹${v}k`]
                  }
                />

                <Area
                  type="monotone"
                  dataKey="risk"
                  strokeWidth={2}
                  fill="url(#riskFill)"
                />

                <Area
                  type="monotone"
                  dataKey="recovered"
                  strokeWidth={2}
                  fill="url(#recFill)"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </section>


        {/* AI AGENT PANEL */}

        <section className="panel agent-panel">

          <SectionHeader
            eyebrow="AUTONOMOUS AGENT"
            title="Decision engine"
          />


          <div className="agent-status">

            <div className="big-agent-icon">

              <Bot size={28} />

              <span className="pulse-ring" />

            </div>


            <div>

              <strong>
                Monitoring transactions
              </strong>

              <span>
                <i className="live-dot" />
                Connected to Razorpay test mode
              </span>

            </div>

          </div>


          <div className="decision-flow">

            {[
              "Detect",
              "Diagnose",
              "Decide",
              "Recover"
            ].map((x, i) => (

              <div
                className="flow-step"
                key={x}
              >

                <div
                  className={
                    i < 3
                      ? "done-dot"
                      : "current-dot"
                  }
                >

                  {i < 3
                    ? "✓"
                    : "4"}

                </div>

                <span>{x}</span>

              </div>

            ))}

          </div>


          <div className="agent-note">

            <Sparkles size={16} />

            <span>

              <strong>
                Latest decision:
              </strong>{" "}

              {latest
                ? `${latest.action} for transaction ${latest.transactionId}.`
                : "Run a recovery scan to create cases."}

            </span>

          </div>

        </section>

      </div>


      {/* =====================================================
          REVENUE AT RISK TABLE
          ===================================================== */}

      <section className="panel">

        <SectionHeader
          eyebrow="LIVE QUEUE"
          title="Revenue at risk"
          action={
            <a
              className="text-link"
              href="/recovery"
            >
              View all
              <ArrowUpRight size={14} />
            </a>
          }
        />


        <div className="table-scroll">

          <table>

            <thead>

              <tr>

                <th>Case</th>

                <th>Diagnosis</th>

                <th>Amount</th>

                <th>AI score</th>

                <th>
                  Recommended action
                </th>

                <th>Status</th>

              </tr>

            </thead>


            <tbody>

              {liveCases.map((r) => (

                <tr key={r.id}>

                  <td>

                    <strong>
                      Case #{r.id}
                    </strong>

                    <small>
                      Txn #{r.transactionId}
                    </small>

                  </td>


                  <td>

                    <span>
                      {r.diagnosis}
                    </span>

                    <small>
                      {r.time}
                    </small>

                  </td>


                  {/* =================================================
                      FIXED AMOUNT
                      ================================================= */}

                  <td>

                    <strong>
                      {money(r.amount)}
                    </strong>

                  </td>


                  <td>

                    <div className="score">

                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            r.score
                          )}%`
                        }}
                      />

                      <b>
                        {r.score}
                      </b>

                    </div>

                  </td>


                  <td>
                    {r.action}
                  </td>


                  <td>

                    <StatusBadge
                      type={
                        r.status === "RECOVERED"
                          ? "success"
                          : r.escalation !== "NONE"
                          ? "danger"
                          : "warning"
                      }
                    >

                      {r.status}

                    </StatusBadge>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>


      {/* =====================================================
          BOTTOM STATUS CARDS
          ===================================================== */}

      <div className="bottom-grid">


        <div className="mini-panel">

          <ShieldCheck size={19} />

          <div>

            <strong>
              Guardrails active
            </strong>

            <span>
              Backend stopping rules are enabled
            </span>

          </div>

          <CheckCircle2 size={18} />

        </div>


        <div className="mini-panel">

          <Target size={19} />

          <div>

            <strong>
              Recovery status
            </strong>

            <span>
              {compactMoney(recovered)}
              {" "}
              recovered from backend
            </span>

          </div>

          <ArrowUpRight size={18} />

        </div>

      </div>

    </>
  );
}