document.addEventListener("DOMContentLoaded", async () => {

  const loading = document.getElementById("loading");
  const dashboard = document.getElementById("dashboardContent");
  const pageError = document.getElementById("pageError");
  const errorMessage = document.getElementById("errorMessage");

  const $ = id => document.getElementById(id);

  function showError(message) {
    loading.hidden = true;
    dashboard.hidden = true;
    pageError.hidden = false;
    errorMessage.textContent = message;
  }

  function showStatus(element, message, type = "") {
    element.textContent = message;
    element.className = "status " + type;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text || "";
    return element;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    return date.toLocaleString("en-ZA");
  }

  try {

    // CHECK SUPABASE CONFIGURATION

    if (typeof supabaseClient === "undefined") {
      throw new Error(
        "Supabase is not configured. Check supabase-config.js."
      );
    }

    // CHECK LOGIN SESSION

    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      window.location.replace("admin.html");
      return;
    }

    const user = sessionData.session.user;

    // VERIFY ACTIVE STAFF ACCOUNT

    const { data: staff, error: staffError } =
      await supabaseClient
        .from("staff_members")
        .select("full_name, role, active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

    if (staffError) throw staffError;

    if (!staff) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "This account is not registered as an active staff member."
      );
    }

    // DISPLAY STAFF INFORMATION

    $("staffName").textContent = staff.full_name;
    $("staffRole").textContent =
      staff.role.replaceAll("_", " ");

    loading.hidden = true;
    dashboard.hidden = false;

    // SIGN OUT

    $("logoutButton").addEventListener("click", async () => {

      const button = $("logoutButton");
      button.disabled = true;

      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        button.disabled = false;

        showStatus(
          $("accountMessage"),
          "Could not sign out: " + error.message,
          "error"
        );

        return;
      }

      window.location.replace("admin.html");
    });

    // LOAD ANNOUNCEMENTS

    async function loadAnnouncements() {

      const list = $("announcementList");

      list.textContent = "Loading announcements...";

      const { data, error } = await supabaseClient
        .from("announcements")
        .select("id, title, content, created_at, created_by")
        .order("created_at", { ascending: false });

      if (error) throw error;

      list.replaceChildren();

      if (!data || data.length === 0) {
        list.appendChild(
          createElement(
            "p",
            "status",
            "No announcements have been published yet."
          )
        );
        return;
      }

      data.forEach(item => {

        const card = createElement("article", "content-item", "");

        const title = createElement("h3", "", item.title);

        const content = createElement(
          "p",
          "",
          item.content
        );

        const date = createElement(
          "small",
          "content-date",
          "Published: " + formatDate(item.created_at)
        );

        const deleteButton = createElement(
          "button",
          "delete-button",
          "Delete Announcement"
        );

        deleteButton.addEventListener("click", async () => {

          const confirmed = window.confirm(
            'Are you sure you want to delete "' +
            item.title +
            '"? This action cannot be undone.'
          );

          if (!confirmed) return;

          deleteButton.disabled = true;

          showStatus(
            $("manageAnnouncementMessage"),
            "Deleting announcement..."
          );

          try {

            const { data: deletedRows, error: deleteError } =
              await supabaseClient
                .from("announcements")
                .delete()
                .eq("id", item.id)
                .select("id");

            if (deleteError) throw deleteError;

            if (!deletedRows || deletedRows.length === 0) {
              throw new Error(
                "Deletion was not permitted or the announcement no longer exists."
              );
            }

            showStatus(
              $("manageAnnouncementMessage"),
              "Announcement deleted successfully.",
              "success"
            );

            await loadAnnouncements();

          } catch (error) {

            console.error("Announcement deletion error:", error);

            showStatus(
              $("manageAnnouncementMessage"),
              "Could not delete announcement: " + error.message,
              "error"
            );

            deleteButton.disabled = false;
          }
        });

        card.append(
          title,
          content,
          date,
          document.createElement("br"),
          deleteButton
        );

        list.appendChild(card);
      });
    }

    // CREATE ANNOUNCEMENT

    $("announcementForm").addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const button = event.submitter;
        const message = $("announcementMessage");

        button.disabled = true;

        showStatus(message, "Publishing announcement...");

        try {

          const title =
            $("announcementTitle").value.trim();

          const content =
            $("announcementContent").value.trim();

          const { error } = await supabaseClient
            .from("announcements")
            .insert({
              title,
              content,
              published: true,
              created_by: user.id
            });

          if (error) throw error;

          showStatus(
            message,
            "Announcement published successfully.",
            "success"
          );

          event.target.reset();

          await loadAnnouncements();

        } catch (error) {

          showStatus(
            message,
            "Could not publish announcement: " + error.message,
            "error"
          );

        } finally {
          button.disabled = false;
        }
      }
    );

    // LOAD SCHOOL EVENTS

    async function loadEvents() {

      const list = $("eventList");

      list.textContent = "Loading school events...";

      const { data, error } = await supabaseClient
        .from("school_events")
        .select(
          "id, title, description, event_date, end_date, event_time, venue, created_at"
        )
        .order("event_date", { ascending: true });

      if (error) throw error;

      list.replaceChildren();

      if (!data || data.length === 0) {
        list.appendChild(
          createElement(
            "p",
            "status",
            "No school events have been published yet."
          )
        );
        return;
      }

      data.forEach(item => {

        const card = createElement("article", "content-item", "");

        const title = createElement("h3", "", item.title);

        const description = createElement(
          "p",
          "",
          item.description
        );

        const dates = item.end_date
          ? item.event_date + " to " + item.end_date
          : item.event_date;

        const date = createElement(
          "p",
          "content-date",
          "Date: " + dates
        );

        const details = createElement(
          "p",
          "",
          [
            item.event_time ? "Time: " + item.event_time : "",
            item.venue ? "Venue: " + item.venue : ""
          ].filter(Boolean).join(" | ")
        );

        const deleteButton = createElement(
          "button",
          "delete-button",
          "Delete School Event"
        );

        deleteButton.addEventListener("click", async () => {

          const confirmed = window.confirm(
            'Are you sure you want to delete "' +
            item.title +
            '"? This action cannot be undone.'
          );

          if (!confirmed) return;

          deleteButton.disabled = true;

          showStatus(
            $("manageEventMessage"),
            "Deleting school event..."
          );

          try {

            const { data: deletedRows, error: deleteError } =
              await supabaseClient
                .from("school_events")
                .delete()
                .eq("id", item.id)
                .select("id");

            if (deleteError) throw deleteError;

            if (!deletedRows || deletedRows.length === 0) {
              throw new Error(
                "Deletion was not permitted or the event no longer exists."
              );
            }

            showStatus(
              $("manageEventMessage"),
              "School event deleted successfully.",
              "success"
            );

            await loadEvents();

          } catch (error) {

            console.error("Event deletion error:", error);

            showStatus(
              $("manageEventMessage"),
              "Could not delete event: " + error.message,
              "error"
            );

            deleteButton.disabled = false;
          }
        });

        card.append(
          title,
          description,
          date
        );

        if (item.event_time || item.venue) {
          card.appendChild(details);
        }

        card.appendChild(deleteButton);

        list.appendChild(card);
      });
    }

    // CREATE SCHOOL EVENT

    $("eventForm").addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const button = event.submitter;
        const message = $("eventMessage");

        button.disabled = true;

        showStatus(message, "Publishing school event...");

        try {

          const title =
            $("eventTitle").value.trim();

          const description =
            $("eventDescription").value.trim();

          const eventDate =
            $("eventDate").value;

          const endDate =
            $("eventEndDate").value;

          const eventTime =
            $("eventTime").value;

          const venue =
            $("eventVenue").value.trim();

          if (endDate && endDate < eventDate) {
            throw new Error(
              "The end date cannot be before the event date."
            );
          }

          const { error } = await supabaseClient
            .from("school_events")
            .insert({
              title,
              description,
              event_date: eventDate,
              end_date: endDate || null,
              event_time: eventTime || null,
              venue: venue || null,
              published: true,
              created_by: user.id
            });

          if (error) throw error;

          showStatus(
            message,
            "School event published successfully.",
            "success"
          );

          event.target.reset();

          await loadEvents();

        } catch (error) {

          showStatus(
            message,
            "Could not publish event: " + error.message,
            "error"
          );

        } finally {
          button.disabled = false;
        }
      }
    );

    // INITIAL CONTENT LOAD

    await Promise.all([
      loadAnnouncements(),
      loadEvents()
    ]);

  } catch (error) {

    console.error("Dashboard error:", error);

    showError(
      error.message || "An unexpected error occurred."
    );
  }

});