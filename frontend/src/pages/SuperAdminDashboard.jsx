
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SuperAdminDashboard.css";

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Access denied or session expired. Please log in again as Super Admin."
      );
    }

    throw new Error(
      data?.detail || data?.message || `Request failed (HTTP ${response.status}).`
    );
  }

  return data;
}

function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [search, setSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    localityId: "",
  });

  const showMessage = (text, success = false) => {
    setMessage(text);
    setMessageType(success ? "success" : "error");
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const [localityData, adminData] = await Promise.all([
        api("/api/super-admin/localities"),
        api("/api/super-admin/area-admins"),
      ]);

      setLocalities(Array.isArray(localityData) ? localityData : []);
      setAdmins(Array.isArray(adminData) ? adminData : []);
    } catch (error) {
      showMessage(error.message || "Could not load dashboard data.");
      if (error.message.includes("Access denied")) {
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const activeLocalities = useMemo(
    () => localities.filter((locality) => locality.active === true),
    [localities]
  );

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();

    return admins.filter((admin) => {
      const searchable = [
        admin.fullName,
        admin.email,
        admin.localityName,
      ].join(" ").toLowerCase();

      const matchesSearch = searchable.includes(query);
      const matchesStatus =
        adminStatusFilter === "ALL" ||
        (adminStatusFilter === "ACTIVE" && admin.active === true) ||
        (adminStatusFilter === "INACTIVE" && admin.active === false);

      return matchesSearch && matchesStatus;
    });
  }, [admins, search, adminStatusFilter]);

  async function createAdmin(event) {
    event.preventDefault();

    if (!form.fullName.trim() || !form.email.trim() ||
        !form.password || !form.localityId) {
      showMessage("Please complete all fields.");
      return;
    }

    if (form.password.length < 8 || form.password.length > 72) {
      showMessage("Password must contain between 8 and 72 characters.");
      return;
    }

    const localityId = Number(form.localityId);
    const selectedLocality = activeLocalities.find(
      (locality) => Number(locality.id) === localityId
    );

    if (!selectedLocality) {
      showMessage("Please select an active locality.");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      await api("/api/super-admin/area-admins", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          localityId,
        }),
      });

      setForm({
        fullName: "",
        email: "",
        password: "",
        localityId: "",
      });

      showMessage("Area administrator created successfully.", true);
      await loadDashboard();
    } catch (error) {
      showMessage(error.message || "Could not create administrator.");
    } finally {
      setCreating(false);
    }
  }

  async function changeAdminStatus(admin) {
    const nextActive = !admin.active;
    const action = nextActive ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${admin.fullName}?`)) {
      return;
    }

    const key = `admin-${admin.id}`;
    setBusyKey(key);

    try {
      await api(`/api/super-admin/area-admins/${admin.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ active: nextActive }),
      });

      showMessage(`Administrator ${action}d successfully.`, true);
      await loadDashboard();
    } catch (error) {
      showMessage(error.message || "Could not update administrator.");
    } finally {
      setBusyKey("");
    }
  }

  async function changeLocalityStatus(locality) {
    const nextActive = !locality.active;
    const action = nextActive ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${locality.name}?`)) {
      return;
    }

    const key = `locality-${locality.id}`;
    setBusyKey(key);

    try {
      await api(`/api/super-admin/localities/${locality.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ active: nextActive }),
      });

      showMessage(`${locality.name} ${action}d successfully.`, true);
      await loadDashboard();
    } catch (error) {
      showMessage(error.message || "Could not update locality.");
    } finally {
      setBusyKey("");
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <h1>CivicPulse</h1>
          <p>Super Admin Dashboard</p>
        </div>
        <button type="button" onClick={logout}>Logout</button>
      </header>

      <main className="super-admin-main">
        <section className="super-admin-card">
          <h2>Welcome, Super Admin</h2>
          <p>Manage area administrators and community localities from one place.</p>
          <button type="button" onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Dashboard"}
          </button>

          {message && (
            <p className={`super-admin-message ${messageType}`}
               role="status" aria-live="polite">
              {message}
            </p>
          )}
        </section>

        <section className="super-admin-summary-grid">
          <SummaryCard title="Total Area Admins" count={admins.length} />
          <SummaryCard
            title="Active Area Admins"
            count={admins.filter((admin) => admin.active === true).length}
          />
          <SummaryCard title="Total Active Localities" count={activeLocalities.length} />
          <SummaryCard
            title="Inactive Localities"
            count={localities.filter((locality) => locality.active === false).length}
          />
        </section>

        <section className="super-admin-card">
          <h2>Create Area Administrator</h2>
          <p className="muted">
            Each administrator will be assigned to one active locality.
          </p>

          <form onSubmit={createAdmin}>
            <div className="super-admin-form-grid">
              <div>
                <label htmlFor="super-fullName">Full name</label>
                <input
                  id="super-fullName"
                  value={form.fullName}
                  maxLength={100}
                  autoComplete="off"
                  required
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                />
              </div>

              <div>
                <label htmlFor="super-email">Email</label>
                <input
                  id="super-email"
                  type="email"
                  value={form.email}
                  maxLength={150}
                  autoComplete="off"
                  required
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </div>

              <div>
                <label htmlFor="super-password">Temporary password</label>
                <input
                  id="super-password"
                  type="password"
                  value={form.password}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  required
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
              </div>

              <div>
                <label htmlFor="super-locality">Assigned locality</label>
                <select
                  id="super-locality"
                  value={form.localityId}
                  required
                  disabled={activeLocalities.length === 0}
                  onChange={(event) =>
                    setForm({ ...form, localityId: event.target.value })
                  }
                >
                  <option value="">
                    {activeLocalities.length
                      ? "Select a locality"
                      : "No active localities available"}
                  </option>
                  {activeLocalities.map((locality) => (
                    <option key={locality.id} value={locality.id}>
                      {locality.name} — {locality.cityName}, {locality.stateName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" disabled={creating || activeLocalities.length === 0}>
              {creating ? "Creating..." : "Create Administrator"}
            </button>
          </form>
        </section>

        <section className="super-admin-card">
          <h2>Area Administrators</h2>

          <div className="super-admin-filters">
            <input
              type="search"
              placeholder="Search name, email or locality..."
              aria-label="Search area administrators"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Filter administrators"
              value={adminStatusFilter}
              onChange={(event) => setAdminStatusFilter(event.target.value)}
            >
              <option value="ALL">All accounts</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="super-admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Locality</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow columns={5} text="Loading administrators..." />
                ) : filteredAdmins.length === 0 ? (
                  <EmptyRow columns={5} text="No matching area administrators." />
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.fullName || "—"}</td>
                      <td>{admin.email || "—"}</td>
                      <td>{admin.localityName || "—"}</td>
                      <td>
                        <Status active={admin.active} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={admin.active ? "danger" : ""}
                          disabled={busyKey === `admin-${admin.id}`}
                          onClick={() => changeAdminStatus(admin)}
                        >
                          {busyKey === `admin-${admin.id}`
                            ? "Saving..."
                            : admin.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="super-admin-card">
          <h2>Locality Management</h2>
          <p className="muted">
            Activate or deactivate localities without deleting existing accounts
            or issue records. Only active localities can be assigned to new admins.
          </p>

          <div className="super-admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>State</th>
                  <th>City</th>
                  <th>Locality</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow columns={5} text="Loading localities..." />
                ) : localities.length === 0 ? (
                  <EmptyRow columns={5} text="No localities found." />
                ) : (
                  localities.map((locality) => (
                    <tr key={locality.id}>
                      <td>{locality.stateName || "—"}</td>
                      <td>{locality.cityName || "—"}</td>
                      <td>{locality.name || "—"}</td>
                      <td><Status active={locality.active} /></td>
                      <td>
                        <button
                          type="button"
                          className={locality.active ? "danger" : ""}
                          disabled={busyKey === `locality-${locality.id}`}
                          onClick={() => changeLocalityStatus(locality)}
                        >
                          {busyKey === `locality-${locality.id}`
                            ? "Saving..."
                            : locality.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, count }) {
  return (
    <article className="super-admin-summary-card">
      <h3>{title}</h3>
      <div className="summary-number">{count}</div>
    </article>
  );
}

function Status({ active }) {
  return (
    <span className={`super-admin-status ${active ? "active" : "inactive"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function EmptyRow({ columns, text }) {
  return (
    <tr>
      <td colSpan={columns} className="empty-message">{text}</td>
    </tr>
  );
}

export default SuperAdminDashboard;
