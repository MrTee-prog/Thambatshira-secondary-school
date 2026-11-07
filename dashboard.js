document.addEventListener("DOMContentLoaded", async () => {

  const loading = document.getElementById("loading");
  const dashboard = document.getElementById("dashboardContent");
  const pageError = document.getElementById("pageError");
  const errorMessage = document.getElementById("errorMessage");

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

  try {

    if (typeof supabaseClient === "undefined") {
      throw new Error(
        "Supabase is not configured. Check supabase-config.js."
      );
    }

    // Check login session
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionData.session) {
      window.location.replace("admin.html");
      return;
    }

    const user = sessionData.session.user;

    // Verify staff account
    const { data: staff, error: staffError } =
      await supabaseClient
        .from("staff_members")
        .select("full_name, role, active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

    if (staffError) {
      throw staffError;
    }

    if (!staff) {
      await supabaseClient.auth.signOut();
      throw new Error(
        "This account is not registered as an active staff member."
      );
    }

    // Display staff details
    document.getElementById("staffName").textContent =
      staff.full_name;

    document.getElementById("staffRole").textContent =
      staff.role.replaceAll("_", " ");

    loading.hidden = true;
    dashboard.hidden = false;

    // Sign out
    document.getElementById("logoutButton")
      .addEventListener("click", async () => {

        const button = document.getElementById("logoutButton");
        button.disabled = true;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
          button.disabled = false;

          showStatus(
            document.getElementById("accountMessage"),
            "Could not sign out: " + error.message,
            "error"
          );

          return;
        }

        window.location.replace("admin.html");
      });

    // Create announcement
    document.getElementById("announcementForm")
      .addEventListener("submit", async (event) => {

        event.preventDefault();

        const button = event.submitter;
        const message = document.getElementById("announcementMessage");

        button.disabled = true;
        showStatus(message, "Publishing announcement...");

        try {

          const title =
            document.getElementById("announcementTitle").value.trim();

          const content =
            document.getElementById("announcementContent").value.trim();

          const { error } = await supabaseClient
            .from("announcements")
            .insert({
              title: title,
              content: content,
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

        } catch (error) {

          showStatus(
            message,
            "Could not publish announcement: " + error.message,
            "error"
          );

        } finally {
          button.disabled = false;
        }

      });

    // Create school event
    document.getElementById("eventForm")
      .addEventListener("submit", async (event) => {

        event.preventDefault();

        const button = event.submitter;
        const message = document.getElementById("eventMessage");

        button.disabled = true;
        showStatus(message, "Publishing school event...");

        try {

          const title =
            document.getElementById("eventTitle").value.trim();

          const description =
            document.getElementById("eventDescription").value.trim();

          const eventDate =
            document.getElementById("eventDate").value;

          const endDate =
            document.getElementById("eventEndDate").value;

          const eventTime =
            document.getElementById("eventTime").value;

          const venue =
            document.getElementById("eventVenue").value.trim();

          if (endDate && endDate < eventDate) {
            throw new Error(
              "The end date cannot be before the event date."
            );
          }

          const { error } = await supabaseClient
            .from("school_events")
            .insert({
              title: title,
              description: description,
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

        } catch (error) {

          showStatus(
            message,
            "Could not publish event: " + error.message,
            "error"
          );

        } finally {
          button.disabled = false;
        }

      });

  } catch (error) {

    console.error("Dashboard error:", error);

    showError(error.message || "An unexpected error occurred.");

  }

});