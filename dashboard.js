
const dashboardClient = supabaseClient;

const staffWelcome = document.getElementById("staffWelcome");
const staffRole = document.getElementById("staffRole");

const announcementForm = document.getElementById("announcementForm");
const announcementList = document.getElementById("announcementList");
const announcementMessage = document.getElementById("announcementMessage");
const manageAnnouncementMessage = document.getElementById("manageAnnouncementMessage");

const eventForm = document.getElementById("eventForm");
const eventList = document.getElementById("eventList");
const eventMessage = document.getElementById("eventMessage");
const manageEventMessage = document.getElementById("manageEventMessage");

const resourceForm = document.getElementById("resourceForm");
const resourceUploadMessage = document.getElementById("resourceUploadMessage");
const resourceManagementList = document.getElementById("resourceManagementList");
const resourceManagementMessage = document.getElementById("resourceManagementMessage");

let currentUser = null;
let currentStaff = null;

// GENERAL HELPERS

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function showMessage(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#b52d36" : "#237a43";
}

function canManageRecord(createdBy) {
    if (!currentStaff || !currentUser) return false;

    if (
        currentStaff.role === "principal" ||
        currentStaff.role === "department_head"
    ) {
        return true;
    }

    return createdBy === currentUser.id;
}

// INITIALISE DASHBOARD

async function initialiseDashboard() {
    const { data: sessionData, error: sessionError } =
        await dashboardClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        window.location.href = "admin.html";
        return;
    }

    currentUser = sessionData.session.user;

    const { data: staff, error: staffError } = await dashboardClient
        .from("staff_members")
        .select("user_id, full_name, role, active")
        .eq("user_id", currentUser.id)
        .eq("active", true)
        .maybeSingle();

    if (staffError || !staff) {
        await dashboardClient.auth.signOut();
        alert("Your account does not have an active staff profile.");
        window.location.href = "admin.html";
        return;
    }

    currentStaff = staff;

    staffWelcome.textContent = `Welcome, ${staff.full_name}`;
    staffRole.textContent = `Role: ${staff.role.replaceAll("_", " ")}`;

    await Promise.all([
        loadAnnouncements(),
        loadEvents(),
        loadLearningResources()
    ]);
}

// ANNOUNCEMENTS

async function loadAnnouncements() {
    announcementList.textContent = "Loading announcements...";

    const { data, error } = await dashboardClient
        .from("announcements")
        .select("id, title, content, created_at, created_by")
        .order("created_at", { ascending: false });

    if (error) {
        announcementList.textContent = "Could not load announcements.";
        console.error(error);
        return;
    }

    if (!data.length) {
        announcementList.textContent = "No announcements found.";
        return;
    }

    announcementList.innerHTML = data.map(item => `
        <article class="manage-item">
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.content)}</p>
            <small>${new Date(item.created_at).toLocaleString()}</small>
            <br>
            ${
                canManageRecord(item.created_by)
                ? `
                    <button
                        class="delete-button"
                        data-delete-announcement="${escapeHTML(item.id)}"
                    >
                        Delete Announcement
                    </button>
                `
                : ""
            }
        </article>
    `).join("");
}

announcementList.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-announcement]");
    if (!button) return;

    const id = button.dataset.deleteAnnouncement;

    if (!confirm("Are you sure you want to delete this announcement?")) {
        return;
    }

    button.disabled = true;

    const { data, error } = await dashboardClient
        .from("announcements")
        .delete()
        .eq("id", id)
        .select("id");

    if (error) {
        showMessage(manageAnnouncementMessage, error.message, true);
        button.disabled = false;
        return;
    }

    if (!data || data.length === 0) {
        showMessage(
            manageAnnouncementMessage,
            "No announcement was deleted. Check your staff permissions.",
            true
        );
        button.disabled = false;
        return;
    }

    showMessage(manageAnnouncementMessage, "Announcement deleted.");
    await loadAnnouncements();
});

announcementForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = document.getElementById("announcementTitle").value.trim();
    const content = document.getElementById("announcementContent").value.trim();

    showMessage(announcementMessage, "Publishing...");

    const { error } = await dashboardClient
        .from("announcements")
        .insert({
            title,
            content,
            published: true,
            created_by: currentUser.id
        });

    if (error) {
        showMessage(announcementMessage, error.message, true);
        return;
    }

    announcementForm.reset();

    showMessage(
        announcementMessage,
        "Announcement published successfully."
    );

    await loadAnnouncements();
});

// SCHOOL EVENTS

async function loadEvents() {
    eventList.textContent = "Loading events...";

    const { data, error } = await dashboardClient
        .from("school_events")
        .select(
            "id, title, description, event_date, end_date, event_time, venue, created_at, created_by"
        )
        .order("event_date", { ascending: true });

    if (error) {
        eventList.textContent = "Could not load events.";
        console.error(error);
        return;
    }

    if (!data.length) {
        eventList.textContent = "No school events found.";
        return;
    }

    eventList.innerHTML = data.map(item => `
        <article class="manage-item">
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.description || "")}</p>
            <p><strong>Date:</strong> ${escapeHTML(item.event_date)}</p>

            ${
                item.end_date
                ? `<p><strong>End date:</strong> ${escapeHTML(item.end_date)}</p>`
                : ""
            }

            ${
                item.event_time
                ? `<p><strong>Time:</strong> ${escapeHTML(item.event_time)}</p>`
                : ""
            }

            ${
                item.venue
                ? `<p><strong>Venue:</strong> ${escapeHTML(item.venue)}</p>`
                : ""
            }

            ${
                canManageRecord(item.created_by)
                ? `
                    <button
                        class="delete-button"
                        data-delete-event="${escapeHTML(item.id)}"
                    >
                        Delete Event
                    </button>
                `
                : ""
            }
        </article>
    `).join("");
}

eventList.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-event]");
    if (!button) return;

    const id = button.dataset.deleteEvent;

    if (!confirm("Are you sure you want to delete this event?")) {
        return;
    }

    button.disabled = true;

    const { data, error } = await dashboardClient
        .from("school_events")
        .delete()
        .eq("id", id)
        .select("id");

    if (error) {
        showMessage(manageEventMessage, error.message, true);
        button.disabled = false;
        return;
    }

    if (!data || data.length === 0) {
        showMessage(
            manageEventMessage,
            "No event was deleted. Check your staff permissions.",
            true
        );
        button.disabled = false;
        return;
    }

    showMessage(manageEventMessage, "Event deleted.");
    await loadEvents();
});

eventForm.addEventListener("submit", async event => {
    event.preventDefault();

    const eventDate = document.getElementById("eventDate").value;
    const endDate = document.getElementById("eventEndDate").value;

    if (endDate && endDate < eventDate) {
        showMessage(
            eventMessage,
            "The end date cannot be before the start date.",
            true
        );
        return;
    }

    showMessage(eventMessage, "Publishing event...");

    const { error } = await dashboardClient
        .from("school_events")
        .insert({
            title: document.getElementById("eventTitle").value.trim(),
            description: document.getElementById("eventDescription").value.trim(),
            event_date: eventDate,
            end_date: endDate || null,
            event_time: document.getElementById("eventTime").value || null,
            venue: document.getElementById("eventVenue").value.trim() || null,
            published: true,
            created_by: currentUser.id
        });

    if (error) {
        showMessage(eventMessage, error.message, true);
        return;
    }

    eventForm.reset();

    showMessage(eventMessage, "Event published successfully.");

    await loadEvents();
});

// LEARNING LIBRARY MANAGEMENT

async function loadLearningResources() {
    if (!resourceManagementList) return;

    resourceManagementList.textContent = "Loading learning resources...";

    const { data, error } = await dashboardClient
        .from("learning_resources")
        .select(
            "id, title, description, grade, subject, category, file_url, published, created_by, created_at"
        )
        .order("created_at", { ascending: false });

    if (error) {
        resourceManagementList.textContent =
            "Could not load learning resources.";

        showMessage(
            resourceManagementMessage,
            error.message,
            true
        );

        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        resourceManagementList.textContent =
            "No learning resources have been uploaded yet.";
        return;
    }

    const categoryNames = {
        past_paper: "Past Paper",
        study_notes: "Study Notes",
        worksheet: "Worksheet",
        study_guide: "Study Guide"
    };

    resourceManagementList.innerHTML = data.map(item => {
        const categoryName =
            categoryNames[item.category] || item.category;

        const safeUrl = (() => {
            try {
                const url = new URL(item.file_url);
                return url.protocol === "https:" ? url.href : "";
            } catch {
                return "";
            }
        })();

        return `
            <article class="resource-management-item">
                <h3>${escapeHTML(item.title)}</h3>

                <p>${escapeHTML(item.description || "")}</p>

                <p>
                    <strong>Grade:</strong>
                    ${escapeHTML(item.grade)}
                </p>

                <p>
                    <strong>Subject:</strong>
                    ${escapeHTML(item.subject)}
                </p>

                <p>
                    <strong>Type:</strong>
                    ${escapeHTML(categoryName)}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${item.published ? "Published" : "Unpublished"}
                </p>

                <p class="dashboard-muted">
                    Uploaded:
                    ${new Date(item.created_at).toLocaleString()}
                </p>

                <div class="resource-management-actions">
                    ${
                        safeUrl
                        ? `
                            <a
                                class="resource-view-link"
                                href="${escapeHTML(safeUrl)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View PDF
                            </a>
                        `
                        : ""
                    }

                    ${
                        canManageRecord(item.created_by)
                        ? `
                            <button
                                type="button"
                                class="delete-button"
                                data-delete-resource="${escapeHTML(item.id)}"
                            >
                                Delete Resource
                            </button>
                        `
                        : ""
                    }
                </div>
            </article>
        `;
    }).join("");
}

if (resourceManagementList) {
    resourceManagementList.addEventListener("click", async event => {
        const button = event.target.closest("[data-delete-resource]");

        if (!button) return;

        const id = button.dataset.deleteResource;

        const confirmed = confirm(
            "Delete this learning resource from the library?\n\n" +
            "The resource will disappear from the public library. " +
            "Its PDF file will remain in Supabase Storage."
        );

        if (!confirmed) return;

        button.disabled = true;

        showMessage(
            resourceManagementMessage,
            "Deleting learning resource..."
        );

        const { data, error } = await dashboardClient
            .from("learning_resources")
            .delete()
            .eq("id", id)
            .select("id");

        if (error) {
            showMessage(
                resourceManagementMessage,
                error.message,
                true
            );

            button.disabled = false;
            return;
        }

        if (!data || data.length === 0) {
            showMessage(
                resourceManagementMessage,
                "Resource was not deleted. Check your staff permissions.",
                true
            );

            button.disabled = false;
            return;
        }

        showMessage(
            resourceManagementMessage,
            "Learning resource deleted successfully."
        );

        await loadLearningResources();
    });
}

// LEARNING LIBRARY UPLOAD

resourceForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = document.getElementById("resourceTitle").value.trim();
    const description = document.getElementById("resourceDescription").value.trim();
    const grade = Number(document.getElementById("resourceGrade").value);
    const subject = document.getElementById("resourceSubject").value;
    const category = document.getElementById("resourceCategory").value;
    const file = document.getElementById("resourceFile").files[0];

    if (!file) {
        showMessage(
            resourceUploadMessage,
            "Please select a PDF file.",
            true
        );
        return;
    }

    if (
        file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
        showMessage(
            resourceUploadMessage,
            "Only PDF files are allowed.",
            true
        );
        return;
    }

    const maximumSize = 20 * 1024 * 1024;

    if (file.size > maximumSize) {
        showMessage(
            resourceUploadMessage,
            "The PDF must be smaller than 20 MB.",
            true
        );
        return;
    }

    const safeFileName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
    );

    const filePath =
        `${currentUser.id}/${crypto.randomUUID()}-${safeFileName}`;

    const uploadButton = resourceForm.querySelector(
        'button[type="submit"]'
    );

    uploadButton.disabled = true;

    showMessage(resourceUploadMessage, "Uploading PDF...");

    try {
        const { error: uploadError } = await dashboardClient
            .storage
            .from("learning-resources")
            .upload(filePath, file, {
                contentType: "application/pdf",
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = dashboardClient
            .storage
            .from("learning-resources")
            .getPublicUrl(filePath);

        const fileUrl = urlData.publicUrl;

        const { error: insertError } = await dashboardClient
            .from("learning_resources")
            .insert({
                title,
                description,
                grade,
                subject,
                category,
                file_url: fileUrl,
                published: true,
                created_by: currentUser.id
            });

        if (insertError) {
            await dashboardClient
                .storage
                .from("learning-resources")
                .remove([filePath]);

            throw insertError;
        }

        resourceForm.reset();

        showMessage(
            resourceUploadMessage,
            "Resource uploaded and published successfully."
        );

        await loadLearningResources();

    } catch (error) {
        console.error(error);

        showMessage(
            resourceUploadMessage,
            error.message || "Upload failed.",
            true
        );

    } finally {
        uploadButton.disabled = false;
    }
});

// SIGN OUT

document.getElementById("logoutButton").addEventListener(
    "click",
    async () => {
        await dashboardClient.auth.signOut();
        window.location.href = "admin.html";
    }
);

// START DASHBOARD


// ACADEMIC CALENDAR MANAGEMENT

const calendarForm = document.getElementById("calendarForm");
const calendarList = document.getElementById("calendarList");
const calendarMessage = document.getElementById("calendarMessage");
const manageCalendarMessage = document.getElementById("manageCalendarMessage");

async function loadCalendarEntries() {
    if (!calendarList || !currentStaff) return;

    calendarList.textContent = "Loading calendar entries...";

    const { data, error } = await dashboardClient
        .from("academic_calendar")
        .select("id, title, description, category, start_date, end_date, created_by")
        .order("start_date", { ascending: true });

    if (error) {
        calendarList.textContent = "Could not load calendar entries.";
        showMessage(manageCalendarMessage, error.message, true);
        return;
    }

    if (!data || data.length === 0) {
        calendarList.textContent = "No calendar entries found.";
        return;
    }

    calendarList.innerHTML = data.map(item => `
        <article class="manage-item">
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.description || "")}</p>
            <p><strong>Category:</strong> ${escapeHTML(item.category)}</p>
            <p><strong>Start:</strong> ${escapeHTML(item.start_date)}</p>
            ${item.end_date
                ? `<p><strong>End:</strong> ${escapeHTML(item.end_date)}</p>`
                : ""}

            ${canManageRecord(item.created_by)
                ? `<button type="button"
                    class="delete-button"
                    data-delete-calendar="${escapeHTML(item.id)}">
                    Delete Entry
                   </button>`
                : ""}
        </article>
    `).join("");
}

if (calendarForm) {
    calendarForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!currentUser || !currentStaff) return;

        const startDate =
            document.getElementById("calendarStartDate").value;
        const endDate =
            document.getElementById("calendarEndDate").value;

        if (endDate && endDate < startDate) {
            showMessage(
                calendarMessage,
                "End date cannot be before start date.",
                true
            );
            return;
        }

        const submitButton = calendarForm.querySelector(
            'button[type="submit"]'
        );
        submitButton.disabled = true;

        showMessage(calendarMessage, "Publishing calendar entry...");

        const { error } = await dashboardClient
            .from("academic_calendar")
            .insert({
                title: document.getElementById("calendarTitle").value.trim(),
                description: document.getElementById("calendarDescription").value.trim(),
                category: document.getElementById("calendarCategory").value,
                start_date: startDate,
                end_date: endDate || null,
                published: true,
                created_by: currentUser.id
            });

        submitButton.disabled = false;

        if (error) {
            showMessage(calendarMessage, error.message, true);
            return;
        }

        calendarForm.reset();
        showMessage(
            calendarMessage,
            "Calendar entry published successfully."
        );

        await loadCalendarEntries();
    });
}

if (calendarList) {
    calendarList.addEventListener("click", async event => {
        const button = event.target.closest("[data-delete-calendar]");
        if (!button) return;

        if (!confirm("Delete this academic calendar entry?")) return;

        button.disabled = true;

        const { data, error } = await dashboardClient
            .from("academic_calendar")
            .delete()
            .eq("id", button.dataset.deleteCalendar)
            .select("id");

        if (error || !data || data.length === 0) {
            showMessage(
                manageCalendarMessage,
                error?.message || "Deletion not permitted.",
                true
            );
            button.disabled = false;
            return;
        }

        showMessage(
            manageCalendarMessage,
            "Calendar entry deleted successfully."
        );

        await loadCalendarEntries();
    });
}

// Load the calendar after staff authentication completes.
const originalInitialiseDashboard = initialiseDashboard;

initialiseDashboard = async function () {
    await originalInitialiseDashboard();
    if (currentStaff) {
        await loadCalendarEntries();
    }
};
initialiseDashboard();
