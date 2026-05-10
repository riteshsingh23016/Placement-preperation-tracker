/* Notes page CRUD logic */

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
  if (!window.NotesApi || !window.CollectionApi) return;
  
  const notesContainer = qs("#notesContainer");
  const colContainer = qs("#collectionsContainer");
  
  if (notesContainer) notesContainer.classList.add("is-loading");
  if (colContainer) colContainer.classList.add("is-loading");

  try {
    const colRes = await window.CollectionApi.list();
    collectionsList = Array.isArray(colRes.data) ? colRes.data : [];

    const notesRes = await window.NotesApi.list();
    notesList = Array.isArray(notesRes.data) ? notesRes.data : [];

    renderCollections();
    renderNotes();
  } catch (err) {
    toast("Failed to load data", "error");
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
    const noteCount = notesList.filter(n => n.collectionId && n.collectionId._id === c._id).length;
    html += `
      <div class="collection ${isActive}" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="setActiveCollection('${c._id}')">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <i data-lucide="${c.icon}"></i>
          <span>${c.name}</span>
          <span class="badge badge--${c.color}">${noteCount}</span>
        </div>
        <div class="collection-actions" style="display:flex; gap:0.25rem;">
          <button class="iconBtn" onclick="editCollection(event, '${c._id}')" data-tooltip="Rename" style="width:24px; height:24px;"><i data-lucide="pencil" style="width:14px; height:14px;"></i></button>
          <button class="iconBtn" onclick="deleteCollection(event, '${c._id}')" data-tooltip="Delete" style="width:24px; height:24px; color:var(--bad)"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  const select = qs("#noteCollectionId");
  if (select) {
    select.innerHTML = collectionsList.map(c => `<option value="${c._id}">${c.name}</option>`).join("");
  }

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

window.setActiveCollection = (id) => {
  activeCollectionId = id;
  renderCollections();
  renderNotes();
};

function renderNotes() {
  const container = qs("#notesContainer");
  if (!container) return;

  const filtered = activeCollectionId === "all" 
    ? notesList 
    : notesList.filter(n => n.collectionId && n.collectionId._id === activeCollectionId);

  if (filtered.length === 0) {
    container.innerHTML = "<div style='grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--color-text-muted);'>No notes found in this collection. Create your first note!</div>";
    return;
  }

  container.innerHTML = filtered.map(n => `
    <div class="noteCard glassHover">
      <div class="noteCard__top">
        <span class="badge badge--${n.collectionId?.color || 'muted'}">${n.collectionId?.name || 'General'}</span>
        <div style="display:flex; gap: 0.5rem;">
          <button class="iconBtn" onclick="editNote('${n._id}')" data-tooltip="Edit Note" style="color:var(--text); width: 32px; height: 32px;"><i data-lucide="pencil" style="width: 16px; height: 16px;"></i></button>
          <button class="iconBtn" onclick="deleteNote('${n._id}')" data-tooltip="Delete Note" style="color:var(--bad); width: 32px; height: 32px;"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
        </div>
      </div>
      <div class="noteCard__title">${n.title}</div>
      <div class="noteCard__excerpt">${n.content.substring(0, 100)}${n.content.length > 100 ? '...' : ''}</div>
    </div>
  `).join("");

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

window.editNote = (id) => {
  const n = notesList.find(x => x._id === id);
  if (!n) return;
  qs("#noteModalTitle").textContent = "Edit Note";
  qs("#noteEditId").value = n._id;
  qs("#noteTitle").value = n.title;
  if (n.collectionId) qs("#noteCollectionId").value = n.collectionId._id;
  qs("#noteContent").value = n.content;
  window.openModalOverlay(qs("#noteModal"));
};

window.deleteNote = async (id) => {
  if (!id || id === "undefined" || id === "null") {
    toast("Invalid note ID", "error");
    return;
  }
  if (!confirm("Are you sure you want to delete this note?")) return;
  try {
    await window.NotesApi.remove(id);
    toast("Note deleted", "success");
    loadData();
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
  qs("#collectionColor").value = c.color || "muted";
  qs("#collectionIcon").value = c.icon || "folder";
  window.openModalOverlay(qs("#collectionModal"));
};

window.deleteCollection = async (e, id) => {
  e.stopPropagation();
  const c = collectionsList.find(x => x._id === id);
  if (!c) return;
  if (c.name === "General") return toast("Cannot delete General collection", "error");
  if (!confirm(`Are you sure you want to delete collection "${c.name}"? Notes will be moved to General.`)) return;
  try {
    await window.CollectionApi.remove(id);
    toast("Collection deleted", "success");
    if (activeCollectionId === id) activeCollectionId = "all";
    loadData();
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

  const noteForm = qs("#noteForm");
  if (noteForm) {
    noteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = qs("#noteEditId").value;
      const title = qs("#noteTitle").value.trim();
      const collectionId = qs("#noteCollectionId").value;
      const content = qs("#noteContent").value.trim();

      if (!title || !content) return toast("Title and content are required", "error");

      const body = { title, collectionId, content };
      const btn = qs("#noteSaveBtn");
      btn.disabled = true;

      try {
        if (id) {
          await window.NotesApi.update(id, body);
          toast("Note updated", "success");
        } else {
          await window.NotesApi.create(body);
          toast("Note created", "success");
        }
        window.closeModalOverlay(qs("#noteModal"));
        loadData();
      } catch (err) {
        toast("Failed to save note", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  const colForm = qs("#collectionForm");
  if (colForm) {
    colForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = qs("#collectionEditId").value;
      const name = qs("#collectionName").value.trim();
      const color = qs("#collectionColor").value;
      const icon = qs("#collectionIcon").value;

      if (!name) return toast("Collection name is required", "error");

      const body = { name, color, icon };
      const btn = qs("#collectionSaveBtn");
      btn.disabled = true;

      try {
        if (id) {
          await window.CollectionApi.update(id, body);
          toast("Collection updated", "success");
        } else {
          await window.CollectionApi.create(body);
          toast("Collection created", "success");
        }
        window.closeModalOverlay(qs("#collectionModal"));
        loadData();
      } catch (err) {
        toast("Failed to save collection", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  loadData();
});
