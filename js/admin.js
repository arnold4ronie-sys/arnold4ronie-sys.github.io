// RONIE ARNOLD — ADMIN DASHBOARD

document.addEventListener("DOMContentLoaded", () => {
  const BUCKET = "portfolio-media";

  const client = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  const $ = (id) => document.getElementById(id);

  const loginSection = $("login-section");
  const dashboard = $("dashboard");
  const loginForm = $("login-form");
  const loginStatus = $("login-status");
  const projectForm = $("project-form");
  const formSection = $("project-form-section");
  const projectStatus = $("project-status");
  const listStatus = $("list-status");
  const projectList = $("admin-project-list");

  let currentUser = null;

  function setStatus(element, message) {
    if (element) element.textContent = message;
  }

  function showLogin() {
    loginSection.classList.remove("hidden");
    dashboard.classList.add("hidden");
  }

  function showDashboard() {
    loginSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
  }

  function resetProjectForm() {
    projectForm.reset();
    $("project-id").value = "";
    $("form-heading").textContent = "Add project";
    $("project-cover").required = false;
    setStatus(projectStatus, "");
  }

  function openProjectForm() {
    resetProjectForm();
    formSection.classList.remove("hidden");
    formSection.scrollIntoView({ behavior: "smooth" });
  }

  function closeProjectForm() {
    formSection.classList.add("hidden");
    resetProjectForm();
  }

  // SIGN IN
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    setStatus(loginStatus, "Signing in...");

    const email = $("email").value.trim();
    const password = $("password").value;

    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setStatus(loginStatus, error.message);
      return;
    }

    await checkSession();
  });

  // SIGN OUT
  $("logout-btn").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();

    if (error) {
      setStatus(listStatus, error.message);
      return;
    }

    currentUser = null;
    showLogin();
  });

  // OPEN AND CANCEL FORM
  $("new-project-btn").addEventListener("click", openProjectForm);
  $("cancel-project-btn").addEventListener("click", closeProjectForm);

  // UPLOAD A FILE TO PRIVATE STORAGE
  async function uploadFile(file) {
    if (!file) return null;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${currentUser.id}/${Date.now()}-${safeName}`;

    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) throw error;

    return path;
  }

  // SAVE OR UPDATE A PROJECT
  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    const saveButton = projectForm.querySelector(
      'button[type="submit"]'
    );

    saveButton.disabled = true;
    setStatus(projectStatus, "Saving project...");

    try {
      const projectId = $("project-id").value;
      const coverFile = $("project-cover").files[0];
      const mediaFiles = Array.from(
        $("project-media").files
      );

      let coverUrl = null;
      let mediaUrls = [];

      // Keep existing media when editing
      if (projectId) {
        const { data, error } = await client
          .from("projects")
          .select("cover_url,media_urls")
          .eq("id", projectId)
          .single();

        if (error) throw error;

        coverUrl = data.cover_url;
        mediaUrls = Array.isArray(data.media_urls)
          ? data.media_urls
          : [];
      }

      if (coverFile) {
        coverUrl = await uploadFile(coverFile);
      }

      if (mediaFiles.length) {
        for (const file of mediaFiles) {
          const uploadedPath = await uploadFile(file);
          mediaUrls.push(uploadedPath);
        }
      }

      if (!coverUrl) {
        throw new Error("Please choose a cover image.");
      }

      const projectData = {
        title: $("project-title").value.trim(),
        category: $("project-category").value,
        description: $("project-description").value.trim(),
        cover_url: coverUrl,
        media_urls: mediaUrls,
        published: $("project-published").checked
      };

      if (projectId) {
        const { error } = await client
          .from("projects")
          .update(projectData)
          .eq("id", projectId);

        if (error) throw error;
      } else {
        const { error } = await client
          .from("projects")
          .insert(projectData);

        if (error) throw error;
      }

      setStatus(projectStatus, "Project saved successfully.");
      closeProjectForm();
      await loadProjects();

    } catch (error) {
      console.error(error);
      setStatus(projectStatus, error.message || "Could not save project.");
    } finally {
      saveButton.disabled = false;
    }
  });

  // LOAD PROJECTS
  async function loadProjects() {
    if (!currentUser) return;

    setStatus(listStatus, "Loading projects...");
    projectList.innerHTML = "";

    const { data, error } = await client
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(listStatus, error.message);
      return;
    }

    if (!data || data.length === 0) {
      setStatus(listStatus, "You haven't added any projects yet.");
      return;
    }

    setStatus(listStatus, "");

    data.forEach((project) => {
      const row = document.createElement("div");
      row.className = "project-row";

      const details = document.createElement("div");

      const title = document.createElement("strong");
      title.textContent = project.title;

      const meta = document.createElement("p");
      meta.textContent =
        `${project.category || "Uncategorised"} · ` +
        (project.published ? "Published" : "Draft");

      details.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.className = "secondary";

      editButton.addEventListener("click", () => {
        editProject(project);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.className = "secondary";

      deleteButton.addEventListener("click", () => {
        deleteProject(project);
      });

      actions.append(editButton, deleteButton);
      row.append(details, actions);
      projectList.appendChild(row);
    });
  }

  // EDIT PROJECT
  function editProject(project) {
    resetProjectForm();

    $("project-id").value = project.id;
    $("project-title").value = project.title || "";
    $("project-category").value = project.category || "";
    $("project-description").value = project.description || "";
    $("project-published").checked = Boolean(project.published);

    $("form-heading").textContent = "Edit project";

    formSection.classList.remove("hidden");
    formSection.scrollIntoView({ behavior: "smooth" });
  }

  // DELETE PROJECT RECORD
  async function deleteProject(project) {
    const confirmed = window.confirm(
      `Delete "${project.title}" from your projects?`
    );

    if (!confirmed) return;

    setStatus(listStatus, "Deleting project...");

    const { error } = await client
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (error) {
      setStatus(listStatus, error.message);
      return;
    }

    setStatus(listStatus, "Project deleted.");
    await loadProjects();
  }

  // CHECK LOGIN SESSION
  async function checkSession() {
    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {
      currentUser = null;
      showLogin();
      return;
    }

    currentUser = data.session.user;
    showDashboard();
    await loadProjects();
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      currentUser = null;
      showLogin();
    }
  });

  checkSession();
});
