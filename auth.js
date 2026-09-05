export function logout() {
  localStorage.removeItem("reviveai_authenticated");
  localStorage.removeItem("reviveai_user");

  window.location.href = "/login";
}