# SILLO 8 : les angles morts

> Document de travail, octobre 2026. Il ne change rien au jeu.
> **But :** repérer ce à quoi personne n'a encore pensé et qui comptera pour que le jeu soit vraiment
> bon et complet. Il s'appuie sur le README, les documents `HISTOIRE_PROPOSITION.md`,
> `RECHERCHE_ENQUETE.md` et `MECHANICS.md`, le code de l'étage 1 et les captures d'écran.
> `MEFIANCE_SURVIVANTS.md` est en cours d'écriture par ailleurs : il n'est pas pris en compte ici.
>
> **Comment le lire :** le top 10 d'abord (le plus important en premier), puis le reste par thème, puis
> les décisions à prendre. Chaque point du top 10 se termine par **la question à poser**.

**Sommaire**
1. En une minute
2. Le top 10 des angles morts
3. Le reste, par thème : histoire · game design · production · expérience joueur · son · distribution · monétisation · organisation
4. Décisions à prendre bientôt

---

## 1. En une minute

L'étage 1 est joli, tourne sur téléphone et sur ordi, et son histoire est bien écrite sur papier. Mais
**ce qui doit faire le jeu (l'enquête) n'existe pas encore à l'écran**, alors que ce qu'il ne doit pas
être (un jeu d'action) se voit tout de suite. Plusieurs choses fragiles comptent beaucoup avant d'ajouter
trois étages : les sauvegardes, l'équilibre des ressources, le secret de Lou, le nom du jeu et le
rangement du projet.

---

## 2. Le top 10 des angles morts

### 1. Le cœur du jeu, l'enquête, n'a jamais été joué

**Ce qu'on voit aujourd'hui.** L'étage 1 jouable est une suite de courses : trouver 3 ferrailles,
relancer la génératrice, trouver 2 ferrailles, fabriquer un module, lire une note, pousser un mur. Le
**tableau d'enquête** (relier des contradictions, compléter des phrases à trous), les gros plans, la
lampe UV, les pensées du héros, les survivants : tout cela n'existe que dans la proposition d'histoire.

**Le risque concret.** On construit trois étages de décor et de textes autour d'une mécanique que
personne n'a essayée. Or c'est la plus difficile à réussir, surtout sur un téléphone tenu en
portrait : glisser une carte sur une autre dans un écran de 6 pouces, lire une banque de mots, savoir
qu'on a « assez » d'indices. Si le tableau est pénible, le jeu entier l'est.

**Recommandation.** Arrêter d'ajouter du décor tant que le tableau n'a pas été prototypé et testé.
D'abord une maquette (même sur papier ou en images cliquables) avec les 7 contradictions et les 4
phrases de l'étage 1, puis 5 joueurs qui ne connaissent pas l'histoire, dont 3 sur téléphone. On mesure :
ont-ils compris quoi faire, combien de temps, ont-ils trouvé l'opératrice sans essayer toutes les
combinaisons, savent-ils raconter l'histoire après ?

**Question à poser.** *« Es-tu d'accord pour geler le décor et les étages 2 à 4 jusqu'à ce qu'une
version jouable du tableau d'enquête ait été testée par 5 personnes ? »*

---

### 2. Le secret de Lou contredit la promesse « on découvre en même temps que le héros »

**Ce qu'on voit.** La promesse du jeu : le joueur découvre en même temps que le héros. Or Lou a un
secret sur la raison de sa venue, qu'il connaît et que le joueur ignore. Et la proposition d'histoire
écrit encore « pas de famille, pas de lien avec le silo », ce qui ne colle plus.

**Le risque concret.** Deux pièges classiques.
- **Le narrateur qui cache** (le procédé du *Meurtre de Roger Ackroyd*) : si les pensées de Lou évitent
  son secret pendant trois étages, le joueur se sentira trompé à la révélation au lieu d'être ébloui.
- **Le faux coupable évident** : dans une enquête, un héros qui cache quelque chose et que les survivants
  soupçonnent devient le premier suspect dans la tête du joueur. S'il est innocent, il faut que ce soit
  un plaisir de le découvrir, pas une déception (« tout ça pour ça »).

Et comme les indices doivent être plantés dès l'étage 1, **le secret doit être décidé maintenant**, pas
à l'étage 3.

**Recommandation.**
- Montrer **qu'il y a** un secret dès la première minute, sans dire lequel : un objet dans la sacoche
  que Lou refuse d'examiner (« Pas maintenant. »), une photo pliée, un nom qu'il a sursauté en lisant.
  Le joueur sait que Lou cache quelque chose : c'est une question de plus, pas un mensonge.
- Règle d'écriture : **les pensées de Lou peuvent se taire, jamais mentir.**
- 2 ou 3 indices du secret par étage, dans la même logique de fair-play que l'enquête.
- Écrire dès maintenant le secret complet en 5 lignes dans une « bible » (voir n° 10).

**Question à poser.** *« Quel est le secret de Lou, en une phrase ? Et le joueur doit-il savoir dès le
début que Lou cache quelque chose, ou le découvrir en même temps que les survivants ? »*

---

### 3. Le jeu ressemble à un jeu d'action dès la première seconde

**Ce qu'on voit.** Sur téléphone, le plus gros bouton dit **FRAPPER**. Le menu liste d'abord viser,
frapper, tirer, éblouir, recharger. Le code place **10 zombies** à l'étage 1 (la proposition en prévoit
5), dont un au milieu du hub. Le tutoriel apprend à frapper. Le lance-clous tire 16 clous et l'étage en
fournit environ 80.

**Le risque concret.** La première impression décide de qui reste. Un joueur qui vient pour un jeu de
zombies trouvera l'action pauvre ; un joueur qui vient pour une enquête croira s'être trompé de jeu. Les
avis et les captures d'écran vendront un jeu d'action moyen au lieu d'une enquête rare.

**Recommandation.**
- Gros bouton principal sur téléphone : **EXAMINER / ✋**. FRAPPER devient un bouton secondaire.
- 5 mordus à l'étage 1, comme dans la proposition, chacun avec son habitude et son indice.
- Le lance-clous arrive plus tard, ou reste rare. La clé à molette et la lampe suffisent à l'étage 1.
- Le menu et la page de présentation parlent d'abord du mystère : « Qui a ouvert la chambre 1 ? ».
- Les objectifs affichés deviennent des **questions** (« Qui est resté ? ») plutôt qu'une liste de tâches
  « 0/5 ».

**Question à poser.** *« Peut-on réduire l'étage 1 à 5 mordus évitables, et faire d'EXAMINER le bouton
principal, même si le jeu paraît moins "action" sur les captures ? »*

---

### 4. Les sauvegardes peuvent faire perdre une partie entière

**Ce qu'on voit.**
- **Une seule sauvegarde.** « Nouvelle descente » l'écrase sans demander confirmation.
- **Sauvegarde automatique toutes les 30 secondes**, même en plein danger. Si elle tombe quand Lou a 5
  points de vie, sans soin, un mordu à côté, le joueur recharge… et meurt encore. C'est une boucle sans
  issue.
- **Chaque mise à jour du jeu peut invalider les sauvegardes.** Le format est vérifié de façon stricte :
  un nouveau champ (le tableau d'enquête, par exemple) rendra les anciennes « invalides ».
- **Sur iPhone**, Safari efface les données d'un site non visité depuis 7 jours, sauf s'il a été ajouté à
  l'écran d'accueil. Un joueur qui revient après deux semaines repart de zéro.
- La « confiance » des survivants existe dans le code mais n'est **pas sauvegardée**.

**Le risque concret.** Perdre une heure d'enquête est la pire chose qui puisse arriver dans ce genre de
jeu. C'est ce qui fait abandonner, et écrire un mauvais avis.

**Recommandation.**
- Trois emplacements : **début d'étage** (jamais écrasé en cours d'étage), **dernier lieu sûr**
  (sauvegarde automatique seulement hors danger : aucun mordu proche, vie au-dessus de 30 %), et
  **manuel**.
- Confirmation avant d'écraser.
- Une règle de « traduction » des anciennes sauvegardes à chaque changement de format, avec un test.
- Proposer l'installation sur l'écran d'accueil (voir PWA), et un **code de sauvegarde** à copier pour
  changer d'appareil.

**Question à poser.** *« Combien de temps de jeu un joueur peut-il perdre au pire, après une mort ou une
mise à jour : 2 minutes, 10 minutes, jamais ? »*

---

### 5. Les ressources peuvent bloquer la partie, ou ne servir à rien

**Ce qu'on voit.**
- L'étage contient **8 ferrailles**. La génératrice en prend 3, la radio 2, l'amélioration de la lampe 3,
  et la presse transforme 1 ferraille en clous. Un joueur qui améliore sa lampe et fait des clous avant la
  radio **ne peut plus jamais la réparer**. L'objectif reste affiché « 1/2 » pour toujours.
- La radio n'est d'ailleurs pas obligatoire pour finir : on peut descendre sans l'avoir réparée et
  **rater toute la fin prévue** (la voix d'Okafor, le signal « VIENS »).
- La **borne de recharge est gratuite et illimitée**. Or la proposition fait de la rareté des piles le
  cœur du drame. Avec une borne infinie, une pile ne vaut rien et le dilemme « figer ou voir » disparaît.
- Les deux survivants demandent **1 pile** et **1 bandage**. Si le joueur les a déjà utilisés, la petite
  quête est impossible.

**Le risque concret.** Des parties bloquées sans que le joueur le sache, et une tension de survie qui
n'existe que sur le papier.

**Recommandation.**
- Règle d'or : **rien de nécessaire à l'histoire ne peut être dépensé ailleurs.** Les pièces de la radio
  sont réservées (ou une réserve de secours apparaît), la pile et le bandage demandés restent
  trouvables jusqu'à la fin de l'étage.
- La radio devient obligatoire pour descendre, ou la fin de l'étage se joue à l'escalier même sans elle.
- La borne recharge une seule fois par visite, ou se vide à chaque usage.
- Un tableau de ressources par étage (combien de chaque, où, pour quoi) et un test automatique qui
  joue les pires choix possibles et vérifie qu'on peut toujours finir.

**Question à poser.** *« Veux-tu que la survie soit vraiment serrée (on peut se retrouver à court de
lumière), ou seulement une ambiance, avec un filet de sécurité qui empêche tout blocage ? »*

---

### 6. Rien n'est prévu pour fabriquer les étages 2, 3 et 4

**Ce qu'on voit.** Tout est écrit pour un seul étage : le plan, les objectifs, les zombies, les notes,
la sauvegarde. Le décor de l'étage 1 représente environ **3 600 lignes de code écrites à la main**. La
proposition d'histoire prévoit, pour un seul étage, environ 33 cartes d'indices, 20 nouveaux documents,
14 gros plans, 25 pensées, 12 événements, 3 énigmes, 2 survivants avec dialogues, 7 contradictions et 4
phrases à trous.

**Le risque concret.** Multiplié par quatre, cela donne environ **130 cartes, 50 gros plans, 12 énigmes,
8 survivants et 15 000 à 20 000 mots** de texte, tous reliés entre eux. Sans outil, chaque oubli (un
indice qu'on ne peut pas trouver, un mot de la banque qui n'apparaît jamais, une énigme dont la solution
est dans une pièce fermée) casse l'enquête, et personne ne s'en aperçoit avant un joueur.

**Recommandation.**
- Décrire un étage comme des **données** (pièces, portes, objets, indices, énigmes, survivants) plutôt
  que comme du code, avec un « kit » d'objets de décor réutilisables.
- Un **vérificateur d'enquête** automatique : chaque conclusion a au moins 3 indices dans 2 pièces,
  chaque indice est trouvable avant d'en avoir besoin, chaque mot de la banque est gagnable, aucune
  énigme ne dépend d'une pièce fermée par elle-même.
- Finir et publier l'étage 1 **complet** (enquête comprise) avant de commencer l'étage 2.

**Question à poser.** *« Combien de temps es-tu prêt à donner à chaque étage, et préfères-tu 4 étages
riches ou 4 étages plus courts mais tous finis ? »*

---

### 7. Le nom « SILLO 8 » : faute de frappe apparente et ressemblance avec *Silo*

**Ce qu'on voit.** « SILLO » ressemble à une faute de frappe de « silo ». Et l'idée d'ensemble (un silo
souterrain numéroté, à étages, des mensonges sur l'origine, des habitants méfiants) rappelle beaucoup
*Silo*, les romans de Hugh Howey et la série d'Apple TV+, où les silos portent des numéros.

**Le risque concret.** Un jeu introuvable dans les moteurs de recherche (« vous vouliez dire silo ? »),
perçu comme une copie, et un risque, même faible, sur la marque. Le nom choisit aussi l'icône, le domaine
et les pages sur les boutiques : plus on attend, plus il coûte de le changer.

**Recommandation.** Une heure de vérification (recherche web, boutiques, noms de domaine, base de
marques). Garder « SILLO 8 » comme nom de travail, et choisir le nom public avant toute publication. Si
on garde le nom, ajouter un sous-titre qui dit le genre (« SILLO 8 : l'enquête »).

**Question à poser.** *« Le double L de SILLO est-il voulu, et que veut-il dire ? Accepterais-tu de
changer de nom si la vérification montre une trop grande proximité avec Silo ? »*

---

### 8. Des restes de SILO 9 encore visibles, dont un qui peut coûter de l'argent

**Ce qu'on voit.**
- Dans **Réglages**, le joueur voit une section « Dialogues par IA (facultatif, histoire à venir) » qui
  demande une adresse de serveur et un identifiant de modèle. Incompréhensible pour un joueur.
- Le jeu contient une **porte d'accès vers une IA** (`/api/dialogue`). Si une clé d'IA est configurée sur
  le serveur, **n'importe qui sur Internet peut l'utiliser** sans limite, et c'est le propriétaire de la
  clé qui paie.
- `narrative.json`, `dialogue.ts` et `story.ts` parlent encore de MÈRE, de N-7, de relais, de noyau ; un
  écran de « décision irréversible » à deux choix existe encore.
- Le héros s'appelle « operator » dans le code, alors que l'histoire a maintenant une **opératrice de
  nuit** : confusion assurée pour quiconque travaille sur le projet.
- Le projet s'appelle encore « silo9-toon », et la branche « claude/silo9-toon-web ».

**Faut-il garder l'IA conversationnelle ?** Non, pour ce jeu. Une enquête à la Christie repose sur des
dialogues **exacts** : chaque réplique est un indice, et le fair-play exige que le jeu ne dise ni plus ni
moins que prévu. L'IA actuelle ne fait d'ailleurs que choisir parmi des phrases écrites d'avance ; elle
ajoute un coût, une dépendance à Internet, une question de vie privée (le texte tapé part vers un
service tiers) et un risque de révéler la solution. Les dialogues écrits de la proposition sont
meilleurs. On peut garder l'idée de **confiance** des survivants, utile pour la méfiance, sans l'IA.

**Recommandation.** Retirer l'IA, la section des réglages et la route serveur, en gardant une copie
étiquetée dans l'historique. Renommer le héros dans le code (« lou » ou « hero »). Remplacer les écrans
MÈRE/N-7 par les vrais écrans de fin d'étage.

**Question à poser.** *« Es-tu d'accord pour retirer complètement l'IA de dialogue et la remplacer par
des dialogues écrits ? »*

---

### 9. Des indices que tout le monde ne pourra pas percevoir, et un contenu qui peut heurter

**Ce qu'on voit.**
- Des indices clés reposent sur **une couleur** (la lampe **verte** contre la lanterne **blanche**, des
  lueurs vertes dans un décor aux tons jaunes) ou sur **le son** (Marceau qui ne grogne pas, les trois
  coups dans la chambre froide, le signal en morse « VIENS »).
- Tous les textes sont en **écriture manuscrite**, sans réglage de taille.
- Aucun mode « sans tension » pour qui veut seulement l'enquête.
- Quand le téléphone sonne ou qu'on change d'application, le jeu sauvegarde mais **ne se met pas en
  pause** : au retour, on est en plein jeu, peut-être à côté d'un mordu.
- L'histoire contient une enfant disparue (Lila), un mari devenu mort-vivant, une veuve qui se sent
  coupable. Le style « jouet » attirera des enfants.

**Le risque concret.** Des joueurs bloqués sans savoir pourquoi (daltonisme : environ 1 homme sur 12 ;
jeu sans le son : la majorité des joueurs sur téléphone dans les transports), et des parents surpris.

**Recommandation.**
- Chaque indice de couleur a un double en forme ou en texte (« verre **vert** », filtre ébréché). Chaque
  indice sonore a un double visuel (sous-titres des sons : « [trois coups, réguliers] », « [aucun
  bruit] »), et le morse s'affiche aussi en traits et en points.
- Réglages : taille du texte, police plus lisible, sous-titres des sons, mode « enquête seule » (mordus
  passifs), pause automatique à la sortie de l'application.
- Un avertissement de contenu court au lancement, et un âge visé décidé (voir les décisions).

**Question à poser.** *« Veux-tu un mode "enquête seule", où les mordus ne peuvent pas tuer Lou, pour les
joueurs qui ne veulent que le mystère ? »*

---

### 10. Le projet n'a ni branche principale, ni bible, ni journal des décisions

**Ce qu'on voit.**
- La branche **main** ne contient que le premier commit ; tout le jeu est sur
  « claude/silo9-toon-web ». Il reste **23 branches de travail** d'agents.
- L'historique pèse **320 Mo**, surtout à cause des captures d'écran régénérées (72 Mo à elles seules).
- Les documents se contredisent : `RECHERCHE_ENQUETE.md` cite encore Firmin, l'intendante Corbière et la
  Lune-pâle, qui n'existent plus ; la proposition dit que le héros n'a aucun lien avec le silo, ce qui ne
  tient plus avec le secret de Lou.
- Plusieurs agents écrivent en parallèle sur l'histoire. Aucune page ne dit ce qui est **décidé** et ce
  qui est **proposé**.

**Le risque concret.** Publier la mauvaise version (un hébergeur publie souvent main : un site vide),
perdre une décision prise à l'oral, ou voir un agent réintroduire un personnage abandonné.

**Recommandation.**
- Fusionner le travail dans **main**, étiqueter « v0.1 étage 1 », supprimer les branches de travail
  terminées.
- Ne plus enregistrer les captures à chaque vérification (les garder hors de l'historique, ou seulement
  pour les versions publiées).
- Créer une **bible** (une page : les noms, la chronologie, les règles des mordus, le secret de Lou, ce
  qui ne sera jamais contredit) et un **journal des décisions** (une ligne par décision, avec la date).
  Tout agent la lit avant d'écrire.

**Question à poser.** *« Peut-on faire de main la branche officielle du jeu, et tenir une bible et un
journal des décisions que tous les agents doivent lire ? »*

---

## 3. Le reste, par thème

### A. Histoire et enquête

**Trous logiques et chronologie**
- **Combien de jours entre l'orage et l'arrivée de Lou ?** La chronologie s'arrête à « Après » puis
  « Jour 0 ». Ce chiffre décide de tout : l'opératrice enfermée a-t-elle de l'eau ? Cuisine tient-il avec
  des pêches ? Depuis quand Lila est-elle sortie ? Proposition : 3 à 5 jours, et un point d'eau dans le
  local technique.
- **Quel âge a Lila ?** « Lettres d'enfant », « la petite », « gamine », un arrosoir d'enfant… mais elle
  est aide d'infirmerie, porte des piles la nuit, garde la clé de l'étage et sort seule vers les épaves.
  Une adolescente de 14 ou 15 ans rend tout plus crédible, et moins dur à raconter.
- **Combien de temps met une morsure à transformer ?** Le guetteur, Marceau (11 jours sous les lampes),
  l'infirmier : la règle doit être fixée une fois pour les 4 étages.
- **Pourquoi Okafor a-t-elle laissé Cuisine et l'opératrice ?** Une phrase suffit (ils n'ont pas répondu,
  il fallait partir avant la nuit), mais il la faut.
- **Pourquoi Lou arrive-t-il maintenant, ici ?** C'est le secret : il doit expliquer aussi le moment.

**Si le joueur rate des indices**
- Que se passe-t-il à l'étage 2 si l'affaire de l'étage 1 n'est pas résolue ? Il faut décider une fois
  pour toutes (voir les décisions) : on peut la résoudre plus tard, ou elle reste ouverte.
- Peut-on remonter à l'étage 1 ? Si non, un indice dormant raté est perdu pour toujours.
- Les objets portés par un mordu abattu doivent rester ramassables, même s'il tombe contre un mur.

**Rejouabilité et fins**
- Une enquête se rejoue mal une fois la solution connue. Plutôt que des fins très différentes, viser :
  un **rapport d'enquête** en fin d'étage (« 6 vérités sur 8 trouvées »), qui donne envie de tout
  trouver ; et 2 ou 3 fins à l'étage 4, selon des choix moraux faits en route (dénoncer ou couvrir
  l'opératrice, donner ou garder la pile, ce que Lou fait de son secret).
- Ne pas promettre de fins multiples à chaque étage : le travail serait multiplié par deux à chaque fois.

**Rythme sur 4 étages**
- Durée cible à fixer : par exemple 45 à 60 minutes par étage, soit 3 à 4 heures en tout.
- Sur téléphone, on joue 10 à 15 minutes d'affilée : chaque pièce doit pouvoir se finir dans ce temps,
  et le carnet doit rappeler « où j'en étais » au retour.
- Prévoir un moment calme (un survivant, un refuge) au milieu de chaque étage, et varier : l'étage 2 ne
  doit pas refaire « 3 pièces, un générateur, une clé ».

**Restes de SILO 9 et cohérence**
- Voir le n° 8. Ajouter : l'étiquette « LE BRICOLEUR » du menu devrait dire « LOU ». Le portrait du menu
  (cheveux longs sur une ancienne capture) doit correspondre au jeune homme de la fiche.

**Méfiance et fair-play**
- Les survivants peuvent mentir ; **le jeu, jamais**. Ni les notes « canon », ni les pensées de Lou, ni
  l'interface. À écrire dans la bible.

### B. Game design

**La boucle minute par minute (à viser)**
1. Entrer dans une pièce : une scène muette qui pose une question.
2. Examiner 2 à 4 choses : gros plan, pensée de Lou, une carte s'ajoute au carnet.
3. Un petit obstacle : un mordu à contourner, un cadenas, un survivant méfiant.
4. Une petite réponse, et une nouvelle question, qui envoie ailleurs.
5. De temps en temps : le tableau, une déduction, une porte qui s'ouvre.

Aujourd'hui, seule l'étape 3 existe vraiment (et surtout sous forme de combat).

**Difficulté**
- Deux réglages séparés : **survie** (dégâts, ressources) et **enquête** (quand l'aide arrive). Un bon
  enquêteur peut être un mauvais combattant, et l'inverse.
- La flèche d'objectif et les astuces automatiques ne doivent **jamais** pointer vers la réponse d'une
  déduction. Il faut décider quels objectifs elles montrent quand l'enquête existera.

**Mort**
- Aujourd'hui on ne perd presque rien (retour à la dernière sauvegarde, 30 secondes au plus), sauf dans
  la boucle décrite au n° 4. Il faut choisir : la mort coûte du temps, des ressources, ou rien.
  Proposition : retour au dernier lieu sûr, ressources ramassées depuis perdues, indices **jamais**
  perdus.

**Si un survivant meurt**
- Dans la proposition, les survivants sont enfermés et ne peuvent pas mourir. Si la méfiance ajoute des
  survivants qui bougent ou suivent Lou, il faut décider : ils ne meurent pas (le plus simple), ou leur
  témoignage existe aussi ailleurs (une note, un enregistrement), pour ne pas bloquer l'enquête.

**Énigmes et sauvegarde**
- Une énigme à moitié faite (deux leviers sur quatre) n'est pas sauvegardée. Règle simple : une énigme
  se remet à zéro au chargement, et ce qu'on a lu pour la résoudre reste au carnet.
- Le cadenas à lettres « PECHES » : prévoir que le joueur tape « PÊCHES » avec l'accent, et sur un
  clavier de téléphone.
- Tester que le tableau ne se résout pas en essayant tout (la proposition le signale pour la phrase C4).

**Passage d'étage**
- Ce qui passe à l'étage suivant : l'inventaire (la rareté monte), le carnet, les questions sans
  réponse, la confiance des survivants, l'état des affaires résolues ou non. À écrire avant l'étage 2.

### C. Production

- **Volume** : environ 4 000 mots de texte visible par étage, 15 000 à 20 000 pour le jeu ; environ 35
  cartes d'indices par étage. Relecture et correction à prévoir (orthographe, cohérence).
- **Décor** : chaque étage a besoin de sa palette, de ses objets propres et d'un « kit » commun. Faire
  la liste des objets nécessaires à l'enquête de l'étage 1 et vérifier qu'ils sont **lisibles en vue de
  dessus** sur téléphone (un éclat de verre vert de 2 cm ne se voit pas).
- **Tests** : garder le test qui joue l'étage de bout en bout ; ajouter le vérificateur d'enquête
  (n° 6), le test des pires choix de ressources (n° 5), et un test de chargement des anciennes
  sauvegardes (n° 4).
- **Tests avec des joueurs** : 5 à 7 personnes par étage, filmées ou observées sans aide. La meilleure
  mesure : « raconte-moi ce qui s'est passé ».
- **Arrêt du contenu** : fixer une date après laquelle l'étage 1 ne change plus que pour des corrections.

### D. Expérience joueur

**Première impression et accueil**
- Les 30 premières secondes doivent vendre le mystère : la craie sur la porte, la voix à la radio. Pas
  une bulle « déplacez-vous » ni un bouton FRAPPER.
- Le tableau d'enquête aura besoin de son propre petit tutoriel, au premier usage, avec une déduction
  facile et guidée.

**Téléphone**
- Portrait : vérifier que la vue de dessus montre assez de pièce devant Lou, et que le tableau tient
  sans glisser-déposer minuscule (prévoir « toucher une carte, puis toucher l'autre »).
- Passage portrait / paysage en pleine partie : à tester sur chaque écran (carnet, tableau, énigmes).
- Taille minimale du texte : 16 px, plus grand pour les documents à lire.

**Manette**
- Le jeu se joue à la manette, mais les menus, le carnet et le futur tableau doivent aussi se
  parcourir à la manette (et au clavier seul).

**Interruptions et appareils**
- Pause automatique quand l'application passe en arrière-plan (appel, notification, onglet fermé).
- Sur iPhone, après un passage en arrière-plan, l'écran 3D peut devenir noir : à tester et à prévoir.
- La scène 3D semble continuer à se dessiner derrière le menu et la pause : à vérifier, car cela vide la
  batterie et fait chauffer le téléphone. Prévoir aussi une limite à 30 images par seconde en mode
  performance.
- Tester sur un vieux téléphone Android d'entrée de gamme (3 ou 4 ans) et un vieil iPhone, pas seulement
  dans le simulateur.

**Hors ligne et installation**
- Le jeu n'a ni icône, ni manifeste, ni fonctionnement hors ligne. Une installation sur l'écran
  d'accueil (PWA) donnerait le plein écran sur téléphone, un jeu jouable dans le métro, et protégerait
  les sauvegardes sur iPhone.

**Accessibilité** : voir le n° 9. Ajouter : réduire les tremblements d'écran et les clignotements
(néons, génératrice) pour les personnes sensibles.

### E. Son et musique

- **iPhone** : le son ne démarre qu'après un premier toucher, et le bouton « silencieux » coupe tout. Le
  jeu ne doit donc **jamais** exiger le son pour avancer.
- **Indices sonores** : chacun a un sous-titre (voir le n° 9). Le silence de Marceau est une belle idée,
  mais il doit aussi se voir (aucune bulle de grognement, aucune poussière de pas).
- **Voix** : un doublage complet coûte cher, se refait à chaque traduction et pose la question de
  l'accent (Québec ou France). Proposition : pas de voix parlées, des « grommelots » (sons de voix sans
  mots), des grésillements radio et du texte.
- **Musique par étage** : un thème par étage (les quartiers de vie, les réserves, les machines, le
  fond), qui se dégrade en descendant. Une musique qui se coupe près d'un danger aide aussi le joueur.
- **Réglages** : volumes séparés (musique, effets, ambiance), et une option « pas de musique ».
- **Droits** : noter la source et la licence de chaque son dans `NOTICES.md` dès le premier fichier.

### F. Distribution

**Où publier**
- **Lien web** (Vercel) : simple, mais l'offre gratuite de Vercel est réservée à un usage **non
  commercial**. Si le jeu devient payant ou reçoit des dons, il faut l'offre payante ou un autre
  hébergeur.
- **itch.io** : idéal pour un premier épisode, accepte les jeux en une page, permet le « payez ce que
  vous voulez ». Le jeu sait déjà se construire en une page, mais **sans la route d'IA** (une raison de
  plus de la retirer).
- **Portails de jeux web** (CrazyGames, Poki) : beaucoup de joueurs, mais surtout en anglais, avec des
  publicités et peu adaptés à une enquête lente.
- **Boutiques mobiles** : Google Play est accessible (enveloppe autour du site) ; l'App Store demande
  un compte payant (99 $ par an), une enveloppe native et une validation. À garder pour plus tard.
- **Steam** : possible avec une enveloppe de bureau, 100 $ par jeu ; pertinent seulement pour les 4
  étages finis.

**Langue**
- Français standard ou québécois ? Attention aux mots qui changent de sens : au Québec, un « mordu »
  est aussi un passionné. Proposition : un français standard, avec quelques touches québécoises
  assumées dans la bouche de certains survivants.
- **Traduction anglaise** : les textes sont aujourd'hui écrits directement dans le code, ce qui rendra
  la traduction pénible. Surtout, plusieurs énigmes dépendent du français : le code « PECHES », le jeu
  sur « ma Nuit », le morse « VIENS ». Il faudra les adapter, pas seulement les traduire. Mieux vaut
  ranger les textes à part dès maintenant.

**Âge visé**
- Le style jouet attire les enfants ; l'histoire parle d'une enfant disparue, d'un mari mort-vivant et
  de culpabilité. Proposition : **12 ans et plus**, sans sang, avec un avertissement court.

**Droits**
- La **fiche du personnage** et la **carte de l'étage** viennent de générateurs d'images : elles ne sont
  pas dans le projet (le héros et le décor sont dessinés par code). Les garder comme références
  internes ; vérifier les conditions du générateur avant de s'en servir pour une icône, une affiche ou
  une boutique. Une image générée est souvent mal protégée par le droit d'auteur : un autre peut la
  réutiliser.
- **Polices** : leurs licences permettent l'usage, à condition de les citer. Ajouter un écran
  **Crédits** dans le menu.
- Il faudra des images pour la promotion (icône, bannière, captures, petite vidéo) : à prévoir.

**Vie privée**
- Aujourd'hui, tout reste dans le navigateur du joueur : c'est très bien.
- Si on ajoute des statistiques (utiles pour savoir où les joueurs bloquent), choisir un outil sans
  cookies et ajouter une courte page de confidentialité (la Loi 25 au Québec et le RGPD en Europe
  s'appliquent).
- Retirer l'IA supprime le seul cas où le texte du joueur partait vers un service tiers.

### G. Monétisation et durée de vie (pas une priorité)

- Pas de publicités dans une enquête : elles cassent l'immersion.
- Modèle simple : **étage 1 gratuit** (comme un épisode pilote), les 4 étages payants ou en « payez ce
  que vous voulez » sur itch.io.
- Durée de vie : 3 à 4 heures pour le jeu complet, plus le rapport d'enquête à compléter à 100 %.
  Les jeux d'enquête vivent par le bouche-à-oreille et les vidéos de joueurs : soigner les moments
  « à filmer » (la révélation, la fin d'étage).

### H. Organisation

- Voir le n° 10 : main comme branche officielle, une étiquette par version, ménage des branches,
  captures hors de l'historique.
- **Bible** et **journal des décisions** : courts, à jour, lus par chaque agent avant d'écrire.
- Renommer le projet dans les fichiers techniques (« silo9-toon » → le nom retenu).
- **Budget** : noter ce que coûte le projet (temps, abonnements, nom de domaine, comptes de boutiques,
  musique éventuelle) pour décider en connaissance de cause.
- **Sauvegarde du travail** : le projet est sur GitHub ; s'assurer que tout est bien poussé, y compris
  les documents.

---

## 4. Décisions à prendre bientôt

Chaque question est fermée. ⭐ = option recommandée.

**1. Le secret de Lou, côté joueur**
- A. ⭐ Le joueur sait dès la première minute que Lou cache quelque chose, sans savoir quoi.
- B. Le secret est totalement caché jusqu'à la révélation.
- C. Le joueur connaît le secret dès le début ; seuls les survivants l'ignorent.

**2. Les mordus de l'étage 1**
- A. ⭐ 5 mordus-personnages, lents, évitables, chacun porteur d'un indice.
- B. Garder les 10 actuels.
- C. 5 mordus-personnages, plus quelques anonymes seulement en difficulté élevée.

**3. Le bouton principal sur téléphone**
- A. ⭐ EXAMINER / ✋ devient le gros bouton ; FRAPPER passe en secondaire.
- B. Garder FRAPPER comme gros bouton.

**4. La borne de recharge des piles**
- A. ⭐ Elle recharge une fois par visite (il faut ressortir et revenir).
- B. Gratuite et illimitée, comme aujourd'hui.
- C. Supprimée : seules les piles trouvées comptent.

**5. Les sauvegardes**
- A. ⭐ Trois emplacements : début d'étage, dernier lieu sûr (automatique), manuel.
- B. Une seule sauvegarde, comme aujourd'hui, mais jamais en plein danger.
- C. Une sauvegarde au début de chaque étage seulement.

**6. Si le joueur n'a pas résolu l'affaire de l'étage**
- A. ⭐ Il peut descendre ; l'affaire reste ouverte et peut se résoudre plus tard, avec un indice bonus en bas.
- B. Il ne peut pas descendre sans avoir résolu.
- C. Il descend et la vérité de cet étage est perdue.

**7. Remonter aux étages précédents**
- A. ⭐ Oui, l'escalier reste ouvert dans les deux sens.
- B. Non, chaque étage se ferme derrière Lou.
- C. Seulement jusqu'au moment où l'étage suivant est résolu.

**8. L'IA de dialogue héritée de SILO 9**
- A. ⭐ La retirer (copie gardée dans l'historique) et écrire tous les dialogues.
- B. La garder cachée, en option pour les curieux.
- C. La développer pour les interrogatoires.

**9. Les voix**
- A. ⭐ Pas de voix parlées : texte, grommelots et grésillements radio.
- B. Seulement les voix à la radio, enregistrées.
- C. Doublage complet.

**10. La langue**
- A. ⭐ Français standard avec quelques touches québécoises ; textes rangés à part pour une traduction anglaise après l'étage 1.
- B. Français québécois assumé partout.
- C. Français et anglais dès maintenant.

**11. Le nom du jeu**
- A. Garder « SILLO 8 » tel quel.
- B. ⭐ Garder « SILLO 8 » comme nom de travail et choisir le nom public après vérification, avant la première publication.
- C. Changer de nom tout de suite.

**12. La première publication**
- A. ⭐ L'étage 1 complet (enquête comprise), gratuit, sur itch.io et un lien web, comme « épisode 1 ».
- B. Attendre que les 4 étages soient finis.
- C. Viser tout de suite les boutiques mobiles.

**À trancher aussi, plus vite encore :** l'âge visé (⭐ 12 ans et plus, ou 8 ans et plus avec une
histoire adoucie, ou 16 ans et plus) et la branche officielle (⭐ tout fusionner dans main et étiqueter
« v0.1 », ou laisser le travail sur la branche actuelle).
