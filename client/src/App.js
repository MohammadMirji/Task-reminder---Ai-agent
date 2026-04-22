import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNotifications } from "./useNotifications";

const API = process.env.REACT_APP_API_URL;

// ─── Axios helper: attach JWT to every request ────────────────────────────────
const authAxios = () => {
  const token = localStorage.getItem("token");
  return axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!API) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authBox}>
          <h1 style={{ textAlign: "center", marginBottom: 8 }}>AI Task Manager</h1>
          <p style={{ color: "red", textAlign: "center" }}>
            Frontend is not configured. Set REACT_APP_API_URL in Vercel.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister
        ? form
        : { email: form.email, password: form.password };
      const res = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
    setLoading(false);
  };

  const handleGoogle = () => {
    window.location.href = `${API}/auth/google`;
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authBox}>
        <h1 style={{ textAlign: "center", marginBottom: 8 }}>
          AI Task Manager
        </h1>
        <h2
          style={{
            textAlign: "center",
            color: "#555",
            fontWeight: 400,
            marginBottom: 24,
          }}
        >
          {isRegister ? "Create an account" : "Welcome back"}
        </h2>

        {isRegister && (
          <input
            style={styles.input}
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        )}
        <input
          style={styles.input}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ ...styles.btn, background: "#1890ff", width: "100%" }}
        >
          {loading ? "..." : isRegister ? "Register" : "Login"}
        </button>

        <div style={styles.divider}>
          <span style={{ background: "#fff", padding: "0 10px" }}>or</span>
        </div>

        <button
          onClick={handleGoogle}
          style={{
            ...styles.btn,
            background: "#fff",
            color: "#333",
            border: "1px solid #ddd",
            width: "100%",
          }}
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="G"
            style={{ width: 16, marginRight: 8 }}
          />
          Continue with Google
        </button>

        <p style={{ textAlign: "center", marginTop: 20, color: "#666" }}>
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            onClick={() => setIsRegister(!isRegister)}
            style={{ color: "#1890ff", cursor: "pointer" }}
          >
            {isRegister ? "Login" : "Register"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── MAIN TASK APP ────────────────────────────────────────────────────────────
function TaskApp({ user, onLogout }) {
  const { subscribed, subscribe, unsubscribe } = useNotifications();
  const [tasks, setTasks] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ─── Auto re-subscribe on every app load to keep subscription fresh ──────
  useEffect(() => {
    if ("serviceWorker" in navigator && Notification.permission === "granted") {
      subscribe(true); // silent = true, no popups
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fetch all tasks ──────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      const res = await authAxios().get("/tasks");
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ─── Create task via AI ───────────────────────────────────────────────────
  const handleCreateTask = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await authAxios().post("/tasks/create-from-prompt", {
        prompt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setMessage(res.data.message);
      setPrompt("");
      fetchTasks();
    } catch (err) {
      setMessage(err.response?.data?.error || "Error creating task");
    }
    setLoading(false);
  };

  // ─── Search tasks via AI ──────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await authAxios().post("/tasks/search", {
        query: searchQuery,
      });
      setSearchResults(res.data.tasks);
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.error || "Error searching tasks");
    }
    setLoading(false);
  };

  // ─── Update task status ───────────────────────────────────────────────────
  const handleStatusChange = async (id, status) => {
    await authAxios().patch(`/tasks/${id}`, { status });
    fetchTasks();
    if (searchResults) handleSearch();
  };

  // ─── Delete task ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await authAxios().delete(`/tasks/${id}`);
    fetchTasks();
    if (searchResults)
      setSearchResults(searchResults.filter((t) => t._id !== id));
  };

  // ─── Format date in user's local timezone ────────────────────────────────
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const priorityColor = { high: "#ff4d4f", medium: "#faad14", low: "#52c41a" };
  const displayTasks = searchResults !== null ? searchResults : tasks;

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "24px",
        fontFamily: "sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>AI Task Manager</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#555" }}>{user.name}</span>

          <button
            onClick={subscribed ? unsubscribe : subscribe}
            style={{
              ...styles.btn,
              background: subscribed ? "#52c41a" : "#faad14",
              padding: "6px 14px",
              fontSize: 13,
            }}
          >
            {subscribed ? "Notifications Enabled" : "Enable Notifications"}
          </button>

          <button
            onClick={onLogout}
            style={{
              ...styles.btn,
              background: "#ff4d4f",
              padding: "6px 14px",
              fontSize: 13,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Create Task ── */}
      <div style={styles.card}>
        <h2>Create Task with AI</h2>
        <p style={{ color: "#666" }}>
          Try:{" "}
          <em>"Submit report by 5pm today, remind me 30 mins before, work"</em>
        </p>
        <textarea
          rows={3}
          style={styles.input}
          placeholder="Describe your task in plain English..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCreateTask();
            }
          }}
        />
        <button
          onClick={handleCreateTask}
          disabled={loading}
          style={{ ...styles.btn, background: "#1890ff", marginTop: 8 }}
        >
          {loading ? "Processing..." : "Create Task"}
        </button>
      </div>

      {/* ── Search Tasks ── */}
      <div style={styles.card}>
        <h2>Search Tasks with AI</h2>
        <p style={{ color: "#666" }}>
          Try: <em>"Show all urgent work tasks"</em>
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            placeholder="Search in plain English..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{ ...styles.btn, background: "#722ed1" }}
          >
            {loading ? "..." : "Search"}
          </button>
          {searchResults && (
            <button
              onClick={() => {
                setSearchResults(null);
                setMessage("");
              }}
              style={{ ...styles.btn, background: "#888" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Status Message ── */}
      {message && <p style={styles.message}>{message}</p>}

      {/* ── Task List ── */}
      <h2>
        {searchResults !== null
          ? "Search Results"
          : `All Tasks (${tasks.length})`}
      </h2>

      {displayTasks.length === 0 ? (
        <p style={{ color: "#999", textAlign: "center", padding: 40 }}>
          No tasks yet. Create one above!
        </p>
      ) : (
        displayTasks.map((task) => (
          <div
            key={task._id}
            style={{
              ...styles.taskCard,
              borderLeftColor: priorityColor[task.priority] || "#ccc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>

                {/* Task title */}
                <h3 style={{ margin: 0 }}>{task.title}</h3>

                {/* ── Original user prompt ── */}
                {task.userPrompt && (
                  <p
                    style={{
                      color: "#888",
                      fontSize: 12,
                      margin: "6px 0 4px 0",
                      fontStyle: "italic",
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                      borderRadius: 6,
                      padding: "4px 10px",
                      display: "inline-block",
                      maxWidth: "100%",
                    }}
                  >
                    User prompt: "{task.userPrompt}"
                  </p>
                )}

                {/* Task description */}
                {task.description && (
                  <p style={{ color: "#555", margin: "4px 0" }}>
                    {task.description}
                  </p>
                )}

                {/* Tags and badges */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  <span
                    style={{
                      background: priorityColor[task.priority],
                      color: "#fff",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    {task.priority}
                  </span>

                  <span
                    style={{
                      background: "#f0f0f0",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    {task.status}
                  </span>

                  {task.dueDate && (
                    <span
                      style={{
                        background: "#fff7e6",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                      }}
                    >
                      Due: {formatDate(task.dueDate)}
                    </span>
                  )}

                  {task.notifyAt && (
                    <span
                      style={{
                        background: "#f9f0ff",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                      }}
                    >
                      Reminder: {formatDate(task.notifyAt)}
                    </span>
                  )}

                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "#e6f7ff",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(task._id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  alignSelf: "flex-start",
                }}
              >
                Delete
              </button>
            </div>

            {/* Status dropdown */}
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(task._id, e.target.value)}
              style={{
                marginTop: 12,
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #ddd",
                cursor: "pointer",
              }}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        ))
      )}
    </div>
  );
}

// ─── GOOGLE OAUTH CALLBACK ────────────────────────────────────────────────────
function GoogleCallback({ onLogin }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const user = { id: payload.id, name: payload.name, email: payload.email };
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      onLogin(user);
      window.history.replaceState({}, "", "/");
    }
  }, [onLogin]);

  return (
    <p style={{ textAlign: "center", marginTop: 100 }}>Logging you in...</p>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (window.location.pathname === "/auth/callback") {
    return <GoogleCallback onLogin={handleLogin} />;
  }

  if (!user) return <AuthPage onLogin={handleLogin} />;
  return <TaskApp user={user} onLogout={handleLogout} />;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  authContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f2f5",
    fontFamily: "sans-serif",
  },
  authBox: {
    background: "#fff",
    padding: 40,
    borderRadius: 16,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 15,
    marginBottom: 12,
    boxSizing: "border-box",
  },
  btn: {
    padding: "10px 20px",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 15,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#f5f5f5",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  message: {
    padding: 12,
    background: "#e6f7ff",
    borderRadius: 8,
    marginBottom: 16,
  },
  taskCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderLeft: "5px solid #ccc",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  divider: {
    textAlign: "center",
    margin: "16px 0",
    color: "#aaa",
    borderTop: "1px solid #eee",
    lineHeight: "0",
  },
};