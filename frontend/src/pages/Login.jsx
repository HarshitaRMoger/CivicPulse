import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setMessageType("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Invalid email or password.");
        setMessageType("error");
        return;
      }

      const redirectUrl = data.redirectUrl;

      if (!redirectUrl) {
        console.error("Login API response:", data);
        setMessage("Login succeeded, but no dashboard URL was returned.");
        setMessageType("error");
        return;
      }

      // Citizen dashboard: use the React route.
      if (
        redirectUrl.endsWith("/citizen-dashboard.html") ||
        redirectUrl.endsWith("/dashboard.html") ||
        redirectUrl === "/dashboard" ||
        redirectUrl.endsWith("/dashboard")
      ) {
        navigate("/citizen-dashboard", { replace: true });
        return;
      }

      // Keep existing backend dashboards for other roles.
     if (
  redirectUrl.endsWith("/area-admin-dashboard.html") ||
  redirectUrl.endsWith("/area-admin-dashboard")
) {
  navigate("/area-admin-dashboard", { replace: true });
  return;
}


if (
  redirectUrl.endsWith("/super-admin-dashboard.html") ||
  redirectUrl.endsWith("/super-admin-dashboard")
) {
  navigate("/super-admin-dashboard", { replace: true });
  return;
}


      console.error("Unexpected dashboard URL:", redirectUrl);
      setMessage(`Unexpected dashboard URL: ${redirectUrl}`);
      setMessageType("error");
    } catch (error) {
      console.error("Login error:", error);
      setMessage(
        "Unable to connect to the server. Please check your connection."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="navbar">
        <Link to="/" className="logo">
          <span className="logo-icon">C</span>
          <span>
            Civic<span className="logo-accent">Pulse</span>
          </span>
        </Link>

        <Link to="/" className="back-link">
          ← Back to home
        </Link>
      </header>

      <main className="auth-layout">
        <section className="auth-banner">
          <span className="section-label light-label">
            WELCOME BACK
          </span>

          <h1>Your community. Your voice.</h1>

          <p>
            Sign in to CivicPulse to participate in making
            your neighbourhood cleaner, safer and better.
          </p>

          <div className="auth-highlight">
            <span>✓</span>
            Every report is a step towards positive change.
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-heading">
            <h2>Welcome back!</h2>
            <p>Enter your credentials to sign in.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email address</label>

              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>

              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {message && (
              <p
                className={`form-message ${messageType}`}
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/register">Create account</Link>
          </p>
        </section>
      </main>
    </div>
  );
}