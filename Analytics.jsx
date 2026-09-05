import React, { useEffect, useState } from "react";
import { ArrowUpRight, BarChart3, IndianRupee, Percent, Users } from "lucide-react";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SectionHeader from "../components/SectionHeader";
import { getDashboard, getTransactions } from "../services/api";

export default function Analytics() {
 const [dashboard, setDashboard] = useState(null);
 const [transactions, setTransactions] = useState([]);
 const [error, setError] = useState("");

 useEffect(() => {
   Promise.all([getDashboard(), getTransactions()])
     .then(([d,t]) => { setDashboard(d); setTransactions(t); })
     .catch(e => setError(e?.response?.data?.detail || "Could not load analytics."));
 }, []);

 const recovered = Number(dashboard?.money_recovered ?? 0);
 const atRisk = Number(dashboard?.revenue_at_risk ?? 0);
 const rate = Number(dashboard?.recovery_rate ?? 0);
 const failed = Number(dashboard?.failed_transactions ?? 0);
 const data = [{ name: "Current", risk: Math.round(atRisk / 1000), recovered: Math.round(recovered / 1000) }];

 return <div className="page">
  <SectionHeader eyebrow="MEASURED OUTCOMES" title="Recovery analytics"
    action={<select className="select"><option>Current dataset</option></select>} />
  <div className="analytics-grid">
   <div className="analytics-card"><IndianRupee size={18}/><span>Recovered</span><strong>₹{recovered.toLocaleString("en-IN")}</strong><small><ArrowUpRight size={13}/> Live backend value</small></div>
   <div className="analytics-card"><Percent size={18}/><span>Recovery rate</span><strong>{rate.toFixed(1)}%</strong><small><ArrowUpRight size={13}/> Live backend value</small></div>
   <div className="analytics-card"><Users size={18}/><span>Transactions</span><strong>{transactions.length.toLocaleString("en-IN")}</strong><small>{failed.toLocaleString("en-IN")} failed</small></div>
   <div className="analytics-card"><BarChart3 size={18}/><span>Revenue at risk</span><strong>₹{atRisk.toLocaleString("en-IN")}</strong><small>Current exposure</small></div>
  </div>
  {error && <div className="audit-proof">{error}</div>}
  <section className="panel chart-panel"><SectionHeader eyebrow="RECOVERY VOLUME" title="Recovered vs. at-risk value" />
   <div className="chart-wrap"><ResponsiveContainer width="100%" height={320}><BarChart data={data}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="risk" name="At risk (₹k)" radius={[5,5,0,0]}/><Bar dataKey="recovered" name="Recovered (₹k)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>
  </section>
 </div>
}
