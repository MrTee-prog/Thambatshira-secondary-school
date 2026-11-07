const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "Signing in...";
  loginButton.disabled = true;

  try {
    // Authenticate the staff member
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    // Check whether this account is authorised school staff
    const { data: staff, error: staffError } =
      await supabaseClient
        .from("staff_members")
        .select("full_name, role, active")
        .eq("user_id", data.user.id)
        .eq("active", true)
        .maybeSingle();

    if (staffError || !staff) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "This account is not authorised to access the school portal."
      );
    }

    // Save the verified staff profile for the dashboard
    sessionStorage.setItem(
      "schoolStaff",
      JSON.stringify(staff)
    );

    message.textContent = "Login successful. Opening dashboard...";

    window.location.href = "dashboard.html";

  } catch (error) {
    message.textContent =
      error.message || "Unable to sign in. Please try again.";

  } finally {
    loginButton.disabled = false;
  }
});