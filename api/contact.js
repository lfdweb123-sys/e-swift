// /api/contact.js
// Fonction serverless Vercel — reçoit le formulaire de contact du site
// et l'envoie via l'API transactionnelle Brevo.
//
// Variables d'environnement requises (à définir dans Vercel > Settings >
// Environment Variables) :
//   BREVO_API_KEY      — clé API Brevo (Transactional > SMTP & API)
//   BREVO_SENDER_EMAIL — adresse expéditrice vérifiée dans Brevo
//   BREVO_SENDER_NAME  — nom affiché comme expéditeur (optionnel)
//   CONTACT_RECEIVER_EMAIL — adresse qui doit recevoir les messages du site

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Site E-SWIFT";
  const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || senderEmail;

  if (!apiKey || !senderEmail) {
    return res.status(500).json({
      error: "Configuration serveur incomplète (BREVO_API_KEY ou BREVO_SENDER_EMAIL manquant).",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { name, email, phone, intent, message } = body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Nom, email et message sont obligatoires." });
  }

  // Validation simple du format email
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const htmlContent = `
    <h2>Nouveau message depuis le site E-SWIFT</h2>
    <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
    <p><strong>Email :</strong> ${escapeHtml(email)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(phone || "Non renseigné")}</p>
    <p><strong>Demande :</strong> ${escapeHtml(intent || "Non précisé")}</p>
    <p><strong>Message :</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: receiverEmail }],
        replyTo: { email, name },
        subject: `[Site E-SWIFT] Nouveau message — ${intent || "Contact"}`,
        htmlContent,
      }),
    });

    if (!brevoRes.ok) {
      const errText = await brevoRes.text();
      console.error("Erreur Brevo:", errText);
      return res.status(502).json({ error: "Échec de l'envoi via Brevo." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur serveur /api/contact:", err);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
