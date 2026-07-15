import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Activity, ArrowUp, Bell, Bot, BrainCircuit, Camera, CheckCheck, CheckSquare,
  ChevronDown, ChevronLeft, CornerDownLeft, FileStack, History, LayoutDashboard,
  LogOut, Menu, Plus, Search, Settings, ShieldAlert, Sparkles, Trash2, Upload,
  UserRound, Workflow, X,
} from "lucide-react";
import API from "../services/api";

const navigation = [
  ["Command Center", "/dashboard", LayoutDashboard],
  ["Document Hub", "/documents", FileStack],
  ["Automations", "/automations", Workflow],
  ["Approval Queue", "/approvals", CheckSquare],
  ["AI Copilot", "/assistant", Bot],
  ["Insights", "/insights", Activity],
  ["Audit Trail", "/audit", History],
  ["Data Security", "/security", ShieldAlert],
];

const quickCommands = [
  { id: "upload", title: "Upload a document", subtitle: "Start intelligent processing", path: "/documents?upload=1", icon: Upload, keywords: "new pdf file import" },
  { id: "automation", title: "Create an automation", subtitle: "Build a no-code document workflow", path: "/automations?create=1", icon: Plus, keywords: "rule workflow generate" },
  { id: "copilot", title: "Ask AutoFlow Copilot", subtitle: "Chat with a processed PDF", path: "/assistant", icon: Bot, keywords: "ai chat question" },
  { id: "dashboard", title: "Open Command Center", subtitle: "View workspace performance", path: "/dashboard", icon: LayoutDashboard, keywords: "home metrics" },
  { id: "security", title: "Open Data Security", subtitle: "Review privacy and PII risks", path: "/security", icon: ShieldAlert, keywords: "scan aadhaar pan privacy" },
  { id: "approvals", title: "Open Approval Queue", subtitle: "Resolve human review decisions", path: "/approvals", icon: CheckSquare, keywords: "review approve reject" },
  { id: "audit", title: "Open Audit Trail", subtitle: "Inspect automation executions", path: "/audit", icon: History, keywords: "runs logs history" },
  { id: "trash", title: "Open Trash", subtitle: "Restore or permanently delete files", path: "/trash", icon: Trash2, keywords: "deleted restore remove" },
];

function optimizeProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Invalid image"));
      image.onload = () => {
        const size = 320;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        const sourceSize = Math.min(image.width, image.height);
        const sourceX = (image.width - sourceSize) / 2;
        const sourceY = (image.height - sourceSize) / 2;
        context.fillStyle = "#121827";
        context.fillRect(0, 0, size, size);
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function relativeTime(value) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function AutoFlowShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandDocuments, setCommandDocuments] = useState([]);
  const [activeCommand, setActiveCommand] = useState(0);
  const [recentCommands, setRecentCommands] = useState(() => JSON.parse(localStorage.getItem("autoflow_recent_commands") || "[]"));
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const photoInputRef = useRef(null);
  const navigate = useNavigate();

  const openCommandPalette = () => {
    setCommandOpen(true);
    setCommandQuery("");
    setActiveCommand(0);
    API.get("/documents").then(({ data }) => setCommandDocuments(data)).catch(() => {});
  };

  useEffect(() => {
    API.get("/auth/profile").then(({ data }) => {
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => {
          if (!open) {
            setCommandQuery("");
            setActiveCommand(0);
            API.get("/documents").then(({ data }) => setCommandDocuments(data)).catch(() => {});
          }
          return !open;
        });
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => API.get("/notifications").then(({ data }) => {
      if (!active) return;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const close = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
      if (!notificationRef.current?.contains(event.target)) setNotificationOpen(false);
    };
    const syncProfile = (event) => setUser(event.detail);
    document.addEventListener("mousedown", close);
    window.addEventListener("autoflow-profile-updated", syncProfile);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("autoflow-profile-updated", syncProfile);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const refreshNotifications = async () => {
    try {
      const { data } = await API.get("/notifications");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      toast.error("Unable to load notifications");
    }
  };

  const openNotification = async (notification) => {
    if (!notification.read) {
      await API.put(`/notifications/${notification._id}/read`).catch(() => {});
      setNotifications((items) => items.map((item) => item._id === notification._id ? { ...item, read: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setNotificationOpen(false);
    navigate(notification.actionPath || "/dashboard");
  };

  const markAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Unable to update notifications");
    }
  };

  const notificationIcon = (type) => {
    const icons = { upload: FileStack, review: CheckSquare, approval: CheckCheck, security: ShieldAlert, automation: Workflow, system: Sparkles };
    return icons[type] || Bell;
  };

  const normalizedQuery = commandQuery.trim().toLowerCase();
  const actionResults = quickCommands.filter((command) => !normalizedQuery || `${command.title} ${command.subtitle} ${command.keywords}`.toLowerCase().includes(normalizedQuery));
  const documentResults = commandDocuments
    .filter((doc) => !normalizedQuery || `${doc.filename} ${doc.classification || ""} ${doc.category || ""}`.toLowerCase().includes(normalizedQuery))
    .slice(0, normalizedQuery ? 7 : 4)
    .map((doc) => ({ id: `doc-${doc._id}`, title: doc.filename, subtitle: `${doc.classification || "General"} · ${doc.fileType?.toUpperCase()} · ${doc.priority} priority`, path: doc.fileType === "pdf" ? `/evidence/${doc._id}` : "/documents", icon: FileStack, document: true }));
  const recentResults = !normalizedQuery ? recentCommands.slice(0, 3).map((item, index) => ({ ...item, id: `recent-${index}`, icon: History, recent: true })) : [];
  const commandResults = normalizedQuery ? [...actionResults, ...documentResults] : [...recentResults, ...actionResults.slice(0, 5), ...documentResults];

  const runCommand = (command) => {
    const recent = [{ title: command.title, subtitle: command.subtitle, path: command.path }, ...recentCommands.filter((item) => item.path !== command.path)].slice(0, 5);
    setRecentCommands(recent);
    localStorage.setItem("autoflow_recent_commands", JSON.stringify(recent));
    setCommandOpen(false);
    const targetPath = command.path.startsWith("/documents?upload=")
      ? `/documents?upload=${Date.now()}`
      : command.path.startsWith("/automations?create=")
        ? `/automations?create=${Date.now()}`
        : command.path;
    navigate(targetPath);
  };

  const commandKeyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveCommand((index) => commandResults.length ? (index + 1) % commandResults.length : 0); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveCommand((index) => commandResults.length ? (index - 1 + commandResults.length) % commandResults.length : 0); }
    if (event.key === "Enter" && commandResults[activeCommand]) { event.preventDefault(); runCommand(commandResults[activeCommand]); }
    if (event.key === "Escape") setCommandOpen(false);
  };

  const updatePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return toast.error("Choose a JPG, PNG or WEBP image");
    if (file.size > 8 * 1024 * 1024) return toast.error("Photo must be smaller than 8 MB");
    try {
      setUpdatingPhoto(true);
      const avatar = await optimizeProfilePhoto(file);
      const { data } = await API.put("/auth/profile", { avatar });
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to update photo");
    } finally {
      setUpdatingPhoto(false);
    }
  };

  return (
    <div className="flow-app">
      {mobileOpen && <button className="flow-overlay" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      {commandOpen && <div className="flow-command-overlay" onMouseDown={() => setCommandOpen(false)}><section className="flow-command-dialog" role="dialog" aria-modal="true" aria-label="AutoFlow command palette" onMouseDown={(event) => event.stopPropagation()}><header><Search /><input autoFocus role="combobox" aria-expanded="true" aria-controls="flow-command-results" aria-activedescendant={commandResults[activeCommand]?.id} aria-keyshortcuts="Control+K Meta+K" value={commandQuery} onChange={(event) => { setCommandQuery(event.target.value); setActiveCommand(0); }} onKeyDown={commandKeyDown} placeholder="Search documents, pages or actions..." /><kbd>ESC</kbd></header><div className="flow-command-results" id="flow-command-results" role="listbox">{commandResults.map((command, index) => { const Icon = command.icon; return <button id={command.id} role="option" aria-selected={index === activeCommand} key={command.id} className={index === activeCommand ? "active" : ""} onMouseEnter={() => setActiveCommand(index)} onClick={() => runCommand(command)}><span className={`flow-command-icon ${command.document ? "document" : ""}`}><Icon /></span><span><b>{command.title}</b><small>{command.subtitle}</small></span>{command.recent && <em>RECENT</em>}<CornerDownLeft className="flow-command-enter" /></button>; })}{!commandResults.length && <div className="flow-command-empty"><Search /><b>No results found</b><span>Try a document name, page or workspace action.</span></div>}</div><footer><span><ArrowUp /> Navigate</span><span><CornerDownLeft /> Open</span><span><kbd>ESC</kbd> Close</span><b>AutoFlow Command Center</b></footer></section></div>}
      <aside className={`flow-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="flow-brand">
          <div className="flow-brand-mark"><BrainCircuit size={24} /></div>
          <div><strong>AutoFlow AI</strong><span>Intelligent Operations</span></div>
          <button className="flow-mobile-close" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <div className="flow-workspace"><span>VD</span><div><b>Vishal's Workspace</b><small>Automation Workspace</small></div><ChevronLeft size={16} /></div>
        <nav className="flow-nav">
          <p>WORKSPACE</p>
          {navigation.map(([label, path, Icon]) => (
            <NavLink key={path} to={path} onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? "active" : ""}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
          <p>ACCOUNT</p>
          <NavLink to="/settings"><Settings size={19} /><span>Settings</span></NavLink>
          <NavLink to="/trash"><Trash2 size={19} /><span>Trash</span></NavLink>
        </nav>
        <div className="flow-side-card"><Sparkles size={22} /><b>Automation health</b><span>All systems operational</span><div><i /></div><small>98% success rate</small></div>
        <button className="flow-logout" onClick={logout}><LogOut size={18} /> Sign out</button>
      </aside>

      <section className="flow-main">
        <header className="flow-topbar">
          <button className="flow-menu" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
          <button className="flow-search" onClick={openCommandPalette} aria-keyshortcuts="Control+K Meta+K"><Search size={18} /><span>Search documents, workflows or actions...</span><kbd>Ctrl K</kbd></button>
          <div className="flow-top-actions"><button className="flow-ai-pill" onClick={() => navigate("/assistant")}><Sparkles size={16} /> Ask AutoFlow</button><div className="flow-notifications" ref={notificationRef}><button className={`flow-notification-trigger ${notificationOpen ? "active" : ""}`} title="Notifications" onClick={() => { const next = !notificationOpen; setNotificationOpen(next); setProfileOpen(false); if (next) refreshNotifications(); }}><Bell />{unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>{notificationOpen && <div className="flow-notification-menu"><header><div><b>Notifications</b><span>{unreadCount ? `${unreadCount} unread updates` : "You're all caught up"}</span></div><button onClick={markAllRead} disabled={!unreadCount}><CheckCheck /> Mark all read</button></header><div className="flow-notification-list">{notifications.slice(0, 10).map((notification) => { const Icon = notificationIcon(notification.type); return <button key={notification._id} className={notification.read ? "read" : "unread"} onClick={() => openNotification(notification)}><div className={`flow-notification-icon ${notification.type}`}><Icon /></div><div><b>{notification.title}</b><p>{notification.message}</p><span>{relativeTime(notification.createdAt)}</span></div>{!notification.read && <i />}</button>; })}{!notifications.length && <div className="flow-notification-empty"><Bell /><b>No notifications yet</b><span>Important workspace events will appear here.</span></div>}</div><footer><ShieldAlert /> Live alerts for documents, privacy and automations</footer></div>}</div><div className="flow-profile" ref={profileRef}><input ref={photoInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={updatePhoto} /><button className={`flow-profile-trigger ${profileOpen ? "active" : ""}`} onClick={() => { setProfileOpen((open) => !open); setNotificationOpen(false); }}><div className="flow-avatar">{user.avatar ? <img src={user.avatar} alt={user.name || "Profile"} /> : (user.name || "VD").slice(0, 2).toUpperCase()}<i /></div><div className="flow-user"><b>{user.name || "Vishal Dubey"}</b><span>{user.role || "AI Automation Engineer"}</span></div><ChevronDown className="flow-profile-chevron" /></button>{profileOpen && <div className="flow-profile-menu"><div className="flow-profile-card"><div className="flow-profile-photo">{user.avatar ? <img src={user.avatar} alt="Profile" /> : (user.name || "VD").slice(0, 2).toUpperCase()}<span /></div><div><b>{user.name || "Vishal Dubey"}</b><span>{user.role || "AI Automation Engineer"}</span><small>{user.email}</small></div></div><div className="flow-profile-status"><i /> Available for intelligent operations</div><button onClick={() => photoInputRef.current?.click()} disabled={updatingPhoto}><Camera />{updatingPhoto ? "Optimizing photo..." : user.avatar ? "Change profile photo" : "Upload profile photo"}</button><button onClick={() => { setProfileOpen(false); navigate("/settings"); }}><UserRound /> My profile & settings</button><hr /><button className="danger" onClick={logout}><LogOut /> Sign out securely</button></div>}</div></div>
        </header>
        <main className="flow-content"><Outlet /></main>
      </section>
    </div>
  );
}
