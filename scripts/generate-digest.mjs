import fs from "fs";
import path from "path";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const CONTENT_DIR = "src/content/blog";

// Numéro de semaine ISO (utilisé pour nommer le digest)
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function generateDigest() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prompt = `Tu rédiges un digest hebdomadaire d'actualités trail running et ultra-trail en français, daté du ${dateStr}.

Utilise la recherche web pour trouver les actualités récentes de cette semaine : résultats de courses majeures, annonces UTMB/ITRA, actualités matériel, ou calendrier des prochaines courses importantes.

Format demandé :
- Un titre accrocheur du type "Cette semaine en trail : ..."
- 4 à 6 brèves, chacune avec :
  - un sous-titre (## Titre de la brève)
  - 2 à 3 phrases de résumé écrites avec tes propres mots (ne copie jamais de phrases entières d'une source)
  - un lien Markdown vers la source officielle à la fin : [Source : nom du site](url)
- Si tu n'es pas certain d'un résultat, d'un chiffre ou d'une date, ne le mentionne pas plutôt que de risquer une erreur.

Réponds uniquement avec le contenu en Markdown, sans préambule ni commentaire.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 6, // limite le nombre de recherches pour contrôler le coût
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API (${response.status}) : ${errText}`);
  }

  const data = await response.json();

  // On ne garde que les blocs de texte final (pas les blocs d'appel d'outil)
  const textBlocks = data.content?.filter((b) => b.type === "text") || [];
  const body = textBlocks.map((b) => b.text).join("\n\n").trim();

  if (!body) {
    throw new Error("Aucun contenu texte renvoyé par l'API.");
  }

  return body;
}

async function main() {
  if (!API_KEY) {
    throw new Error("La variable ANTHROPIC_API_KEY est manquante.");
  }

  console.log("Génération du digest hebdomadaire...");
  const body = await generateDigest();

  const date = new Date();
  const dateSlug = date.toISOString().split("T")[0];
  const week = isoWeek(date);
  const slug = `digest-semaine-${week}`;

  const frontmatter = `---
title: "Cette semaine en trail — semaine ${week}"
date: "${dateSlug}"
slug: "${slug}"
type: "digest"
generated: true
---

`;

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const filePath = path.join(CONTENT_DIR, `${dateSlug}-${slug}.md`);
  fs.writeFileSync(filePath, frontmatter + body);

  console.log(`Digest créé : ${filePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
