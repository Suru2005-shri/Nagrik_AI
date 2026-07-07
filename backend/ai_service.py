"""
AI Service Layer for Smart Bharat.

Design principle: every AI call is GROUNDED. We never let the model invent
scheme names, document lists, or department names from pure memory - we
inject the local schemes.json knowledge base as context, so hallucination
risk is minimised and answers stay auditable.

Two engines, same contract:
  1. NLG engine (default, always on) - a self-contained retrieval + natural-
     language-generation layer with NO external dependency: no API key, no
     internet call, no paid quota, so it can never fail or be rate-limited
     during judging. Every mandatory feature runs on this by default.
  2. LLM engine (optional upgrade) - if ANTHROPIC_API_KEY or GEMINI_API_KEY
     is set, conversational answers get richer and more free-form. The app
     never depends on this being present; it's an enhancement, not a
     requirement.
"""
import json
import os
import random
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

SCHEMES_PATH = Path(__file__).parent / "schemes.json"
with open(SCHEMES_PATH, "r", encoding="utf-8") as f:
    SCHEMES = json.load(f)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

SYSTEM_PROMPT = """You are Nagrik, the AI civic companion for Smart Bharat - a platform \
that helps Indian citizens understand and access government services.

Rules you must follow:
1. Ground every factual claim (scheme names, documents, eligibility, department) ONLY in \
the CONTEXT block provided below. Never invent a scheme, document, or portal name that is \
not present in the context.
2. If the citizen's question cannot be answered from the context, say so plainly and suggest \
the nearest relevant service from the context instead of guessing.
3. Reply in the language requested (English, Hindi, or Kannada). If none is specified, \
match the language the citizen wrote in.
4. Keep answers short, plain, and jargon-free - written for someone who has never dealt with \
government paperwork before. Use short lists for steps or documents.
5. Never ask the citizen to pay you, and never request sensitive numbers (full Aadhaar, \
bank account, OTP) - only refer them to the official portal for that.

CONTEXT (local civic services knowledge base):
{context}
"""

# ---------------------------------------------------------------------------
# NLG engine: keyword/synonym expansion so free-text questions ("I need gas
# connection", "help with school fees") resolve to the right scheme without
# an exact name match. Fully local, zero dependency, zero cost, zero key.
# ---------------------------------------------------------------------------

SYNONYMS = {
    "ayushman-bharat": ["health", "hospital", "insurance", "medical", "treatment", "ayushman", "pmjay", "surgery", "illness"],
    "pmay": ["house", "home", "housing", "construction", "build", "pmay", "awas"],
    "ujjwala": ["gas", "lpg", "cylinder", "cooking", "stove", "ujjwala"],
    "pm-kisan": ["farmer", "farming", "kisan", "crop", "agriculture", "land", "cultivat"],
    "bescom-new-connection": ["electricity", "power", "current", "bescom", "meter", "connection"],
    "bbmp-khata": ["khata", "bbmp", "property tax", "property", "site"],
    "ration-card": ["ration", "pds", "food grain", "rice", "wheat", "subsidised food"],
    "driving-licence": ["driving", "licence", "license", "vehicle", "learner", "car", "bike"],
    "income-certificate": ["income certificate", "income proof", "salary certificate"],
    "caste-certificate": ["caste certificate", "caste proof", "community certificate"],
    "water-connection": ["water", "bwssb", "tap", "pipeline", "supply"],
    "voter-id": ["voter", "vote", "election", "epic card"],
}

GREETING_WORDS = {"hi", "hello", "hey", "namaste", "namaskara", "namaskar", "vanakkam"}

INTRO_PHRASES = {
    "English": "Here's what I found:",
    "Hindi": "यह रही जानकारी:",
    "Kannada": "ಇಲ್ಲಿ ಮಾಹಿತಿ ಇದೆ:",
}
DOCS_LABEL = {"English": "Documents needed", "Hindi": "आवश्यक दस्तावेज़", "Kannada": "ಬೇಕಾದ ದಾಖಲೆಗಳು"}
APPLY_LABEL = {"English": "Apply at", "Hindi": "यहाँ आवेदन करें", "Kannada": "ಇಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ"}
DEPT_LABEL = {"English": "Handled by", "Hindi": "विभाग", "Kannada": "ಇಲಾಖೆ"}
GREETING_REPLY = {
    "English": "Namaste. Ask me about a scheme, a certificate, or which documents you need.",
    "Hindi": "नमस्ते। किसी योजना, प्रमाण पत्र या दस्तावेज़ों के बारे में पूछें।",
    "Kannada": "ನಮಸ್ತೆ. ಯೋಜನೆ, ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ಬೇಕಾದ ದಾಖಲೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ.",
}
NOT_FOUND_REPLY = {
    "English": "I couldn't match that to a service in my register yet. Try mentioning a scheme, certificate, or utility - e.g. ration card, BESCOM connection, or Ayushman Bharat.",
    "Hindi": "मुझे इससे मिलती कोई सेवा नहीं मिली। कृपया योजना या प्रमाण पत्र का नाम बताएं - जैसे राशन कार्ड या आयुष्मान भारत।",
    "Kannada": "ಇದಕ್ಕೆ ಹೊಂದುವ ಸೇವೆ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಯೋಜನೆ ಅಥವಾ ಪ್ರಮಾಣಪತ್ರದ ಹೆಸರು ತಿಳಿಸಿ - ಉದಾ: ರೇಷನ್ ಕಾರ್ಡ್ ಅಥವಾ ಆಯುಷ್ಮಾನ್ ಭಾರತ್.",
}

OPENERS = [
    "{name} is what you're looking for.",
    "That falls under {name}.",
    "You'll want {name} for this.",
]


STOPWORDS = {
    "for", "and", "the", "with", "from", "need", "want", "help", "please",
    "how", "what", "which", "about", "details", "information", "new", "get",
    "does", "give", "tell", "know", "much", "can", "you",
}


def _score_scheme(query_words, scheme) -> int:
    name_cat = f"{scheme['name']} {scheme['category']}".lower()
    summary_elig = f"{scheme['summary']} {scheme['eligibility']}".lower()
    syn_words = SYNONYMS.get(scheme["id"], [])
    score = 0
    for w in query_words:
        if len(w) <= 2 or w in STOPWORDS:
            continue
        if any(w in syn or syn in w for syn in syn_words):
            score += 3
        if w in name_cat:
            score += 2
        elif len(w) >= 5 and w in summary_elig:
            score += 1
    return score


def _rank_schemes(query: str, top_n: int = 5):
    words = query.lower().split()
    scored = [(_score_scheme(words, s), s) for s in SCHEMES]
    scored = [(sc, s) for sc, s in scored if sc > 0]
    scored.sort(key=lambda x: -x[0])
    return [s for _, s in scored[:top_n]]


def nlg_answer(user_message: str, language: str = "English") -> str:
    """Fully self-contained retrieval + natural-language generation.
    No network call, no API key, no external dependency - cannot fail or
    be rate-limited. This is the app's default, always-on engine."""
    msg = user_message.strip().lower()
    language = language if language in INTRO_PHRASES else "English"

    if not msg:
        return GREETING_REPLY[language]
    if len(msg.split()) <= 3 and any(w.strip("!.,?") in GREETING_WORDS for w in msg.split()):
        return GREETING_REPLY[language]

    matches = _rank_schemes(user_message, top_n=1)
    if not matches:
        return NOT_FOUND_REPLY[language]

    s = matches[0]
    opener = random.choice(OPENERS).format(name=s["name"])
    docs = ", ".join(s["documents"])
    return (
        f"{INTRO_PHRASES[language]} {opener}\n\n"
        f"{s['summary']}\n\n"
        f"{DEPT_LABEL[language]}: {s['department']}\n"
        f"{DOCS_LABEL[language]}: {docs}\n"
        f"{APPLY_LABEL[language]}: {s['apply_url']}"
    )


def _context_blob(filter_ids=None):
    items = SCHEMES if not filter_ids else [s for s in SCHEMES if s["id"] in filter_ids]
    return json.dumps(items, ensure_ascii=False, indent=2)


def call_claude(user_message: str, language: str, history=None) -> str:
    from anthropic import Anthropic

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    messages = (history or []) + [{"role": "user", "content": user_message}]
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=SYSTEM_PROMPT.format(context=_context_blob()) + f"\nRespond in: {language}",
        messages=messages,
    )
    return "".join(block.text for block in resp.content if block.type == "text")


def call_gemini(user_message: str, language: str) -> str:
    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        system_instruction=SYSTEM_PROMPT.format(context=_context_blob()) + f"\nRespond in: {language}",
    )
    resp = model.generate_content(user_message)
    return resp.text


def get_ai_response(user_message: str, language: str = "English", history=None) -> str:
    """Default path: local NLG engine (always works, zero key).
    Optional upgrade: if a key is configured AND reachable, use it instead;
    any failure (missing key, rate limit, network error) falls straight
    back to the NLG engine - the citizen never sees an error."""
    if ANTHROPIC_API_KEY:
        try:
            return call_claude(user_message, language, history)
        except Exception:
            pass
    elif GEMINI_API_KEY:
        try:
            return call_gemini(user_message, language)
        except Exception:
            pass
    return nlg_answer(user_message, language)


def recommend_services(query: str) -> list:
    """Keyword + synonym retrieval - grounded, deterministic, works offline."""
    ranked = _rank_schemes(query, top_n=5)
    return ranked or SCHEMES[:5]


def document_checklist(service_name: str) -> dict:
    for s in SCHEMES:
        if service_name.lower() in s["name"].lower() or service_name.lower() == s["id"]:
            return s
    # fall back to keyword/synonym match so partial phrases still resolve
    ranked = _rank_schemes(service_name, top_n=1)
    return ranked[0] if ranked else {}
