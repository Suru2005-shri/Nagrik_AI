import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  FileWarning,
  Search,
  Compass,
  Send,
  Loader2,
  MapPin,
  Building2,
  FileText,
  Sparkles,
  ShieldCheck,
  Languages,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: NagrikApp,
});

// In dev, Vite proxies /api to the FastAPI server (see vite.config.ts).
// In production, the built frontend is served by FastAPI itself, so a
// relative path is correct there too. Override with VITE_API_BASE if you
// ever host the API on a different origin.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type TabId = "chat" | "report" | "track" | "services";

const TABS: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Companion", icon: MessageSquare },
  { id: "report", label: "Report an Issue", icon: FileWarning },
  { id: "track", label: "Track a Complaint", icon: Search },
  { id: "services", label: "Find a Service", icon: Compass },
];

const LANGS = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Marathi"];

const CATEGORIES = [
  { v: "roads", l: "Roads & potholes" },
  { v: "water", l: "Water supply" },
  { v: "electricity", l: "Electricity" },
  { v: "garbage", l: "Garbage collection" },
  { v: "streetlight", l: "Streetlight" },
  { v: "drainage", l: "Drainage" },
  { v: "other", l: "Other" },
];

function NagrikApp() {
  const [tab, setTab] = useState<TabId>("chat");
  const [language, setLanguage] = useState("English");

  return (
    <div className="min-h-screen flex flex-col">
      <Masthead tab={tab} onTab={setTab} language={language} onLanguage={setLanguage} />
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-16">
        {tab === "chat" && <ChatPanel language={language} />}
        {tab === "report" && <ReportPanel />}
        {tab === "track" && <TrackPanel />}
        {tab === "services" && <ServicesPanel />}
      </main>
      <Footer />
    </div>
  );
}

/* ---------- Masthead ---------- */

function Masthead({
  tab,
  onTab,
  language,
  onLanguage,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
  language: string;
  onLanguage: (l: string) => void;
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-ink-2/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:flex md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 grid place-items-center h-11 w-11 rounded-md border border-sandstone/60 bg-ink-3">
            <span className="font-mono text-[13px] font-semibold text-sandstone-bright tracking-wider">
              नA
            </span>
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-display text-lg md:text-xl font-semibold text-paper truncate">
              Nagrik AI
            </span>
            <span className="stamp truncate">Civic Ledger & Companion</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 rounded-full bg-ink-3/60 border border-border p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  active
                    ? "bg-sandstone text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-paper"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Languages className="hidden sm:block h-4 w-4 text-muted-foreground" />
          <select
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            aria-label="Response language"
            className="bg-ink-3 border border-border rounded-md px-3 py-2 text-sm text-paper focus:outline-none focus:ring-2 focus:ring-sandstone"
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden overflow-x-auto border-t border-border">
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  active
                    ? "bg-sandstone text-primary-foreground"
                    : "text-muted-foreground border border-border"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

/* ---------- Shared bits ---------- */

function PanelIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 md:mb-10">
      <div className="stamp mb-3">{eyebrow}</div>
      <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-paper">
        {title}
      </h1>
      <p className="mt-4 text-muted-foreground text-base md:text-[15px] leading-relaxed max-w-2xl">
        {children}
      </p>
    </div>
  );
}

function PrimaryButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-sandstone hover:bg-sandstone-bright text-primary-foreground font-semibold text-sm px-5 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full bg-ink-2 border border-border rounded-md px-3.5 py-2.5 text-sm text-paper placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-sandstone focus:border-transparent transition";

/* ---------- CHAT ---------- */

type Msg = { who: "user" | "bot"; text: string; pending?: boolean };

const SUGGESTIONS = [
  "Documents needed for a ration card?",
  "How do I apply for PM-KISAN?",
  "Ayushman Bharat eligibility",
  "Renewing a driving licence",
];

function ChatPanel({ language }: { language: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      who: "bot",
      text: "Namaste. Ask me about a scheme, a certificate, or which documents you need — I'll answer in the language you pick above.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    windowRef.current?.scrollTo({ top: windowRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setInput("");
    setMessages((m) => [...m, { who: "user", text: message }, { who: "bot", text: "Thinking…", pending: true }]);
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, language }),
      });
      const data = await res.json();
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { who: "bot", text: data.reply ?? "(no reply)" };
        return copy;
      });
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          who: "bot",
          text: "Could not reach the companion service. Please check the backend and try again.",
        };
        return copy;
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <PanelIntro eyebrow="01 — Companion" title="Ask Nagrik.">
        Your civic companion for schemes, certificates, and everyday government questions.
        Answers are grounded in the local services register — nothing invented.
      </PanelIntro>

      <div className="rounded-2xl border border-border bg-ink-2/60 shadow-[var(--shadow-soft)] overflow-hidden">
        <div
          ref={windowRef}
          className="flex flex-col gap-5 px-5 md:px-7 py-6 min-h-[320px] max-h-[52vh] overflow-y-auto"
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
        </div>

        <div className="border-t border-border bg-ink-2/80 px-4 md:px-5 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. What documents do I need for a ration card?"
              className={inputClass}
              autoComplete="off"
            />
            <PrimaryButton type="submit" disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Ask</span>
            </PrimaryButton>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={sending}
                className="text-xs text-muted-foreground hover:text-paper border border-border rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TrustStrip />
    </section>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.who === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[92%] ${isUser ? "self-end" : ""}`}>
      <span className={`stamp mb-1.5 ${isUser ? "!text-muted-foreground" : ""}`}>
        {isUser ? "You" : "Nagrik"}
      </span>
      <div
        className={`rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-sandstone/15 border border-sandstone/30 text-paper rounded-tr-sm"
            : "bg-ink-3/70 border border-border text-paper rounded-tl-sm"
        } ${msg.pending ? "opacity-70 italic" : ""}`}
      >
        {msg.pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {msg.text}
          </span>
        ) : (
          msg.text
        )}
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, label: "Grounded in local register" },
    { icon: Sparkles, label: "No hallucinations, no invented facts" },
    { icon: Languages, label: "Multilingual by default" },
  ];
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      {items.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-lg border border-border bg-ink-2/40 px-4 py-3"
        >
          <Icon className="h-4 w-4 text-sandstone-bright shrink-0" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- REPORT ---------- */

type ReportResp = {
  ticket_id: string;
  status: string;
  department: string;
};

function ReportPanel() {
  const [form, setForm] = useState({ name: "", category: "roads", location: "", description: "" });
  const [result, setResult] = useState<ReportResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      const data: ReportResp = await res.json();
      setResult(data);
      setForm({ name: "", category: "roads", location: "", description: "" });
    } catch {
      setError("Something went wrong submitting the report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <PanelIntro eyebrow="02 — Report" title="File a civic report.">
        Every report is stamped with a ledger reference and routed to the responsible
        department. Keep the reference to track progress.
      </PanelIntro>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-ink-2/60 p-6 md:p-8 grid gap-5 md:grid-cols-2 shadow-[var(--shadow-soft)]"
        >
          <Field label="Your name" className="md:col-span-1">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </Field>
          <Field label="Category" className="md:col-span-1">
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location" className="md:col-span-2">
            <input
              className={inputClass}
              placeholder="Area, ward or landmark"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              required
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              placeholder="Describe the issue"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              required
            />
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileWarning className="h-4 w-4" />}
              Submit Report
            </PrimaryButton>
          </div>
        </form>

        <aside className="rounded-2xl border border-border bg-ink-2/40 p-6 md:p-8">
          {result ? (
            <ResultCard>
              <TicketStamp id={result.ticket_id} />
              <ResultRow k="Status" v={<StatusBadge>{result.status}</StatusBadge>} />
              <ResultRow k="Routed to" v={result.department} />
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                Save this reference — you can track progress under <em>Track a Complaint</em>.
              </p>
            </ResultCard>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <EmptyState
              icon={FileWarning}
              title="Ledger reference"
              body="Once submitted, your complaint reference appears here. It is unique, auditable, and routed automatically."
            />
          )}
        </aside>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="stamp !text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ---------- TRACK ---------- */

type Complaint = {
  ticket_id: string;
  status: string;
  category: string;
  location: string;
  department: string;
  created_at: string;
};

function TrackPanel() {
  const [id, setId] = useState("");
  const [data, setData] = useState<Complaint | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id.trim()) return;
    setState("loading");
    setData(null);
    try {
      const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(id.trim())}`);
      if (!res.ok) {
        setState("empty");
        return;
      }
      const d: Complaint = await res.json();
      setData(d);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <section>
      <PanelIntro eyebrow="03 — Track" title="Track a complaint.">
        Enter the ledger reference number you received when you filed a report.
      </PanelIntro>

      <form onSubmit={submit} className="flex gap-2 mb-6">
        <input
          className={`${inputClass} font-mono tracking-wider uppercase`}
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="SB-2026-XXXXXX"
          required
        />
        <PrimaryButton type="submit" disabled={state === "loading"}>
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Track
        </PrimaryButton>
      </form>

      {data && (
        <ResultCard>
          <TicketStamp id={data.ticket_id} />
          <ResultRow k="Status" v={<StatusBadge>{data.status}</StatusBadge>} />
          <ResultRow k="Category" v={data.category} />
          <ResultRow k="Location" v={data.location} />
          <ResultRow k="Department" v={data.department} />
          <ResultRow k="Filed" v={new Date(data.created_at).toLocaleString()} />
        </ResultCard>
      )}
      {state === "empty" && (
        <EmptyState
          icon={Search}
          title="No complaint found"
          body="Double-check the reference number. It looks like SB-YYYY-XXXXXX."
        />
      )}
      {state === "error" && (
        <p className="text-sm text-destructive">Could not reach the tracking service.</p>
      )}
    </section>
  );
}

/* ---------- SERVICES ---------- */

type Service = {
  name: string;
  department: string;
  category: string;
  summary: string;
  documents: string[];
};

function ServicesPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Service[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setState("loading");
    setResults(null);
    try {
      const res = await fetch(`${API_BASE}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <section>
      <PanelIntro eyebrow="04 — Services" title="Find the right service.">
        Describe your situation in plain words — the companion matches it to relevant
        schemes and certificates from the register.
      </PanelIntro>

      <form onSubmit={submit} className="flex gap-2 mb-6">
        <input
          className={inputClass}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. I need help with an electricity connection for my new house"
          required
        />
        <PrimaryButton type="submit" disabled={state === "loading"}>
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
          Search
        </PrimaryButton>
      </form>

      {state === "error" && (
        <p className="text-sm text-destructive">Could not reach the recommendation service.</p>
      )}

      {results && results.length === 0 && (
        <EmptyState
          icon={Compass}
          title="No matches"
          body="Try rephrasing — mention the certificate, situation, or department you're looking for."
        />
      )}

      {results && results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((s, i) => (
            <ServiceCard key={i} s={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function ServiceCard({ s }: { s: Service }) {
  return (
    <article className="group rounded-2xl border border-border bg-ink-2/60 p-6 hover:border-sandstone/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="shrink-0 grid place-items-center h-10 w-10 rounded-md bg-sandstone/15 border border-sandstone/30 text-sandstone-bright">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-paper leading-snug">
            {s.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {s.department}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {s.category}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-paper/85 leading-relaxed">{s.summary}</p>

      {s.documents?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="stamp mb-2">Documents</div>
          <div className="flex flex-wrap gap-1.5">
            {s.documents.map((d) => (
              <span
                key={d}
                className="text-xs px-2 py-1 rounded bg-ink-3 border border-border text-paper/80"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------- Result primitives ---------- */

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-ink-2/60 p-5">{children}</div>
  );
}

function TicketStamp({ id }: { id: string }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded border border-sandstone/50 text-sandstone-bright bg-sandstone/10">
      <span className="stamp !text-muted-foreground !text-[10px]">Ref</span>
      {id}
    </div>
  );
}

function ResultRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/60 last:border-0">
      <span className="stamp !text-muted-foreground">{k}</span>
      <span className="text-sm text-paper text-right">{v}</span>
    </div>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  const s = String(children).toLowerCase();
  const tone = useMemo(() => {
    if (s.includes("resolv") || s.includes("closed")) return "bg-ok/20 text-ok border-ok/40";
    if (s.includes("progress") || s.includes("routed")) return "bg-sandstone/15 text-sandstone-bright border-sandstone/40";
    return "bg-ink-3 text-paper border-border";
  }, [s]);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono uppercase tracking-wider ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MessageSquare;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center py-8 px-4">
      <div className="mx-auto grid place-items-center h-12 w-12 rounded-full bg-ink-3 border border-border mb-4">
        <Icon className="h-5 w-5 text-sandstone-bright" />
      </div>
      <div className="font-display text-lg text-paper">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {body}
      </p>
    </div>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="stamp">Smart Bharat</div>
          <span className="text-xs text-muted-foreground">
            Build · Learn · Lead · Impact
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nagrik AI. Grounded in the local services register.
        </div>
      </div>
    </footer>
  );
}
