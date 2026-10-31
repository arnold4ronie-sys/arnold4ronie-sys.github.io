// RONIE ARNOLD — PUBLIC PORTFOLIO

document.addEventListener("DOMContentLoaded", () => {
  const BUCKET = "portfolio-media";

  const client = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  const $ = (selector) => document.querySelector(selector);

  // FOOTER YEAR
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // MOBILE NAVIGATION
  const navToggle = $(".nav-toggle");
  const siteNav = $("#site-nav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // CONTACT DETAILS
  const email = window.CONTACT_EMAIL || "";

  if ($("#contact-email") && email) {
    $("#contact-email").textContent = email;
    $("#contact-email").href = `mailto:${email}`;
  }

  if ($("#contact-placeholder") && email) {
    $("#contact-placeholder").hidden = true;
  }

  const socialContainer = $("#social-links");

  if (socialContainer && Array.isArray(window.SOCIAL_LINKS)) {
    socialContainer.innerHTML = "";

    window.SOCIAL_LINKS.forEach((social) => {
      if (!social.label || !social.url) return;

      const link = document.createElement("a");
      link.href = social.url;
      link.textContent = social.label;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      socialContainer.appendChild(link);
    });
  }

  // PROJECT ELEMENTS
  const filtersContainer = $("#filters");
  const projectsGrid = $("#projects-grid");
  const workStatus = $("#work-status");
  const dialog = $("#project-dialog");

  let projects = [];

  // CREATE SIGNED MEDIA URL
  async function getMediaUrl(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error("Media URL error:", error);
      return "";
    }

    return data.signedUrl;
  }

  // CREATE PROJECT CARD
  async function createProjectCard(project) {
    const item = document.createElement("li");
    const button = document.createElement("button");

    button.className = "card";
    button.type = "button";

    const media = document.createElement("div");
    media.className = "card-media";

    const imageUrl = await getMediaUrl(project.cover_url);

    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = project.title || "Portfolio project";
      image.loading = "lazy";
      media.appendChild(image);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.textContent = project.title || "Untitled project";

    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = project.category || "Creative work";

    body.append(title, meta);
    button.append(media, body);
    item.appendChild(button);

    button.addEventListener("click", () => openProject(project));

    return item;
  }

  // DISPLAY PROJECTS
  async function displayProjects(list) {
    if (!projectsGrid) return;

    projectsGrid.innerHTML = "";

    for (const project of list) {
      const card = await createProjectCard(project);
      projectsGrid.appendChild(card);
    }

    if (workStatus) {
      workStatus.textContent = list.length
        ? `${list.length} project${list.length === 1 ? "" : "s"}`
        : "No projects in this category yet.";
    }
  }

  // CREATE CATEGORY FILTERS
  function createFilters() {
    if (!filtersContainer) return;

    filtersContainer.innerHTML = "";

    const categories = [
      "All",
      ...new Set(
        projects
          .map((project) => project.category)
          .filter(Boolean)
      )
    ];

    categories.forEach((category, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = category;
      button.className = index === 0 ? "active" : "";

      button.addEventListener("click", () => {
        filtersContainer.querySelectorAll("button").forEach((item) => {
          item.classList.remove("active");
        });

        button.classList.add("active");

        const filtered = category === "All"
          ? projects
          : projects.filter(
              (project) => project.category === category
            );

        displayProjects(filtered);
      });

      filtersContainer.appendChild(button);
    });
  }

  // OPEN PROJECT DETAILS
  async function openProject(project) {
    if (!dialog) return;

    $("#dlg-title").textContent = project.title || "";
    $("#dlg-meta").textContent = project.category || "";
    $("#dlg-desc").textContent = project.description || "";

    const mediaContainer = $("#dlg-media");
    mediaContainer.innerHTML = "";

    const mediaPaths = [
      project.cover_url,
      ...(Array.isArray(project.media_urls) ? project.media_urls : [])
    ].filter(Boolean);

    const uniquePaths = [...new Set(mediaPaths)];

    for (const path of uniquePaths) {
      const url = await getMediaUrl(path);
      if (!url) continue;

      const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(path);

      if (isVideo) {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.playsInline = true;
        mediaContainer.appendChild(video);
      } else {
        const image = document.createElement("img");
        image.src = url;
        image.alt = project.title || "Project media";
        mediaContainer.appendChild(image);
      }
    }

    dialog.showModal();
  }

  // CLOSE PROJECT DIALOG
  if (dialog) {
    const closeButton = dialog.querySelector(".dlg-close");

    if (closeButton) {
      closeButton.addEventListener("click", () => dialog.close());
    }

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", () => {
      dialog.querySelectorAll("video").forEach((video) => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
    });
  }

  // LOAD PUBLISHED PROJECTS FROM SUPABASE
  async function loadProjects() {
    if (!projectsGrid) return;

    if (workStatus) workStatus.textContent = "Loading projects...";

    const { data, error } = await client
      .from("projects")
      .select(
        "id,title,description,category,cover_url,media_urls,sort_order,created_at"
      )
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Project loading error:", error);

      if (workStatus) {
        workStatus.textContent =
          "Projects could not be loaded. Please try again later.";
      }

      return;
    }

    projects = data || [];

    createFilters();
    await displayProjects(projects);
  }

  loadProjects();
});
