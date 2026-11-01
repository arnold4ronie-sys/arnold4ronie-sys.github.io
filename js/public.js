
// RONIE ARNOLD — PUBLIC PORTFOLIO

document.addEventListener("DOMContentLoaded", () => {
  const BUCKET = "portfolio-media";

  const $ = (selector) => document.querySelector(selector);

  // FOOTER YEAR
  const year = $("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // MOBILE NAVIGATION
  const navToggle = $(".nav-toggle");
  const siteNav = $("#site-nav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        siteNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // AUTO-HIDING MOBILE NAVIGATION
  let scrollStopTimer;

  function handleNavigationScroll() {
    if (!siteNav || window.innerWidth > 650) return;

    // Always show navigation at the top of the page.
    if (window.scrollY <= 10) {
      siteNav.classList.remove("nav-auto-hidden");
      return;
    }

    // Hide navigation while scrolling.
    siteNav.classList.add("nav-auto-hidden");

    // Show navigation again when scrolling stops.
    clearTimeout(scrollStopTimer);

    scrollStopTimer = setTimeout(() => {
      siteNav.classList.remove("nav-auto-hidden");
    }, 350);
  }

  window.addEventListener("scroll", handleNavigationScroll, {
    passive: true
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 650 && siteNav) {
      siteNav.classList.remove("nav-auto-hidden");
    }
  });

  // AUTO-HIDING MOBILE NAVIGATION
  let scrollStopTimer;

  function handleNavigationScroll() {
    if (!siteNav || window.innerWidth > 650) return;

    if (window.scrollY <= 10) {
      siteNav.classList.remove("nav-auto-hidden");
      return;
    }

    siteNav.classList.add("nav-auto-hidden");

    clearTimeout(scrollStopTimer);

    scrollStopTimer = setTimeout(() => {
      siteNav.classList.remove("nav-auto-hidden");
    }, 700);
  }

  window.addEventListener("scroll", handleNavigationScroll, {
    passive: true
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 650) {
      siteNav.classList.remove("nav-auto-hidden");
    }
  });
  
  // SOCIAL LINKS
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

  // SUPABASE INITIALIZATION
  let client = null;

  try {
    if (
      window.supabase &&
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY
    ) {
      client = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
    }
  } catch (error) {
    console.error("Supabase initialization error:", error);
  }

  // CREATE SIGNED MEDIA URL
  async function getMediaUrl(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    if (!client) return "";

    try {
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);

      if (error) {
        console.error("Media URL error:", error);
        return "";
      }

      return data?.signedUrl || "";
    } catch (error) {
      console.error("Media URL error:", error);
      return "";
    }
  }

  // OPEN PROJECT DETAILS
  async function openProject(project) {
    if (!dialog) return;

    const title = $("#dlg-title");
    const meta = $("#dlg-meta");
    const description = $("#dlg-desc");
    const mediaContainer = $("#dlg-media");

    if (!title || !meta || !description || !mediaContainer) return;

    title.textContent = project.title || "";
    meta.textContent = project.category || "";
    description.textContent = project.description || "";

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

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  // CLOSE PROJECT DIALOG
  if (dialog) {
    const closeButton = dialog.querySelector(".dlg-close");

    if (closeButton) {
      closeButton.addEventListener("click", () => dialog.close());
    }

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener("close", () => {
      dialog.querySelectorAll("video").forEach((video) => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
    });
  }

  // CREATE A SUPABASE PROJECT CARD
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

    const description = document.createElement("p");
    description.textContent = project.description || "";

    body.append(title, meta, description);
    button.append(media, body);
    item.appendChild(button);

    button.addEventListener("click", () => openProject(project));

    return item;
  }

  // LOAD PUBLISHED PROJECTS FROM SUPABASE
  async function loadProjects() {
    if (!projectsGrid) return;

    const staticCards = Array.from(projectsGrid.children);

    if (!client) {
      if (workStatus) {
        workStatus.textContent =
          "Showing featured work. More projects will be available soon.";
      }
      return;
    }

    if (workStatus) {
      workStatus.textContent = "Loading additional projects...";
    }

    try {
      const { data, error } = await client
        .from("projects")
        .select(
          "id,title,description,category,cover_url,media_urls,sort_order,created_at"
        )
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const databaseProjects = data || [];

      projectsGrid
        .querySelectorAll("[data-supabase-project]")
        .forEach((card) => card.remove());

      for (const project of databaseProjects) {
        const card = await createProjectCard(project);
        card.dataset.supabaseProject = "true";
        projectsGrid.appendChild(card);
      }

      if (filtersContainer) {
        filtersContainer.hidden = true;
      }

      if (workStatus) {
        const total = staticCards.length + databaseProjects.length;

        workStatus.textContent =
          `${total} featured project${total === 1 ? "" : "s"}`;
      }

    } catch (error) {
      console.error("Project loading error:", error);

      if (workStatus) {
        workStatus.textContent =
          "Showing featured work. Additional projects are temporarily unavailable.";
      }
    }
  }

  // START
  loadProjects();

});
