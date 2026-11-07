document.addEventListener("DOMContentLoaded", async () => {
  const announcementsContainer =
    document.getElementById("publicAnnouncements");

  const eventsContainer =
    document.getElementById("publicEvents");

  const calendarContainer =
    document.getElementById("publicAcademicCalendar");

  function showMessage(container, message, type = "empty") {
    if (!container) return;

    const paragraph = document.createElement("p");
    paragraph.className = "live-" + type;
    paragraph.textContent = message;
    container.replaceChildren(paragraph);
  }

  function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text || "";
    return element;
  }

  function formatDate(dateString) {
    if (!dateString) return "";

    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    return date.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  async function loadAnnouncements() {
    try {
      const { data, error } = await supabaseClient
        .from("announcements")
        .select("title, content, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        showMessage(
          announcementsContainer,
          "There are currently no published announcements."
        );
        return;
      }

      announcementsContainer.replaceChildren();

      data.forEach(item => {
        const card = document.createElement("article");
        card.className = "live-card";

        card.append(
          createTextElement("h4", "", item.title),
          createTextElement("p", "", item.content),
          createTextElement(
            "span",
            "live-date",
            formatDate(item.created_at
              ? item.created_at.substring(0, 10)
              : "")
          )
        );

        announcementsContainer.appendChild(card);
      });
    } catch (error) {
      console.error("Announcements loading error:", error);
      showMessage(
        announcementsContainer,
        "Announcements could not be loaded. Please try again later.",
        "error"
      );
    }
  }

  async function loadEvents() {
    try {
      const today = new Date();
      const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
      ].join("-");

      const { data, error } = await supabaseClient
        .from("school_events")
        .select(
          "title, description, event_date, end_date, event_time, venue"
        )
        .eq("published", true)
        .gte("event_date", localToday)
        .order("event_date", { ascending: true })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        showMessage(
          eventsContainer,
          "There are currently no upcoming school events."
        );
        return;
      }

      eventsContainer.replaceChildren();

      data.forEach(item => {
        const card = document.createElement("article");
        card.className = "live-card";

        card.append(
          createTextElement("h4", "", item.title),
          createTextElement(
            "span",
            "live-date",
            item.end_date
              ? formatDate(item.event_date) +
                " – " + formatDate(item.end_date)
              : formatDate(item.event_date)
          )
        );

        if (item.event_time) {
          card.appendChild(
            createTextElement("p", "", "Time: " + item.event_time)
          );
        }

        if (item.venue) {
          card.appendChild(
            createTextElement("p", "", "Venue: " + item.venue)
          );
        }

        if (item.description) {
          card.appendChild(
            createTextElement("p", "", item.description)
          );
        }

        eventsContainer.appendChild(card);
      });
    } catch (error) {
      console.error("Events loading error:", error);
      showMessage(
        eventsContainer,
        "School events could not be loaded. Please try again later.",
        "error"
      );
    }
  }

  async function loadAcademicCalendar() {
    try {
      const today = new Date();
      const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
      ].join("-");

      const { data, error } = await supabaseClient
        .from("academic_calendar")
        .select("title, description, category, start_date, end_date")
        .eq("published", true)
        .or(`end_date.gte.${localToday},and(end_date.is.null,start_date.gte.${localToday})`)
        .order("start_date", { ascending: true })
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) {
        showMessage(
          calendarContainer,
          "There are currently no upcoming academic dates."
        );
        return;
      }

      calendarContainer.replaceChildren();

      data.forEach(item => {
        const card = document.createElement("article");
        card.className = "live-card";

        card.append(
          createTextElement("h4", "", item.title),
          createTextElement(
            "span",
            "live-date",
            item.end_date
              ? formatDate(item.start_date) +
                " – " + formatDate(item.end_date)
              : formatDate(item.start_date)
          )
        );

        if (item.category) {
          card.appendChild(
            createTextElement(
              "p",
              "",
              "Category: " + item.category
            )
          );
        }

        if (item.description) {
          card.appendChild(
            createTextElement("p", "", item.description)
          );
        }

        calendarContainer.appendChild(card);
      });
    } catch (error) {
      console.error("Academic calendar loading error:", error);
      showMessage(
        calendarContainer,
        "The academic calendar could not be loaded. Please try again later.",
        "error"
      );
    }
  }

  if (typeof supabaseClient === "undefined") {
    showMessage(announcementsContainer, "Supabase configuration was not loaded.", "error");
    showMessage(eventsContainer, "Supabase configuration was not loaded.", "error");
    showMessage(calendarContainer, "Supabase configuration was not loaded.", "error");
    return;
  }

  await Promise.all([
    loadAnnouncements(),
    loadEvents(),
    loadAcademicCalendar()
  ]);
});