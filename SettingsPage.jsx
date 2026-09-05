import React, { useEffect, useState } from "react";
import {
  Link2,
  Server,
  ShieldCheck,
  Database,
} from "lucide-react";

import SectionHeader from "../components/SectionHeader";
import {
  getHealth,
  getRazorpayStatus,
} from "../services/api";

export default function SettingsPage() {
  const [razorpay, setRazorpay] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getRazorpayStatus()
      .then(setRazorpay)
      .catch(() =>
        setRazorpay({ connected: false })
      );

    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="page">

      <SectionHeader
        eyebrow="SYSTEM"
        title="Settings"
      />

      <div className="settings-grid">

        {/* Razorpay */}
        <section className="panel settings-card">
          <h3>
            <Link2 size={18} />
            Razorpay Connection
          </h3>

          <p>
            Connection status for the Razorpay payment
            environment used by ReviveAI.
          </p>

          <label>Environment</label>

          <div className="setting-value">
            <span className="mode-dot" />

            TEST Mode

            <b>
              {razorpay?.connected
                ? "Connected"
                : "Disconnected"}
            </b>
          </div>

          <label>Payments found</label>

          <div className="masked">
            {razorpay?.payments_found ?? "—"}
          </div>

          <label>Credentials</label>

          <div className="masked">
            Protected by backend
          </div>
        </section>


        {/* AI Agent */}
        <section className="panel settings-card">
          <h3>
            <ShieldCheck size={18} />
            AI Agent
          </h3>

          <p>
            Current operating status of the ReviveAI
            recovery agent.
          </p>

          <label>Agent status</label>

          <div className="setting-value">
            <span className="mode-dot" />
            Active
            <b>Guarded</b>
          </div>

          <label>Execution mode</label>

          <div className="masked">
            Policy-controlled
          </div>

          <label>Human oversight</label>

          <div className="masked">
            Required for escalated cases
          </div>
        </section>


        {/* Backend */}
        <section className="panel settings-card">
          <h3>
            <Server size={18} />
            Backend
          </h3>

          <p>
            FastAPI service powering the ReviveAI
            dashboard and recovery engine.
          </p>

          <label>API endpoint</label>

          <div className="masked">
            {import.meta.env.VITE_API_URL ||
              "http://127.0.0.1:8000"}
          </div>

          <label>Health</label>

          <div className="connection-ok">
            <span
              className={
                health
                  ? "live-dot"
                  : "live-dot offline"
              }
            />

            {health
              ? "Backend connected"
              : "Health check unavailable"}
          </div>
        </section>


        {/* Database */}
        <section className="panel settings-card">
          <h3>
            <Database size={18} />
            Data Storage
          </h3>

          <p>
            Structured transaction and recovery data
            used by the control tower.
          </p>

          <label>Database</label>

          <div className="setting-value">
            MySQL
            <b>Connected</b>
          </div>

          <label>Data protection</label>

          <div className="masked">
            Backend managed
          </div>
        </section>

      </div>
    </div>
  );
}