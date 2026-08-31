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

  // Formulaire de contact (démo statique — pas de backend)
  var contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var feedback = contactForm.querySelector(".form-feedback");
      if (feedback) {
        feedback.textContent = "Merci ! Votre message a bien été préparé — l'envoi direct sera activé prochainement. En attendant, écrivez-nous à contact@e-swift.bj.";
        feedback.style.display = "block";
      }
      contactForm.reset();
    });
  }
})();
