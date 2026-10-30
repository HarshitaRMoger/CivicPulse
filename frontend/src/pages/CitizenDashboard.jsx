



import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";

const MAX_DESCRIPTION_LENGTH = 180;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const progressSteps = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

function formatStatus(status) {
  return (status || "SUBMITTED").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function getNotificationReadState(notification) {
  return notification.read === true || notification.isRead === true;
}

function getStatusClass(status) {
  return (status || "SUBMITTED").toLowerCase().replaceAll("_", "-");
}

function getProgressIndex(status) {
  const index = progressSteps.findIndex(
    (step) => step.value === (status || "SUBMITTED").toUpperCase()
  );

  return index === -1 ? 0 : index;
}

export default function CitizenDashboard() {
  const navigate = useNavigate();

  // Citizen profile and reports
  const [citizen, setCitizen] = useState(null);
  const [reports, setReports] = useState([]);

  // Report search, filtering and sorting
  const [reportSearch, setReportSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reportSort, setReportSort] = useState("NEWEST");

  // Report submission form
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // General page messages and loading
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Status history
  const [historyByIssue, setHistoryByIssue] = useState({});
  const [historyLoading, setHistoryLoading] = useState({});
  const [historyErrors, setHistoryErrors] = useState({});
  const [expandedHistory, setExpandedHistory] = useState({});

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [markingRead, setMarkingRead] = useState({});

  // Statistics based on the citizen's reports
  const reportStats = useMemo(() => {
    const statusOf = (report) =>
      (report.status || "SUBMITTED").toUpperCase();

    return {
      total: reports.length,
      pending: reports.filter((report) =>
        ["SUBMITTED", "UNDER_REVIEW"].includes(statusOf(report))
      ).length,
      inProgress: reports.filter(
        (report) => statusOf(report) === "IN_PROGRESS"
      ).length,
      resolved: reports.filter(
        (report) => statusOf(report) === "RESOLVED"
      ).length,
    };
  }, [reports]);

  // Filter and sort reports without changing the original array
 // Filter and sort reports without changing the original array
const filteredReports = useMemo(() => {
  const search = reportSearch.trim().toLowerCase();

  const filtered = reports.filter((report) => {
    const matchesSearch =
      !search ||
      String(report.id ?? "").toLowerCase().includes(search) ||
      String(report.category ?? "").toLowerCase().includes(search) ||
      String(report.description ?? "").toLowerCase().includes(search);

    const status = (report.status || "SUBMITTED").toUpperCase();

    const matchesStatus =
      statusFilter === "ALL" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return filtered.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();

    return reportSort === "NEWEST"
      ? dateB - dateA
      : dateA - dateB;
  });
}, [reports, reportSearch, statusFilter, reportSort]);

  // Release the temporary image preview URL when it changes or the
  // component is unmounted.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  function clearMessage() {
    setMessage("");
    setMessageType("");
  }

  // Load the citizen's own reports
  async function loadMyReports() {
    setReportsLoading(true);

    try {
      const response = await fetch("/api/citizen/issues", {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load saved reports.");
      }

      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage(error.message || "Unable to load reports.", "error");
    } finally {
      setReportsLoading(false);
    }
  }

  // Load notifications from the backend
  async function loadNotifications() {
    setNotificationsLoading(true);
    setNotificationError("");

    try {
      const response = await fetch("/api/citizen/notifications", {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load notifications.");
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : [];

      setNotifications(items);
      setUnreadCount(
        items.filter((item) => !getNotificationReadState(item)).length
      );
    } catch (error) {
      setNotificationError(
        error.message || "Unable to load notifications."
      );
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function toggleNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (nextOpen) {
      await loadNotifications();
    }
  }

  // Mark one notification as read
  async function markNotificationAsRead(notificationId) {
    const notification = notifications.find(
      (item) => item.id === notificationId
    );

    if (!notification || getNotificationReadState(notification)) {
      return;
    }

    setMarkingRead((previous) => ({
      ...previous,
      [notificationId]: true,
    }));

    setNotificationError("");

    try {
      const response = await fetch(
        `/api/citizen/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to mark notification as read."
        );
      }

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notificationId
            ? { ...item, read: true, isRead: true }
            : item
        )
      );
      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (error) {
      setNotificationError(
        error.message || "Unable to update notification."
      );
    } finally {
      setMarkingRead((previous) => ({
        ...previous,
        [notificationId]: false,
      }));
    }
  }

  // Log the citizen out
  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to log out.");
      }

      navigate("/login", { replace: true });
    } catch (error) {
      showMessage(error.message || "Unable to log out.", "error");
    }
  }

  // Load status history for a report
  async function loadIssueHistory(issueId) {
    setHistoryLoading((previous) => ({
      ...previous,
      [issueId]: true,
    }));

    setHistoryErrors((previous) => ({
      ...previous,
      [issueId]: "",
    }));

    try {
      const response = await fetch(
        `/api/citizen/issues/${issueId}/history`,
        { credentials: "include" }
      );

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load status history.");
      }

      const data = await response.json();

      setHistoryByIssue((previous) => ({
        ...previous,
        [issueId]: Array.isArray(data) ? data : [],
      }));
    } catch (error) {
      setHistoryErrors((previous) => ({
        ...previous,
        [issueId]: error.message || "Unable to load status history.",
      }));
    } finally {
      setHistoryLoading((previous) => ({
        ...previous,
        [issueId]: false,
      }));
    }
  }

  async function toggleHistory(issueId) {
    const isExpanded = Boolean(expandedHistory[issueId]);

    setExpandedHistory((previous) => ({
      ...previous,
      [issueId]: !isExpanded,
    }));

    if (!isExpanded && !historyByIssue[issueId]) {
      await loadIssueHistory(issueId);
    }
  }

  // Validate and preview an uploaded photo
  function handlePhotoChange(event) {
    const selectedFile = event.target.files?.[0];

    clearMessage();

    if (!selectedFile) {
      setPhoto(null);
      setPreviewUrl("");
      return;
    }

    if (!ALLOWED_PHOTO_TYPES.includes(selectedFile.type)) {
      showMessage(
        "Please upload a JPEG, PNG, or WebP image.",
        "error"
      );
      event.target.value = "";
      setPhoto(null);
      setPreviewUrl("");
      return;
    }

    if (selectedFile.size > MAX_PHOTO_SIZE) {
      showMessage("The photo must be 5 MB or smaller.", "error");
      event.target.value = "";
      setPhoto(null);
      setPreviewUrl("");
      return;
    }

    setPhoto(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  // Submit a new civic issue report
  async function handleSubmitReport(event) {
    event.preventDefault();
    clearMessage();

    if (!category) {
      showMessage("Please select an issue category.", "error");
      return;
    }

    if (!description.trim()) {
      showMessage("Please enter an issue description.", "error");
      return;
    }

    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      showMessage(
        `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
        "error"
      );
      return;
    }

    const formData = new FormData();
    formData.append("category", category);
    formData.append("description", description.trim());

    if (photo) {
      formData.append("photo", photo);
    }

    setLoading(true);

    try {
      const response = await fetch("/api/citizen/issues", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to submit your report."
        );
      }

      setCategory("");
      setDescription("");
      setPhoto(null);
      setPreviewUrl("");

      const fileInput = document.getElementById("issue-photo");
      if (fileInput) {
        fileInput.value = "";
      }

      showMessage(
        result.message || "Your issue report was submitted successfully.",
        "success"
      );

      await loadMyReports();
    } catch (error) {
      showMessage(
        error.message || "Something went wrong while submitting.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  // Initialize the dashboard
  useEffect(() => {
    let cancelled = false;

    async function initializeDashboard() {
      try {
        const response = await fetch("/api/citizen/me", {
          credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error("Could not verify your session.");
        }

        const citizenData = await response.json();

        if (cancelled) return;
        setCitizen(citizenData);

        const reportsResponse = await fetch("/api/citizen/issues", {
          credentials: "include",
        });

        if (
          reportsResponse.status === 401 ||
          reportsResponse.status === 403
        ) {
          navigate("/login", { replace: true });
          return;
        }

        if (!reportsResponse.ok) {
          throw new Error("Unable to load saved reports.");
        }

        const reportsData = await reportsResponse.json();

        if (cancelled) return;
        setReports(Array.isArray(reportsData) ? reportsData : []);

        const notificationResponse = await fetch(
          "/api/citizen/notifications",
          { credentials: "include" }
        );

        if (
          notificationResponse.status === 401 ||
          notificationResponse.status === 403
        ) {
          navigate("/login", { replace: true });
          return;
        }

        if (!notificationResponse.ok) {
          throw new Error("Unable to load notifications.");
        }

        const notificationData = await notificationResponse.json();

        if (cancelled) return;

        const items = Array.isArray(notificationData)
          ? notificationData
          : [];

        setNotifications(items);
        setUnreadCount(
          items.filter((item) => !getNotificationReadState(item)).length
        );
      } catch (error) {
        if (!cancelled) {
          showMessage(
            error.message || "Unable to initialize the dashboard.",
            "error"
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
          setReportsLoading(false);
        }
      }
    }

    initializeDashboard();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Refresh notifications periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="citizen-dashboard-page">
      {/* Navigation */}
      <nav className="navbar">
        <Link to="/citizen/dashboard" className="navbar-brand">
          CivicPulse
        </Link>

        <div className="navbar-actions">
         <Link to="/citizen/profile" className="profile-nav-link">
    My Profile
  </Link>
          <div className="notification-wrapper">
            <button
              type="button"
              className="notification-button"
              onClick={toggleNotifications}
              aria-expanded={notificationsOpen}
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <span aria-hidden="true">🔔</span>
              <span>Notifications</span>

              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="notification-panel">
                <div className="notification-panel-header">
                  <h3>Notifications</h3>

                  <div className="notification-panel-actions">
                    
<button
  type="button"
  className="notification-refresh-button icon-button"
  onClick={loadNotifications}
  disabled={notificationsLoading}
  aria-label="Refresh notifications"
  title="Refresh notifications"
>
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={notificationsLoading ? "spinning" : ""}
  >
    <path d="M20 7v5h-5" />
    <path d="M4 17v-5h5" />
    <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12" />
    <path d="M18.4 15a7 7 0 0 1-11.6 2L4 12" />
  </svg>
</button>


                    <button
                      type="button"
                      className="notification-close-button"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notifications"
                      title="Close notifications"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {notificationError && (
                  <p className="message error-message">
                    {notificationError}
                  </p>
                )}

                {notificationsLoading ? (
                  <p className="empty-state">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <p className="empty-state">
                    You don't have any notifications yet.
                  </p>
                ) : (
                  <div className="notification-list">
                    
{notifications.map((notification) => {
  const isRead = getNotificationReadState(notification);

  return (
    <div
      key={notification.id}
      className={`notification-item ${isRead ? "read" : "unread"}`}
    >
      <span
        className={`notification-unread-dot ${isRead ? "read" : ""}`}
        aria-hidden="true"
      />

      <div className="notification-content">
        <p className="notification-message">
          {notification.message ||
            notification.title ||
            "You have a new notification."}
        </p>

        <div className="notification-meta">
          <span>
            {formatDate(
              notification.createdAt || notification.timestamp
            )}
          </span>

          <span className="notification-time">
            {isRead ? "✓ Read" : "New"}
          </span>
        </div>

        {!isRead && (
          <button
            type="button"
            className="mark-read-button"
            onClick={() => markNotificationAsRead(notification.id)}
            disabled={Boolean(markingRead[notification.id])}
          >
            {markingRead[notification.id] ? "Marking..." : "Mark as read"}
          </button>
        )}
      </div>
    </div>
  );
})}

                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main dashboard */}
      <main className="dashboard">
        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">CITIZEN WORKSPACE</p>
            <h1>
              Welcome
              {citizen?.name ? `, ${citizen.name}` : ""}!
            </h1>
            <p>
              Report community issues and follow their progress in one place.
            </p>
          </div>

          {citizen?.area && (
            <div className="citizen-area">
              <span aria-hidden="true">📍</span>
              <span>{citizen.area}</span>
            </div>
          )}
        </section>

        {message && (
          <div
            className={`message ${
              messageType === "error"
                ? "error-message"
                : "success-message"
            }`}
            role="status"
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={clearMessage}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        
{/* Professional Dashboard Statistics */}
<section className="citizen-report-stats">

  {/* Total Reports */}
  <article className="dashboard-card stat-card">
    <div className="stat-icon stat-total">
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>
        <path d="M14 3v5h5"/>
        <path d="M9 13h7M9 17h7M9 9h1"/>
      </svg>
    </div>
    <div className="stat-content">
      <p>Total Reports</p>
      <h2>{reportStats.total}</h2>
      <span className="stat-description">Issues submitted</span>
    </div>
  </article>

  {/* Pending Reports */}
  <article className="dashboard-card stat-card">
    <div className="stat-icon stat-pending">
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 2"/>
      </svg>
    </div>
    <div className="stat-content">
      <p>Pending</p>
      <h2>{reportStats.pending}</h2>
      <span className="stat-description">Awaiting review</span>
    </div>
  </article>

  {/* In Progress Reports */}
  <article className="dashboard-card stat-card">
    <div className="stat-icon stat-progress">
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a5 5 0 0 0-6.9 6.9L3 18l3 3 4.8-4.8a5 5 0 0 0 6.9-6.9l-3.1 3.1-3-3 3.1-3.1Z"/>
        <path d="m15 9 3-3 3 3-3 3"/>
      </svg>
    </div>
    <div className="stat-content">
      <p>In Progress</p>
      <h2>{reportStats.inProgress}</h2>
      <span className="stat-description">Being addressed</span>
    </div>
  </article>

  {/* Resolved Reports */}
  <article className="dashboard-card stat-card">
    <div className="stat-icon stat-resolved">
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="m8 12 2.5 2.5L16 9"/>
      </svg>
    </div>
    <div className="stat-content">
      <p>Resolved</p>
      <h2>{reportStats.resolved}</h2>
      <span className="stat-description">Successfully resolved</span>
    </div>
  </article>

</section>


        {/* Submit a new report */}
        <section className="dashboard-card issue-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">MAKE A DIFFERENCE</p>
              <h2>Report a Community Issue</h2>
              <p>
                Tell your local administration about a problem in your area.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitReport}>
            <div className="form-group">
              <label htmlFor="issue-category">Issue Category *</label>

              <select
                id="issue-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                
<option value="">Select a category</option>
<option value="ROADS">Roads and Potholes</option>
<option value="WATER">Water Supply</option>
<option value="STREETLIGHT">Streetlights</option>
<option value="WASTE">Garbage and Waste</option>
<option value="DRAINAGE">Drainage and Sewage</option>
<option value="OTHER">Other</option>

              </select>
            </div>

            <div className="form-group">
              <label htmlFor="issue-description">
                Description *
              </label>

              <textarea
                id="issue-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value.slice(0, MAX_DESCRIPTION_LENGTH)
                  )
                }
                placeholder="Describe the issue and where it is happening..."
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={4}
                required
              />

              <small className="character-count">
                {description.length}/{MAX_DESCRIPTION_LENGTH} characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="issue-photo">
                Attach a Photo (Optional)
              </label>

              <input
                id="issue-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
              />

              <small>
                Accepted formats: JPEG, PNG, WebP. Maximum size: 5 MB.
              </small>

              {previewUrl && (
                <div className="photo-preview">
                  <img src={previewUrl} alt="Selected issue preview" />

                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPreviewUrl("");

                      const fileInput =
                        document.getElementById("issue-photo");

                      if (fileInput) fileInput.value = "";
                    }}
                  >
                    Remove photo
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={loading || profileLoading}
            >
              {loading ? "Submitting..." : "Submit Issue Report"}
            </button>
          </form>
        </section>

        {/* Submitted reports */}
        <section className="dashboard-card issue-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">YOUR ACTIVITY</p>
              <h2>My Submitted Reports</h2>
              <p>
                Search your reports, filter them by status, and track updates.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={loadMyReports}
              disabled={reportsLoading}
            >
              {reportsLoading ? "Refreshing..." : "Refresh Reports"}
            </button>
          </div>

          {/* Search, status filter and sorting */}
          <div className="citizen-report-filters">
            <input
              type="search"
              placeholder="Search by issue ID, category, or description..."
              value={reportSearch}
              onChange={(event) => setReportSearch(event.target.value)}
              aria-label="Search submitted reports"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter reports by status"
            >
              <option value="ALL">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={reportSort}
              onChange={(event) => setReportSort(event.target.value)}
              aria-label="Sort reports"
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
            </select>

            <button
              type="button"
              className="history-toggle"
              onClick={() => {
                setReportSearch("");
                setStatusFilter("ALL");
                setReportSort("NEWEST");
              }}
            >
              Clear Filters
            </button>
          </div>

          <p className="report-filter-count">
            Showing {filteredReports.length} of {reports.length} reports
          </p>

          {reportsLoading ? (
            <p className="empty-state">Loading your reports...</p>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <span aria-hidden="true">📭</span>
              <h3>No reports yet</h3>
              <p>
                When you submit a community issue, it will appear here.
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-state">
              <h3>No matching reports</h3>
              <p>
                Try another search term or change your status filter.
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setReportSearch("");
                  setStatusFilter("ALL");
                  setReportSort("NEWEST");
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="submitted-reports-list">
              {filteredReports.map((report) => {
                const status = (
                  report.status || "SUBMITTED"
                ).toUpperCase();

                const progressIndex = getProgressIndex(status);
                const isRejected = status === "REJECTED";

                return (
                  <article
                    className="submitted-report"
                    key={report.id}
                  >
                    <div className="report-card-header">
                      <div>
                        <p className="report-id">
                          Report #{report.id}
                        </p>
                        <h3>{report.category || "Community Issue"}</h3>
                      </div>

                      <span
                        className={`status-badge status-${getStatusClass(
                          status
                        )}`}
                      >
                        {formatStatus(status)}
                      </span>
                    </div>

                    <p className="report-description">
                      {report.description || "No description provided."}
                    </p>

                    <div className="report-meta">
                      <span>
                        <strong>Submitted:</strong>{" "}
                        {formatDate(report.createdAt)}
                      </span>

                      {report.updatedAt && (
                        <span>
                          <strong>Updated:</strong>{" "}
                          {formatDate(report.updatedAt)}
                        </span>
                      )}
                    </div>

                    {report.photoUrl && (
                      <div className="report-photo">
                        <img
                          src={report.photoUrl}
                          alt={`Photo attached to report ${report.id}`}
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Progress indicator */}
                    {!isRejected && (
                      <div className="issue-progress">
                        <h4>Resolution Progress</h4>

                        <div className="progress-steps">
                          {progressSteps.map((step, index) => {
                            const isComplete = index < progressIndex;
                            const isCurrent = index === progressIndex;

                            return (
                              <div
                                key={step.value}
                                className={`progress-step ${
                                  isComplete ? "completed" : ""
                                } ${isCurrent ? "current" : ""}`}
                              >
                                <span className="progress-dot">
                                  {isComplete ? "✓" : index + 1}
                                </span>

                                <span className="progress-label">
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isRejected && (
                      <p className="report-status-note">
                        This report has been rejected. Check the status
                        history for any available details.
                      </p>
                    )}

                    {/* Expandable status history */}
                    <div className="report-history">
                      <button
                        type="button"
                        className="history-toggle"
                        onClick={() => toggleHistory(report.id)}
                        aria-expanded={Boolean(
                          expandedHistory[report.id]
                        )}
                      >
                        {expandedHistory[report.id]
                          ? "Hide Status History"
                          : "View Status History"}
                      </button>

                      {expandedHistory[report.id] && (
                        <div className="history-content">
                          {historyLoading[report.id] ? (
                            <p>Loading status history...</p>
                          ) : historyErrors[report.id] ? (
                            <p className="error-text">
                              {historyErrors[report.id]}
                            </p>
                          ) : !historyByIssue[report.id] ||
                            historyByIssue[report.id].length === 0 ? (
                            <p>No status history is available yet.</p>
                          ) : (
                            <ol className="history-list">
                              {historyByIssue[report.id].map(
                                (entry, index) => (
                                  <li
                                    key={
                                      entry.id ??
                                      `${report.id}-history-${index}`
                                    }
                                  >
                                    <div className="history-entry">
                                      <strong>
                                        {formatStatus(
                                          entry.status ||
                                            entry.newStatus ||
                                            "Status Updated"
                                        )}
                                      </strong>

                                      <small>
                                        {formatDate(
                                          entry.createdAt ||
                                            entry.changedAt ||
                                            entry.timestamp
                                        )}
                                      </small>

                                      {(entry.description ||
                                        entry.comment ||
                                        entry.remarks) && (
                                        <p>
                                          {entry.description ||
                                            entry.comment ||
                                            entry.remarks}
                                        </p>
                                      )}
                                    </div>
                                  </li>
                                )
                              )}
                            </ol>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
