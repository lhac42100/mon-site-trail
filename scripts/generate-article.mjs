import fs from "fs";
import path from "path";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const TOPICS_FILE = "data/topics.json";
const CONTENT_DIR = "src/content/blog";

// Récupère le prochain sujet non encore traité et le marque comme fait
function getNextTopic() {
  const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, "utf-8"));
  const pending = topics.filter((t) => !t.done);

  if (pending.length === 0) {
    console.log("Aucun sujet en attente. Ajoute des sujets dans data/topics.json.");
    process.exit(0);
  }

  const topic = pending[0];
  topic.done = true;
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2));
  return topic;
}

// Appelle l'API Claude pour rédiger l'article
async function generateArticle(topic) {
  const prompt = `Écris un article de blog en français sur le sujet suivant : "${topic.title}".

Le site s'adresse à des passionnés de trail running et d'ultra-trail (du débutant au coureur expérimenté). Adapte le vocabulaire technique et les exemples à ce public, sans être inutilement élitiste.

Contraintes :
- 600 à 800 mots
- ton informatif, clair, accessible à un public non spécialiste
- structure avec des sous-titres en Markdown (## ...)
- ne commence pas par "Dans cet article" ou une formule similaire
- termine par une courte conclusion
- n'invente pas de chiffres ou de sources précises

Réponds uniquement avec le contenu de l'article en Markdown, sans préambule ni commentaire.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API (${response.status}) : ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");

  if (!textBlock) {
    throw new Error("Aucun contenu texte renvoyé par l'API.");
  }

  return textBlock.text.trim();
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  if (!API_KEY) {
    throw new Error("La variable ANTHROPIC_API_KEY est manquante.");
  }

  const topic = getNextTopic();
  console.log(`Génération de l'article : "${topic.title}"`);

  const body = await generateArticle(topic);
  const slug = slugify(topic.title);
  const date = new Date().toISOString().split("T")[0];

  const frontmatter = `---
title: "${topic.title}"
date: "${date}"
slug: "${slug}"
generated: true
---

`;

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const filePath = path.join(CONTENT_DIR, `${date}-${slug}.md`);
  fs.writeFileSync(filePath, frontmatter + body);

  console.log(`Article créé : ${filePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
