const API_URL = "https://script.google.com/macros/s/AKfycbw4cjKcewkUveeVZ-dygPaBsVUtA9lVUuHo7Iv6HvIbePHMPuK3pHcyVLi_HrcMf_-Ong/exec";
const ADMIN_ID = "123";
const ADMIN_PASS = "123";

let INTERNS = [];
let activeId = null;

// ✅ FIX 1: silent parameter added - background load mein UI update nahi hoga
async function loadInternDetail(internId, silent = false) {
  try {
    const res = await fetch(`${API_URL}?action=adminInternOverview&adminId=${ADMIN_ID}&adminPass=${ADMIN_PASS}&internId=${internId}`);
    const data = await res.json();
    if (!data.success) { console.error("Failed to load intern detail:", data.message); return; }

    const tasks = (data.history || []).map(t => ({
      id: t.AssignedTaskID,
      title: t.Title || t.AssignedTaskID,
      link: t["Live Website Link"] || "",
      githubLink: t["Repository Link"] || "",
      date: t.Date || "",
      grade: t.Grade || "",
      finalStatus: t.Status || "Pending"
    }));

    const intern = INTERNS.find(i => i.id === internId);
    if (intern) intern.tasks = tasks;

    // ✅ silent = true hoga to sirf data load hoga, UI flicker nahi hoga
    if (!silent) {
      renderSidebar();
      renderDetail(internId);
    }

  } catch (err) { console.error("loadInternDetail error:", err); }
}

// ✅ FIX 2: loadInterns pehle, loadAllInternTasks baad mein
async function loadInterns() {
  try {
    const res = await fetch(`${API_URL}?action=getInternsList&adminId=${ADMIN_ID}&adminPass=${ADMIN_PASS}`);
    const data = await res.json();
    if (!data.success) { console.error("Failed:", data.message); return; }
    INTERNS = data.interns.map(i => ({ id: i.InternID, name: i.Name, dept: i.BatchName || i.BatchID, tasks: [] }));
    renderSidebar();
    await loadAllInternTasks(); // ✅ Background mein sab tasks load karo
  } catch (err) { console.error("loadInterns error:", err); }
}

// ✅ FIX 3: silent = true so no flicker during background load
async function loadAllInternTasks() {
  for (const intern of INTERNS) {
    await loadInternDetail(intern.id, true); // silent = true
  }
  renderSidebar(); // Sab load hone ke baad ek baar sidebar update
}

function renderSidebar() {
  const list = document.getElementById("internList");
  const countBadge = document.getElementById("countBadge");
  const query = document.getElementById("searchInput").value.toLowerCase().trim();

  let filtered = [];

  if (!query) {
    filtered = INTERNS.map(i => ({ intern: i, matchedTask: null }));
  } else {
    INTERNS.forEach(i => {
      const nameMatch = i.name.toLowerCase().includes(query);
      const idMatch = i.id.toLowerCase().includes(query);
      const deptMatch = i.dept.toLowerCase().includes(query);

      const matchedTasks = (i.tasks || []).filter(t =>
        (t.title || "").toLowerCase().includes(query) ||
        (t.id || "").toLowerCase().includes(query)
      );

      if (nameMatch || idMatch || deptMatch) {
        filtered.push({ intern: i, matchedTask: null });
      } else if (matchedTasks.length > 0) {
        filtered.push({ intern: i, matchedTask: matchedTasks[0] });
      }
    });
  }

  countBadge.textContent = filtered.length;

  list.innerHTML = filtered.map(({ intern: i, matchedTask }) => `
    <div class="intern-card ${activeId === i.id ? 'active' : ''}" onclick="selectIntern('${i.id}')">
      <div class="card-avatar">${i.name.charAt(0)}</div>
      <div class="card-info">
        <div class="card-name">${highlightText(i.name, query)}</div>
        <div class="card-meta">
          <span class="card-id">${highlightText(i.id, query)}</span>
          <span class="card-dept">${i.dept}</span>
        </div>
        ${matchedTask
          ? `<div style="font-size:9px;color:var(--accent);margin-top:3px;opacity:0.8;
                         font-family:var(--font-mono);white-space:nowrap;
                         overflow:hidden;text-overflow:ellipsis;">
               ↳ ${highlightText(matchedTask.title, query)}
             </div>`
          : ''}
      </div>
    </div>`
  ).join("");
}

function highlightText(text, query) {
  if (!query || !text) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="highlight">$1</span>');
}

function filterInterns() { renderSidebar(); }

// ✅ FIX 4: selectIntern mein silent = false (detail dikhao)
function selectIntern(id) {
  activeId = id;
  renderSidebar();
  document.getElementById("emptyState").style.display = "none";
  document.getElementById("detailScroll").style.display = "block";
  document.getElementById("detailScroll").innerHTML = `<div class="loading-state">Loading...</div>`;
  loadInternDetail(id, false); // silent = false, detail dikhao
}

function renderDetail(internId) {
  const intern = INTERNS.find(i => i.id === internId);
  if (!intern) return;

  const gradeColors = { "A+": "#00ff88", "A": "#00e5a0", "B": "#ffb547", "C": "#ff9900" };
  const statusColors = { "Approved": "#00e5a0", "Rejected": "#ff4d6a", "Submitted": "#ffb547", "Pending": "#3d4f6a" };

  const tasksHTML = intern.tasks.length === 0
    ? `<div class="no-tasks">No submissions yet</div>`
    : intern.tasks.map(t => `
      <div class="task-row">
        <div class="task-left">
          <div class="task-id">${t.id}</div>
          <div class="task-title">${t.title}</div>
          <div class="task-date">${t.date}</div>
        </div>
        <div class="task-right">

          <div class="link-btns">
            ${t.link
              ? `<a class="link-btn link-web" href="${t.link}" target="_blank">
                   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                   Website
                 </a>`
              : `<span class="link-btn link-web disabled">
                   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                   Website
                 </span>`
            }
            ${t.githubLink
              ? `<a class="link-btn link-git" href="${t.githubLink}" target="_blank">
                   <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                   GitHub
                 </a>`
              : `<span class="link-btn link-git disabled">
                   <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                   GitHub
                 </span>`
            }
          </div>

          <span class="grade-pill" style="color:${t.grade ? (gradeColors[t.grade] || '#aaa') : '#555'};border-color:${t.grade ? (gradeColors[t.grade] || '#aaa') : '#555'}">
            ${t.grade || 'NA'}
          </span>

          <span class="status-pill" style="color:${statusColors[t.finalStatus] || '#888'};border-color:${statusColors[t.finalStatus] || '#888'};background:transparent;">
            ${t.finalStatus}
          </span>

        </div>
      </div>`).join("");

  document.getElementById("detailScroll").innerHTML = `
    <div class="detail-header">
      <div class="detail-avatar">${intern.name.charAt(0)}</div>
      <div class="detail-info">
        <div class="detail-name">${intern.name}</div>
        <div class="detail-meta">
          <span>${intern.id}</span><span class="dot">·</span><span>${intern.dept}</span>
        </div>
      </div>
    </div>
    <div class="tasks-label">SUBMISSIONS</div>
    <div class="task-list">${tasksHTML}</div>`;
}

loadInterns();