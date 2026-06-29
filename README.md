# Site trail/running — pipeline de contenu autonome

Ce dossier contient un pipeline qui fait vivre un site trail/running tout
seul, avec deux types de contenu :

- des **articles de fond** (entraînement, matériel, technique) générés
  quotidiennement à partir d'une liste de sujets,
- un **digest hebdomadaire** ("Cette semaine en trail") qui utilise la
  recherche web pour résumer l'actualité trail/ultra-trail récente, avec
  liens vers les sources officielles.

## Comment ça marche

1. Deux workflows GitHub Actions tournent sur des plannings différents :
   - `generate-article.yml` : tous les jours → `scripts/generate-article.mjs`
   - `generate-digest.yml` : tous les lundis → `scripts/generate-digest.mjs`
2. Chaque script écrit un fichier Markdown dans `src/content/blog/` et
   commit/push automatiquement.
3. Vercel ou Netlify détecte le push et redéploie le site avec le nouveau
   contenu — sans aucune action humaine.

## Mise en place, étape par étape

### 1. Créer ta clé API

Va sur [platform.claude.com](https://platform.claude.com), crée un compte,
ajoute un moyen de paiement, puis génère une clé API depuis la Console.

**Important pour le digest** : la recherche web doit être activée pour ton
organisation dans la Console. Vérifie dans Settings si le digest échoue
avec une erreur liée à l'outil.

### 2. Intégrer ces fichiers à ton projet

Si le site n'existe pas encore :

```bash
npm create astro@latest mon-site-trail
```

Copie ensuite `scripts/`, `.github/`, et `data/` à la racine du projet.

### 3. Adapter le dossier de contenu si besoin

Les deux scripts écrivent dans `src/content/blog/`. Change la constante
`CONTENT_DIR` en haut de chaque script si ton générateur de site utilise
un autre dossier.

### 4. Ajouter la clé API en secret GitHub

Dans le dépôt GitHub : Settings → Secrets and variables → Actions →
New repository secret.

- Nom : `ANTHROPIC_API_KEY`
- Valeur : ta clé API

### 5. Compléter la liste de sujets

`data/topics.json` contient 12 sujets de démarrage (entraînement, matériel,
technique). Le script en consomme un par jour et le marque `"done": true`.
Pense à en rajouter régulièrement — à ce rythme, la liste de départ tient
environ 12 jours.

### 6. Connecter le déploiement automatique

Sur [vercel.com](https://vercel.com) ou [netlify.com](https://netlify.com),
importe le dépôt GitHub. Chaque push déclenche un build et une mise en
ligne automatique.

### 7. Tester avant de laisser tourner

Depuis l'onglet "Actions" du dépôt GitHub, lance chaque workflow
manuellement ("Run workflow") pour vérifier que les deux scripts
fonctionnent, avant de les laisser sur leur planning automatique.

## Estimation de coût (rappel)

- Article de fond : ~0,02 $ pièce → ~0,60 $/mois en quotidien
- Digest hebdo (avec recherche web) : ~0,08-0,10 $ pièce → ~0,40 $/mois
- GitHub Actions et hébergement : gratuits à ce volume

**Total : environ 1 €/mois.**

## Pour aller plus loin

- **Vérification anti-erreur sur le digest** : avant de publier, on peut
  ajouter une étape qui relit le digest et vérifie qu'aucune phrase n'est
  trop proche d'une source (anti-plagiat basique).
- **Calendrier de courses** : une page dédiée qui se mettrait à jour à
  partir des dates UTMB/ITRA serait un bon complément, en plus du digest.
- **Images** : ajouter une génération d'image pour illustrer chaque
  article (à faire avec prudence — éviter toute image qui ressemble trop à
  une photo de presse existante).
