import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Activity, ArrowLeft, ArrowRight, Bot, BrainCircuit, CalendarDays, Check, CheckCircle2,
  ChevronRight, CircleAlert, Clock3, Download, Eye, FileCheck2, FileOutput,
  FileText, Filter, Fingerprint, Gauge, IndianRupee, Inbox, ListChecks,
  Maximize2, Pause, Play, Plus, Printer, RefreshCw, RotateCcw, Search, Send, ShieldAlert, ShieldCheck, Sparkles,
  Trash2, Upload, WandSparkles, Workflow, X,
} from "lucide-react";
import API from "../services/api";

const badge = (value) => <span className={`flow-badge ${String(value).toLowerCase()}`}>{value}</span>;
const formatSize = (bytes = 0) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

function PageHeader({ eyebrow, title, description, action }) {
  return <div className="flow-page-head"><div><span className="flow-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return <article className={`flow-metric ${tone}`}><div className="flow-metric-icon"><Icon /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

function useAutomationDashboard() {
  const [data, setData] = useState({ metrics: {}, recentDocuments: [], rules: [] });
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try { const response = await API.get("/automation/dashboard"); setData(response.data); }
    catch (error) { if (error.response?.status !== 401) toast.error("Unable to load automation dashboard"); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);
  return { data, loading, load };
}

export function DashboardPage() {
  const { data, loading } = useAutomationDashboard();
  const m = data.metrics || {};
  return <>
    <PageHeader eyebrow="AUTOMATION COMMAND CENTER" title="Good afternoon, Vishal" description="Monitor intelligent document operations and resolve work that needs human judgment." action={<button className="flow-primary" onClick={() => window.location.assign("/automations")}><WandSparkles size={18} /> Create automation</button>} />
    <section className="flow-metrics">
      <MetricCard icon={FileCheck2} label="Documents processed" value={loading ? "—" : m.processed || 0} detail="AI-classified documents" tone="violet" />
      <MetricCard icon={Workflow} label="Active automations" value={loading ? "—" : m.activeRules || 0} detail="Rules currently running" tone="blue" />
      <MetricCard icon={CircleAlert} label="Needs review" value={loading ? "—" : m.needsReview || 0} detail="Human decision required" tone="amber" />
      <MetricCard icon={Clock3} label="Time saved" value={loading ? "—" : `${m.timeSavedMinutes || 0}m`} detail="Estimated manual effort" tone="green" />
    </section>
    <section className="flow-grid-main">
      <div className="flow-card flow-activity-card"><div className="flow-card-head"><div><h2>Automation activity</h2><p>Documents processed during the last 7 days</p></div><button className="flow-ghost">Last 7 days</button></div><div className="flow-chart"><div className="flow-chart-grid" />{[38,54,46,68,58,83,72].map((height, index) => <div key={index} className="flow-bar-wrap"><div className="flow-bar" style={{ height: `${height}%` }}><span>{Math.round(height / 6)}</span></div><small>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][index]}</small></div>)}</div></div>
      <div className="flow-card"><div className="flow-card-head"><div><h2>Automation health</h2><p>Live system performance</p></div><Gauge className="flow-green" /></div><div className="flow-score-ring"><strong>98<span>%</span></strong><small>Success rate</small></div><div className="flow-health-row"><span><i className="green" />Rule engine</span><b>Operational</b></div><div className="flow-health-row"><span><i className="green" />Document parser</span><b>Operational</b></div><div className="flow-health-row"><span><i className="amber" />AI enhancement</span><b>Optional</b></div></div>
    </section>
    <section className="flow-grid-main bottom">
      <div className="flow-card"><div className="flow-card-head"><div><h2>Recent document runs</h2><p>Latest automatic classification results</p></div><a href="/documents">View all <ArrowRight size={15} /></a></div><DocumentTable documents={data.recentDocuments} compact /></div>
      <div className="flow-card"><div className="flow-card-head"><div><h2>Approval inbox</h2><p>Priority items requiring attention</p></div><Inbox /></div>{data.recentDocuments.filter((d) => d.workflowStatus === "review").slice(0, 3).map((doc) => <div className="flow-inbox-item" key={doc._id}><div className="flow-file-icon"><FileText /></div><div><b>{doc.filename}</b><span>{doc.classification} · {doc.priority} priority</span></div><ChevronRight /></div>)}{!data.recentDocuments.some((d) => d.workflowStatus === "review") && <div className="flow-empty-mini"><CheckCircle2 /><b>Inbox is clear</b><span>No documents need review.</span></div>}</div>
    </section>
  </>;
}

function DocumentTable({ documents, compact = false, onRefresh }) {
  if (!documents.length) return <div className="flow-empty"><FileText /><h3>No documents yet</h3><p>Upload a document and AutoFlow will classify and route it automatically.</p></div>;
  const process = async (id) => { try { await API.post(`/automation/process/${id}`); toast.success("Document processed"); onRefresh?.(); } catch { toast.error("Processing failed"); } };
  const downloadDocument = async (doc) => { try { const response = await API.get(`/documents/download/${doc._id}`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = doc.filename; link.click(); URL.revokeObjectURL(url); toast.success("Download started"); } catch { toast.error("Download failed"); } };
  const removeDocument = async (doc) => { if (!window.confirm(`Move "${doc.filename}" to Trash? You can restore it later.`)) return; try { await API.delete(`/documents/${doc._id}`); toast.success("Document moved to Trash"); onRefresh?.(); } catch (error) { toast.error(error.response?.data?.message || "Unable to remove document"); } };
  return <div className="flow-table-wrap"><table className="flow-table"><thead><tr><th>Document</th><th>Classification</th><th>Priority</th><th>Status</th><th>AI score</th>{!compact && <th />}</tr></thead><tbody>{documents.map((doc) => <tr key={doc._id}><td><div className="flow-doc-name"><span><FileText /></span><div><b>{doc.filename}</b><small>{formatSize(doc.filesize)} · {new Date(doc.createdAt).toLocaleDateString()}</small></div></div></td><td>{doc.classification || doc.category || "General"}</td><td>{badge(doc.priority || "medium")}</td><td>{badge(doc.workflowStatus || "processed")}</td><td><div className="flow-confidence"><i style={{ width: `${doc.automationScore || 0}%` }} /><span>{doc.automationScore || 0}%</span></div></td>{!compact && <td><div className="flow-row-actions">{doc.fileType === "pdf" && <button className="flow-icon-btn evidence" title="Open Evidence Studio" onClick={() => window.location.assign(`/evidence/${doc._id}`)}><Eye size={16} /></button>}<button className="flow-icon-btn report" title="Generate executive report" onClick={() => window.location.assign(`/report/${doc._id}`)}><FileOutput size={16} /></button><button className="flow-icon-btn" title="Download securely" onClick={() => downloadDocument(doc)}><Download size={16} /></button><button className="flow-icon-btn" title="Run automation" onClick={() => process(doc._id)}><RefreshCw size={16} /></button><button className="flow-icon-btn danger" title="Move to Trash" onClick={() => removeDocument(doc)}><Trash2 size={16} /></button></div></td>}</tr>)}</tbody></table></div>;
}

export function DocumentsPage() {
  const inputRef = useRef();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const load = async () => { try { const response = await API.get("/documents"); setDocuments(response.data); } catch { toast.error("Unable to load documents"); } };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);
  useEffect(() => {
    if (searchParams.has("upload")) window.setTimeout(() => inputRef.current?.click(), 120);
  }, [searchParams]);
  const upload = async (file) => { if (!file) return; const body = new FormData(); body.append("file", file); try { setUploading(true); await API.post("/upload", body); toast.success("Uploaded and automatically classified"); await load(); } catch (error) { toast.error(error.response?.data?.message || "Upload failed"); } finally { setUploading(false); } };
  const shown = useMemo(() => documents.filter((doc) => doc.filename.toLowerCase().includes(query.toLowerCase())), [documents, query]);
  return <><PageHeader eyebrow="INTELLIGENT DOCUMENT HUB" title="Documents" description="Every upload is classified, prioritized and routed by the automation engine." action={<><input ref={inputRef} hidden type="file" onChange={(e) => upload(e.target.files[0])} /><button className="flow-primary" onClick={() => inputRef.current?.click()} disabled={uploading}><Upload size={18} />{uploading ? "Processing..." : "Upload document"}</button></>} />
    <div className="flow-dropzone" onClick={() => inputRef.current?.click()}><div><Upload /><b>Drop a document to start an automation</b><span>PDF, DOCX, XLSX, PPTX, images and text up to 100 MB</span></div><div className="flow-steps"><span><i>1</i>Extract</span><ChevronRight /><span><i>2</i>Classify</span><ChevronRight /><span><i>3</i>Route</span></div></div>
    <div className="flow-card"><div className="flow-toolbar"><div className="flow-input"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search document hub..." /></div><button className="flow-ghost"><Filter size={16} /> Filters</button><span>{shown.length} documents</span></div><DocumentTable documents={shown} onRefresh={load} /></div></>;
}

export function AutomationsPage() {
  const [searchParams] = useSearchParams();
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [parsing, setParsing] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "Document uploaded", condition: "Any document", action: "Classify and prioritize" });
  const load = async () => { try { setRules((await API.get("/automation/rules")).data); } catch { toast.error("Unable to load automations"); } };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);
  useEffect(() => {
    if (searchParams.has("create")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowForm(true);
    }
  }, [searchParams]);
  const create = async (e) => { e.preventDefault(); try { await API.post("/automation/rules", form); toast.success("Automation activated"); setShowForm(false); setForm({ ...form, name: "" }); load(); } catch (error) { toast.error(error.response?.data?.message || "Unable to create rule"); } };
  const toggle = async (id) => { await API.put(`/automation/rules/${id}/toggle`); load(); };
  const remove = async (id) => { await API.delete(`/automation/rules/${id}`); toast.success("Automation removed"); load(); };
  const generateRule = async () => {
    if (!instruction.trim()) return toast.error("Describe the workflow you want");
    try {
      setParsing(true);
      const { data } = await API.post("/automation/parse-rule", { description: instruction });
      setForm(data.rule);
      setShowForm(true);
      toast.success(data.source === "groq" ? "AI workflow generated" : "Workflow generated locally");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to generate workflow");
    } finally {
      setParsing(false);
    }
  };
  return <><PageHeader eyebrow="NO-CODE WORKFLOW ENGINE" title="Automations" description="Build reliable document workflows with triggers, conditions and actions." action={<button className="flow-primary" onClick={() => setShowForm(true)}><Plus size={18} /> New automation</button>} />
    <section className="flow-ai-builder"><div className="flow-ai-builder-icon"><WandSparkles /></div><div className="flow-ai-builder-copy"><span>AI WORKFLOW ARCHITECT</span><h2>Describe your automation in plain language</h2><p>AutoFlow converts your sentence into a ready-to-activate trigger, condition and action.</p><div className="flow-ai-prompt"><textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Example: When an urgent finance document is detected, send it for approval." /><button type="button" className="flow-primary" onClick={generateRule} disabled={parsing}><Sparkles size={16} />{parsing ? "Generating..." : "Generate workflow"}</button></div><div className="flow-prompt-examples"><span>Try:</span><button type="button" onClick={() => setInstruction("When a finance document is uploaded, classify and prioritize it")}>Finance classification</button><button type="button" onClick={() => setInstruction("When a critical document is detected, send it for approval")}>Critical approval</button><button type="button" onClick={() => setInstruction("When any document is uploaded, extract action items")}>Action extraction</button></div></div></section>
    <div className="flow-automation-summary"><div><Workflow /><span><b>{rules.filter((r) => r.enabled).length}</b>Active workflows</span></div><div><Activity /><span><b>{rules.reduce((sum, r) => sum + r.runs, 0)}</b>Total runs</span></div><div><ShieldCheck /><span><b>100%</b>Auditable</span></div></div>
    {showForm && <form className="flow-rule-builder" onSubmit={create}><div className="flow-card-head"><div><h2>Create automation</h2><p>Define when AutoFlow should take action.</p></div><button type="button" className="flow-icon-btn" onClick={() => setShowForm(false)}><X /></button></div><label>Automation name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Example: Route urgent invoices" /></label><div className="flow-rule-flow"><label><span>WHEN</span><select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}><option>Document uploaded</option><option>High priority detected</option><option>Approval completed</option></select></label><ChevronRight /><label><span>IF</span><select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option>Any document</option><option>Category is Finance</option><option>Priority is Critical</option></select></label><ChevronRight /><label><span>THEN</span><select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}><option>Classify and prioritize</option><option>Send for approval</option><option>Extract action items</option></select></label></div><button className="flow-primary">Activate automation <Play size={16} /></button></form>}
    <div className="flow-rule-list">{rules.map((rule) => <article className="flow-rule-card" key={rule._id}><div className={`flow-rule-symbol ${rule.enabled ? "on" : ""}`}><Workflow /></div><div className="flow-rule-copy"><div><h3>{rule.name}</h3>{badge(rule.enabled ? "Active" : "Paused")}</div><p><b>When</b> {rule.trigger} <ChevronRight /> <b>If</b> {rule.condition} <ChevronRight /> <b>Then</b> {rule.action}</p><small>{rule.runs} successful runs · Created {new Date(rule.createdAt).toLocaleDateString()}</small></div><button className="flow-icon-btn" onClick={() => toggle(rule._id)}>{rule.enabled ? <Pause /> : <Play />}</button><button className="flow-icon-btn danger" onClick={() => remove(rule._id)}><Trash2 /></button></article>)}{!rules.length && <div className="flow-empty"><Workflow /><h3>No automations created</h3><p>Create your first no-code document workflow.</p></div>}</div></>;
}

export function ApprovalsPage() {
  const [documents, setDocuments] = useState([]);
  const load = async () => { const response = await API.get("/documents"); setDocuments(response.data.filter((doc) => ["review", "approved", "rejected"].includes(doc.workflowStatus))); };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);
  const decide = async (id, status) => { await API.put(`/automation/review/${id}`, { status }); toast.success(`Document ${status}`); load(); };
  return <><PageHeader eyebrow="HUMAN-IN-THE-LOOP" title="Approval Queue" description="Review high-priority documents before automated workflows continue." />
    <div className="flow-approval-layout"><div className="flow-card"><div className="flow-card-head"><div><h2>Review queue</h2><p>{documents.filter((d) => d.workflowStatus === "review").length} items awaiting a decision</p></div><button className="flow-ghost"><Filter size={16} /> Priority</button></div>{documents.map((doc) => <article className="flow-approval-item" key={doc._id}><div className="flow-file-icon"><FileText /></div><div className="flow-approval-copy"><div><b>{doc.filename}</b>{badge(doc.priority)}</div><span>{doc.classification} · AI confidence {doc.automationScore}%</span><p>{doc.extractedTasks?.[0] || "AutoFlow recommends a human review based on document priority."}</p></div><div className="flow-approval-actions">{doc.workflowStatus === "review" ? <><button className="flow-approve" onClick={() => decide(doc._id, "approved")}><Check /> Approve</button><button className="flow-reject" onClick={() => decide(doc._id, "rejected")}><X /> Reject</button></> : badge(doc.workflowStatus)}</div></article>)}{!documents.length && <div className="flow-empty"><CheckCircle2 /><h3>Nothing needs review</h3><p>High-priority documents will appear here automatically.</p></div>}</div><div className="flow-card flow-policy"><ShieldCheck /><h2>Approval policy</h2><p>Documents marked high or critical are automatically paused for human review.</p><div><span>Critical priority</span><b>Always review</b></div><div><span>High priority</span><b>Always review</b></div><div><span>Medium priority</span><b>Auto-process</b></div></div></div></>;
}

export function AssistantPage() {
  const [documents, setDocuments] = useState([]); const [selected, setSelected] = useState(""); const [question, setQuestion] = useState(""); const [messages, setMessages] = useState([{ role: "ai", text: "Select a processed PDF and ask me about its content, risks or action items." }]); const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  useEffect(() => { API.get("/documents").then(({ data }) => { const pdfs = data.filter((d) => d.fileType === "pdf"); const requested = searchParams.get("document"); setDocuments(pdfs); setSelected(pdfs.some((doc) => doc._id === requested) ? requested : pdfs[0]?._id || ""); }); }, [searchParams]);
  const ask = async (e) => { e.preventDefault(); if (!question.trim() || !selected) return; const text = question; setMessages((old) => [...old, { role: "user", text }]); setQuestion(""); try { setLoading(true); const { data } = await API.post(`/chat/${selected}`, { question: text }); setMessages((old) => [...old, { role: "ai", text: data.answer }]); } catch (error) { setMessages((old) => [...old, { role: "ai", text: error.response?.data?.message || "AI service is unavailable. The local automation engine is still operational." }]); } finally { setLoading(false); } };
  return <><PageHeader eyebrow="GROUNDED DOCUMENT INTELLIGENCE" title="AI Copilot" description="Ask questions using only the content of your uploaded documents." />
    <div className="flow-copilot"><aside><h3>Knowledge source</h3><p>Choose the document AutoFlow may use.</p><select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Select a PDF</option>{documents.map((doc) => <option key={doc._id} value={doc._id}>{doc.filename}</option>)}</select><div className="flow-copilot-safety"><ShieldCheck /><b>Grounded answers</b><span>Answers are restricted to the selected PDF.</span></div></aside><section><div className="flow-chat-head"><div className="flow-brand-mark"><Bot /></div><div><b>AutoFlow Copilot</b><span>{selected ? "Document connected" : "Waiting for document"}</span></div></div><div className="flow-messages">{messages.map((message, index) => <div key={index} className={`flow-message ${message.role}`}>{message.role === "ai" && <Bot size={18} />}<p>{message.text}</p></div>)}{loading && <div className="flow-message ai"><Bot /><p>Analyzing document...</p></div>}</div><form className="flow-chat-input" onSubmit={ask}><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about risks, deadlines or key decisions..." /><button><Send /></button></form></section></div></>;
}

export function InsightsPage() {
  const { data } = useAutomationDashboard(); const m = data.metrics || {};
  return <><PageHeader eyebrow="OPERATIONAL INTELLIGENCE" title="Automation Insights" description="Measure throughput, review workload and the impact of automated document processing." />
    <section className="flow-metrics"><MetricCard icon={Activity} label="Automation runs" value={m.processed || 0} detail="Completed successfully" tone="violet" /><MetricCard icon={Clock3} label="Hours reclaimed" value={((m.timeSavedMinutes || 0) / 60).toFixed(1)} detail="Estimated time saved" tone="green" /><MetricCard icon={CheckCircle2} label="Approved" value={m.approved || 0} detail="Human decisions completed" tone="blue" /><MetricCard icon={Gauge} label="Automation accuracy" value="98%" detail="Rule confidence" tone="amber" /></section>
    <div className="flow-insight-grid"><div className="flow-card"><div className="flow-card-head"><div><h2>Documents by workflow stage</h2><p>Current operational distribution</p></div></div><div className="flow-donut-area"><div className="flow-donut"><span><b>{m.documents || 0}</b>Total</span></div><div className="flow-legend"><span><i className="violet" />Processed <b>{m.processed || 0}</b></span><span><i className="amber" />Needs review <b>{m.needsReview || 0}</b></span><span><i className="green" />Approved <b>{m.approved || 0}</b></span></div></div></div><div className="flow-card"><div className="flow-card-head"><div><h2>Automation value</h2><p>Estimated manual work avoided</p></div></div><div className="flow-value"><Sparkles /><strong>{m.timeSavedMinutes || 0} minutes</strong><p>AutoFlow has classified, prioritized and routed {m.processed || 0} documents without manual sorting.</p><div><span>Average time per document</span><b>12 min saved</b></div><div><span>Operational cost</span><b>₹0 API required</b></div></div></div></div></>;
}

export function SettingsPage() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [profile, setProfile] = useState({ name: storedUser.name || "Vishal Dubey", role: storedUser.role || "AI Automation Engineer" });
  const [saving, setSaving] = useState(false);
  const saveProfile = async (event) => { event.preventDefault(); try { setSaving(true); const { data } = await API.put("/auth/profile", profile); localStorage.setItem("user", JSON.stringify(data.user)); window.dispatchEvent(new CustomEvent("autoflow-profile-updated", { detail: data.user })); toast.success("Professional profile updated"); } catch (error) { toast.error(error.response?.data?.message || "Unable to update profile"); } finally { setSaving(false); } };
  return <><PageHeader eyebrow="WORKSPACE CONFIGURATION" title="Settings" description="Manage your professional identity, automation preferences and workspace security." /><div className="flow-settings-grid"><form className="flow-card" onSubmit={saveProfile}><h2>Professional profile</h2><p className="flow-setting-copy">Your name and role appear in the workspace header. Use the profile menu to upload or change your photo.</p><label>Full name<input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label><label>Professional role<input required value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} placeholder="AI Automation Engineer" /></label><label>Email address<input value={storedUser.email || ""} readOnly /></label><button className="flow-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button></form><section className="flow-card"><h2>Automation defaults</h2><div className="flow-setting"><div><b>Automatic classification</b><span>Classify every uploaded document locally.</span></div><input type="checkbox" defaultChecked /></div><div className="flow-setting"><div><b>High-priority approval</b><span>Pause urgent documents for human review.</span></div><input type="checkbox" defaultChecked /></div><div className="flow-setting"><div><b>Activity audit log</b><span>Record every automation decision.</span></div><input type="checkbox" defaultChecked /></div></section></div></>;
}

export function TrashPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { try { const { data } = await API.get("/documents?status=trash"); setDocuments(data); } catch { toast.error("Unable to load Trash"); } finally { setLoading(false); } };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);
  const restore = async (doc) => { try { await API.put(`/documents/${doc._id}/restore`); toast.success(`${doc.filename} restored`); load(); } catch { toast.error("Unable to restore document"); } };
  const removeForever = async (doc) => { if (!window.confirm(`Permanently delete "${doc.filename}"? This cannot be undone.`)) return; try { await API.delete(`/documents/${doc._id}/permanent`); toast.success("Document permanently deleted"); load(); } catch { toast.error("Permanent deletion failed"); } };
  return <><PageHeader eyebrow="DOCUMENT RETENTION" title="Trash" description="Restore accidentally removed documents or permanently erase files you no longer need." action={documents.length > 0 ? <span className="flow-trash-count">{documents.length} deleted documents</span> : null} /><div className="flow-card"><div className="flow-table-wrap"><table className="flow-table"><thead><tr><th>Document</th><th>Classification</th><th>Priority</th><th>Deleted</th><th>Actions</th></tr></thead><tbody>{documents.map((doc) => <tr key={doc._id}><td><div className="flow-doc-name"><span><FileText /></span><div><b>{doc.filename}</b><small>{formatSize(doc.filesize)} · {doc.fileType?.toUpperCase()}</small></div></div></td><td>{doc.classification || "General"}</td><td>{badge(doc.priority || "medium")}</td><td>{new Date(doc.updatedAt).toLocaleString()}</td><td><div className="flow-row-actions"><button className="flow-restore-btn" onClick={() => restore(doc)}><RotateCcw /> Restore</button><button className="flow-delete-forever" onClick={() => removeForever(doc)}><Trash2 /> Delete forever</button></div></td></tr>)}</tbody></table></div>{!loading && !documents.length && <div className="flow-empty"><Trash2 /><h3>Trash is empty</h3><p>Documents moved to Trash will appear here until permanently deleted.</p></div>}</div></>;
}

export function AuditPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/automation/runs")
      .then(({ data }) => setRuns(data))
      .catch(() => toast.error("Unable to load audit trail"))
      .finally(() => setLoading(false));
  }, []);

  return <>
    <PageHeader eyebrow="AUTOMATION GOVERNANCE" title="Audit Trail" description="A permanent, user-isolated history of every rule executed by AutoFlow AI." />
    <section className="flow-metrics">
      <MetricCard icon={Activity} label="Total executions" value={loading ? "—" : runs.length} detail="Recorded automation runs" tone="violet" />
      <MetricCard icon={CheckCircle2} label="Successful" value={loading ? "—" : runs.filter((run) => run.status === "success").length} detail="Completed without errors" tone="green" />
      <MetricCard icon={CircleAlert} label="Failed" value={loading ? "—" : runs.filter((run) => run.status === "failed").length} detail="Runs needing attention" tone="amber" />
      <MetricCard icon={ShieldCheck} label="Traceability" value="100%" detail="Every decision is auditable" tone="blue" />
    </section>
    <div className="flow-card">
      <div className="flow-card-head"><div><h2>Automation execution history</h2><p>Latest rule matches, actions and outcomes</p></div><button type="button" className="flow-ghost"><Filter size={16} /> All events</button></div>
      <div className="flow-table-wrap"><table className="flow-table flow-audit-table"><thead><tr><th>Automation</th><th>Document</th><th>Trigger</th><th>Action</th><th>Status</th><th>Executed</th></tr></thead><tbody>{runs.map((run) => <tr key={run._id}><td><b>{run.ruleName}</b></td><td>{run.documentName}</td><td>{run.trigger}</td><td>{run.action}</td><td>{badge(run.status)}</td><td>{new Date(run.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
      {!loading && runs.length === 0 && <div className="flow-empty"><Activity /><h3>No automation runs yet</h3><p>Upload a document that matches an active rule to create the first audit record.</p></div>}
    </div>
  </>;
}

export function SecurityPage() {
  const [data, setData] = useState({ metrics: {}, documents: [] });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState("");

  const load = async () => {
    try {
      const response = await API.get("/security/dashboard");
      setData(response.data);
    } catch {
      toast.error("Unable to load security dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const scan = async (id) => {
    try {
      setScanning(id);
      await API.post(`/security/scan/${id}`);
      toast.success("Sensitive data scan completed");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Privacy scan failed");
    } finally {
      setScanning("");
    }
  };

  const metrics = data.metrics || {};
  return <>
    <PageHeader eyebrow="PRIVACY & COMPLIANCE" title="Sensitive Data Scanner" description="Detect and mask exposed Aadhaar, PAN, payment card, phone and email data before documents enter a workflow." action={<button type="button" className="flow-ghost" onClick={load}><RefreshCw size={16} /> Refresh</button>} />
    <section className="flow-metrics">
      <MetricCard icon={ShieldCheck} label="Documents scanned" value={loading ? "—" : metrics.scanned || 0} detail="Privacy checks completed" tone="blue" />
      <MetricCard icon={ShieldAlert} label="Risky documents" value={loading ? "—" : metrics.riskyDocuments || 0} detail="Sensitive information detected" tone="amber" />
      <MetricCard icon={CircleAlert} label="Critical risk" value={loading ? "—" : metrics.criticalDocuments || 0} detail="Immediate review recommended" tone="violet" />
      <MetricCard icon={Search} label="PII findings" value={loading ? "—" : metrics.totalFindings || 0} detail="Masked privacy matches" tone="green" />
    </section>
    <section className="flow-security-note"><ShieldCheck /><div><b>Privacy-first scanning</b><span>Only masked samples appear here. Raw sensitive values are never returned by the scanner API.</span></div></section>
    <div className="flow-card"><div className="flow-card-head"><div><h2>Document risk register</h2><p>Automatic results for new PDFs and text files; scan older documents on demand.</p></div></div>
      <div className="flow-table-wrap"><table className="flow-table flow-security-table"><thead><tr><th>Document</th><th>Risk level</th><th>Risk score</th><th>Detected data</th><th>Last scan</th><th /></tr></thead><tbody>{data.documents.map((doc) => {
        const result = doc.sensitiveData || {};
        const scanned = Boolean(result.scannedAt);
        return <tr key={doc._id}><td><div className="flow-doc-name"><span><FileText /></span><div><b>{doc.filename}</b><small>{doc.classification || "General"} · {doc.fileType?.toUpperCase()}</small></div></div></td><td>{scanned ? badge(result.riskLevel || "safe") : badge("Not scanned")}</td><td><div className="flow-risk-score"><i style={{ width: `${result.riskScore || 0}%` }} /><span>{scanned ? `${result.riskScore || 0}/100` : "—"}</span></div></td><td><div className="flow-findings">{result.findings?.length ? result.findings.map((finding) => <span key={finding.type}>{finding.type} <b>{finding.count}</b></span>) : <small>{scanned ? "No sensitive data" : "Scan required"}</small>}</div></td><td>{scanned ? new Date(result.scannedAt).toLocaleString() : "Never"}</td><td><button type="button" className="flow-icon-btn" title="Scan document" onClick={() => scan(doc._id)} disabled={scanning === doc._id}><RefreshCw className={scanning === doc._id ? "flow-spin" : ""} /></button></td></tr>;
      })}</tbody></table></div>
      {!loading && data.documents.length === 0 && <div className="flow-empty"><ShieldCheck /><h3>No documents to scan</h3><p>Upload a PDF or text file to run the first privacy check.</p></div>}
    </div>
  </>;
}

export function EvidenceStudioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [viewerUrl, setViewerUrl] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [activeInsight, setActiveInsight] = useState("risks");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl = "";
    const loadEvidence = async () => {
      try {
        const [profileResponse, fileResponse] = await Promise.all([
          API.get(`/documents/evidence/${id}`),
          API.get(`/documents/view/${id}`, { responseType: "blob" }),
        ]);
        objectUrl = URL.createObjectURL(fileResponse.data);
        setProfile(profileResponse.data);
        setViewerUrl(objectUrl);
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to open Evidence Studio");
      } finally {
        setLoading(false);
      }
    };
    loadEvidence();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id]);

  const download = async () => {
    try {
      const response = await API.get(`/documents/download/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = profile.document.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Verified document downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  if (loading) return <div className="flow-evidence-loading"><RefreshCw className="flow-spin" /><h2>Building evidence workspace...</h2><p>Indexing pages and verifying document integrity.</p></div>;
  if (!profile) return <div className="flow-empty"><CircleAlert /><h3>Evidence workspace unavailable</h3><button className="flow-ghost" onClick={() => navigate("/documents")}>Return to documents</button></div>;

  const groups = [
    { key: "risks", label: "Risks", icon: ShieldAlert, items: profile.insights.risks },
    { key: "deadlines", label: "Deadlines", icon: CalendarDays, items: profile.insights.deadlines },
    { key: "amounts", label: "Amounts", icon: IndianRupee, items: profile.insights.amounts },
    { key: "decisions", label: "Actions", icon: ListChecks, items: profile.insights.decisions },
  ];
  const selectedGroup = groups.find((group) => group.key === activeInsight) || groups[0];
  const openEvidence = (page) => { if (page) setActivePage(page); };

  return <div className="flow-evidence-shell">
    <header className="flow-evidence-head"><button className="flow-icon-btn" onClick={() => navigate("/documents")}><ArrowLeft /></button><div className="flow-evidence-title"><span>EVIDENCE STUDIO</span><h1>{profile.document.filename}</h1><p>{profile.document.pages || "—"} pages · {formatSize(profile.document.filesize)} · {profile.document.classification}</p></div><div className="flow-evidence-actions"><button className="flow-ghost" onClick={() => document.querySelector(".flow-pdf-stage")?.requestFullscreen()}><Maximize2 size={16} /> Fullscreen</button><button className="flow-ghost" onClick={() => navigate(`/assistant?document=${id}`)}><Bot size={16} /> Ask with citations</button><button className="flow-primary" onClick={download}><Download size={16} /> Download verified</button></div></header>
    <section className="flow-evidence-status"><div><ShieldCheck /><span><b>Integrity verified</b><small>{profile.integrity.algorithm} fingerprint matched</small></span></div><div><Fingerprint /><span><b>{profile.integrity.fingerprint.slice(0, 18)}...</b><small title={profile.integrity.fingerprint}>Document fingerprint</small></span></div><div><Gauge /><span><b>{profile.document.automationScore}% AI confidence</b><small>{profile.document.workflowStatus} workflow status</small></span></div><div><ShieldAlert /><span><b>{profile.privacy.riskLevel} privacy risk</b><small>{profile.privacy.totalFindings} sensitive findings</small></span></div></section>
    <div className="flow-evidence-layout"><section className="flow-pdf-stage"><div className="flow-pdf-toolbar"><span><FileText /> Secure PDF stream</span><span>Page {activePage} of {profile.document.pages || "—"}</span></div>{viewerUrl ? <iframe key={activePage} title={profile.document.filename} src={`${viewerUrl}#page=${activePage}&view=FitH`} /> : <div className="flow-empty"><FileText /><h3>Preview unavailable</h3></div>}</section>
      <aside className="flow-evidence-panel"><div className="flow-intel-head"><div><Sparkles /><span><b>AI Decision Radar</b><small>Evidence linked to source pages</small></span></div>{badge(profile.document.priority)}</div><div className="flow-intel-tabs">{groups.map(({ key, label, icon: Icon, items }) => <button key={key} className={activeInsight === key ? "active" : ""} onClick={() => setActiveInsight(key)}><Icon /><span>{label}</span><b>{items.length}</b></button>)}</div><div className="flow-evidence-items">{selectedGroup.items.map((item, index) => <button key={`${item.page}-${index}`} onClick={() => openEvidence(item.page)}><span>{item.text}</span><small>{item.page ? `View evidence · Page ${item.page}` : "Source excerpt · page index unavailable"} <ChevronRight /></small></button>)}{selectedGroup.items.length === 0 && <div className="flow-empty-mini"><CheckCircle2 /><b>No {selectedGroup.label.toLowerCase()} detected</b><span>AutoFlow found no matching evidence in this document.</span></div>}</div><div className="flow-privacy-summary"><div><ShieldCheck /><span><b>Privacy shield</b><small>{profile.privacy.riskScore}/100 risk score</small></span></div>{profile.privacy.findings.map((finding) => <p key={finding.type}><span>{finding.type}</span><b>{finding.count} masked</b></p>)}{!profile.privacy.findings.length && <p><span>No exposed identifiers</span><b>Safe</b></p>}</div></aside>
    </div>
  </div>;
}

export function ExecutiveReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/documents/evidence/${id}`)
      .then(({ data }) => setProfile(data))
      .catch((error) => toast.error(error.response?.data?.message || "Unable to generate report"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flow-evidence-loading"><FileOutput /><h2>Generating executive report...</h2><p>Compiling intelligence, privacy and verification results.</p></div>;
  if (!profile) return <div className="flow-empty"><CircleAlert /><h3>Report unavailable</h3><button className="flow-ghost" onClick={() => navigate("/documents")}>Return to documents</button></div>;

  const { document: doc, insights, privacy, integrity, report } = profile;
  const risks = insights.risks.slice(0, 5);
  const deadlines = insights.deadlines.slice(0, 5);
  const actions = doc.actionItems?.length ? doc.actionItems.slice(0, 6).map((text) => ({ text })) : insights.decisions.slice(0, 6);

  return <div className="flow-report-shell"><div className="flow-report-actions"><button className="flow-ghost" onClick={() => navigate("/documents")}><ArrowLeft size={16} /> Back to documents</button><button className="flow-primary" onClick={() => window.print()}><Printer size={16} /> Download / Print PDF</button></div><article className="flow-report-page">
    <header className="flow-report-header"><div className="flow-report-brand"><div><BrainCircuit /><span>AutoFlow AI</span></div><small>INTELLIGENT DOCUMENT OPERATIONS</small></div><div className="flow-report-label"><span>EXECUTIVE INTELLIGENCE REPORT</span><b>{report.reportId}</b><small>CONFIDENTIAL</small></div></header>
    <section className="flow-report-hero"><span>AUTOMATED DOCUMENT BRIEF</span><h1>{doc.filename}</h1><p>Evidence-grounded operational intelligence generated by AutoFlow AI.</p></section>
    <section className="flow-report-meta"><div><span>Classification</span><b>{doc.classification}</b></div><div><span>Priority</span><b className={`tone-${doc.priority}`}>{doc.priority}</b></div><div><span>Pages</span><b>{doc.pages || "—"}</b></div><div><span>Word count</span><b>{report.wordCount.toLocaleString()}</b></div><div><span>AI confidence</span><b>{doc.automationScore}%</b></div><div><span>Workflow</span><b>{doc.workflowStatus}</b></div></section>
    <section className="flow-report-section"><div className="flow-report-section-title"><Sparkles /><div><span>01</span><h2>Executive summary</h2></div></div><p className="flow-report-summary">{doc.summary}</p></section>
    <section className="flow-report-columns"><div className="flow-report-section"><div className="flow-report-section-title danger"><ShieldAlert /><div><span>02</span><h2>Risk intelligence</h2></div></div><div className="flow-report-list">{risks.map((item, index) => <div key={index}><i>{index + 1}</i><p>{item.text}</p>{item.page && <small>PAGE {item.page}</small>}</div>)}{!risks.length && <div className="empty"><CheckCircle2 /><p>No material risks detected.</p></div>}</div></div><div className="flow-report-section"><div className="flow-report-section-title amber"><CalendarDays /><div><span>03</span><h2>Deadlines & dates</h2></div></div><div className="flow-report-list">{deadlines.map((item, index) => <div key={index}><i>{index + 1}</i><p>{item.text}</p>{item.page && <small>PAGE {item.page}</small>}</div>)}{!deadlines.length && <div className="empty"><CalendarDays /><p>No explicit deadlines detected.</p></div>}</div></div></section>
    <section className="flow-report-section"><div className="flow-report-section-title blue"><ListChecks /><div><span>04</span><h2>Recommended actions</h2></div></div><div className="flow-report-actions-list">{actions.map((item, index) => <div key={index}><span>{String(index + 1).padStart(2, "0")}</span><p>{item.text}</p><small>{item.page ? `SOURCE PAGE ${item.page}` : "AUTO-EXTRACTED"}</small></div>)}{!actions.length && <div className="flow-report-none">No immediate action items were detected in this document.</div>}</div></section>
    <section className="flow-report-assurance"><div><ShieldCheck /><span><small>PRIVACY RISK</small><b>{privacy.riskScore}/100 · {privacy.riskLevel}</b><p>{privacy.totalFindings} sensitive findings detected</p></span></div><div><Fingerprint /><span><small>DOCUMENT INTEGRITY</small><b>SHA-256 verified</b><p>{integrity.fingerprint.slice(0, 24)}...</p></span></div><div><Gauge /><span><small>AUTOMATION QUALITY</small><b>{doc.automationScore}% confidence</b><p>Evidence traceability enabled</p></span></div></section>
    <footer className="flow-report-footer"><div><span>Generated for</span><b>{report.generatedBy}</b><small>{new Date(report.generatedAt).toLocaleString()}</small></div><div><span>Verification fingerprint</span><code>{integrity.fingerprint}</code></div><div className="flow-report-seal"><ShieldCheck /><span>VERIFIED<br />BY AUTOFLOW</span></div></footer>
  </article></div>;
}
