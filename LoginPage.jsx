import React, {
  useState
} from "react";

import {
  ShieldCheck,
  LockKeyhole,
  ArrowRight,
  AlertCircle
} from "lucide-react";

import {
  useNavigate
} from "react-router-dom";

import {
  loginUser
} from "../services/api";


export default function LoginPage() {

  const navigate =
    useNavigate();


  const [
    email,
    setEmail
  ] = useState("");


  const [
    password,
    setPassword
  ] = useState("");


  const [
    error,
    setError
  ] = useState("");


  const [
    loading,
    setLoading
  ] = useState(false);


  async function handleLogin(e) {

    e.preventDefault();

    setError("");


    if (!email.trim() || !password) {

      setError(
        "Please enter your email and password."
      );

      return;

    }


    try {

      setLoading(true);


      const response =
        await loginUser(
          email.trim(),
          password
        );


      if (!response?.success) {

        throw new Error(
          "Login failed."
        );

      }


      /*
       * Store only authentication state
       * and user email.
       *
       * The password is NEVER stored
       * in localStorage.
       */

      localStorage.setItem(
        "reviveai_authenticated",
        "true"
      );


      localStorage.setItem(
        "reviveai_user",
        response.user?.email ||
        email.trim()
      );


      localStorage.setItem(
        "reviveai_role",
        response.user?.role ||
        "ADMIN"
      );


      navigate(
        "/dashboard"
      );


    } catch (e) {

      console.error(
        "Login error:",
        e
      );


      const message =
        e?.response?.data?.detail ||
        "Invalid email or password.";


      setError(
        message
      );


    } finally {

      setLoading(false);

    }

  }


  return (

    <div
      className="login-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#0c0d0b",
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: "430px",
        }}
      >

        {/* ==================================================
            BRAND
        ================================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "30px",
          }}
        >

          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "11px",
              background: "#d9a441",
              color: "#17140c",
              display: "grid",
              placeItems: "center",
            }}
          >

            <ShieldCheck
              size={24}
            />

          </div>


          <div>

            <strong
              style={{
                display: "block",
                color: "#f1eadc",
                fontSize: "21px",
                fontFamily:
                  "Space Grotesk, sans-serif",
              }}
            >
              Revive<span
                style={{
                  color: "#d9a441"
                }}
              >
                AI
              </span>
            </strong>


            <small
              style={{
                display: "block",
                marginTop: "3px",
                color: "#777970",
                fontSize: "10px",
              }}
            >
              Revenue Recovery Control Tower
            </small>

          </div>

        </div>


        {/* ==================================================
            LOGIN CARD
        ================================================== */}

        <div
          style={{
            background: "#12130f",
            border:
              "1px solid #292a24",
            borderRadius: "14px",
            padding: "28px",
          }}
        >

          <div
            style={{
              marginBottom: "25px",
            }}
          >

            <div
              style={{
                color: "#d9a441",
                fontSize: "9px",
                letterSpacing: "1.5px",
                fontWeight: "700",
                marginBottom: "9px",
              }}
            >
              SECURE ACCESS
            </div>


            <h1
              style={{
                margin: 0,
                color: "#f1eadc",
                fontSize: "27px",
                fontFamily:
                  "Space Grotesk, sans-serif",
              }}
            >
              Sign in
            </h1>


            <p
              style={{
                color: "#85877f",
                fontSize: "12px",
                lineHeight: "1.6",
                marginTop: "8px",
              }}
            >
              Access the ReviveAI revenue
              recovery control tower.
            </p>

          </div>


          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "9px",
                padding: "11px 12px",
                marginBottom: "17px",
                borderRadius: "8px",
                background: "#2b1715",
                border:
                  "1px solid #59302b",
                color: "#e47b72",
                fontSize: "11px",
                lineHeight: "1.5",
              }}
            >

              <AlertCircle
                size={16}
                style={{
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              />

              <span>
                {error}
              </span>

            </div>

          )}


          {/* ==================================================
              FORM
          ================================================== */}

          <form
            onSubmit={handleLogin}
          >

            <label
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#aaa",
                fontSize: "10px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              Email
            </label>


            <div
              style={{
                position: "relative",
                marginBottom: "17px",
              }}
            >

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="admin@reviveai.ai"
                autoComplete="username"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  height: "43px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border:
                    "1px solid #292a24",
                  background: "#0e0f0c",
                  color: "#f1eadc",
                  outline: "none",
                  fontSize: "12px",
                }}
              />

            </div>


            <label
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#aaa",
                fontSize: "10px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              Password
            </label>


            <div
              style={{
                position: "relative",
                marginBottom: "22px",
              }}
            >

              <LockKeyhole
                size={15}
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "14px",
                  color: "#666960",
                }}
              />


              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  height: "43px",
                  padding:
                    "0 12px 0 37px",
                  borderRadius: "8px",
                  border:
                    "1px solid #292a24",
                  background: "#0e0f0c",
                  color: "#f1eadc",
                  outline: "none",
                  fontSize: "12px",
                }}
              />

            </div>


            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "44px",
                border: "1px solid #3d3a30",
                borderRadius: "8px",
                background:
                  loading
                    ? "#8d713c"
                    : "#dfb15c",
                color: "#19160f",
                fontWeight: "700",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor:
                  loading
                    ? "default"
                    : "pointer",
              }}
            >

              {loading
                ? "Signing in..."
                : "Sign in"}

              {!loading && (
                <ArrowRight
                  size={16}
                />
              )}

            </button>

          </form>

        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          style={{
            textAlign: "center",
            marginTop: "18px",
            color: "#555850",
            fontSize: "9px",
          }}
        >
          ReviveAI • Revenue Recovery Control Tower
        </div>

      </div>

    </div>

  );

}