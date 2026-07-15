import { useState } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, Sparkles, Workflow } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../services/api";

export default function AuthPage({ mode }) {
  const register = mode === "register";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      if (register) {
        await API.post("/auth/register", form);
        toast.success("Workspace created. Please sign in.");
        navigate("/login");
      } else {
        const { data } = await API.post("/auth/login", form);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Welcome to AutoFlow AI");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to continue");
    } finally { setLoading(false); }
  };

  return (
    <div className="flow-auth">
      <section className="flow-auth-story">
        <div className="flow-auth-brand"><BrainCircuit /> AutoFlow AI</div>
        <div className="flow-auth-copy"><span className="flow-eyebrow"><Sparkles size={15} /> AI DOCUMENT OPERATIONS</span><h1>Turn every document into an automated workflow.</h1><p>Classify, prioritize, route and approve business documents with a reliable AI-assisted operations platform.</p>
          {["Automatic document classification", "Human-in-the-loop approval queues", "Auditable workflow automation"].map((item) => <div className="flow-benefit" key={item}><CheckCircle2 size={19} />{item}</div>)}
        </div>
        <div className="flow-auth-orbit"><Workflow size={80} /></div>
      </section>
      <section className="flow-auth-form-wrap">
        <form className="flow-auth-form" onSubmit={submit}>
          <div className="flow-auth-icon"><BrainCircuit /></div>
          <h2>{register ? "Create your workspace" : "Welcome back"}</h2>
          <p>{register ? "Start automating document operations." : "Sign in to your automation command center."}</p>
          {register && <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vishal Dubey" /></label>}
          <label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
          <label>Password<input required minLength="6" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 characters" /></label>
          <button className="flow-primary" disabled={loading}>{loading ? "Please wait..." : register ? "Create workspace" : "Sign in"}<ArrowRight size={18} /></button>
          <small>{register ? "Already have an account?" : "New to AutoFlow AI?"} <Link to={register ? "/login" : "/register"}>{register ? "Sign in" : "Create workspace"}</Link></small>
        </form>
      </section>
    </div>
  );
}
