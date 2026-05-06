# 📋 GUIDE DE DÉPLOIEMENT – ARSAT LABO (Mode Serveur Centralisé)
**Réf. 25118-GE | Wise Group / Menara Global Service**

---

## 🎯 Qu'est-ce que ce mode apporte ?

| Fonctionnalité | Fichier HTML simple | Mode Serveur |
|---|---|---|
| Données partagées entre utilisateurs | ❌ Chaque PC a sa copie | ✅ Une seule source de vérité |
| Désactivation d'un compte | ❌ Ne marche pas vraiment | ✅ Effet immédiat (prochaine action) |
| Audit trail (qui a fait quoi) | ❌ Non | ✅ Oui – journal complet |
| Accès depuis n'importe où | ❌ Copie locale seulement | ✅ Via URL depuis n'importe quel PC |
| Synchronisation temps réel | ❌ Non | ✅ Oui |

---

## 🚀 Option 1 : Glitch.com (RECOMMANDÉ – 100% Gratuit, 5 minutes)

### Pourquoi Glitch ?
- Gratuit, sans carte bancaire
- Hébergement Node.js inclus
- Stockage de fichiers persistant (.data/)
- URL permanente (ex: `arsat-labo.glitch.me`)
- Accessible depuis N'Djamena, Dakar, Paris…

### Étapes

**1. Créer un compte**
- Allez sur https://glitch.com
- Cliquez "Sign up" → créez un compte (email suffit)

**2. Créer un nouveau projet**
- Cliquez "New project" → "glitch-hello-express"
- Un projet Node.js vide se crée avec une URL (ex: `energetic-maple.glitch.me`)

**3. Uploader les fichiers**
Dans l'éditeur Glitch :
- Effacez le contenu de `server.js` et collez le contenu du fichier `server.js` fourni
- Effacez le contenu de `package.json` et collez le contenu du `package.json` fourni
- Créez un dossier `public/` → Upload `index.html` dedans

**4. Configurer les variables d'environnement**
- Cliquez sur `.env` dans la liste de fichiers
- Ajoutez :
```
JWT_SECRET=votre-code-secret-unique-arsat-2026
```
(Choisissez une phrase longue et gardez-la secrète)

**5. Le projet démarre automatiquement**
- Cliquez "Preview" → "Open preview pane"
- Votre URL est : `https://votre-projet.glitch.me`

**6. Partager l'URL à votre équipe**
- Envoyez l'URL par email/WhatsApp
- Chacun ouvre l'URL dans son navigateur
- Connexion avec son PIN → accès aux données partagées

> ⚠️ **Note Glitch gratuit** : Le projet "s'endort" après 5 minutes d'inactivité. Il se réveille dès qu'on ouvre l'URL (5-10 secondes). Pour éviter ça, abonnez-vous à Glitch Pro (~$8/mois) ou utilisez un service de "ping" gratuit comme UptimeRobot.

---

## 🚀 Option 2 : Render.com (Gratuit, plus robuste)

**1.** Créez un compte sur https://render.com

**2.** Créez un repo GitHub avec les fichiers du dossier `arsat-server/`
   - https://github.com → "New repository" → "arsat-labo"
   - Uploadez tous les fichiers

**3.** Sur Render.com :
   - "New Web Service" → connectez votre repo GitHub
   - Runtime : **Node**
   - Build Command : `npm install`
   - Start Command : `node server.js`
   - Environment Variable : `JWT_SECRET = votre-secret`

**4.** Render vous donne une URL permanente : `https://arsat-labo.onrender.com`

> ⚠️ **Note Render gratuit** : Même comportement que Glitch – s'endort après inactivité.

---

## 🚀 Option 3 : Railway.app (Le plus simple, 5$/mois ou essai gratuit)

**1.** https://railway.app → "New Project" → "Deploy from GitHub"
**2.** Même configuration que Render
**3.** URL permanente, ne s'endort jamais

---

## 👥 Gestion des comptes après déploiement

### Comptes par défaut (à changer immédiatement !)
| Nom | PIN par défaut | Rôle |
|-----|---|---|
| Chef de Projet | **1234** | Admin |
| Coordinateur WISE | **2580** | Éditeur |
| ARSAT (lecture seule) | **7410** | Lecture seule |

### Changer un PIN
1. Connectez-vous en Admin (PIN 1234)
2. Allez dans **🔐 Admin**
3. Cliquez **✏ Modifier** sur l'utilisateur
4. Entrez le nouveau PIN → Enregistrer

### Désactiver un utilisateur
1. **🔐 Admin** → **⛔ Désactiver**
2. **Effet immédiat** : à sa prochaine action (sauvegarde, navigation), l'utilisateur est automatiquement déconnecté et voit un message "Votre compte a été désactivé"
3. Il ne peut plus se reconnecter tant que vous ne réactivez pas

### Ajouter un utilisateur
1. **🔐 Admin** → **+ Ajouter**
2. Remplir : Nom, Rôle, PIN
3. L'utilisateur peut se connecter immédiatement

---

## 🔒 Rôles et permissions

| Action | Admin | Éditeur | Lecture seule |
|--------|-------|---------|--------------|
| Consulter toutes les données | ✅ | ✅ | ✅ |
| Modifier tâches/équipements | ✅ | ✅ | ❌ |
| Supprimer des données | ✅ | ✅ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ |
| Voir le journal d'audit | ✅ | ❌ | ❌ |
| Importer/Exporter JSON | ✅ | ✅ | ❌ |

---

## 🛡️ Sécurité

- Les PINs sont **chiffrés** (bcrypt) sur le serveur – personne ne peut les lire
- Les sessions durent **12 heures** puis expirent automatiquement
- Chaque action est enregistrée dans le **journal d'audit** avec : utilisateur, rôle, date, heure, description
- Le token JWT est stocké dans le navigateur et invalidé à la déconnexion

---

## ❓ Questions fréquentes

**Q : Que se passe-t-il si internet est coupé à N'Djamena ?**
R : L'outil devient inaccessible pendant la coupure. Les données sont toujours sur le serveur et disponibles dès que la connexion revient. Conseil : exportez un JSON en backup chaque semaine.

**Q : Plusieurs personnes peuvent-elles modifier en même temps ?**
R : Oui, mais le dernier à sauvegarder écrase les modifications des autres. Pour l'usage terrain (1-2 personnes actives simultanément), ce n'est pas un problème.

**Q : Peut-on utiliser les deux versions (HTML simple + serveur) ?**
R : Oui. Le fichier `ARSAT_Gestion_Projet.html` reste fonctionnel en local. La version serveur (`index.html`) est pour le travail collaboratif. Vous pouvez exporter un JSON depuis l'une et l'importer dans l'autre.

---

*Document préparé par Wise-Group Engineering – Projet ARSAT Labo Réf. 25118-GE*
