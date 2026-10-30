
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "./AreaAdminDashboard.css";
const STATUSES = [
  ["SUBMITTED", "Submitted"],
  ["UNDER_REVIEW", "Under Review"],
  ["IN_PROGRESS", "In Progress"],
  ["RESOLVED", "Resolved"],
  ["REJECTED", "Rejected"],
];

const STATUS_COLORS = {
  SUBMITTED: "#64748b",
  UNDER_REVIEW: "#f59e0b",
  IN_PROGRESS: "#2563eb",
  RESOLVED: "#16a34a",
  REJECTED: "#dc2626",
};

function statusLabel(status) {
  return (
    STATUSES.find(([value]) => value === status)?.[1] ||
    formatLabel(status)
  );
}

function formatLabel(value) {
  return String(value || "OTHER")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function AreaAdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [issues, setIssues] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  // Load the authenticated admin and locality-specific issues.
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const profileResponse = await fetch("/api/area-admin/me", {
        credentials: "include",
      });

      if (
        profileResponse.status === 401 ||
        profileResponse.status === 403
      ) {
        navigate("/login", { replace: true });
        return;
      }

      if (!profileResponse.ok) {
        throw new Error(
          `Unable to load admin profile (HTTP ${profileResponse.status}).`
        );
      }

      const profile = await profileResponse.json();

      if (profile.role && profile.role !== "AREA_ADMIN") {
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch("/api/area-admin/issues", {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Unable to load issues (HTTP ${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid issue list.");
      }

      setAdmin(profile);
      setIssues(data);

      setSelectedStatuses((current) => {
        const next = {};

        data.forEach((issue) => {
          // Preserve unsaved selections while refreshing.
          next[issue.id] =
            current[issue.id] !== undefined &&
            current[issue.id] !== issue.status
              ? current[issue.id]
              : issue.status;
        });

        return next;
      });
    } catch (err) {
      setError(true);
      setMessage(err.message || "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Category options for the filters.
  const categories = useMemo(
    () =>
      [
        ...new Set(
          issues
            .map((issue) => issue.category)
            .filter(
              (category) =>
                typeof category === "string" && category.trim()
            )
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [issues]
  );

  // Filter issues shown in the Community Issues section.
  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    return issues.filter((issue) => {
      const searchableText = [
        String(issue.id),
        issue.description || "",
        issue.category || "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchableText.includes(query) &&
        (statusFilter === "ALL" || issue.status === statusFilter) &&
        (categoryFilter === "ALL" ||
          issue.category === categoryFilter)
      );
    });
  }, [issues, search, statusFilter, categoryFilter]);

  // Statistics use the complete locality-specific issue list,
  // not the currently filtered list.
  const statistics = useMemo(() => {
    const count = (status) =>
      issues.filter((issue) => issue.status === status).length;

    return {
      total: issues.length,
      submitted: count("SUBMITTED"),
      underReview: count("UNDER_REVIEW"),
      pending: count("SUBMITTED") + count("UNDER_REVIEW"),
      inProgress: count("IN_PROGRESS"),
      resolved: count("RESOLVED"),
      rejected: count("REJECTED"),
    };
  }, [issues]);

  // Pie chart: issues grouped by status.
  const statusChartData = useMemo(
    () =>
      STATUSES.map(([status, label]) => ({
        name: label,
        value: issues.filter((issue) => issue.status === status).length,
        color: STATUS_COLORS[status],
      })).filter((item) => item.value > 0),
    [issues]
  );

  // Bar chart: issues grouped by category.
  const categoryChartData = useMemo(() => {
    const counts = {};

    issues.forEach((issue) => {
      const category = issue.category || "OTHER";
      counts[category] = (counts[category] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([category, count]) => ({
        name: formatLabel(category),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  // Update an issue's status.
  async function saveStatus(issue) {
    const newStatus = selectedStatuses[issue.id] || issue.status;

    if (newStatus === issue.status) {
      setMessage("No status changes to save.");
      setError(false);
      return;
    }

    setUpdatingId(issue.id);
    setMessage("");
    setError(false);

    try {
      const response = await fetch(
        `/api/area-admin/issues/${issue.id}/status`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Could not update issue status."
        );
      }

      const savedStatus = result.status || newStatus;

      setIssues((current) =>
        current.map((item) =>
          item.id === issue.id
            ? { ...item, status: savedStatus }
            : item
        )
      );

      setSelectedStatuses((current) => ({
        ...current,
        [issue.id]: savedStatus,
      }));

      setMessage(`Issue #${issue.id} status updated successfully.`);
    } catch (err) {
      setError(true);
      setMessage(err.message || "Status update failed.");
    } finally {
      setUpdatingId(null);
    }
  }

  // Log out the current user.
  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Logout request returned:", response.status);
      }
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
  }

  return (
    <div className="area-admin-page">
      <header className="area-admin-header">
        <div className="header-brand">
          <h1>CivicPulse</h1>
          <p>Area Administrator Dashboard</p>
        </div>

        <button
          className="logout-button"
          onClick={logout}
          type="button"
        >
          Logout
        </button>
      </header>

      <main className="area-admin-main">
        {/* Admin profile and refresh */}
        <section className="admin-card admin-profile">
          <div className="profile-heading">
            <div>
              <span className="admin-eyebrow">
                CIVICPULSE · ADMINISTRATION
              </span>
              <h2>Welcome, {admin?.fullName || "Admin"}</h2>
              <p>
                Assigned locality:{" "}
                <strong>
                  {admin?.localityName || "Loading..."}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {message && (
            <p
              className={
                error ? "admin-message error" : "admin-message"
              }
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}
        </section>

        {/* Statistics cards */}
        <section
          className="admin-summary-grid"
          aria-label="Issue statistics"
        >
          <SummaryCard
            title="Total Issues"
            count={statistics.total}
            description="All issues in your locality"
          />

          <SummaryCard
            title="Submitted"
            count={statistics.submitted}
            description="Awaiting initial review"
            variant="submitted"
          />

          <SummaryCard
            title="In Progress"
            count={statistics.inProgress}
            description="Issues being addressed"
            variant="progress"
          />

          <SummaryCard
            title="Resolved"
            count={statistics.resolved}
            description="Successfully resolved"
            variant="resolved"
          />
        </section>

        {/* Charts */}
        <section className="admin-charts-grid">
          <article className="admin-card admin-chart-card">
            <h2>Issues by Status</h2>
            <p className="chart-description">
              Distribution of reports in your locality
            </p>

            {loading ? (
              <ChartEmpty message="Loading chart..." />
            ) : statusChartData.length === 0 ? (
              <ChartEmpty message="No issue data available yet." />
            ) : (
              <div className="admin-pie-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {statusChartData.map((item) => (
                        <Cell
                          key={item.name}
                          fill={item.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="admin-card admin-chart-card">
            <h2>Issues by Category</h2>
            <p className="chart-description">
              Most frequently reported problem types
            </p>

            {loading ? (
              <ChartEmpty message="Loading chart..." />
            ) : categoryChartData.length === 0 ? (
              <ChartEmpty message="No issue data available yet." />
            ) : (
              <div className="admin-bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryChartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 35,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Issues"
                      fill="#0f766e"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>
        </section>

        {/* Issue search, filters and status management */}
        <section className="admin-card community-issues-card">
          <h2>Community Issues</h2>
          <p className="chart-description">
            Search, review and update issues in your assigned locality.
          </p>

          <div className="admin-filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search issue ID, description or category..."
              aria-label="Search issues"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="ALL">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {formatLabel(category)}
                </option>
              ))}
            </select>

            <button type="button" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>

          <p className="filter-result">
            Showing {filteredIssues.length} of {issues.length} issues
          </p>

          {loading ? (
            <p>Loading issues...</p>
          ) : filteredIssues.length === 0 ? (
            <p>
              {issues.length === 0
                ? "No issues reported in your locality."
                : "No issues match your search or filters."}
            </p>
          ) : (
            <div className="admin-issues-list">
              {filteredIssues.map((issue) => (
                <article className="admin-issue" key={issue.id}>
                  <div className="issue-heading">
                    <h3>{formatLabel(issue.category || "General")}</h3>
                    <span
                      className="admin-status-pill"
                      style={{
                        "--status-color":
                          STATUS_COLORS[issue.status] || "#64748b",
                      }}
                    >
                      {statusLabel(issue.status)}
                    </span>
                  </div>

                  <p>{issue.description || "No description provided."}</p>

                  <p className="status-text">
                    Current status: <strong>{statusLabel(issue.status)}</strong>
                  </p>

                  {issue.createdAt && (
                    <p className="issue-reported-date">
                      Reported:{" "}
                      {new Date(issue.createdAt).toLocaleString()}
                    </p>
                  )}

                  {issue.photoUploaded && issue.photoUrl && (
                    <img
                      className="admin-issue-photo"
                      src={issue.photoUrl}
                      alt={`Photo attached to issue ${issue.id}`}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}

                  <div className="admin-status-controls">
                    <label htmlFor={`status-${issue.id}`}>
                      Update status:
                    </label>

                    <select
                      id={`status-${issue.id}`}
                      value={
                        selectedStatuses[issue.id] || issue.status
                      }
                      onChange={(event) =>
                        setSelectedStatuses((current) => ({
                          ...current,
                          [issue.id]: event.target.value,
                        }))
                      }
                    >
                      {STATUSES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={
                        updatingId === issue.id ||
                        (selectedStatuses[issue.id] || issue.status) ===
                          issue.status
                      }
                      onClick={() => saveStatus(issue)}
                    >
                      {updatingId === issue.id
                        ? "Saving..."
                        : "Save Status"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  count,
  description,
  variant = "",
}) {
  return (
    <article className={`admin-summary-card ${variant}`}>
      <h3>{title}</h3>
      <div className="summary-number">{count}</div>
      <p className="summary-description">{description}</p>
    </article>
  );
}

function ChartEmpty({ message }) {
  return <div className="admin-chart-empty">{message}</div>;
}

export default AreaAdminDashboard;
