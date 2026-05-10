/**
 * Company Tracker — CRUD via Express + MongoDB API
 */
(function () {
  "use strict";

  var Api = window.CompanyApi;
  var ApiError = Api && Api.ApiError;

  var STATUS_OPTIONS = ["Applied", "Interview Scheduled", "Selected", "Rejected", "Pending"];
  var PRIORITY_ORDER = { High: 3, Medium: 2, Low: 1 };

  /** @type {Array<{ id: string, name: string, role: string, package: string, appliedDate: string|null, interviewDate: string|null, status: string, priority: string, notes: string, logo: string, archived: boolean }>} */
  var companies = [];

  var firstLoad = true;
  var statusUpdateInFlight = null;
  var currentView = "active"; // active | archived
  var deleteTargetId = null;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function logoFromName(name) {
    var colors = ["blue", "purple", "amber", "green", "red", "slate"];
    var sum = 0;
    var s = name || "";
    for (var i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return colors[sum % colors.length];
  }

  function mapServerDoc(doc) {
    var id = doc._id != null ? doc._id : doc.id;
    return {
      id: String(id),
      name: doc.companyName,
      role: doc.role,
      package: doc.package || "",
      appliedDate: doc.appliedDate != null ? doc.appliedDate : null,
      interviewDate: doc.interviewDate != null ? doc.interviewDate : null,
      status: doc.status,
      priority: doc.priority,
      notes: doc.notes || "",
      logo: logoFromName(doc.companyName),
      archived: Boolean(doc.archived),
    };
  }

  function parseISODate(s) {
    if (!s) return null;
    if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
      var d = new Date(s + "T12:00:00");
      return Number.isNaN(d.getTime()) ? null : d;
    }
    var d2 = new Date(s);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }

  function formatDisplayDate(iso) {
    if (!iso) return "—";
    var d = parseISODate(iso);
    if (!d) return "—";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function toInputDate(value) {
    if (!value) return "";
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function todayStart() {
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function daysUntil(iso) {
    var d = parseISODate(iso);
    if (!d) return null;
    var diff = d.setHours(0, 0, 0, 0) - todayStart().getTime();
    return Math.round(diff / 86400000);
  }

  function statusBadgeClass(status) {
    var map = {
      Applied: "statusBadge--applied",
      "Interview Scheduled": "statusBadge--interview",
      Selected: "statusBadge--selected",
      Rejected: "statusBadge--rejected",
      Pending: "statusBadge--pending",
    };
    return map[status] || "statusBadge--pending";
  }

  function priorityClass(p) {
    if (p === "High") return "priorityBadge--high";
    if (p === "Medium") return "priorityBadge--medium";
    return "priorityBadge--low";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---- Toast & loading ---- */

  function showPageLoading(on) {
    var el = qs("#pageLoadOverlay");
    if (!el) return;
    if (on) {
      el.hidden = false;
      el.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-page-loading");
    } else {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-page-loading");
    }
  }

  function showSyncing(on) {
    var main = qs(".companyMain");
    var card = qs(".companyTableCard");
    if (main) main.classList.toggle("is-syncing", on);
    if (card) card.classList.toggle("is-updating", on);
  }

  function toast(message, type) {
    if (window.Toast) {
      if (type === "success") window.Toast.success("Success", message);
      else if (type === "error") window.Toast.error("Error", message);
      else if (type === "warning") window.Toast.warn("Warning", message);
      else window.Toast.info("Info", message);
    } else {
      // Fallback
      var stack = qs("#toastStack");
      if (!stack || !message) return;
      var t = type || "info";
      var el = document.createElement("div");
      el.className = "toast toast--" + t;
      el.setAttribute("role", "status");
      el.textContent = message;
      stack.appendChild(el);
      requestAnimationFrame(function () {
        el.classList.add("is-visible");
      });
      window.setTimeout(function () {
        el.classList.remove("is-visible");
        window.setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 320);
      }, 4400);
    }
  }

  function formatApiError(err) {
    if (!ApiError || !(err instanceof ApiError)) return (err && err.message) || "Something went wrong.";
    if (err.status === 0) return "Cannot reach server. Is the API running (npm run dev)?";
    return err.message;
  }

  function clearFormErrors() {
    qsa(".modalField__error").forEach(function (el) {
      el.textContent = "";
    });
    qsa(".modalField__input.is-invalid").forEach(function (el) {
      el.classList.remove("is-invalid");
    });
  }

  function applyServerFieldErrors(errors) {
    if (!errors) return;
    clearFormErrors();
    if (errors.companyName) {
      var n = qs("#fieldName");
      var en = qs("#errName");
      if (n) n.classList.add("is-invalid");
      if (en) en.textContent = errors.companyName;
    }
    if (errors.role) {
      var r = qs("#fieldRole");
      var er = qs("#errRole");
      if (r) r.classList.add("is-invalid");
      if (er) er.textContent = errors.role;
    }
  }

  /* ---- Data load ---- */

  function normalizeCompanyListResponse(payload) {
    // Supports:
    // a) [...]
    // b) { data: [...] }
    // c) { companies: [...] }
    // d) single object fallback
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.companies)) return payload.companies;

    // If server returns { data: { ... } }
    if (payload && payload.data && typeof payload.data === "object") return [payload.data];

    // If server returns a single object directly
    if (payload && typeof payload === "object") return [payload];

    return [];
  }

  async function loadCompanies() {
    if (!Api) {
      toast("Company API not loaded.", "error");
      companies = [];
      computeStats();
      renderTable();
      renderRecentPanel();
      return;
    }

    if (firstLoad) showPageLoading(true);
    else showSyncing(true);

    try {
      var raw = await Api.list();
      var list = normalizeCompanyListResponse(raw);
      companies = list.map(mapServerDoc);
    } catch (e) {
      companies = [];
      toast(formatApiError(e), "error");
    } finally {
      if (firstLoad) {
        showPageLoading(false);
        firstLoad = false;
      } else {
        showSyncing(false);
      }
      computeStats();
      updateTabCounts();
      renderTable();
      renderRecentPanel();
      refreshIcons();
    }
  }

  function updateTabCounts() {
    var activeCount = companies.filter(function (c) {
      return !c.archived;
    }).length;
    var archivedCount = companies.filter(function (c) {
      return !!c.archived;
    }).length;
    var a = qs("#countActive");
    var b = qs("#countArchived");
    if (a) a.textContent = String(activeCount);
    if (b) b.textContent = String(archivedCount);
  }

  function getFilteredSorted() {
    var searchEl = qs("#companySearch");
    var filterEl = qs("#filterStatus");
    var sortEl = qs("#sortBy");
    var q = (searchEl && searchEl.value ? searchEl.value : "").trim().toLowerCase();
    var filter = filterEl ? filterEl.value : "all";
    var sortKey = sortEl ? sortEl.value : "applied-desc";

    var rows = companies.filter(function (c) {
      return currentView === "archived" ? !!c.archived : !c.archived;
    });

    if (filter !== "all") {
      rows = rows.filter(function (c) {
        return c.status === filter;
      });
    }

    if (q) {
      rows = rows.filter(function (c) {
        var blob = (c.name + " " + c.role + " " + (c.notes || "") + " " + (c.package || "")).toLowerCase();
        return blob.indexOf(q) !== -1;
      });
    }

    rows.sort(function (a, b) {
      if (sortKey === "applied-desc" || sortKey === "applied-asc") {
        var da = a.appliedDate ? new Date(a.appliedDate).getTime() : 0;
        var db = b.appliedDate ? new Date(b.appliedDate).getTime() : 0;
        var cmp = da - db;
        return sortKey === "applied-desc" ? -cmp : cmp;
      }
      if (sortKey === "name-asc") return a.name.localeCompare(b.name);
      if (sortKey === "name-desc") return b.name.localeCompare(a.name);
      if (sortKey === "priority") {
        return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
      }
      return 0;
    });

    return rows;
  }

  function computeStats() {
    // Stats reflect ACTIVE pipeline only
    var active = companies.filter(function (c) {
      return !c.archived;
    });

    var total = active.length;
    var selected = active.filter(function (c) {
      return c.status === "Selected";
    }).length;
    var rejected = active.filter(function (c) {
      return c.status === "Rejected";
    }).length;
    var start = todayStart();
    var upcoming = active.filter(function (c) {
      if (!c.interviewDate) return false;
      var id = parseISODate(c.interviewDate);
      if (!id) return false;
      id.setHours(0, 0, 0, 0);
      return id.getTime() >= start.getTime();
    }).length;

    var statTotal = qs("#statTotal");
    var statSelected = qs("#statSelected");
    var statRejected = qs("#statRejected");
    var statUpcoming = qs("#statUpcoming");
    if (statTotal) statTotal.textContent = String(total);
    if (statSelected) statSelected.textContent = String(selected);
    if (statRejected) statRejected.textContent = String(rejected);
    if (statUpcoming) statUpcoming.textContent = String(upcoming);
  }

  function renderRecentPanel() {
    var listEl = qs("#recentInterviewsList");
    var badgeEl = qs("#reminderBadge");
    if (!listEl) return;

    var start = todayStart();
    var upcomingRows = companies
      .filter(function (c) {
        return !c.archived;
      })
      .filter(function (c) {
        if (!c.interviewDate) return false;
        var id = parseISODate(c.interviewDate);
        if (!id) return false;
        id.setHours(0, 0, 0, 0);
        return id.getTime() >= start.getTime();
      })
      .sort(function (a, b) {
        return new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime();
      })
      .slice(0, 6);

    if (badgeEl) badgeEl.textContent = upcomingRows.length + " upcoming";

    if (!upcomingRows.length) {
      listEl.innerHTML = '<div class="recentEmpty">No upcoming interviews. Add interview dates to track reminders.</div>';
      refreshIcons();
      return;
    }

    listEl.innerHTML = upcomingRows
      .map(function (c) {
        var initial = escapeHtml(c.name.trim().charAt(0).toUpperCase());
        var dStr = formatDisplayDate(c.interviewDate || "");
        var daypart = "";
        var du = daysUntil(c.interviewDate || "");
        if (du === 0) daypart = "Today";
        else if (du === 1) daypart = "Tomorrow";
        else if (du !== null && du > 1) daypart = "In " + du + " days";

        var reminder =
          c.status === "Interview Scheduled"
            ? "Reminder: review company deck & 2 clarifying questions."
            : "Reminder: confirm timeline and round format.";

        return (
          '<article class="recentItem">' +
          '<div class="recentItem__logo companyLogo is-' +
          escapeHtml(c.logo) +
          '" aria-hidden="true">' +
          initial +
          "</div>" +
          '<div class="recentItem__meta">' +
          '<div class="recentItem__name">' +
          escapeHtml(c.name) +
          "</div>" +
          '<div class="recentItem__role">' +
          escapeHtml(c.role) +
          "</div>" +
          '<div class="recentItem__time">' +
          '<span class="recentItem__pill"><i data-lucide="calendar"></i> ' +
          escapeHtml(dStr) +
          "</span>" +
          (daypart ? "<span>" + escapeHtml(daypart) + "</span>" : "") +
          "</div>" +
          '<div class="recentItem__reminder">' +
          escapeHtml(reminder) +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    refreshIcons();
  }

  function statusSelectOptions(selected) {
    return STATUS_OPTIONS.map(function (s) {
      var sel = s === selected ? " selected" : "";
      return '<option value="' + escapeHtml(s) + '"' + sel + ">" + escapeHtml(s) + "</option>";
    }).join("");
  }

  function renderTable() {
    var tbody = qs("#companyTableBody");
    var emptyEl = qs("#companyEmpty");
    var countEl = qs("#tableResultCount");
    var card = qs(".companyTableCard");
    var wrap = qs(".companyTableWrap");
    var emptyTitle = qs("#companyEmptyTitle");
    var emptyText = qs("#companyEmptyText");
    if (!tbody) return;

    var rows = getFilteredSorted();

    if (countEl) {
      countEl.textContent =
        rows.length === (currentView === "archived" ? companies.filter(function(c){return !!c.archived;}).length : companies.filter(function(c){return !c.archived;}).length)
          ? "Showing all " + rows.length + " " + (currentView === "archived" ? "archived" : "active") + " application" + (rows.length === 1 ? "" : "s")
          : "Showing " + rows.length + " of " + companies.length + " application" + (companies.length === 1 ? "" : "s");
    }

    if (!rows.length) {
      tbody.innerHTML = "";
      if (companies.length === 0) {
        if (emptyTitle) emptyTitle.textContent = "No applications yet";
        if (emptyText) emptyText.textContent = "Add your first company or ensure the API is running and the database is seeded.";
      } else {
        if (emptyTitle) emptyTitle.textContent = "No matches";
        if (emptyText) emptyText.textContent = "Try adjusting search or filters.";
      }
      if (emptyEl) emptyEl.hidden = false;
      if (wrap) wrap.hidden = true;
      if (card) card.setAttribute("data-empty", "true");
      refreshIcons();
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (wrap) wrap.hidden = false;
    if (card) card.removeAttribute("data-empty");

    tbody.innerHTML = rows
      .map(function (c) {
        var initial = escapeHtml(c.name.trim().charAt(0).toUpperCase());
        var intv = c.interviewDate
          ? '<span class="dateCell" data-countdown="' + escapeHtml(c.interviewDate) + '">' + formatDisplayDate(c.interviewDate) + "</span>"
          : '<span class="dateCell dateCell--muted">Not set</span>';

        var rowCls = c.priority === "High" ? ' class="priority-high-glow"' : '';

        return (
          '<tr data-id="' +
          escapeHtml(c.id) +
          '"' + rowCls + '>' +
          "<td>" +
          '<div class="companyCell">' +
          '<div class="companyLogo is-' +
          escapeHtml(c.logo) +
          '" aria-hidden="true">' +
          initial +
          "</div>" +
          "<div>" +
          '<div class="companyName">' +
          escapeHtml(c.name) +
          "</div>" +
          '<div class="companyMeta">' +
          escapeHtml(c.package || "—") +
          "</div>" +
          "</div>" +
          "</div>" +
          "</td>" +
          "<td>" +
          escapeHtml(c.role) +
          "</td>" +
          '<td><span class="dateCell">' +
          formatDisplayDate(c.appliedDate) +
          "</span></td>" +
          "<td>" +
          intv +
          "</td>" +
          "<td>" +
          '<div class="statusCell">' +
          '<span class="statusBadge ' +
          statusBadgeClass(c.status) +
          '">' +
          escapeHtml(c.status) +
          "</span>" +
          '<div class="statusSelectWrap" data-status="' +
          escapeHtml(c.status) +
          '">' +
          '<select class="statusSelect js-status" data-id="' +
          escapeHtml(c.id) +
          '" aria-label="Change status for ' +
          escapeHtml(c.name) +
          '"' +
          (statusUpdateInFlight === c.id ? " disabled" : "") +
          ">" +
          statusSelectOptions(c.status) +
          "</select>" +
          "</div>" +
          "</div>" +
          "</td>" +
          '<td><span class="priorityBadge ' +
          priorityClass(c.priority) +
          '">' +
          escapeHtml(c.priority) +
          "</span></td>" +
          '<td class="u-right">' +
          '<div class="rowActions">' +
          '<div class="miniMenu">' +
          '<button type="button" class="iconAction js-mark" data-id="' +
          escapeHtml(c.id) +
          '" data-tooltip="Mark Complete" aria-label="Mark status for ' +
          escapeHtml(c.name) +
          '"' +
          (statusUpdateInFlight === c.id ? " disabled" : "") +
          '><i data-lucide="check-circle-2"></i></button>' +
          '<div class="miniMenu__panel" data-menu="' +
          escapeHtml(c.id) +
          '" hidden>' +
          '<button class="miniMenu__item js-set-status" type="button" data-id="' +
          escapeHtml(c.id) +
          '" data-status="Applied"><span class="miniMenu__itemLabel">Applied</span><span class="miniMenu__hint">Blue</span></button>' +
          '<button class="miniMenu__item js-set-status" type="button" data-id="' +
          escapeHtml(c.id) +
          '" data-status="Interview Scheduled"><span class="miniMenu__itemLabel">Interview</span><span class="miniMenu__hint">Yellow</span></button>' +
          '<button class="miniMenu__item js-set-status" type="button" data-id="' +
          escapeHtml(c.id) +
          '" data-status="Selected"><span class="miniMenu__itemLabel">Selected</span><span class="miniMenu__hint">Green</span></button>' +
          '<button class="miniMenu__item js-set-status" type="button" data-id="' +
          escapeHtml(c.id) +
          '" data-status="Rejected"><span class="miniMenu__itemLabel">Rejected</span><span class="miniMenu__hint">Red</span></button>' +
          "</div>" +
          "</div>" +
          '<span class="rowActions__split" aria-hidden="true"></span>' +
          '<button type="button" class="iconAction js-edit" data-id="' +
          escapeHtml(c.id) +
          '" data-tooltip="Edit Company" aria-label="Edit ' +
          escapeHtml(c.name) +
          '"' +
          (statusUpdateInFlight === c.id ? " disabled" : "") +
          '><i data-lucide="pencil"></i></button>' +
          '<button type="button" class="iconAction js-archive" data-id="' +
          escapeHtml(c.id) +
          '" data-tooltip="' +
          (c.archived ? "Restore Company" : "Archive Company") +
          '" aria-label="' +
          (c.archived ? "Restore " : "Archive ") +
          escapeHtml(c.name) +
          '"' +
          (statusUpdateInFlight === c.id ? " disabled" : "") +
          '><i data-lucide="' +
          (c.archived ? "archive-restore" : "archive") +
          '"></i></button>' +
          '<button type="button" class="iconAction iconAction--danger js-delete" data-id="' +
          escapeHtml(c.id) +
          '" data-tooltip="Delete Company" aria-label="Delete ' +
          escapeHtml(c.name) +
          '"' +
          (statusUpdateInFlight === c.id ? " disabled" : "") +
          '><i data-lucide="trash-2"></i></button>' +
          "</div>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    refreshIcons();
  }

  function findCompany(id) {
    return companies.find(function (c) {
      return c.id === id;
    });
  }

  async function updateCompanyStatus(id, nextStatus) {
    if (!Api) return;
    statusUpdateInFlight = id;
    renderTable();
    try {
      await Api.update(id, { status: nextStatus });
      toast("Status updated", "success");
    } catch (e) {
      toast(formatApiError(e), "error");
    } finally {
      statusUpdateInFlight = null;
    }
    await loadCompanies();
  }

  async function setArchived(id, archived) {
    if (!Api) return;
    showSyncing(true);
    try {
      await Api.update(id, { archived: !!archived });
      toast(archived ? "Archived" : "Restored", "success");
    } catch (e) {
      toast(formatApiError(e), "error");
    }
    await loadCompanies();
  }

  /* --- Modals --- */
  var companyModal = qs("#companyModal");
  var companyForm = qs("#companyForm");
  var editIdField = qs("#companyEditId");
  var fieldName = qs("#fieldName");
  var fieldRole = qs("#fieldRole");
  var fieldPackage = qs("#fieldPackage");
  var fieldStatus = qs("#fieldStatus");
  var fieldInterview = qs("#fieldInterview");
  var fieldPriority = qs("#fieldPriority");
  var fieldNotes = qs("#fieldNotes");
  var modalTitle = qs("#companyModalTitle");
  var modalSubtitle = qs("#companyModalSubtitle");
  var saveBtn = qs("#companyModalSave");

  function openModalOverlay(overlay) {
    window.openModalOverlay(overlay);
  }

  function closeModalOverlay(overlay) {
    window.closeModalOverlay(overlay);
  }

  function setSaveBusy(busy) {
    if (!saveBtn) return;
    saveBtn.classList.toggle("is-busy", busy);
    saveBtn.disabled = !!busy;
  }

  function openCompanyModal(mode, company) {
    if (!companyForm) return;
    clearFormErrors();
    companyForm.reset();
    if (editIdField) editIdField.value = "";

    if (mode === "edit" && company) {
      if (modalTitle) modalTitle.textContent = "Edit company";
      if (modalSubtitle) modalSubtitle.textContent = "Update application details and keep your pipeline accurate.";
      if (editIdField) editIdField.value = company.id;
      if (fieldName) fieldName.value = company.name;
      if (fieldRole) fieldRole.value = company.role;
      if (fieldPackage) fieldPackage.value = company.package || "";
      if (fieldStatus) fieldStatus.value = company.status;
      if (fieldInterview) fieldInterview.value = toInputDate(company.interviewDate);
      if (fieldPriority) fieldPriority.value = company.priority;
      if (fieldNotes) fieldNotes.value = company.notes || "";
    } else {
      if (modalTitle) modalTitle.textContent = "Add company";
      if (modalSubtitle) modalSubtitle.textContent = "Create a new application entry for your pipeline.";
      if (fieldPriority) fieldPriority.value = "Medium";
      if (fieldStatus) fieldStatus.value = "Applied";
      if (fieldInterview) fieldInterview.value = "";
    }

    setSaveBusy(false);
    openModalOverlay(companyModal);
    refreshIcons();
  }

  async function onCompanySubmit(e) {
    e.preventDefault();
    if (!Api) {
      toast("API not available.", "error");
      return;
    }

    clearFormErrors();
    var ok = true;
    var n = fieldName && fieldName.value.trim();
    var r = fieldRole && fieldRole.value.trim();
    if (!n) {
      ok = false;
      if (fieldName) fieldName.classList.add("is-invalid");
      var en = qs("#errName");
      if (en) en.textContent = "Company name is required.";
    }
    if (!r) {
      ok = false;
      if (fieldRole) fieldRole.classList.add("is-invalid");
      var er = qs("#errRole");
      if (er) er.textContent = "Job role is required.";
    }
    if (!ok) return;

    var editId = editIdField && editIdField.value;
    var pack = fieldPackage ? fieldPackage.value.trim() : "";
    var st = fieldStatus ? fieldStatus.value : "Applied";
    var pri = fieldPriority ? fieldPriority.value : "Medium";
    var intvRaw = fieldInterview && fieldInterview.value ? fieldInterview.value.trim() : "";
    var notes = fieldNotes ? fieldNotes.value.trim() : "";

    var body = {
      companyName: n,
      role: r,
      package: pack,
      status: st,
      priority: pri,
      notes: notes,
      interviewDate: intvRaw || "",
    };

    setSaveBusy(true);

    try {
      if (editId) {
        var existing = findCompany(editId);
        if (existing && existing.appliedDate) body.appliedDate = existing.appliedDate;
        await Api.update(editId, body);
        toast("Company updated", "success");
      } else {
        await Api.create(body);
        toast("Company added", "success");
      }
      closeModalOverlay(companyModal);
      await loadCompanies(); // refresh table + stats instantly and persists
    } catch (err) {
      if (ApiError && err instanceof ApiError && err.errors) {
        applyServerFieldErrors(err.errors);
        toast(err.message || "Validation failed", "error");
      } else {
        toast(formatApiError(err), "error");
      }
    } finally {
      setSaveBusy(false);
    }
  }

  /* --- View modal --- */
  var viewModal = qs("#viewModal");
  var viewTitle = qs("#viewModalTitle");
  var viewRole = qs("#viewModalRole");
  var viewBody = qs("#viewModalBody");
  var viewLogo = qs("#viewLogo");

  function openViewModal(c) {
    if (!c) return;
    if (viewTitle) viewTitle.textContent = c.name;
    if (viewRole) viewRole.textContent = c.role;
    if (viewLogo) {
      viewLogo.textContent = c.name.trim().charAt(0).toUpperCase();
      viewLogo.className = "viewModalLogo companyLogo is-" + c.logo;
    }
    if (viewBody) {
      viewBody.innerHTML =
        '<div class="viewRow"><span class="viewRow__k">Package</span><span class="viewRow__v">' +
        escapeHtml(c.package || "—") +
        "</span></div>" +
        '<div class="viewRow"><span class="viewRow__k">Applied</span><span class="viewRow__v">' +
        escapeHtml(formatDisplayDate(c.appliedDate)) +
        "</span></div>" +
        '<div class="viewRow"><span class="viewRow__k">Interview</span><span class="viewRow__v">' +
        escapeHtml(c.interviewDate ? formatDisplayDate(c.interviewDate) : "—") +
        "</span></div>" +
        '<div class="viewRow"><span class="viewRow__k">Status</span><span class="viewRow__v">' +
        escapeHtml(c.status) +
        "</span></div>" +
        '<div class="viewRow"><span class="viewRow__k">Priority</span><span class="viewRow__v">' +
        escapeHtml(c.priority) +
        "</span></div>" +
        '<div class="viewRow" style="align-items:flex-start"><span class="viewRow__k">Notes</span><span class="viewRow__v" style="text-align:right;max-width:62%">' +
        escapeHtml(c.notes || "—") +
        "</span></div>";
    }
    openModalOverlay(viewModal);
    var editBtn = qs("#viewModalEdit");
    if (editBtn) editBtn.dataset.id = c.id;
    refreshIcons();
  }

  function wireModals() {
    var addBtn = qs("#addCompanyBtn");
    if (addBtn) {
      addBtn.onclick = function () {
        openCompanyModal("add", null);
      };
    }

    if (companyForm) companyForm.addEventListener("submit", onCompanySubmit);

    qsa("#companyModalClose, #companyModalCancel").forEach(function (b) {
      b.addEventListener("click", function () {
        closeModalOverlay(companyModal);
      });
    });
    if (companyModal) {
      companyModal.addEventListener("click", function (e) {
        if (e.target === companyModal) closeModalOverlay(companyModal);
      });
    }

    var viewClose = qs("#viewModalClose");
    if (viewClose) {
      viewClose.addEventListener("click", function () {
        closeModalOverlay(viewModal);
      });
    }
    if (viewModal) {
      viewModal.addEventListener("click", function (e) {
        if (e.target === viewModal) closeModalOverlay(viewModal);
      });
    }
    var vEdit = qs("#viewModalEdit");
    if (vEdit) {
      vEdit.addEventListener("click", function () {
        var id = vEdit.dataset.id;
        var c = findCompany(id);
        closeModalOverlay(viewModal);
        if (c) openCompanyModal("edit", c);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (companyModal && !companyModal.hasAttribute("hidden") && companyModal.classList.contains("is-open")) {
        closeModalOverlay(companyModal);
      }
      if (viewModal && !viewModal.hasAttribute("hidden") && viewModal.classList.contains("is-open")) {
        closeModalOverlay(viewModal);
      }
    });
  }

  function wireTableActions() {
    var tbody = qs("#companyTableBody");
    if (!tbody) return;

    tbody.addEventListener("change", function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains("js-status")) {
        updateCompanyStatus(t.getAttribute("data-id"), t.value);
      }
    });

    tbody.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn || btn.disabled) return;

      // menu item click
      if (btn.classList.contains("js-set-status")) {
        closeAllMiniMenus();
        updateCompanyStatus(btn.getAttribute("data-id"), btn.getAttribute("data-status"));
        return;
      }

      var id = btn.getAttribute("data-id");
      if (!id) return;
      var c = findCompany(id);

      if (btn.classList.contains("js-mark")) {
        toggleMiniMenu(id);
        return;
      }
      if (btn.classList.contains("js-edit")) {
        openCompanyModal("edit", c);
        return;
      }
      if (btn.classList.contains("js-archive")) {
        setArchived(id, !c.archived);
        return;
      }
      if (btn.classList.contains("js-delete")) {
        if (!id || id === "undefined") {
          toast("Invalid application ID", "error");
          return;
        }
        openDeleteModal(id, c && c.name);
        return;
      }
    });
  }

  async function handleDelete(id) {
    if (!Api || !id || id === "undefined") return;
    try {
      await Api.remove(id);
      toast("Company removed", "success");
    } catch (e) {
      toast(formatApiError(e), "error");
    }
    await loadCompanies();
  }

  function closeAllMiniMenus() {
    qsa(".miniMenu__panel").forEach(function (p) {
      p.hidden = true;
    });
  }

  function toggleMiniMenu(id) {
    var panel = qs('.miniMenu__panel[data-menu="' + id + '"]');
    if (!panel) return;
    var next = !panel.hidden;
    closeAllMiniMenus();
    panel.hidden = next;
  }

  function wireMiniMenuDismiss() {
    document.addEventListener("click", function (e) {
      var inside = e.target.closest(".miniMenu");
      if (!inside) closeAllMiniMenus();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAllMiniMenus();
    });
  }

  function wireTabs() {
    var tabActive = qs("#tabActive");
    var tabArchived = qs("#tabArchived");
    function setView(v) {
      currentView = v;
      if (tabActive) tabActive.classList.toggle("is-active", v === "active");
      if (tabArchived) tabArchived.classList.toggle("is-active", v === "archived");
      renderTable();
    }
    if (tabActive) tabActive.addEventListener("click", function () { setView("active"); });
    if (tabArchived) tabArchived.addEventListener("click", function () { setView("archived"); });
  }

  // Delete confirmation modal
  var deleteModal = qs("#deleteModal");
  function openDeleteModal(id, name) {
    deleteTargetId = id;
    var label = qs("#deleteCompanyName");
    if (label) label.textContent = name || "—";
    openModalOverlay(deleteModal);
    refreshIcons();
  }
  function closeDeleteModal() {
    deleteTargetId = null;
    closeModalOverlay(deleteModal);
  }
  function wireDeleteModal() {
    var closeBtn = qs("#deleteModalClose");
    var cancelBtn = qs("#deleteModalCancel");
    var confirmBtn = qs("#deleteModalConfirm");
    if (closeBtn) closeBtn.addEventListener("click", closeDeleteModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeDeleteModal);
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (!deleteTargetId) return;
        var idToDelete = deleteTargetId;
        closeDeleteModal();
        handleDelete(idToDelete);
      });
    }
    if (deleteModal) {
      deleteModal.addEventListener("click", function (e) {
        if (e.target === deleteModal) closeDeleteModal();
      });
    }
  }

  function wireFilters() {
    var search = qs("#companySearch");
    var filter = qs("#filterStatus");
    var sort = qs("#sortBy");
    if (search) search.addEventListener("input", renderTable);
    if (filter) filter.addEventListener("change", renderTable);
    if (sort) sort.addEventListener("change", renderTable);
  }

  function handlePendingCompany() {
    var pendingId = sessionStorage.getItem("pendingCompanyId");
    if (!pendingId) return;
    sessionStorage.removeItem("pendingCompanyId");
    var company = findCompany(pendingId);
    if (company) {
      openCompanyModal("edit", company);
    }
  }

  async function init() {
    wireModals();
    wireTableActions();
    wireFilters();
    wireTabs();
    wireDeleteModal();
    wireMiniMenuDismiss();
    await loadCompanies();
    handlePendingCompany();
  }

  window.handlePendingCompany = handlePendingCompany;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();