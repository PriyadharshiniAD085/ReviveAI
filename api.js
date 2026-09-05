import axios from "axios";

/* ============================================================
   API CLIENT
   ============================================================ */

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000",

  // Increased from 10 seconds to prevent
  // timeout errors during MySQL/API operations.
  timeout: 30000,

  headers: {
    "Content-Type": "application/json",
  },
});


/* ============================================================
   AXIOS ERROR HANDLER
   ============================================================ */

api.interceptors.response.use(
  (response) => response,

  (error) => {
    console.error(
      "API Error:",
      error?.response?.status,
      error?.response?.data || error?.message
    );

    return Promise.reject(error);
  }
);


/* ============================================================
   HELPERS
   ============================================================ */

const unwrapList = (data) => {

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.cases)) {
    return data.cases;
  }

  if (Array.isArray(data?.transactions)) {
    return data.transactions;
  }

  if (Array.isArray(data?.events)) {
    return data.events;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};


/* ============================================================
   AUTHENTICATION
   ============================================================ */

export async function loginUser(
  email,
  password
) {

  const response = await api.post(
    "/api/auth/login",
    {
      email,
      password,
    }
  );

  return response.data;
}


/* ============================================================
   HEALTH
   ============================================================ */

export async function getHealth() {

  const response =
    await api.get("/");

  return response.data;
}


/* ============================================================
   DASHBOARD
   ============================================================ */

export async function getDashboard() {

  const response =
    await api.get("/api/dashboard");

  return response.data;
}


/* ============================================================
   RECOVERY SCAN
   ============================================================ */

export async function runRecoveryScan() {

  const response =
    await api.post("/api/scan");

  return response.data;
}


/* ============================================================
   RECOVERY CASES
   ============================================================ */

export async function getCases() {

  const response =
    await api.get("/api/cases");

  return unwrapList(
    response.data
  );
}


export async function getCase(
  caseId
) {

  const response =
    await api.get(
      `/api/cases/${caseId}`
    );

  return response.data;
}


/* ============================================================
   AUTOMATED RECOVERY
   ============================================================ */

export async function recoverCase(
  caseId
) {

  const response =
    await api.post(
      `/api/cases/${caseId}/recover`
    );

  return response.data;
}


/* ============================================================
   HUMAN APPROVED RECOVERY
   ============================================================ */

export async function approveAndRecover(
  caseId
) {

  const response =
    await api.post(
      `/api/cases/${caseId}/approve-recover`
    );

  return response.data;
}


/* ============================================================
   TRANSACTIONS
   ============================================================ */

export async function getTransactions() {

  const response =
    await api.get(
      "/api/transactions"
    );

  return unwrapList(
    response.data
  );
}


export async function getTransaction(
  transactionId
) {

  const response =
    await api.get(
      `/api/transactions/${transactionId}`
    );

  return response.data;
}


/* ============================================================
   AUDIT
   ============================================================ */

export async function getAudit() {

  const response =
    await api.get(
      "/api/audit"
    );

  return unwrapList(
    response.data
  );
}


/* ============================================================
   ML
   ============================================================ */

export async function getMLStatus() {

  const response =
    await api.get(
      "/api/ml/status"
    );

  return response.data;
}


export async function getTransactionPrediction(
  transactionId
) {

  const response =
    await api.get(
      `/api/transactions/${transactionId}/prediction`
    );

  return response.data;
}


/* ============================================================
   RAZORPAY
   ============================================================ */

export async function getRazorpayStatus() {

  const response =
    await api.get(
      "/api/razorpay/status"
    );

  return response.data;
}


export async function getRazorpayPayments() {

  const response =
    await api.get(
      "/api/razorpay/payments"
    );

  return unwrapList(
    response.data
  );
}


/* ============================================================
   POLICIES
   ============================================================ */

/*
   POLICY SAFETY LOCKER

   React
      ↓
   FastAPI
      ↓
   MySQL policy_credentials
      ↓
   Password verification
*/


export async function unlockPolicies(
  password
) {

  const response =
    await api.post(
      "/api/policies/unlock",
      {
        password,
      }
    );

  return response.data;
}


/* ============================================================
   GET POLICIES
   ============================================================ */

export async function getPolicies() {

  const response =
    await api.get(
      "/api/policies"
    );

  return unwrapList(
    response.data
  );
}


/* ============================================================
   UPDATE POLICY
   ============================================================ */

export async function updatePolicy(
  code,
  payload
) {

  const response =
    await api.put(
      `/api/policies/${code}`,
      payload
    );

  return response.data;
}

// ============================================================
// POLICY UPDATE STATUS
// ============================================================

export async function getPolicyUpdateStatus() {
  const response = await api.get(
    "/api/policies/update-status"
  );

  return response.data;
}

/* ============================================================
   CREATE POLICY
   ============================================================ */

export async function createPolicy(
  payload
) {

  const response =
    await api.post(
      "/api/policies",
      payload
    );

  return response.data;
}


/* ============================================================
   DEFAULT EXPORT
   ============================================================ */

export default api;