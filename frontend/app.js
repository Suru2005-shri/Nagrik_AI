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

// ---- Chat ----
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatWindow = document.getElementById("chatWindow");

function addMessage(label, text, who) {
  const div = document.createElement("div");
  div.className = "msg msg-" + who;
  div.innerHTML = `<span class="msg-label">${label}</span><p></p>`;
  div.querySelector("p").textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  const language = document.getElementById("lang").value;
  addMessage("You", message, "user");
  chatInput.value = "";
  addMessage("Nagrik", "Thinking…", "bot");
  const placeholder = chatWindow.lastChild;
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
  }
});

// ---- Report ----
const reportForm = document.getElementById("reportForm");
const reportResult = document.getElementById("reportResult");

reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(reportForm);
  const payload = Object.fromEntries(fd.entries());
  reportResult.classList.remove("hidden");
  reportResult.innerHTML = "Filing your report…";
  try {
    const res = await fetch(`${API_BASE}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    reportResult.innerHTML = `
      <div class="ticket-stamp">${data.ticket_id}</div>
      <div class="result-row"><span class="k">Status</span><span class="status-badge">${data.status}</span></div>
      <div class="result-row"><span class="k">Routed to</span><span>${data.department}</span></div>
      <p style="margin-top:12px;color:var(--text-dim);font-size:13px;">Save this reference number — you can track progress under "Track a Complaint".</p>
    `;
    reportForm.reset();
  } catch (err) {
    reportResult.innerHTML = "Something went wrong submitting the report.";
  }
});

// ---- Track ----
const trackForm = document.getElementById("trackForm");
const trackResult = document.getElementById("trackResult");

trackForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ticketId = document.getElementById("ticketInput").value.trim();
  trackResult.classList.remove("hidden");
  trackResult.innerHTML = "Looking up ticket…";
  try {
    const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(ticketId)}`);
    if (!res.ok) {
      trackResult.innerHTML = "No complaint found with this reference number.";
      return;
    }
    const data = await res.json();
    trackResult.innerHTML = `
      <div class="ticket-stamp">${data.ticket_id}</div>
      <div class="result-row"><span class="k">Status</span><span class="status-badge">${data.status}</span></div>
      <div class="result-row"><span class="k">Category</span><span>${data.category}</span></div>
      <div class="result-row"><span class="k">Location</span><span>${data.location}</span></div>
      <div class="result-row"><span class="k">Department</span><span>${data.department}</span></div>
      <div class="result-row"><span class="k">Filed</span><span>${new Date(data.created_at).toLocaleString()}</span></div>
    `;
  } catch (err) {
    trackResult.innerHTML = "Could not reach the tracking service.";
  }
});

// ---- Services ----
const serviceForm = document.getElementById("serviceForm");
const serviceResults = document.getElementById("serviceResults");

serviceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = document.getElementById("serviceInput").value.trim();
  serviceResults.innerHTML = "Searching services…";
  try {
    const res = await fetch(`${API_BASE}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    serviceResults.innerHTML = data.results
      .map(
        (s) => `
      <div class="service-card">
        <h3>${s.name}</h3>
        <div class="dept">${s.department} · ${s.category}</div>
        <p>${s.summary}</p>
        <div class="docs"><span>Documents: </span>${s.documents.join(", ")}</div>
      </div>`
      )
      .join("");
  } catch (err) {
    serviceResults.innerHTML = "Could not reach the recommendation service.";
  }
});
