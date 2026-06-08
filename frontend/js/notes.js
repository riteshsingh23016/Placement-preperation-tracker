/* Notes page CRUD logic with localStorage Fallback */

function qs(sel, root = document) {
  return root.querySelector(sel);
}
function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function toast(message, type = "info") {
  let stack = qs("#toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toastStack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));
  setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => el.remove(), 320);
  }, 4400);
}

let notesList = [];
let collectionsList = [];
let activeCollectionId = "all";

async function loadData() {
  const notesContainer = qs("#notesContainer");
  const colContainer = qs("#collectionsContainer");
  
  if (notesContainer) notesContainer.classList.add("is-loading");
  if (colContainer) colContainer.classList.add("is-loading");

  try {
    // 1. Load Collections
    let collections = [];
    try {
      const colRes = await window.CollectionApi.list();
      collections = Array.isArray(colRes.data) ? colRes.data : [];
      localStorage.setItem("demo_collections", JSON.stringify(collections));
    } catch (colErr) {
      console.warn("API collections list error, falling back to localStorage:", colErr);
      const localCols = localStorage.getItem("demo_collections");
      collections = localCols ? JSON.parse(localCols) : [];
    }

    // 2. Load Notes
    let notes = [];
    try {
      const notesRes = await window.NotesApi.list();
      notes = Array.isArray(notesRes.data) ? notesRes.data : [];
      localStorage.setItem("demo_notes", JSON.stringify(notes));
    } catch (notesErr) {
      console.warn("API notes list error, falling back to localStorage:", notesErr);
      const localNotes = localStorage.getItem("demo_notes");
      notes = localNotes ? JSON.parse(localNotes) : [];
    }

    // Ensure default General collection exists
    if (collections.length === 0) {
      collections = [{ _id: "c_general", name: "General", icon: "folder", color: "muted" }];
      localStorage.setItem("demo_collections", JSON.stringify(collections));
    }

    collectionsList = collections;
    notesList = notes;

    renderCollections();
    renderNotes();

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("action") === "add") {
      window.history.replaceState({}, document.title, window.location.pathname);
      const form = qs("#noteForm");
      if (form) form.reset();
      
      const editId = qs("#noteEditId");
      if (editId) editId.value = "";
      
      const title = qs("#noteTitle");
      if (title) title.style.borderColor = "";
      
      const content = qs("#noteContent");
      if (content) content.style.borderColor = "";
      
      const colId = qs("#noteCollectionId");
      if (colId && activeCollectionId !== "all") {
        colId.value = activeCollectionId;
      }
      
      const modalTitle = qs("#noteModalTitle");
      if (modalTitle) modalTitle.textContent = "Add Note";
      
      window.openModalOverlay(qs("#noteModal"));
    }
  } catch (err) {
    toast("Failed to load data", "error");
    console.error("loadData error:", err);
  } finally {
    if (notesContainer) notesContainer.classList.remove("is-loading");
    if (colContainer) colContainer.classList.remove("is-loading");
  }
}

function renderCollections() {
  const container = qs("#collectionsContainer");
  if (!container) return;

  const allActive = activeCollectionId === "all" ? "is-active" : "";
  let html = `
    <button class="collection ${allActive}" type="button" onclick="setActiveCollection('all')">
      <i data-lucide="sparkles"></i>
      <span>All Notes</span>
      <span class="badge badge--muted" style="margin-left:auto">${notesList.length}</span>
    </button>
  `;

  collectionsList.forEach(c => {
    const isActive = activeCollectionId === c._id ? "is-active" : "";
    const noteCount = notesList.filter(n => {
      const colId = n.collectionId && (typeof n.collectionId === "object" ? n.collectionId._id : n.collectionId);
      return colId === c._id;
    }).length;

    html += `
      <div class="collection collection--${c.color || 'muted'} ${isActive}" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="setActiveCollection('${c._id}')">
        <div style="display:flex; align-items:center; gap:0.75rem; min-width:0;">
          <i data-lucide="${c.icon || 'folder'}"></i>
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.name}">${c.name}</span>
          <span class="badge badge--${c.color || 'muted'}">${noteCount}</span>
        </div>
        <div class="collection-actions" style="display:flex; gap:0.25rem; flex-shrink:0;">
          <button class="iconBtn" onclick="editCollection(event, '${c._id}')" data-tooltip="Rename" style="width:24px; height:24px;"><i data-lucide="pencil" style="width:14px; height:14px;"></i></button>
          <button class="iconBtn" onclick="deleteCollection(event, '${c._id}')" data-tooltip="Delete" style="width:24px; height:24px; color:var(--bad)"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  const select = qs("#noteCollectionId");
  if (select) {
    const currentVal = select.value;
    select.innerHTML = collectionsList.map(c => `<option value="${c._id}">${c.name}</option>`).join("");
    if (currentVal && collectionsList.some(c => c._id === currentVal)) {
      select.value = currentVal;
    }
  }

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

window.setActiveCollection = (id) => {
  activeCollectionId = id;
  renderCollections();
  renderNotes();
};

function formatNoteDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Format time: e.g. 10:42 PM
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const timeStr = `${hours}:${minutes} ${ampm}`;

  // Check if same day (today)
  if (date.toDateString() === now.toDateString()) {
    return `Today • ${timeStr}`;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday • ${timeStr}`;
  }

  // Absolute date: e.g. 21 May 2026
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

window.togglePinNote = async (e, id) => {
  e.stopPropagation();
  const n = notesList.find(x => x._id === id);
  if (!n) return;
  
  const newPinnedState = !n.pinned;
  const body = { pinned: newPinnedState };

  try {
    const res = await window.NotesApi.update(id, body).catch(async (apiErr) => {
      console.warn("API note update failed, falling back to localStorage:", apiErr);
      const localNotes = JSON.parse(localStorage.getItem("demo_notes") || "[]");
      const index = localNotes.findIndex(x => x._id === id);
      if (index !== -1) {
        localNotes[index] = {
          ...localNotes[index],
          pinned: newPinnedState,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem("demo_notes", JSON.stringify(localNotes));
        return { success: true, localFallback: true };
      }
      throw apiErr;
    });

    if (res && res.success) {
      toast(newPinnedState ? "Note pinned" : "Note unpinned", "success");
      await loadData();
    }
  } catch (err) {
    toast("Failed to toggle pin state", "error");
    console.error("togglePinNote error:", err);
  }
};

function renderNotes() {
  const container = qs("#notesContainer");
  if (!container) return;

  const rawQuery = qs("#noteSearch") ? qs("#noteSearch").value : "";
  const query = window.Validators.sanitizeSearch(rawQuery).toLowerCase();
  let filtered = activeCollectionId === "all" 
    ? notesList 
    : notesList.filter(n => {
        const colId = n.collectionId && (typeof n.collectionId === "object" ? n.collectionId._id : n.collectionId);
        return colId === activeCollectionId;
      });

  if (query) {
    filtered = filtered.filter(n => {
      const title = (n.title || "").toLowerCase();
      const content = (n.content || "").toLowerCase();
      return title.includes(query) || content.includes(query);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = "<div style='grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted); opacity: 0.7;'>No notes found in this collection. Create your first note!</div>";
    return;
  }

  // Sort notes: pinned notes first, then by date descending
  filtered.sort((a, b) => {
    const aPinned = !!a.pinned;
    const bPinned = !!b.pinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    const dateA = new Date(a.createdAt || a.updatedAt || 0);
    const dateB = new Date(b.createdAt || b.updatedAt || 0);
    return dateB - dateA;
  });

  container.innerHTML = filtered.map(n => {
    // Resolve collection color/name dynamically from collectionsList
    let colName = "General";
    let colColor = "muted";
    if (n.collectionId) {
      const colId = typeof n.collectionId === "object" ? n.collectionId._id : n.collectionId;
      const found = collectionsList.find(c => c._id === colId);
      if (found) {
        colName = found.name;
        colColor = found.color || "muted";
      }
    }

    const formattedDate = formatNoteDate(n.createdAt || n.updatedAt);
    const isPinnedClass = n.pinned ? "noteCard--pinned" : "";
    const pinBtnClass = n.pinned ? "is-pinned" : "";

    return `
      <div class="noteCard noteCard--${colColor} ${isPinnedClass} glassHover">
        <div class="noteCard__top">
          <span class="badge badge--${colColor}">${colName}</span>
          <div style="display:flex; gap: 0.25rem; align-items:center;">
            <button class="iconBtn pinBtn ${pinBtnClass}" onclick="togglePinNote(event, '${n._id}')" data-tooltip="${n.pinned ? 'Unpin note' : 'Pin note'}" style="width: 32px; height: 32px;">
              <i data-lucide="pin" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="iconBtn" onclick="editNote('${n._id}')" data-tooltip="Edit Note" style="color:var(--text); width: 32px; height: 32px;">
              <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="iconBtn" onclick="deleteNote('${n._id}')" data-tooltip="Delete Note" style="color:var(--bad); width: 32px; height: 32px;">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </div>
        <div class="noteCard__title">${n.title}</div>
        <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%; gap:8px;">
          <div class="noteCard__excerpt">${(n.content || "").substring(0, 100)}${(n.content || "").length > 100 ? '...' : ''}</div>
          <div class="noteCard__date">
            <i data-lucide="calendar" style="width:12px; height:12px; opacity:0.7;"></i>
            <span>${formattedDate}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide?.createIcons) window.lucide.createIcons();
}



window.editNote = (id) => {
  const n = notesList.find(x => x._id === id);
  if (!n) return;
  qs("#noteModalTitle").textContent = "Edit Note";
  qs("#noteEditId").value = n._id;
  qs("#noteTitle").value = n.title;
  qs("#noteTitle").style.borderColor = "";
  if (n.collectionId) {
    const colId = typeof n.collectionId === "object" ? n.collectionId._id : n.collectionId;
    qs("#noteCollectionId").value = colId;
  }
  qs("#noteContent").value = n.content;
  qs("#noteContent").style.borderColor = "";
  window.openModalOverlay(qs("#noteModal"));
};

window.deleteNote = async (id) => {
  if (!id || id === "undefined" || id === "null") {
    toast("Invalid note ID", "error");
    return;
  }
  if (!confirm("Are you sure you want to delete this note?")) return;
  try {
    const res = await window.NotesApi.remove(id).catch(async (apiErr) => {
      console.warn("API delete failed, deleting from localStorage:", apiErr);
      const localNotes = JSON.parse(localStorage.getItem("demo_notes") || "[]");
      const filtered = localNotes.filter(n => n._id !== id);
      localStorage.setItem("demo_notes", JSON.stringify(filtered));
      return { success: true, localFallback: true };
    });

    if (res && res.success) {
      toast("Note deleted", "success");
      await loadData();
    }
  } catch (err) {
    toast("Failed to delete note", "error");
    console.error("deleteNote error:", err);
  }
};

window.editCollection = (e, id) => {
  e.stopPropagation();
  const c = collectionsList.find(x => x._id === id);
  if (!c) return;
  qs("#collectionModalTitle").textContent = "Edit Collection";
  qs("#collectionEditId").value = c._id;
  qs("#collectionName").value = c.name;
  qs("#collectionName").style.borderColor = "";
  qs("#collectionColor").value = c.color || "muted";
  qs("#collectionIcon").value = c.icon || "folder";
  window.openModalOverlay(qs("#collectionModal"));
};

window.deleteCollection = async (e, id) => {
  e.stopPropagation();
  const c = collectionsList.find(x => x._id === id);
  if (!c) return;
  if (c.isDefault || c._id === "c_general" || c.name === "General") return toast("Cannot delete the default General collection", "error");
  if (!confirm(`Are you sure you want to delete collection "${c.name}"? Notes will be moved to General.`)) return;
  try {
    const res = await window.CollectionApi.remove(id).catch(async (apiErr) => {
      console.warn("API collection delete failed, deleting from localStorage:", apiErr);
      const localCols = JSON.parse(localStorage.getItem("demo_collections") || "[]");
      const filtered = localCols.filter(c => c._id !== id);
      localStorage.setItem("demo_collections", JSON.stringify(filtered));

      // Move notes of deleted collection to general
      const localNotes = JSON.parse(localStorage.getItem("demo_notes") || "[]");
      const updatedNotes = localNotes.map(n => {
        const cId = n.collectionId && (typeof n.collectionId === "object" ? n.collectionId._id : n.collectionId);
        if (cId === id) {
          return { ...n, collectionId: "c_general" };
        }
        return n;
      });
      localStorage.setItem("demo_notes", JSON.stringify(updatedNotes));

      return { success: true, localFallback: true };
    });

    if (res && res.success) {
      toast("Collection deleted", "success");
      if (activeCollectionId === id) activeCollectionId = "all";
      await loadData();
    }
  } catch (err) {
    toast("Failed to delete collection", "error");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const newNoteBtn = qs("#newNoteBtn");
  if (newNoteBtn) {
    newNoteBtn.addEventListener("click", () => {
      qs("#noteForm").reset();
      qs("#noteEditId").value = "";
      qs("#noteTitle").style.borderColor = "";
      qs("#noteContent").style.borderColor = "";
      if (activeCollectionId !== "all") {
        qs("#noteCollectionId").value = activeCollectionId;
      }
      qs("#noteModalTitle").textContent = "Add Note";
      window.openModalOverlay(qs("#noteModal"));
    });
  }

  const newColBtn = qs("#newCollectionBtn");
  if (newColBtn) {
    newColBtn.addEventListener("click", () => {
      qs("#collectionForm").reset();
      qs("#collectionEditId").value = "";
      qs("#collectionName").style.borderColor = "";
      qs("#collectionModalTitle").textContent = "Add Collection";
      window.openModalOverlay(qs("#collectionModal"));
    });
  }

  qsa("#noteModalClose, #noteModalCancel").forEach(b => {
    b.addEventListener("click", () => {
      window.closeModalOverlay(qs("#noteModal"));
    });
  });

  const noteModal = qs("#noteModal");
  if (noteModal) {
    noteModal.addEventListener("click", (e) => {
      if (e.target === noteModal) window.closeModalOverlay(noteModal);
    });
  }

  qsa("#collectionModalClose, #collectionModalCancel").forEach(b => {
    b.addEventListener("click", () => {
      window.closeModalOverlay(qs("#collectionModal"));
    });
  });

  const colModal = qs("#collectionModal");
  if (colModal) {
    colModal.addEventListener("click", (e) => {
      if (e.target === colModal) window.closeModalOverlay(colModal);
    });
  }

  const noteTitleEl = qs("#noteTitle");
  if (noteTitleEl) {
    noteTitleEl.addEventListener("input", () => noteTitleEl.style.borderColor = "");
  }
  const noteContentEl = qs("#noteContent");
  if (noteContentEl) {
    noteContentEl.addEventListener("input", () => noteContentEl.style.borderColor = "");
  }
  const colNameEl = qs("#collectionName");
  if (colNameEl) {
    colNameEl.addEventListener("input", () => colNameEl.style.borderColor = "");
  }



  if (noteForm) {
    noteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = qs("#noteEditId").value;
      const title = qs("#noteTitle").value.trim();
      const collectionId = qs("#noteCollectionId").value;
      const content = qs("#noteContent").value.trim();

      const titleInput = qs("#noteTitle");
      const contentInput = qs("#noteContent");
      const errTitle = qs("#errNoteTitle");
      const errContent = qs("#errNoteContent");

      if (errTitle) errTitle.textContent = "";
      if (errContent) errContent.textContent = "";
      if (titleInput) {
        titleInput.style.borderColor = "";
        titleInput.classList.remove("is-invalid");
      }
      if (contentInput) {
        contentInput.style.borderColor = "";
        contentInput.classList.remove("is-invalid");
      }

      let hasError = false;
      let firstInvalid = null;

      const titleErr = window.Validators.validateLongText(title, 100, "Title", true);
      if (titleErr) {
        if (errTitle) errTitle.textContent = titleErr;
        if (titleInput) {
          titleInput.style.borderColor = "var(--bad)";
          titleInput.classList.add("is-invalid");
        }
        hasError = true;
        if (!firstInvalid) firstInvalid = titleInput;
      }

      const contentErr = window.Validators.validateLongText(content, 5000, "Content", true);
      if (contentErr) {
        if (errContent) errContent.textContent = contentErr;
        if (contentInput) {
          contentInput.style.borderColor = "var(--bad)";
          contentInput.classList.add("is-invalid");
        }
        hasError = true;
        if (!firstInvalid) firstInvalid = contentInput;
      }

      if (hasError) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const body = { title, collectionId, content };
      const btn = qs("#noteSaveBtn");
      btn.disabled = true;

      try {
        if (id) {
          const res = await window.NotesApi.update(id, body).catch(async (apiErr) => {
            console.warn("API note update failed, falling back to localStorage:", apiErr);
            const localNotes = JSON.parse(localStorage.getItem("demo_notes") || "[]");
            const index = localNotes.findIndex(n => n._id === id);
            if (index !== -1) {
              const col = collectionsList.find(c => c._id === collectionId);
              localNotes[index] = {
                ...localNotes[index],
                title,
                content,
                collectionId: col ? { _id: col._id, name: col.name, color: col.color } : null,
                updatedAt: new Date().toISOString()
              };
              localStorage.setItem("demo_notes", JSON.stringify(localNotes));
              return { success: true, localFallback: true };
            }
            throw apiErr;
          });
          if (res && res.success) toast("Note updated", "success");
        } else {
          const res = await window.NotesApi.create(body).catch(async (apiErr) => {
            console.warn("API note create failed, falling back to localStorage:", apiErr);
            const localNotes = JSON.parse(localStorage.getItem("demo_notes") || "[]");
            const col = collectionsList.find(c => c._id === collectionId);
            const newNote = {
              _id: "n_" + Date.now().toString(),
              title,
              content,
              collectionId: col ? { _id: col._id, name: col.name, color: col.color } : null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            localNotes.unshift(newNote);
            localStorage.setItem("demo_notes", JSON.stringify(localNotes));
            return { success: true, localFallback: true };
          });
          if (res && res.success) toast("Note created", "success");
        }
        window.closeModalOverlay(qs("#noteModal"));
        await loadData();
      } catch (err) {
        toast("Failed to save note", "error");
        console.error("Save note error:", err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  if (collectionForm) {
    collectionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = qs("#collectionEditId").value;
      const name = qs("#collectionName").value.trim();
      const color = qs("#collectionColor").value;
      const icon = qs("#collectionIcon").value;

      const nameInput = qs("#collectionName");
      const errName = qs("#errCollectionName");

      if (errName) errName.textContent = "";
      if (nameInput) {
        nameInput.style.borderColor = "";
        nameInput.classList.remove("is-invalid");
      }

      const nameErr = window.Validators.validateName(name, "Collection name", true);
      if (nameErr) {
        if (errName) errName.textContent = nameErr;
        if (nameInput) {
          nameInput.style.borderColor = "var(--bad)";
          nameInput.classList.add("is-invalid");
          nameInput.focus();
        }
        return;
      }

      const body = { name, color, icon };
      const btn = qs("#collectionSaveBtn");
      btn.disabled = true;

      try {
        if (id) {
          const res = await window.CollectionApi.update(id, body).catch(async (apiErr) => {
            console.warn("API collection update failed, falling back to localStorage:", apiErr);
            const localCols = JSON.parse(localStorage.getItem("demo_collections") || "[]");
            const index = localCols.findIndex(c => c._id === id);
            if (index !== -1) {
              localCols[index] = { ...localCols[index], name, color, icon };
              localStorage.setItem("demo_collections", JSON.stringify(localCols));
              return { success: true, localFallback: true };
            }
            throw apiErr;
          });
          if (res && res.success) toast("Collection updated", "success");
        } else {
          const res = await window.CollectionApi.create(body).catch(async (apiErr) => {
            console.warn("API collection create failed, falling back to localStorage:", apiErr);
            const localCols = JSON.parse(localStorage.getItem("demo_collections") || "[]");
            const newCol = {
              _id: "c_" + Date.now().toString(),
              name,
              color,
              icon
            };
            localCols.push(newCol);
            localStorage.setItem("demo_collections", JSON.stringify(localCols));
            return { success: true, localFallback: true };
          });
          if (res && res.success) toast("Collection created", "success");
        }
        window.closeModalOverlay(qs("#collectionModal"));
        await loadData();
      } catch (err) {
        toast("Failed to save collection", "error");
        console.error("Save collection error:", err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  const noteSearchEl = qs("#noteSearch");
  if (noteSearchEl) {
    noteSearchEl.addEventListener("input", () => {
      renderNotes();
    });
  }

  loadData();
});
