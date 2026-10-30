import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Auth.css";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [localities, setLocalities] = useState([]);

  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [localityId, setLocalityId] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStates() {
      try {
        const response = await fetch("/api/locations/states");

        if (!response.ok) {
          throw new Error("Could not load location data.");
        }

        const data = await response.json();
        setStates(data);

        if (data.length === 0) {
          setMessage("No states are available yet.");
          setMessageType("error");
        }
      } catch {
        setMessage("Unable to load locations. Please refresh the page.");
        setMessageType("error");
      }
    }

    loadStates();
  }, []);

  async function handleStateChange(event) {
    const id = event.target.value;

    setStateId(id);
    setCityId("");
    setLocalityId("");
    setCities([]);
    setLocalities([]);
    setMessage("");
    setMessageType("");

    if (!id) return;

    try {
      const response = await fetch(
        `/api/locations/states/${id}/cities`
      );

      if (!response.ok) {
        throw new Error("Could not load cities.");
      }

      setCities(await response.json());
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    }
  }

  async function handleCityChange(event) {
    const id = event.target.value;

    setCityId(id);
    setLocalityId("");
    setLocalities([]);
    setMessage("");
    setMessageType("");

    if (!id) return;

    try {
      const response = await fetch(
        `/api/locations/cities/${id}/localities`
      );

      if (!response.ok) {
        throw new Error("Could not load localities.");
      }

      const data = await response.json();
      setLocalities(data);

      if (data.length === 0) {
        setMessage("No localities are available for this city.");
        setMessageType("error");
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!stateId || !cityId || !localityId) {
      setMessage("Please select your complete location.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    const requestData = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      localityId: Number(localityId),
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed. Please try again."
        );
      }

      setMessage(
        data.message ||
          "Registration successful! You can now sign in."
      );
      setMessageType("success");

      setFullName("");
      setEmail("");
      setPassword("");
      setStateId("");
      setCityId("");
      setLocalityId("");
      setCities([]);
      setLocalities([]);
    } catch (error) {
      setMessage(error.message);
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
            JOIN YOUR COMMUNITY
          </span>

          <h1>Make a difference where you live.</h1>

          <p>
            Create your CivicPulse account to report community
            issues and follow their progress.
          </p>

          <div className="auth-highlight">
            <span>✓</span>
            Every citizen can help build a better neighbourhood.
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-heading">
            <h2>Create your account</h2>
            <p>Enter your details to get started.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
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
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="state">State</label>
              <select
                id="state"
                value={stateId}
                onChange={handleStateChange}
                required
              >
                <option value="">Select state</option>
                {states.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="auth-field">
              <label htmlFor="city">City</label>
              <select
                id="city"
                value={cityId}
                onChange={handleCityChange}
                disabled={!stateId}
                required
              >
                <option value="">Select city</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="auth-field">
              <label htmlFor="locality">Locality</label>
              <select
                id="locality"
                value={localityId}
                onChange={(event) => setLocalityId(event.target.value)}
                disabled={!cityId}
                required
              >
                <option value="">Select locality</option>
                {localities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
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
              {loading ? "Creating account..." : "Create Account →"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}