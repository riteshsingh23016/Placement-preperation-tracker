/* Admin Panel Logic - Robust Implementation with Fallback Data */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Helpers
    const qs = (sel) => document.querySelector(sel);
    const qsa = (sel) => document.querySelectorAll(sel);

    // --- FALLBACK DATA ---
    const fallbackStats = {
        totalStudents: 2,
        totalApplications: 38,
        selectedStudents: 6,
        rejectedApplications: 9,
        scheduledInterviews: 12,
        activeApplications: 23,
        totalNotes: 3,
        totalDrives: 4
    };

    const fallbackStudents = [
        { _id: '1', name: 'John Doe', email: 'john@example.com', role: 'student', isBlocked: false, applicationCount: 15, selectedCount: 2 },
        { _id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'student', isBlocked: true, applicationCount: 23, selectedCount: 4 }
    ];

    const fallbackApps = [
        { _id: 'a1', user: { name: 'John Doe', email: 'john@example.com' }, companyName: 'Google', role: 'SDE', status: 'Selected', priority: 'High', appliedDate: new Date() },
        { _id: 'a2', user: { name: 'Jane Smith', email: 'jane@example.com' }, companyName: 'Meta', role: 'Frontend Eng', status: 'Interview Scheduled', priority: 'Medium', appliedDate: new Date() }
    ];

    const fallbackDrives = [
        { _id: 'd1', companyName: 'Microsoft', role: 'Software Engineer', package: '45 LPA', location: 'Redmond', status: 'Open', driveDate: new Date() },
        { _id: 'd2', companyName: 'Amazon', role: 'Cloud Support', package: '28 LPA', location: 'Seattle', status: 'Closed', driveDate: new Date() }
    ];

    const fallbackAnnouncements = [
        { _id: 'an1', title: 'Welcome to Admin Panel', message: 'The placement season has officially started.', createdAt: new Date() }
    ];

    // API Service
    const adminApi = {
        async get(endpoint) {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${window.APP_API_BASE}/admin${endpoint}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                return data.data;
            } catch (err) {
                console.warn(`API Error (${endpoint}):`, err.message);
                return null;
            }
        },
        async post(endpoint, body = {}) {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${window.APP_API_BASE}/admin${endpoint}`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                return data;
            } catch (err) {
                console.warn(`API Error (${endpoint}):`, err.message);
                return null;
            }
        },
        async patch(endpoint, body = {}) {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${window.APP_API_BASE}/admin${endpoint}`, {
                    method: "PATCH",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                return data;
            } catch (err) {
                console.warn(`API Error (${endpoint}):`, err.message);
                return null;
            }
        },
        async put(endpoint, body = {}) {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${window.APP_API_BASE}/admin${endpoint}`, {
                    method: "PUT",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                return data;
            } catch (err) {
                console.warn(`API Error (${endpoint}):`, err.message);
                return null;
            }
        },
        async delete(endpoint) {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${window.APP_API_BASE}/admin${endpoint}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                return data;
            } catch (err) {
                console.warn(`API Error (${endpoint}):`, err.message);
                return null;
            }
        }
    };

    const announcementApi = {
        async get() {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${window.APP_API_BASE}/announcements`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                return data.success ? data.data : null;
            } catch (err) {
                return null;
            }
        },
        async post(body) {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${window.APP_API_BASE}/announcements`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });
                return await res.json();
            } catch (err) {
                return { success: false, message: err.message };
            }
        },
        async delete(id) {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${window.APP_API_BASE}/announcements/${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                return await res.json();
            } catch (err) {
                return { success: false, message: err.message };
            }
        }
    };

    // --- RENDERING LOGIC ---

    const renderStats = async () => {
        const data = await adminApi.get("/stats") || fallbackStats;
        
        const updateVal = (id, val) => {
            const el = qs(id);
            if (el) el.textContent = val !== undefined ? val : '-';
        };

        updateVal("#statStudents", data.totalStudents);
        updateVal("#statApps", data.totalApplications);
        updateVal("#statSelected", data.selectedStudents);
        updateVal("#statRejected", data.rejectedApplications);
        updateVal("#statInterviews", data.scheduledInterviews);
        updateVal("#statActive", data.activeApplications);
        updateVal("#statNotes", data.totalNotes);
        updateVal("#statDrives", data.totalDrives);
    };

    const renderStudents = async () => {
        const students = await adminApi.get("/users") || fallbackStudents;
        const tbody = qs("#studentsTableBody");
        if (!tbody) return;

        const query = qs("#studentSearch") ? qs("#studentSearch").value.trim().toLowerCase() : "";
        const filteredStudents = students.filter(student => 
            (student.name || "").toLowerCase().includes(query) || 
            (student.email || "").toLowerCase().includes(query)
        );

        tbody.innerHTML = filteredStudents.map(student => `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-cell__avatar">${student.name ? student.name.charAt(0) : '?'}</div>
                        <div class="user-cell__name">${student.name}</div>
                    </div>
                </td>
                <td>${student.email}</td>
                <td>${student.applicationCount || 0}</td>
                <td>${student.selectedCount || 0}</td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                        <span class="badge ${student.isBlocked ? 'badge--blocked' : 'badge--active'}">
                            ${student.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                        <span class="badge ${student.isVerified ? 'badge--active' : 'badge--warning'}">
                            ${student.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        ${!student.isVerified ? `
                        <button class="btn btn--ghost btn--sm verify-toggle" data-id="${student._id}" style="color: var(--accent-primary); border-color: rgba(var(--accent-primary-rgb), 0.2);">
                            Verify
                        </button>
                        ` : ''}
                        <button class="btn btn--ghost btn--sm block-toggle" data-id="${student._id}">
                            ${student.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        <button class="btn btn--ghost btn--sm view-student" data-id="${student._id}">View</button>
                        <button class="btn btn--ghost btn--sm delete-student btn--danger" data-id="${student._id}" style="color: var(--bad); border-color: rgba(var(--color-danger-rgb), 0.2);">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");

        // Attach listeners
        qsa(".verify-toggle").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const res = await adminApi.patch(`/users/${id}/verify`);
                if (res) {
                    if (window.Toast) window.Toast.success("Success", res.message);
                    renderStudents();
                } else {
                    // Local state toggle for demo
                    const s = students.find(x => x._id === id);
                    if (s) {
                        s.isVerified = true;
                        renderStudents();
                        if (window.Toast) window.Toast.info("Demo Mode", `Marked ${s.name} as verified`);
                    }
                }
            });
        });

        qsa(".block-toggle").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const res = await adminApi.patch(`/users/${id}/block`);
                if (res) {
                    if (window.Toast) window.Toast.success("Success", res.message);
                    renderStudents();
                } else {
                    // Local state toggle for demo
                    const s = students.find(x => x._id === id);
                    if (s) {
                        s.isBlocked = !s.isBlocked;
                        renderStudents();
                        if (window.Toast) window.Toast.info("Demo Mode", `Toggled block for ${s.name}`);
                    }
                }
            });
        });

        // View student listener
        qsa(".view-student").forEach(btn => {
            btn.addEventListener("click", () => {
                openStudentDetailModal(btn.dataset.id);
            });
        });

        // Delete student listener
        qsa(".delete-student").forEach(btn => {
            btn.addEventListener("click", () => {
                deletingStudentId = btn.dataset.id;
                const delModal = qs("#deleteConfirmModal");
                if (delModal) {
                    delModal.style.display = "flex";
                    if (window.lucide) window.lucide.createIcons({ root: delModal });
                }
            });
        });
    };

    // --- STUDENT DETAIL MODAL FLOW ---
    const openStudentDetailModal = async (studentId) => {
        const modal = qs("#studentDetailModal");
        if (!modal) return;

        // Reset the send notification form
        const titleInput = qs("#sdNotifTitle");
        const msgInput = qs("#sdNotifMessage");
        const prioritySelect = qs("#sdNotifPriority");
        if (titleInput) titleInput.value = "";
        if (msgInput) msgInput.value = "";
        if (prioritySelect) prioritySelect.value = "medium";

        // Fetch student details, applications, and notes concurrently
        let student = await adminApi.get(`/students/${studentId}`);
        let apps = await adminApi.get(`/students/${studentId}/applications`);
        let notes = await adminApi.get(`/students/${studentId}/notes`);

        // If API fails, check if studentId is a fallback student
        if (!student) {
            const fallbackStudent = fallbackStudents.find(s => s._id === studentId);
            if (fallbackStudent) {
                student = {
                    ...fallbackStudent,
                    phoneNumber: "123-456-7890",
                    course: "B.Tech",
                    branch: "Computer Science",
                    graduationYear: "2026",
                    skills: "React, Node.js, Express, MongoDB, Java",
                    resumeUrl: "https://example.com/resume.pdf",
                    linkedinUrl: "https://linkedin.com/in/example",
                    githubUrl: "https://github.com/example",
                    createdAt: new Date().toISOString()
                };
                apps = fallbackApps.filter(app => {
                    return app.user?.email === fallbackStudent.email;
                });
                notes = [
                    { title: "React Notes", collectionId: { name: "Web Development" }, updatedAt: new Date().toISOString() },
                    { title: "Data Structures", collectionId: { name: "DSA" }, updatedAt: new Date().toISOString() }
                ];
            }
        }

        if (!student) {
            if (window.Toast) window.Toast.error("Error", "Failed to fetch student details");
            return;
        }

        // Render profile details
        qs("#sdName").textContent = student.name || "N/A";
        qs("#sdEmail").textContent = student.email || "N/A";
        qs("#sdPhone").textContent = student.phoneNumber || "Not provided";
        
        let courseBranch = "Not provided";
        if (student.course && student.branch) {
            courseBranch = `${student.course} / ${student.branch}`;
        } else if (student.course) {
            courseBranch = student.course;
        } else if (student.branch) {
            courseBranch = student.branch;
        }
        qs("#sdCourseBranch").textContent = courseBranch;
        qs("#sdGradYear").textContent = student.graduationYear || "Not provided";
        qs("#sdRollNumber").textContent = "Not provided"; // roll number is not in schema
                qs("#sdStatus").textContent = student.isBlocked ? "Blocked" : "Active";
        const verificationEl = qs("#sdVerification");
        if (verificationEl) {
            verificationEl.textContent = student.isVerified ? "Verified" : "Unverified";
            verificationEl.style.color = student.isVerified ? "var(--color-success)" : "var(--color-warning)";
        }
        qs("#sdJoined").textContent = student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "Not provided";
        qs("#sdSkills").textContent = student.skills || "Not provided";

        // Resume, LinkedIn, GitHub
        const resumeEl = qs("#sdResume");
        if (resumeEl) {
            if (student.resumeUrl) {
                resumeEl.innerHTML = `<strong>Resume:</strong> <a href="${student.resumeUrl}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">View Resume</a>`;
            } else {
                resumeEl.innerHTML = `<strong>Resume:</strong> Not provided`;
            }
        }
        const linkedinEl = qs("#sdLinkedIn");
        if (linkedinEl) {
            if (student.linkedinUrl) {
                linkedinEl.innerHTML = `<strong>LinkedIn:</strong> <a href="${student.linkedinUrl}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">LinkedIn Profile</a>`;
            } else {
                linkedinEl.innerHTML = `<strong>LinkedIn:</strong> Not provided`;
            }
        }
        const githubEl = qs("#sdGitHub");
        if (githubEl) {
            if (student.githubUrl) {
                githubEl.innerHTML = `<strong>GitHub:</strong> <a href="${student.githubUrl}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">GitHub Profile</a>`;
            } else {
                githubEl.innerHTML = `<strong>GitHub:</strong> Not provided`;
            }
        }

        // Render Placement Summary
        const appList = apps || [];
        const totalApps = appList.length;
        const selectedApps = appList.filter(a => a.status === "Selected").length;
        const rejectedApps = appList.filter(a => a.status === "Rejected").length;
        const interviewApps = appList.filter(a => a.status === "Interview Scheduled").length;
        const activeApps = appList.filter(a => ["Applied", "Interview Scheduled", "Pending"].includes(a.status)).length;
        const successRate = totalApps > 0 ? Math.round((selectedApps / totalApps) * 100) : 0;

        qs("#sdSumTotal").textContent = totalApps;
        qs("#sdSumSelected").textContent = selectedApps;
        qs("#sdSumRejected").textContent = rejectedApps;
        qs("#sdSumInterview").textContent = interviewApps;
        qs("#sdSumActive").textContent = activeApps;
        qs("#sdSumSuccess").textContent = `${successRate}%`;

        // Render Applications Table
        const appsTbody = qs("#sdAppsTableBody");
        if (appsTbody) {
            if (appList.length === 0) {
                appsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 16px; opacity: 0.6;">No applications found</td></tr>`;
            } else {
                appsTbody.innerHTML = appList.map(app => `
                    <tr>
                        <td style="padding: 10px 14px;">${app.companyName}</td>
                        <td style="padding: 10px 14px;">${app.role}</td>
                        <td style="padding: 10px 14px;"><span class="status-tag status-${app.status.toLowerCase().replace(/\s/g, '-')}">${app.status}</span></td>
                        <td style="padding: 10px 14px;">${app.priority}</td>
                        <td style="padding: 10px 14px;">${new Date(app.appliedDate).toLocaleDateString()}</td>
                        <td style="padding: 10px 14px;">${app.interviewDate ? new Date(app.interviewDate).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                `).join("");
            }
        }

        // Render Notes Table
        const notesList = notes || [];
        const notesTbody = qs("#sdNotesTableBody");
        if (notesTbody) {
            if (notesList.length === 0) {
                notesTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 16px; opacity: 0.6;">No notes found</td></tr>`;
            } else {
                notesTbody.innerHTML = notesList.map(note => `
                    <tr>
                        <td style="padding: 10px 14px;">${note.title}</td>
                        <td style="padding: 10px 14px;">${note.collectionId?.name || "Uncategorized"}</td>
                        <td style="padding: 10px 14px;">${new Date(note.updatedAt).toLocaleDateString()}</td>
                    </tr>
                `).join("");
            }
        }

        // Update Block Button text
        const blockBtn = qs("#sdBlockBtn");
        if (blockBtn) {
            blockBtn.textContent = student.isBlocked ? "Unblock Student" : "Block Student";
            blockBtn.style.color = student.isBlocked ? "var(--color-success)" : "var(--color-danger)";
            blockBtn.style.borderColor = student.isBlocked ? "rgba(var(--color-success-rgb), 0.3)" : "rgba(var(--color-danger-rgb), 0.3)";
            
            blockBtn.onclick = async () => {
                const res = await adminApi.patch(`/users/${studentId}/block`);
                if (res) {
                    if (window.Toast) window.Toast.success("Success", res.message);
                    renderStudents();
                    const updatedIsBlocked = res.data.isBlocked;
                    qs("#sdStatus").textContent = updatedIsBlocked ? "Blocked" : "Active";
                    blockBtn.textContent = updatedIsBlocked ? "Unblock Student" : "Block Student";
                    blockBtn.style.color = updatedIsBlocked ? "var(--color-success)" : "var(--color-danger)";
                    blockBtn.style.borderColor = updatedIsBlocked ? "rgba(var(--color-success-rgb), 0.3)" : "rgba(var(--color-danger-rgb), 0.3)";
                }
            };
        }

        const verifyBtn = qs("#sdVerifyBtn");
        if (verifyBtn) {
            if (student.isVerified) {
                verifyBtn.style.display = "none";
            } else {
                verifyBtn.style.display = "inline-block";
                verifyBtn.style.color = "var(--color-success)";
                verifyBtn.style.borderColor = "rgba(var(--color-success-rgb), 0.3)";
                verifyBtn.onclick = async () => {
                    const res = await adminApi.patch(`/users/${studentId}/verify`);
                    if (res) {
                        if (window.Toast) window.Toast.success("Success", res.message);
                        renderStudents();
                        const verificationEl2 = qs("#sdVerification");
                        if (verificationEl2) {
                            verificationEl2.textContent = "Verified";
                            verificationEl2.style.color = "var(--color-success)";
                        }
                        verifyBtn.style.display = "none";
                    }
                };
            }
        }

        const deleteBtn = qs("#sdDeleteBtn");
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                deletingStudentId = studentId;
                const delModal = qs("#deleteConfirmModal");
                if (delModal) {
                    delModal.style.display = "flex";
                    if (window.lucide) window.lucide.createIcons({ root: delModal });
                }
            };
        }

        // Rebind Send Notification action
        const sendNotifBtn = qs("#sdSendNotifBtn");
        if (sendNotifBtn) {
            sendNotifBtn.onclick = async () => {
                const title = titleInput.value.trim();
                const message = msgInput.value.trim();
                const priority = prioritySelect.value;

                if (!title || !message) {
                    if (window.Toast) window.Toast.error("Validation Error", "Title and Message are required.");
                    return;
                }

                sendNotifBtn.disabled = true;
                sendNotifBtn.textContent = "Sending...";

                const res = await adminApi.post(`/students/${studentId}/notifications`, { title, message, priority });

                sendNotifBtn.disabled = false;
                sendNotifBtn.textContent = "Send Notif";

                if (res && res.success) {
                    if (window.Toast) window.Toast.success("Success", "Notification sent successfully!");
                    titleInput.value = "";
                    msgInput.value = "";
                } else {
                    if (window.Toast) window.Toast.error("Error", res ? res.message : "Failed to send notification.");
                }
            };
        }

        // Show Modal
        modal.classList.remove("hidden");
        document.body.classList.add("modal-open");
    };

    const closeStudentDetailModal = () => {
        const modal = qs("#studentDetailModal");
        if (modal) {
            modal.classList.add("hidden");
            document.body.classList.remove("modal-open");
        }
    };

    const initStudentDetailFlow = () => {
        const closeBtnHeader = qs("#closeStudentDetailModal");
        const closeBtnFooter = qs("#sdCloseBtn");
        const modal = qs("#studentDetailModal");

        if (closeBtnHeader) closeBtnHeader.addEventListener("click", closeStudentDetailModal);
        if (closeBtnFooter) closeBtnFooter.addEventListener("click", closeStudentDetailModal);

        if (modal) {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) closeStudentDetailModal();
            });
        }
    };

    // --- STATE ---
    let deletingStudentId = null;
    let allApps = [];
    let appFilters = {
        search: '',
        candidate: 'all',
        status: 'all',
        priority: 'all',
        sort: 'newest',
        grouped: false
    };

    const cleanEmail = (email) => {
        if (!email) return '';
        const matches = email.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return matches ? matches[0] : email;
    };

    const buildCandidateDropdown = (apps) => {
        const select = qs("#candidateFilter");
        if (!select) return;

        const uniqueStudents = {};
        apps.forEach(app => {
            const email = cleanEmail(app.user?.email);
            if (email && !uniqueStudents[email]) {
                uniqueStudents[email] = app.user?.name || 'Unknown';
            }
        });

        let html = '<option value="all">All Candidates</option>';
        Object.entries(uniqueStudents).forEach(([email, name]) => {
            html += `<option value="${email}">${name} — ${email}</option>`;
        });
        select.innerHTML = html;
        select.value = appFilters.candidate;
    };

    const updateCandidateSummary = (candidateEmail, apps) => {
        const summary = qs("#candidateSummary");
        if (!summary) return;

        if (candidateEmail === 'all') {
            summary.style.display = 'none';
            return;
        }

        const studentApps = apps.filter(a => cleanEmail(a.user?.email) === candidateEmail);
        const name = studentApps[0]?.user?.name || 'Unknown';
        
        summary.style.display = 'grid';
        qs("#summaryName").textContent = name;
        qs("#summaryEmail").textContent = candidateEmail;
        qs("#summaryAvatar").textContent = name.charAt(0);

        qs("#sumTotal").textContent = studentApps.length;
        qs("#sumSelected").textContent = studentApps.filter(a => a.status === 'Selected').length;
        qs("#sumRejected").textContent = studentApps.filter(a => a.status === 'Rejected').length;
        qs("#sumInterview").textContent = studentApps.filter(a => a.status === 'Interview Scheduled').length;
    };

    const renderApplications = async () => {
        if (allApps.length === 0) {
            allApps = await adminApi.get("/applications") || fallbackApps;
            buildCandidateDropdown(allApps);
        }

        let filtered = [...allApps];

        // Apply Filters
        if (appFilters.search) {
            const s = appFilters.search.toLowerCase();
            filtered = filtered.filter(a => 
                a.companyName.toLowerCase().includes(s) || 
                a.role.toLowerCase().includes(s) || 
                (a.user?.name || '').toLowerCase().includes(s) ||
                (a.user?.email || '').toLowerCase().includes(s)
            );
        }

        if (appFilters.candidate !== 'all') {
            filtered = filtered.filter(a => cleanEmail(a.user?.email) === appFilters.candidate);
        }

        if (appFilters.status !== 'all') {
            filtered = filtered.filter(a => a.status === appFilters.status);
        }

        if (appFilters.priority !== 'all') {
            filtered = filtered.filter(a => a.priority === appFilters.priority);
        }

        // Apply Sort
        filtered.sort((a, b) => {
            if (appFilters.sort === 'newest') return new Date(b.appliedDate) - new Date(a.appliedDate);
            if (appFilters.sort === 'oldest') return new Date(a.appliedDate) - new Date(b.appliedDate);
            if (appFilters.sort === 'name-asc') return (a.user?.name || '').localeCompare(b.user?.name || '');
            if (appFilters.sort === 'company-asc') return a.companyName.localeCompare(b.companyName);
            if (appFilters.sort === 'status') return a.status.localeCompare(b.status);
            if (appFilters.sort === 'priority') return a.priority.localeCompare(b.priority);
            return 0;
        });

        updateCandidateSummary(appFilters.candidate, allApps);

        const grid = qs("#candidateGrid");
        const tableView = qs("#appTableView");
        const tbody = qs("#appsTableBody");

        if (appFilters.grouped) {
            grid.style.display = 'grid';
            tableView.style.display = 'none';
            
            // Group logic
            const groups = {};
            filtered.forEach(a => {
                const email = cleanEmail(a.user?.email);
                if (!groups[email]) groups[email] = { name: a.user?.name, email, apps: [] };
                groups[email].apps.push(a);
            });

            grid.innerHTML = Object.values(groups).map(g => `
                <div class="candidate-card">
                    <div class="candidate-card__header">
                        <div class="candidate-card__avatar">${g.name.charAt(0)}</div>
                        <div>
                            <div class="candidate-card__name">${g.name}</div>
                            <div class="candidate-card__email">${g.email}</div>
                        </div>
                    </div>
                    <div class="candidate-card__stats">
                        <div class="candidate-card__stat"><span>Total</span> <b>${g.apps.length}</b></div>
                        <div class="candidate-card__stat"><span>Selected</span> <b>${g.apps.filter(x => x.status === 'Selected').length}</b></div>
                        <div class="candidate-card__stat"><span>Interviews</span> <b>${g.apps.filter(x => x.status === 'Interview Scheduled').length}</b></div>
                        <div class="candidate-card__stat"><span>Applied</span> <b>${g.apps.filter(x => x.status === 'Applied').length}</b></div>
                    </div>
                    <button class="btn btn--secondary btn--sm btn--block view-candidate-apps" data-email="${g.email}">
                        View Applications
                    </button>
                </div>
            `).join("");

            qsa(".view-candidate-apps").forEach(btn => {
                btn.addEventListener("click", () => {
                    appFilters.candidate = btn.dataset.email;
                    appFilters.grouped = false;
                    qs("#candidateFilter").value = appFilters.candidate;
                    updateToggleText();
                    renderApplications();
                });
            });

        } else {
            grid.style.display = 'none';
            tableView.style.display = 'block';
            if (tbody) {
                tbody.innerHTML = filtered.map(app => `
                    <tr>
                        <td>
                            <div class="student-info">
                                <strong>${app.user?.name || 'Unknown'}</strong>
                                <div style="font-size: 11px; opacity: 0.6;">${cleanEmail(app.user?.email)}</div>
                            </div>
                        </td>
                        <td>${app.companyName}</td>
                        <td>${app.role}</td>
                        <td><span class="status-tag status-${app.status.toLowerCase().replace(/\s/g, '-')}">${app.status}</span></td>
                        <td>${app.priority}</td>
                        <td>${new Date(app.appliedDate).toLocaleDateString()}</td>
                    </tr>
                `).join("");
            }
        }
        if (window.lucide) window.lucide.createIcons();
    };

    const updateToggleText = () => {
        const text = qs("#toggleGroupingText");
        const icon = qs("#toggleGrouping i");
        if (text) text.textContent = appFilters.grouped ? "Show All Applications" : "Group by Candidate";
        // if (icon) icon.setAttribute("data-lucide", appFilters.grouped ? "list" : "layout-grid");
    };

    const initAppFilters = () => {
        const search = qs("#appSearch");
        const candidate = qs("#candidateFilter");
        const status = qs("#statusFilter");
        const priority = qs("#priorityFilter");
        const sort = qs("#sortOrder");
        const clear = qs("#clearFilters");
        const toggle = qs("#toggleGrouping");

        if (search) search.addEventListener("input", (e) => { appFilters.search = e.target.value; renderApplications(); });
        if (candidate) candidate.addEventListener("change", (e) => { appFilters.candidate = e.target.value; renderApplications(); });
        if (status) status.addEventListener("change", (e) => { appFilters.status = e.target.value; renderApplications(); });
        if (priority) priority.addEventListener("change", (e) => { appFilters.priority = e.target.value; renderApplications(); });
        if (sort) sort.addEventListener("change", (e) => { appFilters.sort = e.target.value; renderApplications(); });

        if (clear) clear.addEventListener("click", () => {
            appFilters = { search: '', candidate: 'all', status: 'all', priority: 'all', sort: 'newest', grouped: false };
            if (search) search.value = '';
            if (candidate) candidate.value = 'all';
            if (status) status.value = 'all';
            if (priority) priority.value = 'all';
            if (sort) sort.value = 'newest';
            updateToggleText();
            renderApplications();
        });

        if (toggle) toggle.addEventListener("click", () => {
            appFilters.grouped = !appFilters.grouped;
            updateToggleText();
            renderApplications();
        });
    };

    let editingDriveId = null;
    let loadedDrives = [];

    const getInitials = (name) => {
        if (!name) return "?";
        return name.split(" ")
                   .map(word => word[0])
                   .join("")
                   .toUpperCase()
                   .slice(0, 2);
    };

    const bindDriveActions = () => {
        // Toggle status
        qsa(".toggle-status-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const drive = loadedDrives.find(d => d._id === id);
                if (!drive) return;

                const newStatus = drive.status === "Open" ? "Closed" : "Open";
                
                const res = await adminApi.put(`/drives/${id}`, { ...drive, status: newStatus });
                if (res && res.success) {
                    if (window.Toast) window.Toast.success("Success", `Drive ${newStatus === 'Open' ? 'Started' : 'Closed'} successfully`);
                    renderDrives();
                } else {
                    // Local fallback
                    const localDrives = JSON.parse(localStorage.getItem("demo_drives") || "[]");
                    const index = localDrives.findIndex(d => d._id === id);
                    if (index !== -1) {
                        localDrives[index].status = newStatus;
                        localStorage.setItem("demo_drives", JSON.stringify(localDrives));
                        if (window.Toast) window.Toast.info("Demo Mode", `Drive status updated.`);
                        renderDrives();
                    }
                }
            });
        });

        // Edit
        qsa(".edit-drive-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const drive = loadedDrives.find(d => d._id === id);
                if (!drive) return;

                editingDriveId = id;

                // Update Modal UI
                const modalTitle = qs("#driveModalTitle");
                if (modalTitle) modalTitle.textContent = "Edit Placement Drive";

                // Populate Form
                const form = qs("#driveForm");
                if (form) {
                    form.elements["companyName"].value = drive.companyName || "";
                    form.elements["role"].value = drive.role || "";
                    form.elements["package"].value = drive.package || "";
                    form.elements["location"].value = drive.location || "";
                    form.elements["status"].value = drive.status || "Open";
                    form.elements["mode"].value = drive.mode || "Online";
                    form.elements["eligibility"].value = drive.eligibility || "";
                    form.elements["description"].value = drive.description || "";
                    
                    if (drive.driveDate) {
                        const dateObj = new Date(drive.driveDate);
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                        const day = String(dateObj.getDate()).padStart(2, "0");
                        form.elements["driveDate"].value = `${year}-${month}-${day}`;
                    } else {
                        form.elements["driveDate"].value = "";
                    }
                }

                // Show Modal
                const modal = qs("#driveModal");
                if (modal) modal.style.display = "flex";
            });
        });

        // Delete
        qsa(".delete-drive-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const drive = loadedDrives.find(d => d._id === id);
                if (!drive) return;

                if (confirm(`Are you sure you want to delete the placement drive for ${drive.companyName}?`)) {
                    const res = await adminApi.delete(`/drives/${id}`);
                    if (res && res.success) {
                        if (window.Toast) window.Toast.success("Success", "Drive deleted successfully");
                        renderDrives();
                    } else {
                        // Local fallback
                        const localDrives = JSON.parse(localStorage.getItem("demo_drives") || "[]");
                        const filtered = localDrives.filter(d => d._id !== id);
                        localStorage.setItem("demo_drives", JSON.stringify(filtered));
                        if (window.Toast) window.Toast.success("Success", "Drive deleted successfully");
                        renderDrives();
                    }
                }
            });
        });
    };

    const renderDrives = async () => {
        let drives = await adminApi.get("/drives");
        
        // LocalStorage fallback
        if (!drives) {
            const localDrives = localStorage.getItem("demo_drives");
            if (!localDrives) {
                localStorage.setItem("demo_drives", JSON.stringify(fallbackDrives));
                drives = fallbackDrives;
            } else {
                drives = JSON.parse(localDrives);
            }
        }

        loadedDrives = drives;

        // Render Stats
        const statsContainer = qs("#drivesStats");
        if (statsContainer) {
            const total = loadedDrives.length;
            const open = loadedDrives.filter(d => d.status === 'Open').length;
            const closed = loadedDrives.filter(d => d.status === 'Closed').length;
            const upcoming = loadedDrives.filter(d => d.driveDate && new Date(d.driveDate) > new Date()).length;

            statsContainer.innerHTML = `
                <div class="stat-card glass">
                    <div class="stat-card__icon purple">
                        <i data-lucide="briefcase"></i>
                    </div>
                    <div class="stat-card__meta">
                        <div class="stat-card__label">Total Drives</div>
                        <div class="stat-card__value">${total}</div>
                    </div>
                </div>
                <div class="stat-card glass">
                    <div class="stat-card__icon green">
                        <i data-lucide="circle-dot"></i>
                    </div>
                    <div class="stat-card__meta">
                        <div class="stat-card__label">Open Drives</div>
                        <div class="stat-card__value">${open}</div>
                    </div>
                </div>
                <div class="stat-card glass">
                    <div class="stat-card__icon red">
                        <i data-lucide="x-circle"></i>
                    </div>
                    <div class="stat-card__meta">
                        <div class="stat-card__label">Closed Drives</div>
                        <div class="stat-card__value">${closed}</div>
                    </div>
                </div>
                <div class="stat-card glass">
                    <div class="stat-card__icon blue">
                        <i data-lucide="calendar"></i>
                    </div>
                    <div class="stat-card__meta">
                        <div class="stat-card__label">Upcoming Drives</div>
                        <div class="stat-card__value">${upcoming}</div>
                    </div>
                </div>
            `;
        }

        const container = qs("#drivesContainer");
        if (!container) return;

        if (loadedDrives.length === 0) {
            container.innerHTML = `
                <div class="glass" style="grid-column: 1/-1; padding: 40px; text-align: center; opacity: 0.6; border-radius: var(--radius-xl);">
                    <i data-lucide="briefcase" style="width: 48px; height: 48px; margin-bottom: 16px; color: var(--indigo);"></i>
                    <p style="font-size: 16px; font-weight: 500; margin: 0;">No placement drives found. Click "Create Drive" to add one!</p>
                </div>
            `;
        } else {
            container.innerHTML = loadedDrives.map(drive => {
                const dateStr = drive.driveDate 
                    ? new Date(drive.driveDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not scheduled';

                return `
                    <div class="drive-card glass">
                        <div class="drive-card__header-row">
                            <div class="drive-card__avatar">${getInitials(drive.companyName)}</div>
                            <div class="drive-card__company-meta">
                                <h4 class="drive-card__company-name">${drive.companyName}</h4>
                                <span class="drive-card__role-title">${drive.role}</span>
                            </div>
                            <span class="badge ${drive.status === 'Open' ? 'badge--active' : 'badge--blocked'}">${drive.status}</span>
                        </div>
                        
                        <div class="drive-card__body">
                            <p class="drive-card__desc">
                                ${drive.description || 'No description or requirements specified.'}
                            </p>
                            <div class="drive-card__meta-grid">
                                <div class="drive-card__meta-item">
                                    <i data-lucide="wallet" class="meta-icon-purple"></i>
                                    <span>${drive.package || 'N/A'}</span>
                                </div>
                                <div class="drive-card__meta-item">
                                    <i data-lucide="map-pin" class="meta-icon-blue"></i>
                                    <span>${drive.location || 'Remote'} (${drive.mode || 'Online'})</span>
                                </div>
                                <div class="drive-card__meta-item">
                                    <i data-lucide="calendar" class="meta-icon-cyan"></i>
                                    <span>${dateStr}</span>
                                </div>
                                <div class="drive-card__meta-item">
                                    <i data-lucide="graduation-cap" class="meta-icon-green"></i>
                                    <span title="${drive.eligibility || 'All Students'}">${drive.eligibility || 'All Students'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="drive-card__actions">
                            <button class="btn-action btn-action--toggle toggle-status-btn" data-id="${drive._id}" title="${drive.status === 'Open' ? 'Close Drive' : 'Start Drive'}">
                                <i data-lucide="${drive.status === 'Open' ? 'slash' : 'play'}"></i>
                                <span>${drive.status === 'Open' ? 'Close' : 'Start'}</span>
                            </button>
                            <button class="btn-action btn-action--edit edit-drive-btn" data-id="${drive._id}" title="Edit Drive">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button class="btn-action btn-action--delete delete-drive-btn" data-id="${drive._id}" title="Delete Drive">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join("");
        }

        if (window.lucide) window.lucide.createIcons();
        bindDriveActions();
    };

    const renderAnnouncements = async () => {
        let list = await announcementApi.get();

        if (!list) {
            const local = localStorage.getItem("demo_announcements");
            list = local ? JSON.parse(local) : fallbackAnnouncements;
        }

        const container = qs("#announcementsContainer");
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = `
                <div class="glass" style="grid-column: 1/-1; padding: 40px; text-align: center; opacity: 0.6;">
                    <i data-lucide="megaphone" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                    <p>No announcements yet. Broadcast your first update!</p>
                </div>
            `;
        } else {
            container.innerHTML = list.map(item => `
                <div class="drive-card glass">
                    <div class="drive-card__header">
                        <div class="drive-card__company">${item.title}</div>
                        <span class="badge badge--${item.type || 'info'}">${item.type || 'info'}</span>
                    </div>
                    <div style="font-size: 14px; opacity: 0.8; line-height: 1.6; margin-bottom: 20px; min-height: 60px;">
                        ${item.message}
                    </div>
                    <div class="drive-card__footer">
                        <span style="font-size: 12px; opacity: 0.5;">${new Date(item.createdAt).toLocaleDateString()}</span>
                        <button class="btn btn--ghost btn--sm text-red delete-announcement" data-id="${item._id}">
                            <i data-lucide="trash-2"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            `).join("");
        }

        qsa(".delete-announcement").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (confirm("Are you sure you want to delete this announcement?")) {
                    const id = btn.dataset.id;
                    const res = await announcementApi.delete(id);
                    if (res && res.success) {
                        if (window.Toast) window.Toast.success("Deleted", "Announcement removed successfully");
                        renderAnnouncements();
                    } else {
                        // Local fallback for demo
                        let local = JSON.parse(localStorage.getItem("demo_announcements") || "[]");
                        local = local.filter(x => x._id !== id);
                        localStorage.setItem("demo_announcements", JSON.stringify(local));
                        renderAnnouncements();
                        if (window.Toast) window.Toast.info("Demo Mode", "Removed locally.");
                    }
                }
            });
        });

        if (window.lucide) window.lucide.createIcons();
    };

    const renderRepairs = async () => {
        const tbody = qs("#repairsTableBody");
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; opacity: 0.6;">Loading stuck users...</td></tr>`;

        const res = await adminApi.get("/unverified");
        const stuckUsers = res || [];

        if (stuckUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; opacity: 0.6;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <i data-lucide="shield-check" style="width: 48px; height: 48px; color: var(--color-success);"></i>
                            <p>No stuck users found! All accounts are verified or successfully registered.</p>
                        </div>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons({ root: tbody });
            return;
        }

        tbody.innerHTML = stuckUsers.map(user => `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-cell__avatar">${user.name ? user.name.charAt(0) : '?'}</div>
                        <div class="user-cell__name">${user.name}</div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <span class="badge ${user.createdBeforePatch ? 'badge--blocked' : 'badge--active'}">
                        ${user.createdBeforePatch ? 'Before Patch' : 'After Patch'}
                    </span>
                </td>
                <td>
                    <span class="badge ${user.emailDelivered ? 'badge--active' : 'badge--warning'}">
                        ${user.emailDelivered ? 'Delivered' : 'Sandbox Restricted'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn--ghost btn--sm repair-verify" data-id="${user._id}" style="color: var(--color-success); border-color: rgba(var(--color-success-rgb), 0.2);">
                            Verify Now
                        </button>
                        <button class="btn btn--ghost btn--sm repair-resend" data-id="${user._id}">
                            Resend Email
                        </button>
                        <button class="btn btn--ghost btn--sm repair-delete btn--danger" data-id="${user._id}" style="color: var(--bad); border-color: rgba(var(--color-danger-rgb), 0.2);">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

        if (window.lucide) window.lucide.createIcons({ root: tbody });

        // Bind Verify Action
        qsa(".repair-verify").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const token = localStorage.getItem("token");
                try {
                    const response = await fetch(`${window.APP_API_BASE}/admin/users/${id}/verify`, {
                        method: "PATCH",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        if (window.Toast) window.Toast.success("Success", "User marked as verified!");
                        renderRepairs();
                    } else {
                        throw new Error(data.message);
                    }
                } catch (err) {
                    if (window.Toast) window.Toast.error("Error", err.message || "Failed to verify user");
                }
            });
        });

        // Bind Resend Action
        qsa(".repair-resend").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const token = localStorage.getItem("token");
                const originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.textContent = "Sending...";
                try {
                    const response = await fetch(`${window.APP_API_BASE}/admin/users/${id}/resend`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        if (window.Toast) window.Toast.success("Success", "Verification email resent!");
                    } else {
                        throw new Error(data.message);
                    }
                } catch (err) {
                    if (window.Toast) window.Toast.error("Email Error", err.message || "Failed to resend verification");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            });
        });

        // Bind Delete Action
        qsa(".repair-delete").forEach(btn => {
            btn.addEventListener("click", () => {
                deletingStudentId = btn.dataset.id;
                const delModal = qs("#deleteConfirmModal");
                if (delModal) {
                    delModal.style.display = "flex";
                    if (window.lucide) window.lucide.createIcons({ root: delModal });
                }
            });
        });
    };

    const renderResets = async () => {
        const tbody = qs("#resetsTableBody");
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; opacity: 0.6;">Loading password reset requests...</td></tr>`;

        const res = await adminApi.get("/resets");
        const resets = res || [];

        if (resets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; opacity: 0.6;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <i data-lucide="shield-check" style="width: 48px; height: 48px; color: var(--color-success);"></i>
                            <p>No pending password reset requests found.</p>
                        </div>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons({ root: tbody });
            return;
        }

        tbody.innerHTML = resets.map(req => {
            const userName = req.user ? req.user.name : "Unknown User";
            const userEmail = req.email || (req.user ? req.user.email : "N/A");
            const requestedAt = req.requestTime ? new Date(req.requestTime).toLocaleString() : new Date(req.createdAt).toLocaleString();
            
            let statusBadge = "";
            if (req.status === "pending") {
                statusBadge = '<span class="badge badge--warning">Pending</span>';
            } else if (req.status === "approved") {
                statusBadge = '<span class="badge badge--active">Approved</span>';
            } else if (req.status === "rejected") {
                statusBadge = '<span class="badge badge--blocked">Rejected</span>';
            } else {
                statusBadge = `<span class="badge">${req.status}</span>`;
            }

            let actionButtons = "";
            if (req.status === "pending") {
                actionButtons = `
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn--ghost btn--sm reset-approve" data-id="${req._id}" style="color: var(--color-success); border-color: rgba(var(--color-success-rgb), 0.2);">
                            Approve
                        </button>
                        <button class="btn btn--ghost btn--sm reset-reject btn--danger" data-id="${req._id}" style="color: var(--bad); border-color: rgba(var(--color-danger-rgb), 0.2);">
                            Reject
                        </button>
                    </div>
                `;
            } else {
                actionButtons = `<span style="font-size: 12px; color: var(--muted);">No actions available</span>`;
            }

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-cell__avatar">${userName.charAt(0)}</div>
                            <div class="user-cell__name">${userName}</div>
                        </div>
                    </td>
                    <td>${userEmail}</td>
                    <td>${requestedAt}</td>
                    <td>${statusBadge}</td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        }).join("");

        if (window.lucide) window.lucide.createIcons({ root: tbody });

        // Bind Approve Action
        qsa(".reset-approve").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const token = localStorage.getItem("token");
                try {
                    const response = await fetch(`${window.APP_API_BASE}/admin/resets/${id}/approve`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        if (window.Toast) window.Toast.success("Success", "Password reset approved!");
                        
                        // Show temporary password modal
                        const tempModal = qs("#tempPasswordModal");
                        const tempVal = qs("#tempPasswordValue");
                        if (tempModal && tempVal) {
                            tempVal.value = data.tempPassword;
                            tempModal.style.display = "flex";
                            if (window.lucide) window.lucide.createIcons({ root: tempModal });
                        }

                        renderResets();
                    } else {
                        throw new Error(data.message);
                    }
                } catch (err) {
                    if (window.Toast) window.Toast.error("Error", err.message || "Failed to approve request");
                }
            });
        });

        // Bind Reject Action
        qsa(".reset-reject").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const token = localStorage.getItem("token");
                try {
                    const response = await fetch(`${window.APP_API_BASE}/admin/resets/${id}/reject`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        if (window.Toast) window.Toast.success("Success", "Request rejected successfully!");
                        renderResets();
                    } else {
                        throw new Error(data.message);
                    }
                } catch (err) {
                    if (window.Toast) window.Toast.error("Error", err.message || "Failed to reject request");
                }
            });
        });
    };

    const renderReports = async () => {
        const data = await adminApi.get("/stats") || fallbackStats;
        const container = qs("#reportsStats");
        if (!container) return;

        const successRate = ((data.selectedStudents / (data.totalApplications || 1)) * 100).toFixed(1);

        container.innerHTML = `
            <div class="stat-card glass">
                <div class="stat-card__icon blue"><i data-lucide="users"></i></div>
                <div class="stat-card__meta">
                    <div class="stat-card__label">Total Registered</div>
                    <div class="stat-card__value">${data.totalStudents}</div>
                </div>
            </div>
            <div class="stat-card glass">
                <div class="stat-card__icon purple"><i data-lucide="file-text"></i></div>
                <div class="stat-card__meta">
                    <div class="stat-card__label">Total Applications</div>
                    <div class="stat-card__value">${data.totalApplications}</div>
                </div>
            </div>
            <div class="stat-card glass">
                <div class="stat-card__icon green"><i data-lucide="check-circle"></i></div>
                <div class="stat-card__meta">
                    <div class="stat-card__label">Selections</div>
                    <div class="stat-card__value">${data.selectedStudents}</div>
                </div>
            </div>
            <div class="stat-card glass">
                <div class="stat-card__icon amber"><i data-lucide="trending-up"></i></div>
                <div class="stat-card__meta">
                    <div class="stat-card__label">Success Rate</div>
                    <div class="stat-card__value">${successRate}%</div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    // --- NAVIGATION ---

    const initNavigation = () => {
        const navItems = qsa(".nav__item[data-section]");
        const sections = qsa(".admin-section");

        navItems.forEach(item => {
            item.addEventListener("click", () => {
                const target = item.dataset.section;
                if (!target) return;

                // UI Updates
                navItems.forEach(nav => nav.classList.remove("is-active"));
                item.classList.add("is-active");
                document.body.classList.remove("is-mobile-nav-open");

                sections.forEach(section => {
                    if (section.id === `admin-${target}`) {
                        section.classList.add("active");
                        // Update topbar title
                        const titles = {
                            overview: "Platform Overview",
                            students: "Student Management",
                            applications: "All Applications",
                            drives: "Placement Drives",
                            reports: "Reports & Analytics",
                            announcements: "Announcements",
                            repairs: "Verification Repairs",
                            resets: "Password Reset Requests"
                        };
                        const titleEl = qs("#activeSectionTitle");
                        if (titleEl) titleEl.textContent = titles[target] || "Admin Portal";
                    } else {
                        section.classList.remove("active");
                    }
                });

                // Load Data
                if (target === "overview") renderStats();
                if (target === "students") renderStudents();
                if (target === "applications") renderApplications();
                if (target === "drives") renderDrives();
                if (target === "reports") renderReports();
                if (target === "announcements") renderAnnouncements();
                if (target === "repairs") renderRepairs();
                if (target === "resets") renderResets();
            });
        });

        const studentSearch = qs("#studentSearch");
        if (studentSearch) {
            studentSearch.addEventListener("input", () => {
                renderStudents();
            });
        }
    };

    // --- MODALS ---

    const initModals = () => {
        const addBtn = qs("#addDriveBtn");
        const driveModal = qs("#driveModal");
        const closeBtn = qs("#closeDriveModal");
        const driveForm = qs("#driveForm");

        if (addBtn && driveModal) {
            addBtn.addEventListener("click", () => {
                editingDriveId = null;
                const modalTitle = qs("#driveModalTitle");
                if (modalTitle) modalTitle.textContent = "New Placement Drive";
                if (driveForm) driveForm.reset();
                driveModal.style.display = "flex";
            });
        }

        if (closeBtn && driveModal) {
            closeBtn.addEventListener("click", () => {
                driveModal.style.display = "none";
                editingDriveId = null;
                if (driveForm) driveForm.reset();
            });
        }

        // Close on background click
        if (driveModal) {
            driveModal.addEventListener("click", (e) => {
                if (e.target === driveModal) {
                    driveModal.style.display = "none";
                    editingDriveId = null;
                    if (driveForm) driveForm.reset();
                }
            });
        }

        // --- TEMPORARY PASSWORD MODAL WIRING ---
        const closeTempModal = qs("#closeTempPasswordModal");
        const doneTempBtn = qs("#doneTempPasswordBtn");
        const copyTempBtn = qs("#copyTempPasswordBtn");
        const tempPasswordModal = qs("#tempPasswordModal");
        const tempPasswordValue = qs("#tempPasswordValue");

        if (closeTempModal && tempPasswordModal) {
            closeTempModal.addEventListener("click", () => {
                tempPasswordModal.style.display = "none";
            });
        }
        if (doneTempBtn && tempPasswordModal) {
            doneTempBtn.addEventListener("click", () => {
                tempPasswordModal.style.display = "none";
            });
        }
        if (copyTempBtn && tempPasswordValue) {
            copyTempBtn.addEventListener("click", () => {
                tempPasswordValue.select();
                navigator.clipboard.writeText(tempPasswordValue.value);
                if (window.Toast) window.Toast.success("Copied", "Temporary password copied to clipboard!");
            });
        }
        if (tempPasswordModal) {
            tempPasswordModal.addEventListener("click", (e) => {
                if (e.target === tempPasswordModal) {
                    tempPasswordModal.style.display = "none";
                }
            });
        }

        // --- DELETE CONFIRM MODAL WIRING ---
        const deleteModal = qs("#deleteConfirmModal");
        const cancelDeleteBtn = qs("#cancelDeleteBtn");
        const confirmDeleteBtn = qs("#confirmDeleteBtn");

        if (cancelDeleteBtn && deleteModal) {
            cancelDeleteBtn.addEventListener("click", () => {
                deleteModal.style.display = "none";
                deletingStudentId = null;
            });
        }

        if (deleteModal) {
            deleteModal.addEventListener("click", (e) => {
                if (e.target === deleteModal) {
                    deleteModal.style.display = "none";
                    deletingStudentId = null;
                }
            });
        }

        if (confirmDeleteBtn && deleteModal) {
            confirmDeleteBtn.addEventListener("click", async () => {
                if (!deletingStudentId) return;
                
                const span = confirmDeleteBtn.querySelector("span");
                const originalText = span ? span.textContent : "Delete Account";
                if (span) span.textContent = "Deleting...";
                confirmDeleteBtn.classList.add("is-busy");
                
                const res = await adminApi.delete(`/users/${deletingStudentId}`);
                
                if (span) span.textContent = originalText;
                confirmDeleteBtn.classList.remove("is-busy");
                
                if (res) {
                    if (window.Toast) window.Toast.success("Deleted", "Student and all associated data deleted successfully");
                    deleteModal.style.display = "none";
                    closeStudentDetailModal();
                    renderStudents();
                    
                    const repairsSection = qs("#admin-repairs");
                    if (repairsSection && repairsSection.classList.contains("active")) {
                        renderRepairs();
                    }
                } else {
                    if (window.Toast) window.Toast.error("Error", "Failed to delete student");
                }
                
                deletingStudentId = null;
            });
        }

        if (driveForm) {
            driveForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const formData = new FormData(driveForm);
                const body = Object.fromEntries(formData.entries());
                
                // Format the driveDate properly as ISO string
                if (body.driveDate) {
                    body.driveDate = new Date(body.driveDate).toISOString();
                }

                let res;
                if (editingDriveId) {
                    // Update mode
                    res = await adminApi.put(`/drives/${editingDriveId}`, body);
                    if (res && res.success) {
                        if (window.Toast) window.Toast.success("Success", "Drive updated successfully");
                    } else {
                        // Local fallback
                        const localDrives = JSON.parse(localStorage.getItem("demo_drives") || "[]");
                        const index = localDrives.findIndex(d => d._id === editingDriveId);
                        if (index !== -1) {
                            localDrives[index] = { ...localDrives[index], ...body };
                            localStorage.setItem("demo_drives", JSON.stringify(localDrives));
                            if (window.Toast) window.Toast.info("Demo Mode", "Drive updated in session storage.");
                        }
                    }
                } else {
                    // Create mode
                    res = await adminApi.post("/drives", body);
                    if (res && res.success) {
                        if (window.Toast) window.Toast.success("Success", "Drive created successfully");
                    } else {
                        // Local fallback
                        body.createdAt = new Date().toISOString();
                        body._id = "d" + Date.now().toString();
                        const localDrives = JSON.parse(localStorage.getItem("demo_drives") || "[]");
                        localDrives.unshift(body);
                        localStorage.setItem("demo_drives", JSON.stringify(localDrives));
                        if (window.Toast) window.Toast.info("Demo Mode", "Drive created in session storage.");
                    }
                }

                driveModal.style.display = "none";
                editingDriveId = null;
                driveForm.reset();
                renderDrives();
            });
        }
    };

    // --- LOGOUT ---

    const initLogout = () => {
        const logoutBtn = qs("#logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", (e) => {
                e.preventDefault();
                if (typeof window.logout === "function") {
                    window.logout();
                } else {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    localStorage.removeItem("role");
                    window.location.replace("index.html");
                }
            });
        }
    };

    // --- ANNOUNCEMENT MODAL FIX ---
    function openAnnouncementModal() {
        const modal = document.getElementById("announcementModal");
        console.log("announcementModal element:", modal);
        console.log("announcementModal classes before:", modal?.className);

        if (!modal) {
            console.error("announcementModal not found in admin.html");
            return;
        }

        modal.classList.remove("hidden");
        document.body.classList.add("modal-open");

        // Clear fields
        const titleInput = document.getElementById("announcementTitle");
        const msgInput = document.getElementById("announcementMessage");
        const typeSelect = document.getElementById("announcementType");

        if (titleInput) {
            titleInput.value = "";
            titleInput.focus();
        }
        if (msgInput) msgInput.value = "";
        if (typeSelect) typeSelect.value = "info";
    }

    function closeAnnouncementModal() {
        const modal = document.getElementById("announcementModal");
        if (!modal) return;

        modal.classList.add("hidden");
        document.body.classList.remove("modal-open");
    }

    const initAnnouncementFlow = () => {
        const openBtn = document.getElementById("newAnnouncementBtn");
        const closeBtn = document.getElementById("closeAnnouncementModal");
        const cancelBtn = document.getElementById("cancelAnnouncementBtn");
        const publishBtn = document.getElementById("publishAnnouncementBtn");
        const modal = document.getElementById("announcementModal");

        if (openBtn) {
            openBtn.addEventListener("click", function (e) {
                e.preventDefault();
                console.log("New Announcement clicked");
                openAnnouncementModal();
            });
        }

        if (closeBtn) closeBtn.addEventListener("click", closeAnnouncementModal);
        if (cancelBtn) cancelBtn.addEventListener("click", closeAnnouncementModal);

        if (modal) {
            modal.addEventListener("click", function (e) {
                if (e.target === modal) closeAnnouncementModal();
            });
        }

        if (publishBtn) {
            publishBtn.addEventListener("click", async () => {
                const title = document.getElementById("announcementTitle")?.value.trim();
                const message = document.getElementById("announcementMessage")?.value.trim();
                const type = document.getElementById("announcementType")?.value;

                if (!title || !message) {
                    if (window.Toast) window.Toast.error("Validation Error", "Title and Message are required.");
                    else alert("Please fill title and message.");
                    return;
                }

                const payload = { title, message, type };
                console.log("Publishing announcement", payload);

                publishBtn.disabled = true;
                publishBtn.textContent = "Publishing...";

                const res = await announcementApi.post(payload);

                publishBtn.disabled = false;
                publishBtn.textContent = "Publish Announcement";

                if (res && res.success) {
                    if (window.Toast) window.Toast.success("Success", "Announcement broadcasted!");
                    closeAnnouncementModal();
                    renderAnnouncements();
                } else {
                    console.error("Publish failed", res);
                    if (window.Toast) window.Toast.error("Error", res ? res.message : "Failed to publish.");
                }
            });
        }
    };

    const initClickableCards = () => {
        qsa(".clickable-card").forEach(card => {
            card.addEventListener("click", () => {
                const target = card.dataset.targetSection;
                if (!target) return;
                const navItem = qs(`.nav__item[data-section="${target}"]`);
                if (navItem) navItem.click();
            });
        });
    };

    // --- INIT ---
    initNavigation();
    initModals();
    initLogout();
    initAppFilters();
    initAnnouncementFlow(); // NEW
    initStudentDetailFlow(); // NEW
    initClickableCards(); // NEW
    renderStats(); // Load default view
    if (window.lucide) window.lucide.createIcons();
});
