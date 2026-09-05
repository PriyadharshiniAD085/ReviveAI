import React from "react";
import { ArrowRight, ShieldCheck, Activity, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">

      <nav className="landing-nav">
        <div className="brand">
          <ShieldCheck size={22} />
          <span>ReviveAI</span>
        </div>

        <button
          className="login-nav-btn"
          onClick={() => navigate("/login")}
        >
        </button>
      </nav>


      <main className="landing-content">

        <div className="landing-badge">
          <span className="live-dot" />
          AI Revenue Recovery Control Tower
        </div>

        <h1>
          Recover revenue.
          <br />
          <span>Intelligently.</span>
        </h1>

        <p>
          ReviveAI continuously detects failed payments,
          evaluates recovery opportunities and executes
          compliant recovery actions with measurable
          revenue impact.
        </p>

        <div className="landing-actions">

          <button
            className="primary-btn landing-primary"
            onClick={() => navigate("/login")}
          >
            Launch Control Tower
            <ArrowRight size={17} />
          </button>

        </div>


        <div className="landing-features">

          <div className="landing-feature">
            <Activity size={20} />
            <div>
              <strong>Detect</strong>
              <span>Identify failed transactions</span>
            </div>
          </div>

          <div className="landing-feature">
            <Zap size={20} />
            <div>
              <strong>Recover</strong>
              <span>Execute bounded interventions</span>
            </div>
          </div>

          <div className="landing-feature">
            <ShieldCheck size={20} />
            <div>
              <strong>Govern</strong>
              <span>Policy controls and audit trail</span>
            </div>
          </div>

        </div>

      </main>

      <footer className="landing-footer">
        ReviveAI · Revenue Recovery Control Tower
      </footer>

    </div>
  );
}