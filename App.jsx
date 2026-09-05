import React, { useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Settings,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import Recovery from "./pages/Recovery";
import Policies from "./pages/Policies";
import Escalations from "./pages/Escalations";
import Audit from "./pages/Audit";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/SettingsPage";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

import { logout } from "./utils/auth";


const nav = [
  {
    to: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    to: "/incidents",
    label: "Revenue Incidents",
    icon: AlertTriangle,
  },
  {
    to: "/recovery",
    label: "Recovery Queue",
    icon: RotateCcw,
  },
  {
    to: "/policies",
    label: "Policies & Guardrails",
    icon: ShieldCheck,
  },
  {
    to: "/escalations",
    label: "Escalations",
    icon: ClipboardCheck,
  },
  {
    to: "/audit",
    label: "Audit Trail",
    icon: FileClock,
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
];


function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();

  /*
   * Landing page and login page should NOT show
   * the dashboard sidebar/topbar.
   */
  const isPublicPage =
    location.pathname === "/" ||
    location.pathname === "/login";


  const pageTitle =
    nav.find(
      (n) =>
        n.to !== "/dashboard" &&
        location.pathname.startsWith(n.to)
    )?.label ||
    (location.pathname === "/dashboard"
      ? "Overview"
      : location.pathname === "/settings"
      ? "Settings"
      : "Revenue Recovery Control Tower");


  /*
   * ==========================================
   * PUBLIC WEBSITE
   * ==========================================
   */

  if (isPublicPage) {
    return (
      <Routes>

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

      </Routes>
    );
  }


  /*
   * ==========================================
   * PROTECTED APPLICATION
   * ==========================================
   */

  return (
    <ProtectedRoute>

      <div className="app-shell">

        {mobileOpen && (
          <div
            className="mobile-overlay"
            onClick={() =>
              setMobileOpen(false)
            }
          />
        )}


        {/* =========================
            SIDEBAR
        ========================= */}

        <aside
          className={`sidebar ${
            mobileOpen ? "open" : ""
          }`}
        >

          <div className="brand">

            <div className="brand-mark">
              <Zap
                size={18}
                fill="currentColor"
              />
            </div>

            <div>
              <strong>
                Revive<span>AI</span>
              </strong>

              <small>
                Revenue Recovery
              </small>
            </div>

            <button
              type="button"
              className="icon-btn mobile-close"
              onClick={() =>
                setMobileOpen(false)
              }
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>

          </div>


          {/* Workspace */}

          <div className="workspace">

            <div className="workspace-dot" />

            <div>
              <strong>
                Demo Merchant
              </strong>

              <small>
                Razorpay Test Mode
              </small>
            </div>

            <ChevronRight size={15} />

          </div>


          {/* Navigation */}

          <nav>

            <div className="nav-label">
              CONTROL TOWER
            </div>

            {nav.map(
              ({
                to,
                label,
                icon: Icon,
              }) => (

                <NavLink
                  key={to}
                  to={to}
                  end={to === "/dashboard"}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className={({
                    isActive,
                  }) =>
                    `nav-item ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                >

                  <Icon size={18} />

                  <span>
                    {label}
                  </span>

                </NavLink>

              )
            )}


            <div className="nav-label settings-label">
              SYSTEM
            </div>


            <NavLink
              to="/settings"
              onClick={() =>
                setMobileOpen(false)
              }
              className={({
                isActive,
              }) =>
                `nav-item ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
            >
              <Settings size={18} />

              <span>
                Settings
              </span>
            </NavLink>

          </nav>


          {/* Agent card */}

          <div className="agent-card">

            <div className="agent-icon">
              <Bot size={18} />
            </div>

            <div className="agent-copy">

              <strong>
                Recovery Agent
              </strong>

              <span>
                <i className="live-dot" />
                Monitoring live
              </span>

            </div>

            <div className="agent-pulse">
              <Activity size={15} />
            </div>

          </div>


          {/* Logout */}

          <button
            type="button"
            className="logout-btn"
            onClick={logout}
          >
            Logout
          </button>

        </aside>


        {/* =========================
            MAIN
        ========================= */}

        <main className="main">

          <header className="topbar">

            <button
              type="button"
              className="icon-btn mobile-menu"
              onClick={() =>
                setMobileOpen(
                  (prev) => !prev
                )
              }
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </button>


            <div className="crumbs">

              <span>
                ReviveAI
              </span>

              <ChevronRight size={14} />

              <strong>
                {pageTitle}
              </strong>

            </div>


            <div className="top-actions">

              <div className="mode-pill">
                <span className="mode-dot" />
                TEST MODE
              </div>

              <div className="avatar">
                PD
              </div>

            </div>

          </header>


          <div className="page-wrap">

            <Routes>

              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/incidents"
                element={<Incidents />}
              />

              <Route
                path="/recovery"
                element={<Recovery />}
              />

              <Route
                path="/policies"
                element={<Policies />}
              />

              <Route
                path="/escalations"
                element={<Escalations />}
              />

              <Route
                path="/audit"
                element={<Audit />}
              />

              <Route
                path="/analytics"
                element={<Analytics />}
              />

              <Route
                path="/settings"
                element={<SettingsPage />}
              />

              {/* Fallback inside protected app */}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/dashboard"
                    replace
                  />
                }
              />

            </Routes>

          </div>

        </main>

      </div>

    </ProtectedRoute>
  );
}


export default App;