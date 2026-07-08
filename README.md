# Nagrik AI — Smart Bharat Civic Companion

A GenAI civic platform where a citizen can talk to an AI companion ("Nagrik") to
understand government schemes, get a document checklist, find the right
service for their situation, and file + track a civic complaint — in English,
Hindi, or Kannada.

Built for the **Smart Bharat: AI-Powered Civic Companion** challenge (Build. Learn. Lead. Impact.)
<p align="center">
  <img src="https://github.com/Suru2005-shri/Nagrik_AI/blob/6da89f24bc19e52b3635659dbda596569a55f8e6/images/find_service.jpeg" />
  
</p>
---

## 1. Project Description

**Problem.** Government schemes and civic processes exist, but citizens don't
know which ones apply to them, what documents they need, or who to complain
to when a civic issue (pothole, garbage, streetlight) goes unaddressed.
Information is scattered across portals in bureaucratic language.

**Solution.** Smart Bharat is a single web app with four surfaces:

| Feature | What it does |
|---|---|
| **Ask Nagrik (Companion)** | Conversational GenAI assistant, grounded only in a local civic-services register (`schemes.json`) — it explains schemes, eligibility, and process in plain language, in the citizen's chosen language. |
| **Report an Issue** | Citizen files a civic complaint (roads, water, electricity, garbage, streetlight, drainage). Each report is auto-routed to the right department (BBMP/BWSSB/BESCOM style routing) and stamped with a unique ledger reference number. |
| **Track a Complaint** | Citizen enters their reference number to see live status. |
| **Find a Service** | Citizen describes their situation in plain words; the app retrieves and ranks the most relevant schemes/certificates. |

**Why it's GenAI-powered, not just a form:**
- The companion **never invents** scheme names, amounts, or documents — every
  answer is grounded (RAG-style) in a structured local knowledge base, so it
  stays accurate and auditable while still reading like a helpful human.
- The same knowledge base powers document-checklist lookups and the
  recommendation engine, so all three features stay consistent with each other.

**No external API key required to run or judge this project.** The core
engine is a self-contained retrieval + natural-language-generation layer
(`ai_service.nlg_answer`): it does synonym-aware intent matching against the
local knowledge base and composes a natural-language reply with no network
call, no quota, and no key. This is the app's *default* path, not a fallback
shown only when something fails — so a judge testing the deployed link with
zero configuration sees the full working product every time.

If you *do* set `ANTHROPIC_API_KEY` (or `GEMINI_API_KEY`) as an environment
variable, the companion automatically upgrades to a full LLM for more
free-form conversation — and if that call ever errors or rate-limits, it
transparently falls back to the same zero-key engine rather than showing a
broken response. The key is a pure enhancement, never a dependency.

**Tech stack.** FastAPI + SQLite (SQLAlchemy) backend, vanilla HTML/CSS/JS
frontend (no build step, so it deploys as one service). Anthropic Claude API
as an optional GenAI upgrade layer (Gemini supported as a drop-in alternative).

---

## 2. Architecture

```
smart-bharat/
├── backend/
│   ├── main.py           FastAPI app + all REST endpoints
│   ├── database.py       SQLAlchemy models: Complaint, ChatLog
│   ├── ai_service.py     GenAI layer: grounded prompting, offline fallback,
│   │                     Claude/Gemini switch, retrieval for recommendations
│   ├── schemes.json       Local knowledge base (12 real Indian schemes/services)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html         Four-panel single-page app (Companion / Report / Track / Find)
│   ├── style.css
│   └── app.js              Talks to the FastAPI JSON endpoints
└── README.md
```

FastAPI serves the frontend directly (`StaticFiles` mount + `/` route), so
the whole platform is **one deployable service** — no separate frontend host
needed.

### API surface

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/chat` | Grounded GenAI companion reply |
| POST | `/api/report` | File a complaint → returns ledger reference |
| GET | `/api/complaints/{ticket_id}` | Track a complaint |
| GET | `/api/complaints` | Recent complaints (admin/ops view) |
| POST | `/api/recommend` | Rank schemes against a free-text situation |
| POST | `/api/documents` | Document checklist for a named service |
| GET | `/api/schemes` | Full local knowledge base |
| GET | `/api/health` | Liveness check |

---

## 3. Prompt Workflow / Strategy

The core GenAI design decision is **grounded generation over free generation,
with a zero-dependency default**: the model is never asked "what does a
citizen need for X" from memory alone — it is always grounded in the local
`schemes.json` register, and the reasoning/generation step itself does not
require an external LLM to work.

**Default engine (`ai_service.nlg_answer`) — no key, no network call:**
1. Normalize the citizen's free-text query and check it against a
   synonym map per scheme (e.g. "gas", "cylinder", "cooking" → Ujjwala
   Yojana; "khata", "property tax" → BBMP Khata) so phrasing doesn't have
   to match scheme names exactly.
2. Score candidates: synonym hits weigh highest, then name/category
   matches, then a light weight for longer distinctive words in the
   summary — this deliberately suppresses generic connector words ("new",
   "for", "connection") so they don't drag an unrelated scheme to the top
   just because it happens to share common phrasing.
3. Compose the reply from a small set of varied sentence openers plus the
   scheme's grounded fields (summary, department, documents, apply URL),
   in the citizen's chosen language (English / Hindi / Kannada labels).
4. If nothing scores above zero, say so honestly and suggest example
   query types — never guess.

**Optional upgrade engine (Claude/Gemini) — used only if a key is present:**

**System prompt (companion), abbreviated:**

```
You are Nagrik, the AI civic companion for Smart Bharat.
1. Ground every factual claim ONLY in the CONTEXT block below. Never invent
   a scheme, document, or portal name not present in context.
2. If the question can't be answered from context, say so and point to the
   nearest relevant service instead of guessing.
3. Reply in the requested language (English / Hindi / Kannada).
4. Keep answers short, plain, jargon-free. Use lists for steps/documents.
5. Never request sensitive numbers (full Aadhaar, bank details, OTP).

CONTEXT: <schemes.json slice, JSON>
```

**Why this shape:**
- **Rule 1** is the hallucination guard — the single highest-risk failure
  mode for a civic assistant is inventing a scheme or eligibility rule that
  doesn't exist, so it's stated first and repeated as a constraint, not a
  suggestion.
- **Rule 2** turns "I don't know" into a useful fallback instead of a dead
  end, which matters for trust in a government-facing tool.
- **Rule 3** is what makes multilingual support a prompt-level feature rather
  than a separate translation microservice — one model call handles both
  reasoning and localization.
- **Rule 5** is a safety rail specific to this domain: citizens should never
  be trained (even implicitly) to hand over sensitive identifiers to a chat
  window.

**Recommendation flow** does a cheap keyword-overlap retrieval over
`schemes.json` first (works even fully offline), then — when a key is
configured — asks the model to rank and explain the top matches in one line
each, so the output is short and scannable rather than a wall of text.

**Document-assistant flow** looks up the service by name/id directly in the
knowledge base first (exact match); if that fails it reuses the same
synonym-ranking retrieval as the companion, so a partial phrase like
"water" still resolves to BWSSB Water Connection without needing an LLM
call at all.

**Reliability by design.** Every AI-service function runs on the zero-key
engine by default and only *adds* an LLM call on top when a key is present
and healthy. This was a deliberate choice after finding that heavier
approaches — a hosted LLM API, or a locally-run open-source model bundled
into the deploy — both introduce a single point of failure a hackathon
judge could hit (an expired/rate-limited key, or a free-tier host running
out of RAM on a multi-hundred-MB model). The zero-key NLG engine has none
of those failure modes, so the deployed link works identically whether or
not any key is ever configured.

---

## 4. Running Locally

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # add your ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000** — the FastAPI app serves the frontend too.

Without an API key, the app still runs in offline-demo mode (grounded,
deterministic answers from `schemes.json`).

---

## 5. Deployment (Render — free tier, single service)

1. Push this repo to GitHub (public).
2. On [render.com](https://render.com) → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable `ANTHROPIC_API_KEY` (Render → Environment tab).
5. Deploy. Render gives you a public URL — that's both your API and your
   live web app, since the frontend is served from the same FastAPI app.

*(Railway or Fly.io work identically — same three settings.)*

---

## 6. Submission Checklist

- [ ] Push this folder to a **public GitHub repo**
- [ ] Deploy on Render/Railway with `ANTHROPIC_API_KEY` set
- [ ] Confirm the deployed URL loads all four panels and `/api/health` returns `{"status":"ok"}`
- [ ] Paste this README's sections 1 and 3 as your Project Description / Prompt Workflow submission text
