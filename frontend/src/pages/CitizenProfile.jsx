
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./CitizenProfile.css";

export default function CitizenProfile() {
  const navigate = useNavigate();

  const [citizen, setCitizen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/citizen/me", {
          credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load your profile.");
        }

        const data = await response.json();

        if (!cancelled) {
          setCitizen(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <main className="citizen-profile-page">
        <div className="profile-loading">Loading your profile...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="citizen-profile-page">
        <div className="profile-error">
          <h2>Unable to load profile</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/citizen/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const displayName =
    citizen?.name || citizen?.fullName || "Citizen";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

 
const details = [
  {
    label: "Full Name",
    value: citizen?.fullName,
    icon: "👤",
  },
  {
    label: "Email Address",
    value: citizen?.email,
    icon: "✉️",
  },
  {
    label: "Locality / Area",
    value: citizen?.localityName,
    icon: "📍",
  },
  {
    label: "Account Role",
    value: citizen?.role,
    icon: "🛡️",
  },
];

  return (
    <main className="citizen-profile-page">
      <header className="profile-navbar">
        <Link to="/citizen/dashboard" className="profile-brand">
          CivicPulse
        </Link>

        <Link
          to="/citizen/dashboard"
          className="profile-back-link"
        >
          ← Back to Dashboard
        </Link>
      </header>

      <div className="profile-container">
        <div className="profile-heading">
          <p className="profile-eyebrow">CITIZEN ACCOUNT</p>
          <h1>My Profile</h1>
          <p>
            View your account details and registered locality.
          </p>
        </div>

        <section className="profile-hero">
          <div className="profile-avatar">
            {initials || "C"}
          </div>

          <div className="profile-hero-info">
            <span className="profile-role-badge">
              {citizen?.role || "Citizen"}
            </span>
            <h2>{displayName}</h2>
            <p>{citizen?.email || "Email not available"}</p>
            <span className="profile-account-status">
              <span className="profile-status-dot" />
              Account information loaded
            </span>
          </div>
        </section>

        <section className="profile-details-card">
          <div className="profile-section-heading">
            <div>
              <h2>Personal Information</h2>
              <p>Your registered account details</p>
            </div>
            <span className="profile-lock-icon">🔒</span>
          </div>

          <div className="profile-details-grid">
            {details.map((item) => (
              <div className="profile-detail" key={item.label}>
                <div className="profile-detail-icon">
                  {item.icon}
                </div>

                <div className="profile-detail-content">
                  <span>{item.label}</span>
                  <strong>
                    {item.value !== undefined &&
                    item.value !== null &&
                    String(item.value).trim() !== ""
                      ? item.value
                      : "Not provided"}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-info-note">
          <span className="profile-note-icon">ℹ️</span>
          <div>
            <h3>Keep your information up to date</h3>
            <p>
              If your registered details need to be changed, contact
              your CivicPulse administrator. Profile editing is not
              enabled on this page.
            </p>
          </div>
        </section>

        <div className="profile-footer-actions">
          <Link
            to="/citizen/dashboard"
            className="profile-primary-button"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
