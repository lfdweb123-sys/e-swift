// ASSOCIATION E-SWIFT — comportements partagés du site
(function () {
  "use strict";

  // Menu mobile
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var isOpen = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    document.querySelectorAll(".nav-mobile a").forEach(function (link) {
      link.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Année du footer
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Accordéon (page Rejoindre)
  document.querySelectorAll(".accordion-item").forEach(function (item) {
    var btn = item.querySelector("button");
    var panel = item.querySelector(".accordion-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".accordion-item.open").forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove("open");
          openItem.querySelector(".accordion-panel").style.maxHeight = null;
        }
      });
      item.classList.toggle("open", !isOpen);
      panel.style.maxHeight = !isOpen ? panel.scrollHeight + "px" : null;
    });
  });

  // Révélation discrète au défilement (avec repli automatique si l'observation échoue)
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px 200px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
    // Filet de sécurité : si un élément n'est jamais intersecté (ex. capture
    // automatisée, navigateur atypique), on le révèle après un court délai.
    window.setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        el.classList.add("is-visible");
      });
    }, 1800);
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // Bascule du panneau hero (accueil) selon le bouton cliqué
  var heroTabs = document.querySelectorAll("[data-hero-tab]");
  if (heroTabs.length) {
    heroTabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-hero-tab");
        heroTabs.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        document.querySelectorAll("[data-hero-view]").forEach(function (view) {
          view.hidden = view.getAttribute("data-hero-view") !== target;
        });
      });
    });
  }

  // Bouton retour en haut (page d'accueil)
  var backToTop = document.querySelector("#back-to-top");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.classList.toggle("visible", window.scrollY > 260);
    }, { passive: true });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Widget de support (assistant du site, via /api/chat)
  var launcher = document.querySelector("#support-launcher");
  var panel = document.querySelector("#support-panel");
  var closeBtn = document.querySelector("#support-close");
  var body = document.querySelector("#support-body");
  var form = document.querySelector("#support-form");
  var input = document.querySelector("#support-input");
  var tooltip = document.querySelector("#support-tooltip");
  var tooltipClose = document.querySelector("#support-tooltip-close");

  if (launcher && tooltip) {
    var tooltipSeen = sessionStorage.getItem("eswift-support-tooltip-seen");
    if (!tooltipSeen) {
      window.setTimeout(function () {
        if (!panel.classList.contains("open")) {
          tooltip.classList.add("visible");
        }
      }, 1400);
    }
    function dismissTooltip() {
      tooltip.classList.remove("visible");
      sessionStorage.setItem("eswift-support-tooltip-seen", "1");
    }
    if (tooltipClose) tooltipClose.addEventListener("click", dismissTooltip);
    launcher.addEventListener("click", dismissTooltip);
  }

  if (launcher && panel && form && input && body) {
    var history = [];

    function addMessage(role, text) {
      var el = document.createElement("div");
      el.className = "support-msg " + (role === "user" ? "user" : "bot");
      el.textContent = text;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    launcher.addEventListener("click", function () {
      panel.classList.add("open");
      launcher.setAttribute("aria-expanded", "true");
      input.focus();
    });
    closeBtn.addEventListener("click", function () {
      panel.classList.remove("open");
      launcher.setAttribute("aria-expanded", "false");
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      addMessage("user", text);
      history.push({ role: "user", content: text });

      var typingEl = document.createElement("div");
      typingEl.className = "support-msg bot typing";
      typingEl.textContent = "L'assistant écrit…";
      body.appendChild(typingEl);
      body.scrollTop = body.scrollHeight;

      try {
        var resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        var data = await resp.json();
        typingEl.remove();
        if (resp.ok && data.reply) {
          addMessage("bot", data.reply);
          history.push({ role: "assistant", content: data.reply });
        } else {
          addMessage("bot", "Désolé, une erreur est survenue. Vous pouvez nous écrire directement à contact@e-swift.bj.");
        }
      } catch (err) {
        typingEl.remove();
        addMessage("bot", "Connexion impossible pour le moment. Écrivez-nous à contact@e-swift.bj.");
      }
    });
  }

  // Formulaire de contact — envoi réel via /api/contact (Brevo)
  var contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var feedback = contactForm.querySelector(".form-feedback");
      var submitBtn = contactForm.querySelector('button[type="submit"]');
      var payload = {
        name: contactForm.querySelector('[name="name"]').value.trim(),
        email: contactForm.querySelector('[name="email"]').value.trim(),
        phone: contactForm.querySelector('[name="phone"]').value.trim(),
        intent: contactForm.querySelector('[name="intent"]').value,
        message: contactForm.querySelector('[name="message"]').value.trim(),
      };

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi en cours…"; }

      try {
        var resp = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        var data = await resp.json();
        if (feedback) {
          feedback.style.display = "block";
          if (resp.ok) {
            feedback.style.color = "#8CE0B0";
            feedback.textContent = "Merci ! Votre message a bien été envoyé, nous revenons vers vous rapidement.";
            contactForm.reset();
          } else {
            feedback.style.color = "#F3A6A6";
            feedback.textContent = (data && data.error) || "Une erreur est survenue. Réessayez ou écrivez-nous à contact@e-swift.bj.";
          }
        }
      } catch (err) {
        if (feedback) {
          feedback.style.display = "block";
          feedback.style.color = "#F3A6A6";
          feedback.textContent = "Connexion impossible. Écrivez-nous directement à contact@e-swift.bj.";
        }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Envoyer le message"; }
      }
    });
  }
})();
