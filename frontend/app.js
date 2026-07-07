const API_BASE = ""; // same-origin; change to deployed backend URL if split-hosted

// ---- Tabs ----
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// ---- Chat ----
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatWindow = document.getElementById("chatWindow");

function addMessage(label, text, who) {
  const div = document.createElement("div");
  div.className = "msg msg-" + who;
  div.innerHTML = `<span class="msg-label"><span class="msg-dot"></span>${label}</span><p></p>`;
  div.querySelector("p").textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

function addTypingPlaceholder() {
  const div = document.createElement("div");
  div.className = "msg msg-bot";
  div.innerHTML = `<span class="msg-label"><span class="msg-dot"></span>Nagrik</span><p><span class="typing-dots"><span></span><span></span><span></span></span></p>`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  const language = document.getElementById("lang").value;
  addMessage("You", message, "user");
  chatInput.value = "";
  const placeholder = addTypingPlaceholder();
  const submitBtn = chatForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language }),
    });
    const data = await res.json();
    placeholder.querySelector("p").textContent = data.reply;
  } catch (err) {
    placeholder.querySelector("p").textContent = "Could not reach the companion service. Please try again.";
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Shared: postmark seal builder + copy-to-clipboard ----
function sealStampHtml(ticketId) {
  return `
    <span class="seal-stamp" data-ticket="${escapeHtml(ticketId)}" role="button" tabindex="0" title="Click to copy">
      <span class="seal-stamp-label">Ref. No.</span>
      <span class="seal-stamp-id">${escapeHtml(ticketId)}</span>
      <span class="seal-stamp-hint">Click to copy</span>
    </span>`;
}

function wireSealStamp(container) {
  const seal = container.querySelector(".seal-stamp");
  if (!seal) return;
  seal.addEventListener("click", async () => {
    const ticket = seal.dataset.ticket;
    try {
      await navigator.clipboard.writeText(ticket);
      seal.classList.add("copied");
      const hint = seal.querySelector(".seal-stamp-hint");
      const prev = hint.textContent;
      hint.textContent = "Copied";
      hint.style.opacity = "1";
      setTimeout(() => {
        seal.classList.remove("copied");
        hint.textContent = prev;
        hint.style.opacity = "";
      }, 1200);
    } catch (err) {
      /* clipboard unavailable — silently ignore */
    }
  });
}

function statusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("resolved") || s.includes("closed") || s.includes("complete")) return "";
  return "pending";
}

// ---- Report ----
const reportForm = document.getElementById("reportForm");
const reportResult = document.getElementById("reportResult");

reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(reportForm);
  const payload = Object.fromEntries(fd.entries());
  reportResult.classList.remove("hidden");
  reportResult.innerHTML = `<p class="empty-state" style="border-top:none;padding:0;">Filing your report…</p>`;
  const submitBtn = reportForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    reportResult.innerHTML = `
      ${sealStampHtml(data.ticket_id)}
      <div class="result-row"><span class="k">Status</span><span class="v"><span class="status-badge ${statusBadgeClass(data.status)}">${escapeHtml(data.status)}</span></span></div>
      <div class="result-row"><span class="k">Routed to</span><span class="v">${escapeHtml(data.department)}</span></div>
      <p class="result-note">Save this reference number — you can track progress under &ldquo;Track a Complaint&rdquo;.</p>
    `;
    wireSealStamp(reportResult);
    reportForm.reset();
  } catch (err) {
    reportResult.innerHTML = `<p class="empty-state" style="border-top:none;padding:0;">Something went wrong submitting the report.</p>`;
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Track ----
const trackForm = document.getElementById("trackForm");
const trackResult = document.getElementById("trackResult");

trackForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ticketId = document.getElementById("ticketInput").value.trim();
  trackResult.classList.remove("hidden");
  trackResult.innerHTML = `<p class="empty-state" style="border-top:none;padding:0;">Looking up ticket…</p>`;
  const submitBtn = trackForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(ticketId)}`);
    if (!res.ok) {
      trackResult.innerHTML = `<p class="empty-state" style="border-top:none;padding:0;">No complaint found with this reference number.</p>`;
      return;
    }
    const data = await res.json();
    trackResult.innerHTML = `
      ${sealStampHtml(data.ticket_id)}
      <div class="result-row"><span class="k">Status</span><span class="v"><span class="status-badge ${statusBadgeClass(data.status)}">${escapeHtml(data.status)}</span></span></div>
      <div class="result-row"><span class="k">Category</span><span class="v">${escapeHtml(data.category)}</span></div>
      <div class="result-row"><span class="k">Location</span><span class="v">${escapeHtml(data.location)}</span></div>
      <div class="result-row"><span class="k">Department</span><span class="v">${escapeHtml(data.department)}</span></div>
      <div class="result-row"><span class="k">Filed</span><span class="v">${escapeHtml(new Date(data.created_at).toLocaleString())}</span></div>
    `;
    wireSealStamp(trackResult);
  } catch (err) {
    trackResult.innerHTML = `<p class="empty-state" style="border-top:none;padding:0;">Could not reach the tracking service.</p>`;
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Services ----
const serviceForm = document.getElementById("serviceForm");
const serviceResults = document.getElementById("serviceResults");

serviceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = document.getElementById("serviceInput").value.trim();
  serviceResults.innerHTML = `<div class="empty-state">Searching services…</div>`;
  const submitBtn = serviceForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      serviceResults.innerHTML = `<div class="empty-state">No matching services found — try describing your situation differently.</div>`;
      return;
    }
    serviceResults.innerHTML = data.results
      .map(
        (s) => `
      <div class="service-card">
        <div class="dept">${escapeHtml(s.department)} · ${escapeHtml(s.category)}</div>
        <h3>${escapeHtml(s.name)}</h3>
        <p>${escapeHtml(s.summary)}</p>
        <div class="docs"><span>Documents: </span>${escapeHtml(s.documents.join(", "))}</div>
      </div>`
      )
      .join("");
  } catch (err) {
    serviceResults.innerHTML = `<div class="empty-state">Could not reach the recommendation service.</div>`;
  } finally {
    submitBtn.disabled = false;
  }
});
