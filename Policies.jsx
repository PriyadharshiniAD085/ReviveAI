import React, { useEffect, useState } from "react";
import {
  Check,
  Edit3,
  Plus,
  Shield,
  ToggleLeft,
  ToggleRight,
  X,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Settings2,
  ShieldCheck,
  CircleCheck,
  AlertCircle,
} from "lucide-react";

import SectionHeader from "../components/SectionHeader";

import {
  getPolicies,
  updatePolicy,
  createPolicy,
} from "../services/api";

export default function Policies() {
  // ============================================================
  // STATE
  // ============================================================

  const [rules, setRules] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Edit modal
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);

  const [newPolicy, setNewPolicy] = useState({
    code: "",
    name: "",
    description: "",
    value: 0,
    enabled: true,
  });

  // ============================================================
  // POLICY SAFETY LOCKER
  // ============================================================

  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [policyPassword, setPolicyPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // TEMPORARY BUILDATHON PASSWORD
  const HARDCODED_PASSWORD = "admin123";

  // ============================================================
  // LOAD POLICIES
  // ============================================================

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getPolicies();

      console.log("Policies API response:", data);

      if (Array.isArray(data)) {
        setRules(data);
      } else if (Array.isArray(data?.items)) {
        setRules(data.items);
      } else {
        setRules([]);
      }
    } catch (e) {
      console.error("Load policies error:", e);

      setError(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not load policies."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UNLOCK
  // ============================================================

  const handleUnlock = () => {
    setUnlockError("");
    setError("");
    setMessage("");

    const enteredPassword = password.trim();

    if (!enteredPassword) {
      setUnlockError(
        "Please enter the Policy Safety Locker password."
      );
      return;
    }

    if (enteredPassword !== HARDCODED_PASSWORD) {
      setUnlockError(
        "Incorrect Policy Safety Locker password."
      );
      return;
    }

    setPolicyPassword(HARDCODED_PASSWORD);
    setUnlocked(true);
    setPassword("");

    setMessage(
      "Policy Safety Locker unlocked."
    );
  };

  // ============================================================
  // LOCK
  // ============================================================

  const handleLock = () => {
    setUnlocked(false);
    setPolicyPassword("");
    setPassword("");

    setEditingPolicy(null);
    setShowCreate(false);

    setMessage(
      "Policy Safety Locker locked."
    );

    setError("");
  };

  // ============================================================
  // LOAD AFTER UNLOCK
  // ============================================================

  useEffect(() => {
    if (unlocked) {
      loadPolicies();
    }
  }, [unlocked]);

  // ============================================================
  // TOGGLE POLICY
  // ============================================================

  const toggle = async (policy) => {
    if (!policyPassword) {
      setError(
        "Policy Safety Locker session expired. Please unlock again."
      );

      setUnlocked(false);
      return;
    }

    const oldEnabled =
      policy.enabled === true;

    const newEnabled =
      !oldEnabled;

    console.log(
      `Updating ${policy.code}: ${oldEnabled} → ${newEnabled}`
    );

    // Optimistic UI update
    setRules((currentRules) =>
      currentRules.map((item) =>
        item.code === policy.code
          ? {
              ...item,
              enabled: newEnabled,
            }
          : item
      )
    );

    try {
      setSaving(policy.code);
      setError("");
      setMessage("");

      const response =
        await updatePolicy(
          policy.code,
          {
            enabled: newEnabled,
            policy_password:
              policyPassword,
          }
        );

      console.log(
        "Policy update response:",
        response
      );

      if (
        !response ||
        !response.policy
      ) {
        throw new Error(
          response?.message ||
            "Policy update failed."
        );
      }

      const backendEnabled =
        response.policy.enabled === true;

      setRules((currentRules) =>
        currentRules.map((item) =>
          item.code === policy.code
            ? {
                ...item,
                enabled:
                  backendEnabled,
                value:
                  response.policy
                    .value ??
                  item.value,
                updated_at:
                  response.policy
                    .updated_at ??
                  item.updated_at,
              }
            : item
        )
      );

      setMessage(
        `${policy.code} ${
          backendEnabled
            ? "enabled"
            : "disabled"
        } successfully.`
      );
    } catch (e) {
      console.error(
        "Toggle policy error:",
        e
      );

      // Rollback
      setRules((currentRules) =>
        currentRules.map((item) =>
          item.code === policy.code
            ? {
                ...item,
                enabled:
                  oldEnabled,
              }
            : item
        )
      );

      setError(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not update policy."
      );
    } finally {
      setSaving("");
    }
  };

  // ============================================================
  // OPEN EDIT MODAL
  // ============================================================

  const startEdit = (policy) => {
    setError("");
    setMessage("");

    setEditingPolicy(policy);
    setEditValue(
      policy.value ?? ""
    );
  };

  // ============================================================
  // CANCEL EDIT
  // ============================================================

  const cancelEdit = () => {
    setEditingPolicy(null);
    setEditValue("");
  };

  // ============================================================
  // SAVE EDITED POLICY
  // ============================================================

  const saveEdit = async () => {
    if (!editingPolicy) {
      return;
    }

    if (!policyPassword) {
      setError(
        "Policy Safety Locker session expired. Please unlock again."
      );

      setUnlocked(false);
      return;
    }

    const numericValue =
      Number(editValue);

    if (Number.isNaN(numericValue)) {
      setError(
        "Please enter a valid numeric value."
      );
      return;
    }

    if (numericValue < 0) {
      setError(
        "Policy value cannot be negative."
      );
      return;
    }

    try {
      setSaving(
        editingPolicy.code
      );

      setError("");
      setMessage("");

      const response =
        await updatePolicy(
          editingPolicy.code,
          {
            value:
              numericValue,
            policy_password:
              policyPassword,
          }
        );

      console.log(
        "Policy edit response:",
        response
      );

      if (
        !response ||
        !response.policy
      ) {
        throw new Error(
          response?.message ||
            "Policy update failed."
        );
      }

      const updatedPolicy =
        response.policy;

      setRules((currentRules) =>
        currentRules.map((item) =>
          item.code ===
          editingPolicy.code
            ? {
                ...item,
                value:
                  updatedPolicy
                    .value ??
                  numericValue,

                enabled:
                  updatedPolicy
                    .enabled ===
                  true,

                updated_at:
                  updatedPolicy
                    .updated_at ??
                  item.updated_at,
              }
            : item
        )
      );

      setMessage(
        `${editingPolicy.code} updated successfully.`
      );

      setEditingPolicy(null);
      setEditValue("");
    } catch (e) {
      console.error(
        "Edit policy error:",
        e
      );

      setError(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not update policy."
      );
    } finally {
      setSaving("");
    }
  };

  // ============================================================
  // CREATE POLICY
  // ============================================================

  const handleCreate = async () => {
    if (!policyPassword) {
      setError(
        "Policy Safety Locker session expired. Please unlock again."
      );

      setUnlocked(false);
      return;
    }

    const code =
      newPolicy.code.trim();

    const name =
      newPolicy.name.trim();

    const description =
      newPolicy.description.trim();

    const numericValue =
      Number(newPolicy.value);

    if (!code) {
      setError(
        "Policy code is required."
      );
      return;
    }

    if (!name) {
      setError(
        "Policy name is required."
      );
      return;
    }

    if (!description) {
      setError(
        "Policy description is required."
      );
      return;
    }

    if (
      Number.isNaN(
        numericValue
      )
    ) {
      setError(
        "Please enter a valid policy value."
      );
      return;
    }

    if (numericValue < 0) {
      setError(
        "Policy value cannot be negative."
      );
      return;
    }

    try {
      setSaving("CREATE");
      setError("");
      setMessage("");

      const response =
        await createPolicy({
          code,
          name,
          description,
          value:
            numericValue,
          enabled:
            newPolicy.enabled ===
            true,
          policy_password:
            policyPassword,
        });

      console.log(
        "Create policy response:",
        response
      );

      if (!response) {
        throw new Error(
          "Policy creation failed."
        );
      }

      if (response.policy) {
        setRules(
          (currentRules) => [
            ...currentRules,
            {
              ...response.policy,
              enabled:
                response.policy
                  .enabled ===
                true,
            },
          ]
        );
      } else {
        await loadPolicies();
      }

      setMessage(
        `${code} created successfully.`
      );

      setNewPolicy({
        code: "",
        name: "",
        description: "",
        value: 0,
        enabled: true,
      });

      setShowCreate(false);
    } catch (e) {
      console.error(
        "Create policy error:",
        e
      );

      setError(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not create policy."
      );
    } finally {
      setSaving("");
    }
  };

  // ============================================================
  // LOCK SCREEN
  // ============================================================

  if (!unlocked) {
    return (
      <div className="page">
        <SectionHeader
          title="Policy Safety Locker"
          subtitle="Protected recovery policy configuration"
        />

        <div
          style={{
            minHeight:
              "calc(100vh - 180px)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "30px 16px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth:
                "500px",
              padding: 0,
              overflow:
                "hidden",
              borderRadius:
                "20px",
            }}
          >
            {/* TOP SECURITY HEADER */}

            <div
              style={{
                padding:
                  "32px 32px 24px",
                textAlign:
                  "center",
                borderBottom:
                  "1px solid rgba(128,128,128,0.12)",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  margin:
                    "0 auto 18px",
                  borderRadius:
                    "20px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  background:
                    "rgba(99,102,241,0.12)",
                  boxShadow:
                    "0 8px 25px rgba(99,102,241,0.08)",
                }}
              >
                <ShieldCheck
                  size={36}
                />
              </div>

              <div
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: "6px",
                  padding:
                    "5px 10px",
                  borderRadius:
                    "999px",
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                  letterSpacing:
                    "0.08em",
                  textTransform:
                    "uppercase",
                  background:
                    "rgba(99,102,241,0.09)",
                  marginBottom:
                    "12px",
                }}
              >
                <Lock
                  size={12}
                />
                Protected Area
              </div>

              <h2
                style={{
                  margin:
                    "0 0 8px",
                  fontSize:
                    "24px",
                  fontWeight:
                    750,
                }}
              >
                Policy Safety Locker
              </h2>

              <p
                style={{
                  margin: 0,
                  opacity:
                    0.62,
                  fontSize:
                    "14px",
                  lineHeight:
                    1.6,
                  maxWidth:
                    "380px",
                  marginInline:
                    "auto",
                }}
              >
                Enter the administrator
                password to manage
                recovery policies and
                stopping rules.
              </p>
            </div>

            {/* FORM */}

            <div
              style={{
                padding:
                  "28px 32px 32px",
              }}
            >
              {unlockError && (
                <div
                  className="error"
                  style={{
                    marginBottom:
                      "18px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "9px",
                    borderRadius:
                      "10px",
                  }}
                >
                  <AlertCircle
                    size={17}
                  />
                  <span>
                    {unlockError}
                  </span>
                </div>
              )}

              {message && (
                <div
                  className="success"
                  style={{
                    marginBottom:
                      "18px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "9px",
                    borderRadius:
                      "10px",
                  }}
                >
                  <CircleCheck
                    size={17}
                  />
                  <span>
                    {message}
                  </span>
                </div>
              )}

              <div
                className="form-group"
                style={{
                  marginBottom:
                    "20px",
                }}
              >
                <label
                  style={{
                    fontWeight:
                      650,
                    marginBottom:
                      "8px",
                    display:
                      "block",
                  }}
                >
                  Administrator Password
                </label>

                <div
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      password
                    }
                    onChange={(
                      e
                    ) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    onKeyDown={(
                      e
                    ) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        handleUnlock();
                      }
                    }}
                    placeholder="Enter policy password"
                    autoComplete="off"
                    style={{
                      width:
                        "100%",
                      height:
                        "48px",
                      padding:
                        "0 48px 0 14px",
                      borderRadius:
                        "10px",
                      boxSizing:
                        "border-box",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) =>
                          !value
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    style={{
                      position:
                        "absolute",
                      right:
                        "10px",
                      top:
                        "50%",
                      transform:
                        "translateY(-50%)",
                      border:
                        "none",
                      background:
                        "transparent",
                      cursor:
                        "pointer",
                      padding:
                        "6px",
                      opacity:
                        0.65,
                    }}
                  >
                    {showPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="primary-btn"
                onClick={
                  handleUnlock
                }
                style={{
                  width:
                    "100%",
                  height:
                    "48px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: "9px",
                  borderRadius:
                    "10px",
                  fontWeight:
                    700,
                }}
              >
                <Lock
                  size={18}
                />
                Unlock Safety Locker
              </button>

              <div
                style={{
                  marginTop:
                    "18px",
                  textAlign:
                    "center",
                  fontSize:
                    "12px",
                  opacity:
                    0.48,
                }}
              >
                Authorized administrators only
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN POLICY SCREEN
  // ============================================================

  const activePolicies =
    rules.filter(
      (policy) =>
        policy.enabled ===
        true
    ).length;

  const disabledPolicies =
    rules.length -
    activePolicies;

  return (
    <div className="page">
      <SectionHeader
        title="Policy Safety Locker"
        subtitle="Manage recovery policies and stopping rules"
      />

      {/* ========================================================
          SUMMARY CARDS
      ======================================================== */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom:
            "22px",
        }}
      >
        {/* ACTIVE */}

        <div
          className="card"
          style={{
            padding:
              "18px 20px",
            borderRadius:
              "14px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom:
                "12px",
            }}
          >
            <span
              style={{
                fontSize:
                  "12px",
                fontWeight:
                  650,
                opacity:
                  0.62,
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.06em",
              }}
            >
              Active Policies
            </span>

            <div
              style={{
                width:
                  "34px",
                height:
                  "34px",
                borderRadius:
                  "10px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                background:
                  "rgba(34,197,94,0.10)",
              }}
            >
              <ShieldCheck
                size={18}
              />
            </div>
          </div>

          <div
            style={{
              fontSize:
                "27px",
              fontWeight:
                750,
            }}
          >
            {activePolicies}
          </div>

          <div
            style={{
              fontSize:
                "12px",
              opacity:
                0.52,
              marginTop:
                "3px",
            }}
          >
            Currently enforced
          </div>
        </div>

        {/* DISABLED */}

        <div
          className="card"
          style={{
            padding:
              "18px 20px",
            borderRadius:
              "14px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom:
                "12px",
            }}
          >
            <span
              style={{
                fontSize:
                  "12px",
                fontWeight:
                  650,
                opacity:
                  0.62,
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.06em",
              }}
            >
              Disabled
            </span>

            <div
              style={{
                width:
                  "34px",
                height:
                  "34px",
                borderRadius:
                  "10px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                background:
                  "rgba(128,128,128,0.10)",
              }}
            >
              <ToggleLeft
                size={18}
              />
            </div>
          </div>

          <div
            style={{
              fontSize:
                "27px",
              fontWeight:
                750,
            }}
          >
            {disabledPolicies}
          </div>

          <div
            style={{
              fontSize:
                "12px",
              opacity:
                0.52,
                marginTop:
                "3px",
            }}
          >
            Currently inactive
          </div>
        </div>

        {/* TOTAL */}

        <div
          className="card"
          style={{
            padding:
              "18px 20px",
            borderRadius:
              "14px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom:
                "12px",
            }}
          >
            <span
              style={{
                fontSize:
                  "12px",
                fontWeight:
                  650,
                opacity:
                  0.62,
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.06em",
              }}
            >
              Total Controls
            </span>

            <div
              style={{
                width:
                  "34px",
                height:
                  "34px",
                borderRadius:
                  "10px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                background:
                  "rgba(99,102,241,0.10)",
              }}
            >
              <Settings2
                size={18}
              />
            </div>
          </div>

          <div
            style={{
              fontSize:
                "27px",
              fontWeight:
                750,
            }}
          >
            {rules.length}
          </div>

          <div
            style={{
              fontSize:
                "12px",
              opacity:
                0.52,
              marginTop:
                "3px",
            }}
          >
            Recovery safeguards
          </div>
        </div>
      </div>

      {/* ========================================================
          CONTROL BAR
      ======================================================== */}

      <div
        className="card"
        style={{
          padding:
            "14px 16px",
          marginBottom:
            "18px",
          borderRadius:
            "14px",
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          gap: "14px",
          flexWrap:
            "wrap",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap: "11px",
          }}
        >
          <div
            style={{
              width:
                "36px",
              height:
                "36px",
              borderRadius:
                "10px",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              background:
                "rgba(34,197,94,0.10)",
            }}
          >
            <Check
              size={18}
            />
          </div>

          <div>
            <div
              style={{
                fontWeight:
                  700,
                fontSize:
                  "14px",
              }}
            >
              Safety Locker Active
            </div>

            <div
              style={{
                fontSize:
                  "12px",
                opacity:
                  0.55,
                marginTop:
                  "2px",
              }}
            >
              Policy changes are protected
            </div>
          </div>
        </div>

        <div
          style={{
            display:
              "flex",
            gap: "8px",
            flexWrap:
              "wrap",
          }}
        >
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setError("");
              setMessage("");
              loadPolicies();
            }}
            disabled={
              loading
            }
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "7px",
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation:
                  loading
                    ? "spin 1s linear infinite"
                    : "none",
              }}
            />

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              setError("");
              setMessage("");
              setShowCreate(
                true
              );
            }}
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "7px",
            }}
          >
            <Plus
              size={17}
            />
            Add Policy
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={
              handleLock
            }
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "7px",
            }}
          >
            <Lock
              size={15}
            />
            Lock
          </button>
        </div>
      </div>

      {/* ========================================================
          MESSAGES
      ======================================================== */}

      {error && (
        <div
          className="error"
          style={{
            marginBottom:
              "16px",
            display:
              "flex",
            alignItems:
              "center",
            gap: "9px",
            borderRadius:
              "10px",
          }}
        >
          <AlertCircle
            size={17}
          />
          {error}
        </div>
      )}

      {message && (
        <div
          className="success"
          style={{
            marginBottom:
              "16px",
            display:
              "flex",
            alignItems:
              "center",
            gap: "9px",
            borderRadius:
              "10px",
          }}
        >
          <CircleCheck
            size={17}
          />
          {message}
        </div>
      )}

      {/* ========================================================
          LOADING
      ======================================================== */}

      {loading &&
        rules.length === 0 && (
          <div
            className="card"
            style={{
              padding:
                "60px 30px",
              textAlign:
                "center",
              borderRadius:
                "16px",
            }}
          >
            <RefreshCw
              size={28}
              style={{
                marginBottom:
                  "12px",
                animation:
                  "spin 1s linear infinite",
              }}
            />

            <div
              style={{
                fontWeight:
                  650,
              }}
            >
              Loading policies...
            </div>

            <div
              style={{
                fontSize:
                  "12px",
                opacity:
                  0.5,
                marginTop:
                  "5px",
              }}
            >
              Fetching recovery controls
            </div>
          </div>
        )}

      {/* ========================================================
          EMPTY
      ======================================================== */}

      {!loading &&
        rules.length === 0 && (
          <div
            className="card"
            style={{
              padding:
                "60px 30px",
              textAlign:
                "center",
              borderRadius:
                "16px",
            }}
          >
            <Shield
              size={34}
              style={{
                marginBottom:
                  "12px",
                opacity:
                  0.45,
              }}
            />

            <div
              style={{
                fontWeight:
                  700,
                fontSize:
                  "16px",
              }}
            >
              No policies found
            </div>

            <div
              style={{
                fontSize:
                  "13px",
                opacity:
                  0.55,
                marginTop:
                  "6px",
              }}
            >
              Add your first recovery policy to begin.
            </div>
          </div>
        )}

      {/* ========================================================
          POLICY LIST
      ======================================================== */}

      {rules.length > 0 && (
        <div
          className="card"
          style={{
            padding: 0,
            overflow:
              "hidden",
            borderRadius:
              "16px",
          }}
        >
          {/* HEADER */}

          <div
            style={{
              padding:
                "20px 22px",
              borderBottom:
                "1px solid rgba(128,128,128,0.12)",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "12px",
              flexWrap:
                "wrap",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width:
                    "40px",
                  height:
                    "40px",
                  borderRadius:
                    "11px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  background:
                    "rgba(99,102,241,0.10)",
                }}
              >
                <Settings2
                  size={19}
                />
              </div>

              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize:
                      "16px",
                  }}
                >
                  Recovery Policies
                </h3>

                <p
                  style={{
                    margin:
                      "4px 0 0",
                    opacity:
                      0.55,
                    fontSize:
                      "12px",
                  }}
                >
                  Controls governing automated revenue recovery
                </p>
              </div>
            </div>

            <div
              style={{
                padding:
                  "7px 11px",
                borderRadius:
                  "999px",
                background:
                  "rgba(128,128,128,0.08)",
                fontSize:
                  "12px",
                fontWeight:
                  650,
              }}
            >
              {rules.length}{" "}
              {rules.length ===
              1
                ? "policy"
                : "policies"}
            </div>
          </div>

          {/* POLICY ROWS */}

          {rules.map(
            (policy, index) => {
              const isEnabled =
                policy.enabled ===
                true;

              const isSaving =
                saving ===
                policy.code;

              return (
                <div
                  className="policy-row"
                  key={
                    policy.code ||
                    policy.id
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: "20px",
                    padding:
                      "21px 22px",
                    borderBottom:
                      index ===
                      rules.length -
                        1
                        ? "none"
                        : "1px solid rgba(128,128,128,0.10)",
                    transition:
                      "background 0.2s ease",
                  }}
                >
                  {/* INFORMATION */}

                  <div
                    style={{
                      flex: 1,
                      minWidth:
                        0,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "9px",
                        marginBottom:
                          "8px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight:
                            750,
                          fontSize:
                            "14px",
                          letterSpacing:
                            "0.02em",
                        }}
                      >
                        {policy.code}
                      </span>

                      <span
                        style={{
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          gap: "5px",
                          padding:
                            "4px 8px",
                          borderRadius:
                            "999px",
                          fontSize:
                            "10px",
                          fontWeight:
                            750,
                          letterSpacing:
                            "0.05em",
                          background:
                            isEnabled
                              ? "rgba(34,197,94,0.10)"
                              : "rgba(128,128,128,0.10)",
                        }}
                      >
                        <span
                          style={{
                            width:
                              "6px",
                            height:
                              "6px",
                            borderRadius:
                              "50%",
                            background:
                              isEnabled
                                ? "currentColor"
                                : "rgba(128,128,128,0.65)",
                          }}
                        />

                        {isEnabled
                          ? "ACTIVE"
                          : "DISABLED"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontWeight:
                          650,
                        fontSize:
                          "15px",
                        marginBottom:
                          "5px",
                      }}
                    >
                      {policy.name}
                    </div>

                    <div
                      style={{
                        fontSize:
                          "13px",
                        opacity:
                          0.62,
                        lineHeight:
                          1.55,
                        maxWidth:
                          "760px",
                      }}
                    >
                      {policy.description}
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "16px",
                        marginTop:
                          "12px",
                        flexWrap:
                          "wrap",
                        fontSize:
                          "12px",
                      }}
                    >
                      <span
                        style={{
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          gap: "5px",
                          padding:
                            "5px 9px",
                          borderRadius:
                            "7px",
                          background:
                            "rgba(128,128,128,0.07)",
                        }}
                      >
                        <strong>
                          Value
                        </strong>

                        <span
                          style={{
                            opacity:
                              0.72,
                          }}
                        >
                          {policy.value}
                        </span>
                      </span>

                      {policy.updated_at && (
                        <span
                          style={{
                            opacity:
                              0.48,
                          }}
                        >
                          Updated{" "}
                          {new Date(
                            policy.updated_at
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "7px",
                      flexShrink:
                        0,
                    }}
                  >
                    {/* EDIT */}

                    <button
                      type="button"
                      className="icon-btn"
                      title="Edit policy value"
                      aria-label={`Edit ${policy.code}`}
                      onClick={() =>
                        startEdit(
                          policy
                        )
                      }
                      disabled={
                        isSaving
                      }
                      style={{
                        width:
                          "38px",
                        height:
                          "38px",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        borderRadius:
                          "9px",
                      }}
                    >
                      <Edit3
                        size={17}
                      />
                    </button>

                    {/* TOGGLE */}

                    <button
                      type="button"
                      className={`toggle ${
                        isEnabled
                          ? "enabled"
                          : "disabled"
                      }`}
                      title={
                        isEnabled
                          ? "Disable policy"
                          : "Enable policy"
                      }
                      aria-label={
                        isEnabled
                          ? `Disable ${policy.code}`
                          : `Enable ${policy.code}`
                      }
                      disabled={
                        isSaving
                      }
                      onClick={() =>
                        toggle(
                          policy
                        )
                      }
                      style={{
                        cursor:
                          isSaving
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          isSaving
                            ? 0.55
                            : 1,
                        transition:
                          "transform 0.15s ease, opacity 0.15s ease",
                      }}
                    >
                      {isEnabled ? (
                        <ToggleRight
                          size={
                            31
                          }
                        />
                      ) : (
                        <ToggleLeft
                          size={
                            31
                          }
                        />
                      )}
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* ========================================================
          EDIT MODAL
      ======================================================== */}

      {editingPolicy && (
        <div
          className="modal-overlay"
          onClick={
            cancelEdit
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              borderRadius:
                "18px",
              overflow:
                "hidden",
            }}
          >
            <div
              className="modal-header"
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                padding:
                  "20px 22px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "11px",
                }}
              >
                <div
                  style={{
                    width:
                      "38px",
                    height:
                      "38px",
                    borderRadius:
                      "10px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                      "rgba(99,102,241,0.10)",
                  }}
                >
                  <Edit3
                    size={18}
                  />
                </div>

                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize:
                        "17px",
                    }}
                  >
                    Edit Policy
                  </h3>

                  <p
                    style={{
                      margin:
                        "4px 0 0",
                      opacity:
                        0.55,
                      fontSize:
                        "12px",
                    }}
                  >
                    {editingPolicy.code}{" "}
                    —{" "}
                    {editingPolicy.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={
                  cancelEdit
                }
                aria-label="Close"
                style={{
                  width:
                    "34px",
                  height:
                    "34px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  borderRadius:
                    "8px",
                }}
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <div
              className="modal-body"
              style={{
                padding:
                  "24px 22px",
              }}
            >
              <div
                style={{
                  padding:
                    "14px",
                  borderRadius:
                    "10px",
                  marginBottom:
                    "18px",
                  background:
                    "rgba(99,102,241,0.06)",
                  fontSize:
                    "12px",
                  lineHeight:
                    1.5,
                  opacity:
                    0.7,
                }}
              >
                Update the threshold value
                used by this recovery policy.
              </div>

              <div className="form-group">
                <label
                  style={{
                    fontWeight:
                      650,
                    marginBottom:
                      "8px",
                    display:
                      "block",
                  }}
                >
                  Policy Value
                </label>

                <input
                  type="number"
                  value={
                    editValue
                  }
                  onChange={(
                    e
                  ) =>
                    setEditValue(
                      e.target.value
                    )
                  }
                  min="0"
                  step="0.01"
                  autoFocus
                  style={{
                    width:
                      "100%",
                    height:
                      "46px",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: "9px",
                padding:
                  "16px 22px",
              }}
            >
              <button
                type="button"
                className="secondary-btn"
                onClick={
                  cancelEdit
                }
                disabled={
                  saving ===
                  editingPolicy.code
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={
                  saveEdit
                }
                disabled={
                  saving ===
                  editingPolicy.code
                }
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "7px",
                }}
              >
                <Check
                  size={17}
                />

                {saving ===
                editingPolicy.code
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CREATE MODAL
      ======================================================== */}

      {showCreate && (
        <div
          className="modal-overlay"
          onClick={() =>
            setShowCreate(
              false
            )
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              borderRadius:
                "18px",
              overflow:
                "hidden",
            }}
          >
            <div
              className="modal-header"
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                padding:
                  "20px 22px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "11px",
                }}
              >
                <div
                  style={{
                    width:
                      "38px",
                    height:
                      "38px",
                    borderRadius:
                      "10px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                      "rgba(99,102,241,0.10)",
                  }}
                >
                  <Plus
                    size={19}
                  />
                </div>

                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize:
                        "17px",
                    }}
                  >
                    Create Policy
                  </h3>

                  <p
                    style={{
                      margin:
                        "4px 0 0",
                      opacity:
                        0.55,
                      fontSize:
                        "12px",
                    }}
                  >
                    Add a new recovery control rule.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setShowCreate(
                    false
                  )
                }
                aria-label="Close"
                style={{
                  width:
                    "34px",
                  height:
                    "34px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  borderRadius:
                    "8px",
                }}
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <div
              className="modal-body"
              style={{
                padding:
                  "24px 22px",
              }}
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "14px",
                }}
              >
                {/* CODE */}

                <div className="form-group">
                  <label
                    style={{
                      fontWeight:
                        650,
                      marginBottom:
                        "7px",
                      display:
                        "block",
                    }}
                  >
                    Policy Code
                  </label>

                  <input
                    type="text"
                    value={
                      newPolicy.code
                    }
                    onChange={(
                      e
                    ) =>
                      setNewPolicy(
                        (
                          current
                        ) => ({
                          ...current,
                          code:
                            e.target.value.toUpperCase(),
                        })
                      )
                    }
                    placeholder="P-005"
                    style={{
                      width:
                        "100%",
                      height:
                        "44px",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>

                {/* VALUE */}

                <div className="form-group">
                  <label
                    style={{
                      fontWeight:
                        650,
                      marginBottom:
                        "7px",
                      display:
                        "block",
                    }}
                  >
                    Value
                  </label>

                  <input
                    type="number"
                    value={
                      newPolicy.value
                    }
                    onChange={(
                      e
                    ) =>
                      setNewPolicy(
                        (
                          current
                        ) => ({
                          ...current,
                          value:
                            e.target.value,
                        })
                      )
                    }
                    min="0"
                    step="0.01"
                    style={{
                      width:
                        "100%",
                      height:
                        "44px",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>
              </div>

              {/* NAME */}

              <div
                className="form-group"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                <label
                  style={{
                    fontWeight:
                      650,
                    marginBottom:
                      "7px",
                    display:
                      "block",
                  }}
                >
                  Policy Name
                </label>

                <input
                  type="text"
                  value={
                    newPolicy.name
                  }
                  onChange={(
                    e
                  ) =>
                    setNewPolicy(
                      (
                        current
                      ) => ({
                        ...current,
                        name:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="Maximum Retry Limit"
                  style={{
                    width:
                      "100%",
                    height:
                      "44px",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>

              {/* DESCRIPTION */}

              <div
                className="form-group"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                <label
                  style={{
                    fontWeight:
                      650,
                    marginBottom:
                      "7px",
                    display:
                      "block",
                  }}
                >
                  Description
                </label>

                <textarea
                  value={
                    newPolicy.description
                  }
                  onChange={(
                    e
                  ) =>
                    setNewPolicy(
                      (
                        current
                      ) => ({
                        ...current,
                        description:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="Describe what this policy controls..."
                  rows={4}
                  style={{
                    width:
                      "100%",
                    resize:
                      "vertical",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>

              {/* ENABLED */}

              <label
                htmlFor="new-policy-enabled"
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  marginTop:
                    "18px",
                  padding:
                    "12px 13px",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(128,128,128,0.06)",
                  cursor:
                    "pointer",
                  fontSize:
                    "13px",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    newPolicy.enabled ===
                    true
                  }
                  onChange={(
                    e
                  ) =>
                    setNewPolicy(
                      (
                        current
                      ) => ({
                        ...current,
                        enabled:
                          e.target.checked,
                      })
                    )
                  }
                  id="new-policy-enabled"
                />

                <span>
                  Enable policy immediately
                </span>
              </label>
            </div>

            {/* FOOTER */}

            <div
              className="modal-footer"
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: "9px",
                padding:
                  "16px 22px",
              }}
            >
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowCreate(
                    false
                  )
                }
                disabled={
                  saving ===
                  "CREATE"
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={
                  handleCreate
                }
                disabled={
                  saving ===
                  "CREATE"
                }
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "7px",
                }}
              >
                <Plus
                  size={17}
                />

                {saving ===
                "CREATE"
                  ? "Creating..."
                  : "Create Policy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SMALL UI ANIMATIONS
      ======================================================== */}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          .policy-row:hover {
            background: rgba(128,128,128,0.035);
          }

          .policy-row .icon-btn:hover {
            transform: translateY(-1px);
          }

          .policy-row .toggle:hover {
            transform: scale(1.04);
          }

          .modal-overlay {
            backdrop-filter: blur(5px);
          }

          @media (max-width: 650px) {
            .policy-row {
              align-items: flex-start !important;
              flex-direction: column !important;
            }

            .policy-row > div:last-child {
              width: 100%;
              justify-content: flex-end;
            }
          }

          @media (max-width: 520px) {
            .modal-body > div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}