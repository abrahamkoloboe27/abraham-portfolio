# Guide d'administration

Comment piloter le site au quotidien depuis la console.

---

## Se connecter

Rendez-vous sur l'URL de l'administration (`http://localhost:5173` en local,
`https://admin.<votre-domaine>` en production) et connectez-vous avec l'adresse
du compte propriétaire.

> **À faire au premier accès** : changer le mot de passe initial. Le changement
> révoque automatiquement toutes les autres sessions ouvertes.

---

## Comprendre l'édition bilingue

Chaque champ traduisible affiche deux onglets **FR** et **EN**. Un point (`·`)
à côté du code langue signale que cette version est encore vide.

Un champ non traduit n'est jamais bloquant : le site affiche l'autre langue à la
place. Vous pouvez donc publier en français et compléter l'anglais plus tard.

---

## Composer la page d'accueil

**Apparence → Sections du site.**

La page d'accueil est la liste ordonnée de ces sections. Chacune possède :

| Champ | Rôle |
| --- | --- |
| **Clé technique** | Identifiant unique, sert d'ancre (`#experience`) |
| **Type** | Détermine le rendu (voir tableau ci-dessous) |
| **Titre / Sous-titre** | En-tête affiché, bilingue |
| **Contenu libre** | Markdown, utilisé par les types « Texte libre » et « Personnalisée » |
| **Nombre d'éléments** | Limite d'items affichés (réalisations, articles…) |
| **Visible** | Masque la section sans la supprimer |

| Type | Ce qu'il affiche |
| --- | --- |
| Hero | En-tête : nom, titre, accroche, liens sociaux, citation |
| Chiffres clés | Les entrées de *Apparence → Chiffres clés* |
| À propos | La biographie des paramètres, ou le contenu libre s'il est rempli |
| Expériences | La frise du parcours professionnel |
| Compétences | Les catégories et leurs compétences |
| Réalisations | Les projets publiés, les mis en avant d'abord |
| Formations | Les interventions mises en avant |
| Playlists | Les playlists vidéo |
| Certifications / Formation suivie | Les entrées correspondantes |
| Blog | Les derniers articles publiés |
| Recommandations | Les témoignages |
| Contact / Appel à l'action | Bloc de conversion avec bouton |
| Texte libre / Personnalisée | Votre Markdown, tel quel |

**Réordonner** : bouton *Réordonner*, glissez les lignes, puis *Enregistrer
l'ordre*.

**Ajouter une section** : *Nouveau*, choisissez un type, donnez une clé unique.
Elle apparaît sur le site sans aucun déploiement.

---

## Publier une réalisation

**Contenus → Réalisations → Nouveau.**

1. **Titre** en français : le slug se remplit automatiquement.
2. **Résumé** — deux phrases, visibles sur les cartes et dans les partages.
3. **Contenu** en Markdown : contexte, architecture, ce que vous en retenez.
4. **Classement** : catégorie, tags, technologies, mise en avant.
5. **Liens** : dépôt GitHub, démo, article associé.
6. **Contexte** : rôle, client, période, résultats chiffrés.
7. **Statut → Publié**, puis *Créer*.

Tant que le statut est **Brouillon**, la réalisation reste invisible du public —
mais vous la voyez sur le site si vous êtes connecté à l'administration dans le
même navigateur.

### Résultats chiffrés

Le bloc *Résultats chiffrés* produit les encadrés de la page de détail :

| Valeur | Libellé FR | Libellé EN |
| --- | --- | --- |
| −40 % | Coûts BigQuery | BigQuery costs |
| 12 h | Gagnées par semaine | Saved per week |

Ce sont les éléments qu'un recruteur retient : privilégiez-les aux descriptions
de stack.

---

## Écrire un article

**Contenus → Articles → Nouveau.**

- L'**accroche** laissée vide est générée depuis le contenu.
- Le **temps de lecture** est calculé automatiquement à l'enregistrement.
- La **date de publication** peut être future : l'article n'apparaîtra qu'à
  cette date.
- **Publié ailleurs (URL)** ajoute un lien vers l'original en fin d'article.

Le Markdown supporte les tableaux, les listes de tâches et les blocs de code
colorisés (```` ```python ````).

---

## Documenter une formation

**Communauté → Formations & interventions.**

Renseignez d'abord l'**organisation** (*Communauté → Organisations*) — Python
Bénin, Africa TechUp Tour, GrowUp AI… — puis reliez-y vos interventions.

Champs qui font la différence : le **dépôt de support** (les participants le
retrouvent), le **nombre de participants** et la **vidéo**.

---

## Gérer les médias

**Médias** : téléversez images et PDF (10 Mo maximum). Formats acceptés : JPEG,
PNG, WebP, GIF, SVG, PDF.

Le bouton *URL* copie l'adresse publique du fichier, réutilisable partout.
Téléverser deux fois le même fichier ne le duplique pas : l'entrée existante est
réutilisée.

Depuis n'importe quel champ image, *Bibliothèque* ouvre le sélecteur et permet
aussi de téléverser à la volée.

---

## Paramètres du site

**Administration → Paramètres du site**, en cinq onglets :

| Onglet | Contenu |
| --- | --- |
| **Identité** | Nom, intitulé de poste, accroche, biographie, citation, badge de disponibilité |
| **Contact** | Email public, téléphone, localisation, lien de prise de rendez-vous |
| **Visuels & CV** | Photo, logo, image de partage, favicon, URL des CV FR et EN |
| **SEO** | Titre et description par défaut, mots-clés |
| **Avancé** | Langue par défaut, thème (JSON), fonctionnalités, mode maintenance |

Le bouton d'enregistrement ne s'active que si quelque chose a changé, et seuls
les champs modifiés sont envoyés.

---

## Partager l'accès

**Administration → Accès & invitations → Inviter.**

Choisissez le rôle le plus restreint qui permette le travail attendu :

| Rôle | Pour qui |
| --- | --- |
| **Lecteur** | Consulter les statistiques et les contenus, sans rien modifier |
| **Éditeur** | Rédiger et publier des contenus |
| **Administrateur** | Éditer et inviter des membres |
| **Propriétaire** | Vous — contrôle total |

L'invité reçoit un lien valable 7 jours et choisit lui-même son mot de passe :
vous ne partagez jamais le vôtre.

> Sans SMTP configuré, le lien s'affiche **une seule fois** après création.
> Copiez-le à ce moment-là.

Pour retirer un accès : basculez *Actif* sur off (réversible) ou supprimez le
compte (définitif, réservé au propriétaire).

---

## Suivre l'activité

**Tableau de bord** : volumes de contenus, audience sur 30 jours, pages les plus
vues, sources de trafic, derniers messages.

**Messages** : boîte de réception, avec archivage, marquage spam et notes
internes. *Répondre* ouvre votre client mail et horodate la réponse.

**Journal d'activité** : qui a modifié quoi et quand, avec l'adresse IP.
Utile lorsque plusieurs personnes administrent le site.

---

## Questions fréquentes

**Je ne vois pas ma réalisation sur le site.**
Vérifiez que le statut est *Publié*, que *Visible* est activé et que la date de
publication n'est pas dans le futur.

**J'ai modifié un contenu, le site affiche encore l'ancienne version.**
Les pages sont mises en cache 5 minutes. Attendez, ou rechargez avec
Ctrl+Maj+R.

**Une section a disparu de la page d'accueil.**
*Apparence → Sections du site* : la case *Visible* est probablement décochée.

**Comment masquer temporairement le blog ?**
Décochez *Visible* sur la section « blog » et retirez le lien correspondant dans
*Apparence → Navigation*.

**J'ai perdu mon mot de passe.**
Utilisez « Mot de passe oublié ? » sur l'écran de connexion (nécessite SMTP).
Sinon, en ligne de commande :

```bash
docker compose exec api python -c "
from app.core.security import hash_password
print(hash_password('NouveauMotDePasse123!'))
"
# puis mettez à jour la colonne users.hashed_password
```
