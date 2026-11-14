
/* ==========================================
   THAMBATSHIRA DIGITAL LEARNING LIBRARY
   Supabase connection and resource filtering
========================================== */

// Supabase connection
const libraryClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// HTML elements
const resourceList = document.getElementById("resourceList");
const libraryMessage = document.getElementById("libraryMessage");

const resourceSearch = document.getElementById("resourceSearch");
const gradeFilter = document.getElementById("gradeFilter");
const subjectFilter = document.getElementById("subjectFilter");
const categoryFilter = document.getElementById("categoryFilter");

const libraryYear = document.getElementById("libraryYear");

if (libraryYear) {
    libraryYear.textContent = new Date().getFullYear();
}

// Store resources loaded from Supabase
let learningResources = [];

// Category names
const categoryNames = {
    past_paper: "Past Paper",
    study_notes: "Study Notes",
    worksheet: "Worksheet",
    study_guide: "Study Guide"
};

// Safely display text from the database
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// Load published learning resources
async function loadLearningResources() {

    resourceList.innerHTML = "<p>Loading learning resources...</p>";
    libraryMessage.textContent = "";

    const { data, error } = await libraryClient
        .from("learning_resources")
        .select(`
            id,
            title,
            description,
            grade,
            subject,
            category,
            file_url,
            published,
            created_at
        `)
        .eq("published", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Library loading error:", error);

        resourceList.innerHTML = "";
        libraryMessage.textContent =
            "We could not load learning resources. Please try again later.";

        return;
    }

    learningResources = data || [];

    displayLearningResources();
}

// Display resource cards
function displayLearningResources() {

    const searchTerm = resourceSearch.value
        .trim()
        .toLowerCase();

    const selectedGrade = gradeFilter.value;
    const selectedSubject = subjectFilter.value;
    const selectedCategory = categoryFilter.value;

    const filteredResources = learningResources.filter(resource => {

        const matchesSearch =
            !searchTerm ||
            resource.title.toLowerCase().includes(searchTerm) ||
            (resource.description || "").toLowerCase().includes(searchTerm) ||
            resource.subject.toLowerCase().includes(searchTerm);

        const matchesGrade =
            !selectedGrade ||
            String(resource.grade) === selectedGrade;

        const matchesSubject =
            !selectedSubject ||
            resource.subject === selectedSubject;

        const matchesCategory =
            !selectedCategory ||
            resource.category === selectedCategory;

        return (
            matchesSearch &&
            matchesGrade &&
            matchesSubject &&
            matchesCategory
        );
    });

    resourceList.innerHTML = "";

    if (filteredResources.length === 0) {

        resourceList.innerHTML = `
            <p>No learning resources found.
            Try changing your search or filters.</p>
        `;

        return;
    }

    filteredResources.forEach(resource => {

        const card = document.createElement("article");

        card.className = "resource-card";

        const title = escapeHTML(resource.title);
        const description = escapeHTML(resource.description);
        const subject = escapeHTML(resource.subject);
        const category = escapeHTML(
            categoryNames[resource.category] || resource.category
        );

        const grade = escapeHTML(resource.grade);
        const fileURL = escapeHTML(resource.file_url);

        card.innerHTML = `
            <span class="resource-category">
                ${category}
            </span>

            <h3>${title}</h3>

            <p>${description}</p>

            <p><strong>Grade:</strong> ${grade}</p>

            <p><strong>Subject:</strong> ${subject}</p>

            <a
                href="${fileURL}"
                class="resource-download"
                target="_blank"
                rel="noopener noreferrer"
            >
                View / Download PDF
            </a>
        `;

        resourceList.appendChild(card);
    });
}

// Search and filter listeners
resourceSearch.addEventListener(
    "input",
    displayLearningResources
);

gradeFilter.addEventListener(
    "change",
    displayLearningResources
);

subjectFilter.addEventListener(
    "change",
    displayLearningResources
);

categoryFilter.addEventListener(
    "change",
    displayLearningResources
);

// Start the library
loadLearningResources();
