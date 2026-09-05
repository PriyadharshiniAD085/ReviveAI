import React, { useEffect, useState } from "react";
import { Download, FileClock, ShieldCheck } from "lucide-react";
import SectionHeader from "../components/SectionHeader";
import { getAudit } from "../services/api";

export default function Audit() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getAudit().then(setEvents).catch(e => setError(e?.response?.data?.detail || "Could not load audit trail."));
  }, []);

  return <div className="page">
    <SectionHeader eyebrow="PROOF OF EXECUTION" title="Audit trail"
      action={<button className="secondary-btn" onClick={()=>window.print()}><Download size={15}/> Export log</button>} />
    <p className="page-intro">Immutable-style event history for detection, reasoning, policy checks, actions and outcomes.</p>
    <div className="audit-proof"><ShieldCheck size={19}/><span><strong>Audit coverage</strong> — backend decision history is displayed below.</span></div>
    {error && <div className="audit-proof">{error}</div>}
    <section className="panel audit-panel">
      {events.length === 0 ? <div className="audit-row"><div className="audit-content"><strong>No audit events found</strong><span>Run a recovery action to create an event.</span></div></div> :
      events.map((e,i)=><div className="audit-row" key={e.id ?? i}>
        <div className="audit-time">{e.created_at ? new Date(e.created_at).toLocaleString("en-IN") : e.time ?? "—"}</div>
        <div className="audit-icon action"><FileClock size={15}/></div>
        <div className="audit-content"><strong>{e.event ?? e.action ?? e.event_type ?? "Audit event"}</strong><span>{e.detail ?? e.message ?? JSON.stringify(e)}</span></div>
        <div className="audit-actor">{e.actor ?? "ReviveAI"}</div>
        <div className="hash">{e.id ? `evt_${e.id}` : `evt_${String(i+1).padStart(5,"0")}`}</div>
      </div>)}
    </section>
  </div>;
}
