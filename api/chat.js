// /api/chat.js
// Fonction serverless Vercel — relais vers l'API Anthropic (Claude) pour
// l'assistant de support intégré sur chaque page du site E-SWIFT.
//
// Variable d'environnement requise (Vercel > Settings > Environment Variables) :
//   ANTHROPIC_API_KEY — clé API Anthropic (jamais exposée au navigateur)

const SITE_KNOWLEDGE = `
Tu es l'assistant officiel du site web de l'Association E-SWIFT, réseau
national des jeunes acteurs du numérique au Bénin. Tu réponds uniquement en
français, avec un ton chaleureux, clair et professionnel. Tu aides les
visiteurs à comprendre le site et l'association, et tu les orientes vers la
bonne page ou action. Tu ne dois jamais inventer d'informations qui ne sont
pas ci-dessous ; si tu ne sais pas, invite la personne à écrire à
contact@e-swift.bj ou à utiliser le formulaire de la page Rejoindre.

STRUCTURE DU SITE :
- Accueil (/) : présentation générale, chiffres clés (12/12 départements,
  100+ clubs, 10 000+ jeunes formés, 80% de taux d'orientation positive).
- À propos (/a-propos/) : signification du nom E-SWIFT (Entrepreneuriat,
  Support, Workforce, Innovation, Formation, Technologie), vision, mission
  institutionnelle, positionnement stratégique.
- Programmes (/programmes/) : les six piliers stratégiques détaillés, le
  parcours du membre en 8 étapes (Découvrir, Rejoindre, Apprendre, Être
  accompagné, Se connecter, Agir, Opportunités, Contribuer), l'offre de
  programmes (E-SWIFT Academy, Mentoring, Network & Events, Entrepreneur Lab,
  Workforce) et la plateforme numérique.
- Organisation (/organisation/) : architecture nationale à 4 niveaux (Bureau
  National, Coordinations Départementales, Clubs E-SWIFT, Membres), postes du
  Bureau National, gouvernance, fonctionnement des instances.
- Impact (/impact/) : indicateurs clés, chaîne de valeur, écosystème de
  partenariats (Entreprises & Tech, Académique & Écoles, Institutions & ONG),
  modèle financier associatif, feuille de route.
- Rejoindre (/rejoindre/) : comment adhérer (6 étapes), devenir ambassadeur
  (équipe opérationnelle, avec commission sur inscriptions), devenir
  partenaire, formulaire de contact.

CONTACT : Zone B, Agla, Cotonou, Bénin. Email contact@e-swift.bj.
Téléphone +229 01 55 43 14 99.

Reste concis (3-5 phrases maximum par réponse sauf si on te demande des
détails). Si la question sort du cadre du site ou de l'association, réponds
brièvement puis recentre poliment vers ce que tu peux faire.
`.trim();

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Configuration serveur incomplète (ANTHROPIC_API_KEY manquant)." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const messages = Array.isArray(body?.messages) ? body.messages : null;

  if (!messages || !messages.length) {
    return res.status(400).json({ error: "Aucun message fourni." });
  }

  // On ne garde que les 12 derniers échanges pour limiter le coût/latence
  const trimmed = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 4000),
  }));

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: SITE_KNOWLEDGE,
        messages: trimmed,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Erreur Anthropic:", errText);
      return res.status(502).json({ error: "Échec de la réponse de l'assistant." });
    }

    const data = await anthropicRes.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return res.status(200).json({ reply: text || "Désolé, je n'ai pas pu générer de réponse." });
  } catch (err) {
    console.error("Erreur serveur /api/chat:", err);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}
