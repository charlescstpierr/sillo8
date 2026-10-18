# SILLO 8 — La méfiance des survivants (et le secret de Lou)

> Document de conception, à valider. Il ne change aucun code. Il complète
> `HISTOIRE_PROPOSITION.md` (déjà mis à jour en conséquence, voir § 12) et suit les principes de
> `RECHERCHE_ENQUETE.md`. Les 7 notes canon de `game/notes.ts` restent mot pour mot.

**La demande, dans les mots de l'auteur :** « C'est important aussi que les étrangers, quand ils
croisent Lou, ils sont un peu réticents. "Hey, t'es qui ? C'est-tu toi qui as laissé rentrer les
zombies ? C'est-tu à cause de toi ? Depuis que t'es là…" Ça prend aussi une tension avec les
survivants. » Les survivants appellent Lou **« l'étranger »**, puis **« Lou »** quand ils lui font
confiance. Ajout : **Lou a un secret** sur la vraie raison de sa venue, mais il n'est **pas coupable**.

**L'idée en une phrase :** dans un silo, tout le monde croit que le mal vient **du dehors** ; Lou
vient du dehors, il est entré par la porte qu'accuse l'affiche officielle, les mordus se sont remis
à marcher depuis qu'il est là… et il cache vraiment quelque chose. Il doit **prouver par l'enquête**
qu'il n'y est pour rien, pendant que la vraie coupable, gentille avec lui, **laisse faire**.

**Sommaire**
1. Ce que font les bons jeux et les bons livres · 2. Le cœur : « le mal vient du dehors » ·
3. Pourquoi on soupçonne Lou · 4. Le secret de Lou · 5. L'opératrice : la gentille qui laisse
accuser · 6. Cuisine : de la méfiance à l'alliance · 7. Le système de confiance · 8. Dialogues
d'exemple · 9. Moments clés · 10. Au tableau d'enquête · 11. Conséquences et étages 2 à 4 ·
12. Modifications de `HISTOIRE_PROPOSITION.md` · 13. Pièges évités · 14. Sources

---

## 1. Ce que font les bons jeux et les bons livres

| Œuvre | Ce qu'elle fait | Ce qu'on en garde pour SILLO 8 |
|---|---|---|
| **The Walking Dead** (Telltale) | Le message « Clementine s'en souviendra » montre au joueur que ses choix comptent, et crée un malaise. Critique fréquente : beaucoup de choix « pour le moment », sans suite. Dans l'épisode 3, Lilly, rendue folle par les vivres qui disparaissent, accuse quelqu'un de les donner aux pillards et tire sur un innocent. Lee, le héros, cache un passé de condamné que Larry connaît et lui reproche. | Un rappel discret **seulement pour les gros gestes** (« Cuisine a remarqué. »), et chaque rappel **doit** avoir une suite visible avant la fin de l'étage. La rareté rend les gens injustes : c'est le moteur de l'accusation. Le héros peut avoir un secret sans être le coupable. |
| **Disco Elysium** (Kim Kitsuragi) | On « gagne » la confiance de Kim surtout par de **bonnes déductions** (l'autopsie), et par de petits moments partagés (un sandwich, un hochement de tête). Kim n'a pas de fiche chiffrée dans le code ; il révèle sa vie seulement dans certaines situations. | Ici aussi, **montrer le bon indice** est le geste de confiance le plus fort. La confiance passe par de petits gestes et des répliques, pas par un chiffre. |
| **Pathologic 2** | Artemy rentre chez lui et la ville le croit coupable du meurtre de son père : on l'attaque dès la gare. Sa réputation est « écrasée », sauf auprès de quelques vieux amis, et il la reconstruit. Le Bachelier, lui, est un étranger arrivé juste avant l'épidémie ; certains disent qu'il n'apportera que du malheur. | Le soupçon commence **dès l'arrivée** et repose sur une **coïncidence** de date. La réputation se reconstruit personne par personne. |
| **This War of Mine** | Des inconnus frappent à la porte de l'abri pour demander de l'aide ou faire du troc. Ouvrir ou refuser a un prix. | **La porte comme interface de confiance** : celle de la chambre froide de Cuisine, fermée, puis entrebâillée, puis ouverte. |
| **Frostpunk** | L'espoir et le mécontentement du peuple ; une **promesse non tenue** (des abris promis, une aciérie construite) fait perdre la foi. | **Tenir parole** est un geste à part entière. Une promesse faite à un survivant doit pouvoir être tenue ou trahie. |
| **Firewatch** | Une relation entière au **talkie-walkie** ; le joueur peut aussi ne pas répondre. Le récit joue sur la part de mensonge du langage. | L'opératrice est d'abord **une voix** à l'interphone. Une voix douce peut mentir. |
| **Kentucky Route Zero** | Pas de bons ni de mauvais choix de dialogue : les réponses changent la façon dont on comprend le passé et les personnages. | Quand on demande à Lou « pourquoi t'es venu ? », ses réponses **dessinent qui il est**, sans morale à points. |
| **Papers, Please** | On joue l'inspecteur ; le scanner corporel, nécessaire mais intrusif, met mal à l'aise. | On renverse : c'est **Lou qu'on inspecte** (« Vide ta sacoche »). Fouiller les affaires d'un autre a un coût. |
| **The Last of Us** | La relation Joel-Ellie est le socle du jeu ; les réactions d'Ellie à la violence évoluent au fil du jeu. | Les réactions des survivants **évoluent** avec ce que fait Lou (bruit, violence, partage). |
| **Mass Effect / Dragon Age** (approbation) | Les compagnons deviennent plus coopératifs avec une haute approbation. Critique : même une grave offense se rachète avec un cadeau. Dragon Age II remplace le négatif par « amitié ou rivalité ». | **On n'achète pas la confiance avec des objets.** Un cadeau aide, mais seuls la vérité et les preuves font franchir les grandes marches. Un survivant peut respecter Lou sans l'aimer. |
| **The Last Guardian** | La confiance de Trico se construit avec le temps, par la communication et la coopération ; ses yeux changent de couleur devant une menace. Aucune jauge. | La confiance se **lit sur le corps** : distance, arme, porte, dos tourné. |
| **Loups-garous, Among Us, Town of Salem** | Le plaisir naît de la **suspicion** et du **déni possible** ; le grand moment, c'est quand une accusation est appuyée par la preuve d'un autre. Dans Town of Salem, le « Framer » fait paraître coupable un innocent, et l'innocent n'a que sa parole. | La coupable a **intérêt** à ce qu'un innocent soit soupçonné. Lou, lui, n'aura pas que sa parole : il aura **des preuves**. |
| **Return of the Obra Dinn** | Le second maître Nichols tue un marin et **fait accuser un garde formosan**, un étranger à bord. Seuls les faits reconstitués par l'enquêteur rétablissent la vérité. | Accuser l'étranger, c'est **la couverture classique** du coupable. Les faits matériels la font tomber. |
| **Le Crime de l'Orient-Express** (Christie) | Le crime est maquillé en **intrusion venue du dehors** (l'uniforme de contrôleur), mais **la neige** qui bloque le train prouve que le coupable est resté à bord. | La version officielle (« des mordus sont entrés par la porte de service ») est la même ruse. Notre « neige » : **la poussière et la lampe UV sur le seuil**. |
| **Témoin muet** (Christie) | Selon des lecteurs, la vraie coupable profite des préjugés contre un mari étranger pour faire croire les accusations contre lui. | Exactement le rôle de l'opératrice : **elle ne fabrique rien, elle laisse les préjugés travailler.** |
| **Ils étaient dix** (Christie) | L'isolement sur l'île transforme le groupe en méfiance mutuelle ; chacun cache une faute passée, donc chacun craint l'accusation. | Un lieu fermé amplifie la peur. Tout le monde a un secret, **y compris le héros**. |
| **Le western** (« l'étranger arrive en ville ») | Le procédé, plus vieux que le western, fonctionne par **ambiguïté** : héros, méchant, ou entre les deux ? (*Yojimbo*, *Pour une poignée de dollars*.) | Lou arrive comme l'étranger du western : sans passé déclaré, avec un outil, et une raison qu'il tait. |
| **Conseils d'écriture de PNJ** (Grand Text Auto, ixie, Sly Flourish) | Montrer **l'état** du personnage mais cacher **la mécanique** ; une « jauge de suspicion » qui change en douce passe pour un bug ; un PNJ méfiant doit pouvoir **changer d'avis** selon les actes des joueurs ; un PNJ trop serviable rend les joueurs méfiants. | Les règles de confiance sont **lisibles** (on sait ce qui a fâché Cuisine). L'opératrice est **un peu trop gentille** : c'est un indice. |

**Ce qu'on retient en sept règles :**
1. La méfiance a **une raison qu'on comprend** : le joueur, à la place de Cuisine, soupçonnerait aussi.
2. Elle repose sur **des faits vrais mal interprétés**, jamais sur un mensonge du jeu.
3. Elle se **défait par l'enquête** : la preuve de l'innocence est trouvable, en fair play.
4. Elle **ne bloque jamais** le chemin des 5 objectifs : elle change le ton, le prix et les bonus.
5. Elle se **lit sans jauge** : le nom, la distance, la porte, l'arme, ce qu'on partage.
6. Les grandes marches se franchissent par **la vérité, la preuve et la parole tenue**, pas par les cadeaux.
7. Elle **paie** : l'injustice subie rend la réhabilitation savoureuse, et l'accusation pointe, sans le
   dire, vers la vraie coupable.

---

## 2. Le cœur du thème : « le mal vient du dehors »

C'est ce que croit tout le silo, et c'est ce que le jeu démonte, étage après étage :

- **Étage 1.** L'affiche dit : « des mordus sont entrés par la porte de service ». Faux : le premier
  mordu est sorti de l'infirmerie. Et l'étranger qu'on accuse n'y est pour rien.
- **Étage 4.** La règle n° 1 (« aucun mordu ne franchit la porte ») voulait dire *aucun ne sort*. Le
  silo n'a jamais eu peur du dehors : il **gardait** le mal dedans.
- **Lou**, l'homme du dehors, est venu (on le saura plus tard) pour **tenir la porte**, pas pour
  l'ouvrir.

La méfiance contre Lou n'est donc pas un décor : c'est **la même erreur** que celle du silo entier,
vécue à hauteur de personne.

---

## 3. Pourquoi les survivants soupçonnent Lou

Quatre raisons. Chacune contient **du vrai**. C'est ce qui rend la fausse piste honnête.

| Raison | Ce qui est vrai | Ce qui est faux | Comment Lou s'en sort |
|---|---|---|---|
| **1. La coïncidence** : « Depuis que t'es là, ils marchent. » | Avant Lou, le silo était noir et silencieux depuis 9 jours ; les mordus restaient presque immobiles. Lou a **relancé la génératrice** : le moteur tousse, tourne, fait du bruit (le bruit les attire) ; Marceau se remet à tapoter son moteur ; une erreur aux leviers fait claquer le disjoncteur. | Lou n'a **pas** créé les mordus : ils sont là depuis la nuit de l'orage. | Le dire franchement (« Oui, c'est moi qui ai rallumé. Ça fait du bruit. ») est un geste de **vérité**. La montre de l'infirmier (2 h 14) et les 9 traits de Cuisine prouvent que tout a commencé avant lui. |
| **2. Il vient du dehors** | Lou est un inconnu, venu de dehors, là où la règle n° 1 laisse les mordus. Dans un silo, le dehors fait peur. | Rien dans le dehors n'a causé l'épidémie de l'étage 1. | Seule la preuve change la peur : c'est l'enquête (C5). |
| **3. Les preuves trompeuses** | (a) Lou est entré par **la porte de service**, la porte même qu'accuse l'affiche. (b) Il l'a **laissée entrouverte** derrière lui : au retour du courant, le tableau de l'opératrice affiche « PORTE DE SERVICE : OUVERTE ». (c) Ses bottes laissent de la **boue rouge des épaves** de la porte jusqu'à la cafétéria. (d) S'il l'a ramassée, il porte **la lanterne de Lila**, la petite disparue. | Personne n'est entré par cette porte la nuit de l'orage. Lou a trouvé la lanterne aux épaves, vide, à côté d'une ferraille. | **Le seuil de la porte de service** : dans la poussière, de petits pas d'enfant qui **sortent**, anciens (Lila), et une seule paire de bottes qui **entre**, toute fraîche (Lou). À la lampe UV, **aucune** traînée de mordu. Avec la liste de Lila n° 4 (« les poser près de la porte de service, avant la nuit »), cela prouve que Lila est sortie seule, bien avant Lou. |
| **4. Il cache quelque chose** | Lou tient sa sacoche serrée, refuse d'ouvrir un paquet noué, élude « pourquoi t'es venu ». **Les survivants ont raison : il cache un secret.** | Son secret n'a rien à voir avec l'orage, ni avec la chambre 1 (§ 4). | Il ne peut pas tout dire à l'étage 1. Il peut dire **une vérité partielle** (« J'ai fait une promesse. Je ne peux pas en dire plus. »), ce qui compte comme vérité. |

**La petite faute réelle de Lou** (la porte laissée ouverte) est importante : elle donne à Cuisine
une vraie raison d'être fâché, et à Lou un geste simple de réparation (**refermer la porte**).

---

## 4. Le secret de Lou

### Les contraintes

- Lou **n'est pas coupable** de quoi que ce soit dans le silo.
- **Pas de famille dans le silo** (refusé par l'auteur).
- Compatible avec le grand secret de l'étage 4 (le silo a été construit pour **garder** les mordus
  dedans), avec les **verrous côté dehors**, la **photo de l'inauguration** (la personne de dos, la
  valise au triangle) et le signal **« VIENS »** venu d'en bas.
- Révélé à l'étage 3 ou 4 ; à l'étage 1, seulement 2 ou 3 indices dormants très discrets.

### Trois options

**Option A — La promesse au vieux serrurier (recommandée)**
Lou a appris son métier auprès d'un vieux bricoleur du dehors (nom proposé : **le vieux Gaspard**,
jamais nommé à l'étage 1). Le vieux faisait partie de l'équipe qui a construit SILLO 8 : c'est lui
qui a posé **les gros verrous côté dehors**. Avant de mourir, il a donné à Lou un paquet noué dans un
chiffon : **une vieille clé de laiton marquée d'un triangle** (la clé de ces verrous) et un mot. Il
lui a fait promettre : « Si un jour le 8 tombe, va le fermer. **De dehors.** Et n'entre pas. »
Lou ne sait pas pourquoi. Il arrive devant la porte pour tenir sa promesse… et lit à la craie :
**« ILS SONT DESCENDUS. PAS TOUS. »** Des vivants sont dedans. Il désobéit et entre. « Trouver un
abri » est sa couverture.
- *Pourquoi c'est la meilleure :* elle donne un sens nouveau à la pensée canon de la première minute
  (« Pas tous. Alors quelqu'un est encore là-dedans. ») : c'est **la phrase qui l'a fait entrer**.
  Elle relie Lou au triangle de la photo (étage 3) et aux verrous (étage 4). Elle fait de l'étranger
  le **gardien** que personne n'attendait. Et elle prépare le choix final de l'étage 4 : fermer la
  porte de dehors, ou non, avec des vivants en bas.
- *Compatibilité avec « VIENS » :* à l'étage 3 ou 4, on peut apprendre que le vieux avait entendu,
  sur une vieille fréquence des fondateurs, des coups tapés « plus bas que bas ». C'est ce qui l'avait
  inquiété. Lou ne l'a pas entendu lui-même : il découvre le signal avec le joueur.

**Option B — Le message reçu**
Seul dehors, Lou captait depuis des semaines, sur son petit poste, des bips tapés à la main : V-I-E-N-S.
Il a suivi la fréquence jusqu'au silo. Il ne l'a dit à personne, de peur qu'on le croie fou.
- *Plus :* simple, relié directement à la fin de l'étage 1.
- *Moins :* le signal semble alors adressé à Lou, ce qui réduit le mystère « qui appelle ? » ; et à
  la fin de l'étage 1, Lou en saurait plus que le joueur sur le signal, ce qui frôle le piège du
  « héros qui sait avant le joueur ».

**Option C — La lettre à remettre**
Lou porte une lettre cachetée d'un triangle, adressée « à la personne du fond, SILLO 8 », confiée par
un mourant du dehors. Il a promis de la remettre en main propre. Le destinataire est l'inconnu de dos
de la photo, peut-être celui qui tape « VIENS ».
- *Plus :* très romanesque, un MacGuffin clair.
- *Moins :* charge l'étage 3 d'une révélation de plus, et fait de Lou un simple messager.

**Recommandation : option A.** On peut lui emprunter un détail de C : le paquet contient aussi un
**mot du vieux**, qu'on ne lira qu'à l'étage 4.

### Les indices dormants de l'étage 1 (option A)

Trois seulement, très discrets. Lou **ne pense jamais quelque chose de faux** : il se tait, c'est tout.
C'est la règle du narrateur du *Meurtre de Roger Ackroyd* : on omet, on ne ment pas.

| # | Où | Ce qu'on voit | Ce qu'on en pense à l'étage 1 | Où ça paie |
|---|---|---|---|---|
| L1 | **Sacoche** (inventaire du carnet) | Un **paquet noué dans un chiffon**, lourd. `E` : « Un chiffon noué. » Pensée : « Pas maintenant. » On ne peut pas l'ouvrir. | Lou garde un souvenir. | Étage 3 : la clé au triangle. |
| L2 | **Entrée**, photo de l'inauguration (gros plan a1) | En zoomant sur la valise au triangle, la main de Lou se pose sur sa sacoche. Pensée coupée : « Ce triangle… » puis « Non. Rien. » | Un détail qui le trouble. | Étage 3 : même triangle que sur la clé. |
| L3 | **Entrée**, les verrous côté dehors (première minute) | Après la pensée canon (« Drôle de porte… »), Lou passe le gant sur un verrou, une seconde, comme on reconnaît un travail. Pas de pensée. | Rien, ou presque. | Étage 4 : c'est le vieux qui les a posés. |

**Pas d'indice sur le signal à l'étage 1** : à la fin, Lou découvre « VIENS » avec le joueur.

### Comment le secret nourrit la méfiance

Les survivants **sentent** que Lou cache quelque chose, et ils ont raison… mais pas pour ce qu'ils
croient. Trois effets :
- **Cuisine** remarque le geste : « Tu tiens ta sacoche comme si y avait un bébé dedans. »
- **L'opératrice** le reconnaît, parce qu'elle fait pareil avec son alliance : « Vous aussi, vous
  gardez quelque chose. Je connais ce geste. » Deux gardiens de secret qui se regardent : elle devient
  plus humaine, et plus suspecte.
- **Le joueur** apprend une leçon d'enquête : *avoir un secret* ne veut pas dire *être coupable*. Il
  l'applique à Bérard, à Okafor, à Cuisine… et à Lou lui-même.

### Quand et comment il est révélé

- **Étage 3** : le triangle de la photo est identifié (la marque des fondateurs). Des habitants
  fouillent Lou ou le paquet tombe : la clé apparaît. « Tu le savais ! » Lou doit choisir : dire la
  promesse entière, ou se taire. C'est le grand test de confiance du jeu.
- **Étage 4** : le mot du vieux et les verrous prennent leur sens. Lou comprend ce qu'il avait promis
  de faire : enfermer le silo. Choix final : tenir la promesse (fermer de dehors) ou non.

---

## 5. L'opératrice : la gentille qui laisse accuser

### Pourquoi elle a intérêt à laisser accuser l'étranger

Tant que l'étranger est soupçonné, personne ne cherche **qui a ouvert la chambre 1**. Son mobile reste
le même que dans l'histoire (l'amour, puis **la honte**) : elle ne hait pas Lou, elle a peur d'être
vue. Laisser accuser un autre, c'est **le même silence** que celui qu'elle a opposé à Lila. C'est ce
que dit la note canon : « ne fais pas confiance au silence ».

### Ce qu'elle fait (et ne fait pas)

**Elle ne fabrique aucune preuve.** Elle fait trois choses :
1. **Elle dit des choses vraies qui orientent.** Au haut-parleur, pour Cuisine : « Depuis que le courant
   est revenu, mon tableau dit que la porte de service est ouverte. Quelqu'un l'a laissée ouverte. Et
   juste après, ils se sont remis à marcher. » Tout est vrai.
2. **Elle ment une fois, sur elle-même.** « La nuit de l'orage aussi, j'ai vu le voyant de la porte de
   service s'allumer. J'étais à ma console. » C'est faux : il y avait une coupure de courant, et son
   cahier est vide entre 2 h 00 et 2 h 20. Ce mensonge est **vérifiable** (contradiction X9, § 10).
3. **Elle est gentille avec Lou, et douce avec Cuisine.** À Lou : « Ne lui en voulez pas, il a peur.
   Moi, je vous crois, mon garçon. » Puis : « Mais c'est vrai que vous êtes entré par là… »

### Ses « tells » (fair play)

- **Deux noms pour un seul homme.** En face, elle dit « **mon garçon** ». Au haut-parleur, à Cuisine,
  elle dit « **l'étranger** ». Elle entend son prénom (Cuisine le demande) mais **ne l'utilise jamais**…
  jusqu'à l'aveu.
- **Trop gentille trop vite.** Le joueur averti se méfie de la personne qui aide sans rien demander
  (elle ne demande qu'une pile, pour sa lumière).
- **La lampe verte** reste allumée sous sa porte quand Lou est accusé, et **s'éteint** quand il est
  disculpé, avec trois secondes de silence à l'interphone.
- **Elle tient à la porte de service** plus que les faits ne le permettent (X9).

Ces tells **ne suffisent pas** à l'accuser : Cuisine croyait aussi l'affiche, et beaucoup de gens
gentils se trompent. Ils s'ajoutent aux indices existants de C4 (lampe verte, « ma Nuit », trou dans
le cahier, loquet), sans les remplacer.

### Cohérence avec la révélation

À l'aveu (§ 15 de l'histoire), elle ajoute une phrase : « Quand ils vous ont accusé, je n'ai rien dit.
C'était plus facile. Pardon, **Lou**. » C'est la première fois qu'elle dit son prénom. Le joueur
relit alors chaque « mon garçon » autrement.

---

## 6. Cuisine : de la méfiance à l'alliance

Cuisine est le contraire de l'opératrice : **méfiant en face, honnête au fond**. Il compte tout (les
pêches, les piles, les jours) et il **compte aussi Lou**. Il est bourru, drôle malgré lui, et il a
honte d'avoir refusé une pile à Lila. Sa méfiance est **franche** : il dit ce qu'il pense, il pose
son couperet sur la table quand il change d'avis.

**Son arc :** il accuse (« C'est-tu toi ? »), il est ébranlé par une preuve, il est sauvé par celui
qu'il accusait, il s'excuse à sa façon (« Bon. J'me suis trompé. Ça arrive pas souvent. »), et il
devient l'allié qui donne la clé de sa réserve et, à la fin, une boîte de pêches pour la route.

**Une idée de décor (facultative) :** sur la porte de la chambre froide, Cuisine a tracé à la craie
**9 traits** (un par jour depuis l'orage, c'est un indice de C5) et, en dessous, une colonne au titre
qui change : « L'ÉTRANGER », puis barré « LE BRICOLEUR », puis barré « LOU ». C'est la seule
« jauge » du jeu, et c'est un personnage qui l'écrit.

---

## 7. Le système de confiance

### Les quatre niveaux (Cuisine)

| Niveau | Il appelle Lou… | La porte | L'arme | Ce qu'il partage | Le geste |
|---|---|---|---|---|---|
| **Hostile** | « l'étranger », « toi, là » | Fermée. Il parle à travers. On passe les objets par la fente. | Couperet levé. | Rien de gratuit : échange seulement (une conserve contre un bandage). | Il recule. Il éteint sa lampe. |
| **Méfiant** *(niveau de départ)* | « l'étranger » | Entrebâillée, sur la chaîne. | Couperet baissé, à la main. | Des infos sur lui (« J'étais à l'entrepôt »). Pas d'objets. | Il te regarde les mains. |
| **Prudent** | « le bricoleur » | Ouverte : Lou entre. | Couperet posé sur le comptoir. | Son témoignage, des échanges justes. Il demande ton nom. | Il s'assoit. |
| **Confiant** | « Lou » | Il sort de la chambre froide. | Rangé. | La clé de la réserve, son secret (la pile refusée à Lila), une boîte de pêches pour la route. | **Il te tourne le dos** pour fouiller une étagère. |

**Règle :** on ne peut pas atteindre **Confiant** tant que Lou est accusé. Il faut d'abord se
disculper (C5).

### Ce qui fait monter, ce qui fait baisser

Pas de points cachés. Chaque niveau a **des clés** (n'importe laquelle suffit pour monter d'une marche),
et des **faux pas** (chacun fait descendre d'une marche, une fois).

| Monter d'une marche | Exemple |
|---|---|
| **Partager une ressource rare** | Donner le bandage (le seul de l'infirmerie), une pile, une boîte de clous. |
| **Dire la vérité quand elle coûte** | « Oui, c'est moi qui ai rallumé la génératrice. » / « Oui, je suis entré par la porte de service. » |
| **Montrer le bon indice** | Lui montrer la feuille de comptage, le seuil, la liste de Lila n° 2 (C3). |
| **Tenir parole** | « Je referme la porte de service. » Puis la refermer vraiment. |
| **Sauver de mordus** | Figer le commis à la lampe quand il s'approche de Cuisine (§ 9, M4). |
| **Respecter un secret** | Ne pas fouiller ses étagères ; quand il dit « ça te regarde pas », ne pas insister. |

| Descendre d'une marche | Exemple |
|---|---|
| **Mentir et être démasqué** | Dire « je suis pas rentré par là », puis la boue et le seuil le contredisent. |
| **Fouiller ses affaires sous ses yeux** | « Touche pas à ça. » |
| **Faire du bruit qui attire les mordus** | Lance-clous ou disjoncteur près de la cafétéria. |
| **Promettre et ne pas tenir** | Promettre de refermer la porte de service et partir à l'étage 2 sans l'avoir fait. |
| **Laisser quelqu'un face à un mordu** | Fuir quand le commis s'approche de Cuisine. |

**Les cadeaux ne suffisent jamais pour les grandes marches** (critique de Dragon Age) : on passe de
Méfiant à Prudent avec un bandage, mais on ne passe à Confiant qu'avec **la preuve** de son innocence.

### Rendre la confiance visible sans jauge

1. **Le nom** qu'il utilise, dans chaque réplique.
2. **Le corps** : distance, arme, porte, dos tourné (comme les yeux de Trico).
3. **Ce qu'il partage** : des mots, puis des objets, puis un secret.
4. **La longueur de ses répliques** : une ligne quand il se méfie, une petite histoire quand il a confiance.
5. **Le carnet** : la fiche de Cuisine montre un petit dessin de lui, dont la pose change (bras
   croisés → mains sur les hanches → main tendue), et sous le dessin, une ligne : *Il t'appelle :
   « l'étranger »*. Pas de chiffre, pas de barre.
6. **Le rappel rare** : après un **gros** geste seulement, une ligne discrète en bas d'écran :
   « Cuisine a remarqué. » Au plus 4 fois dans l'étage, et chaque fois avec une suite visible.

### Les règles pour que la méfiance ne soit pas agaçante

- **Elle ne bloque jamais les 5 objectifs.** Cuisine est facultatif ; même Hostile, il échange par la fente.
- **Toujours un geste possible.** À chaque niveau, au moins deux clés sont accessibles tout de suite.
- **Pas de répétition.** Chaque réplique méfiante n'est dite qu'une fois ; ensuite, il se tait ou grogne « … ».
- **Elle est courte et drôle.** Cuisine est bourru, pas cruel.
- **Les règles sont lisibles.** Quand la confiance baisse, on sait pourquoi (il le dit).
- **Elle devient une quête.** Après l'accusation, le tableau ajoute une question : « Comment prouver
  que je n'y suis pour rien ? » La frustration se transforme en objectif.
- **Elle se résout en scène.** Le retournement (M5) est une récompense en soi.

### L'opératrice : deux visages

Elle ne suit pas l'échelle de Cuisine. Elle porte un masque :

| État | Quand | Elle appelle Lou… | Signes |
|---|---|---|---|
| **Cordiale (le masque)** | De la première rencontre jusqu'à la disculpation | « mon garçon » (à Cuisine : « l'étranger ») | Lampe verte allumée, voix douce, elle tourne son alliance. Elle aide pour la radio. |
| **Sur la défensive** | Après X6 ou X9, ou quand Lou est disculpé | « mon garçon », plus sec | Lampe éteinte, réponses courtes, elle change de sujet. |
| **Honteuse** | Après l'accusation juste (C4) | « … » | Elle pose sa lampe sur la console. |
| **Vraie** | Après l'aveu | « **Lou** » | Elle ouvre le loquet elle-même. |

Ce qui la touche : la **pile** donnée (elle parle plus, comme dans l'histoire), la **radio** réparée,
et le moment où Lou dit **sa** vérité partielle (« J'ai fait une promesse »). Elle répond alors :
« Moi aussi. » C'est un indice, et c'est un lien.

---

## 8. Dialogues d'exemple

### Le ton

- **Cuisine** et les survivants bourrus parlent un **français familier québécois léger** : « T'es qui,
  toi ? », « C'est-tu toi qui… ? », « ben », « pantoute », « de même », « asteure », « icitte ».
  **Un ou deux marqueurs par réplique, pas plus**, pour rester lisible par tous les francophones.
- **L'opératrice** parle un **français standard, poli, au vouvoiement**. Sa politesse fait partie de
  son masque, et la distingue de Cuisine.
- **Lou** (choix de dialogue et pensées) et **tous les documents** restent en **français standard**,
  comme le reste du jeu. Lou tutoie Cuisine dès que Cuisine le tutoie.
- Répliques courtes : **2 lignes au plus** sur téléphone.

### Cuisine, niveau par niveau

**Méfiant (première rencontre, porte sur la chaîne)**
> **Cuisine :** T'es qui, toi ? T'es pas d'ici.
> **Cuisine :** Ça fait neuf jours que c'est mort, icitte. Pis là, ça se remet à marcher. Depuis que t'es là.
> **Cuisine :** C'est-tu toi qui as rallumé la génératrice ?

**Hostile (après l'annonce de l'opératrice)**
> **Cuisine :** La porte de service, ouverte. C'est-tu toi qui les as laissés rentrer ?
> **Cuisine :** Recule. Tu passes ton affaire par la fente, pis tu t'en vas.
> **Cuisine :** Parle-moi pas, l'étranger. Je compte jusqu'à trois.

**Prudent**
> **Cuisine :** Bon. Entre, le bricoleur. Touche à rien.
> **Cuisine :** Tu tiens ta sacoche comme si y avait un bébé dedans. Qu'est-ce que tu caches ?
> **Cuisine :** C'est quoi ton nom, d'abord ?

**Confiant**
> **Cuisine :** Lou. Tiens, la clé de ma réserve. Vide-la pas toute.
> **Cuisine :** *(Il te tourne le dos et fouille l'étagère.)* La petite m'a demandé une pile. J'ai dit non. Je m'en veux, tu sais.
> **Cuisine :** Reviens pas mordu, Lou. J'ai pas assez de pêches pour deux.

**Réactions aux gestes**
> *(Lou dit la vérité sur la génératrice)* **Cuisine :** …Au moins, tu mens pas. C'est déjà ça.
> *(Lou ment, puis la boue le trahit)* **Cuisine :** Pas rentré par là, hein ? Ta boue dit le contraire.
> *(Lou fouille une étagère)* **Cuisine :** Touche pas à ça. Ça, c'est à moi.
> *(Lou fait du bruit)* **Cuisine :** Arrête ton vacarme ! Tu vas toutes nous les ramener !
> *(Lou referme la porte de service)* **Cuisine :** Tu l'as fermée ? Pour vrai ? …Bon.
> *(Lou garde le paquet fermé)* **Cuisine :** Correct. Moi aussi, j'ai des affaires à moi.

### L'opératrice, selon son état

**Cordiale (à Lou)**
> **Opératrice :** Ne lui en voulez pas, mon garçon. Il a peur. Moi, je vous crois.
> **Opératrice :** Mais c'est vrai que vous êtes entré par là… Vous comprenez qu'il se pose des questions.

**Cordiale (au haut-parleur, à Cuisine)**
> **Opératrice :** Mon tableau dit que la porte de service est ouverte. L'étranger est entré par là.
> **Opératrice :** La nuit de l'orage aussi, j'ai vu le voyant s'allumer. J'étais à ma console. *(Mensonge : X9.)*

**Quand Lou montre son geste de secret**
> **Opératrice :** Vous aussi, vous gardez quelque chose. Je connais ce geste. *(Elle tourne son alliance.)*

**Sur la défensive (après la disculpation)**
> **Opératrice :** *(Trois secondes de silence.)* …Je suis contente pour vous. Vraiment.
> **Opératrice :** Le voyant ? J'ai dû me tromper. Il faisait noir. Parlons de la radio, voulez-vous ?

**Vraie (après l'aveu)**
> **Opératrice :** Quand ils vous ont accusé, je n'ai rien dit. C'était plus facile. Pardon, Lou.

### Lou

**Quand on lui demande pourquoi il est venu** (aucune réponse n'est « bonne » ; toutes sont vraies ou presque)
> **[Lou] Chercher un abri.** → **Cuisine :** Mouais. *(Il plisse les yeux.)*
> **[Lou] J'ai fait une promesse. Je ne peux pas en dire plus.** → **Cuisine :** Une promesse à qui ? …Correct, garde-la.
> **[Lou] Ça ne te regarde pas.** → **Cuisine :** Ben là, ça me regarde un peu, l'étranger.

**Pensées pendant l'accusation** (elles ne concluent jamais à la place du joueur)
> « Je sais que ce n'est pas moi. Eux, il faut le leur montrer. »
> « Neuf traits sur sa porte. Neuf jours. Moi, je suis arrivé ce matin. Ça se prouve, ça ? »

---

## 9. Les moments clés

### M1 — La première rencontre (cafétéria, chambre froide)

Toujours **après** la relance de la génératrice (la cafétéria n'est accessible qu'après le hub), donc
la coïncidence est toujours vraie. Trois coups de l'intérieur (d6, déjà prévu). La question canon
(« Dis-moi un truc qu'un vivant dirait ») ouvre la porte **sur la chaîne** : on voit un œil, une
moustache et la lame d'un couperet. Cuisine est **Méfiant**. Ses trois premières répliques (§ 8) posent
la coïncidence. Choix : dire la vérité sur la génératrice (il reste Méfiant mais note « tu mens pas »)
ou nier (il le saura plus tard : faux pas différé).

### M2 — La voix au haut-parleur (après l'énigme 2)

L'interphone revient. L'opératrice parle d'abord à Lou (gentille, « mon garçon »), puis, sur le circuit
général, à Cuisine : la porte de service ouverte, l'étranger entré par là, le voyant de la nuit de
l'orage (son mensonge). La cafétéria entend tout. Cuisine passe à **Hostile** (ou de Prudent à Méfiant).
Pensée de Lou : « Elle dit vrai. Presque tout. »

### M3 — L'accusation publique (hub central, devant l'avis officiel)

Déclenchée la première fois que Lou repasse au hub après M2 **et** M1. Pour la première fois en neuf
jours, **Cuisine sort** de sa chambre froide : la colère est plus forte que la peur. Il se plante
devant l'avis, couperet à la main ; la voix de l'opératrice grésille au haut-parleur.

> **Cuisine :** *(Il tape sur l'avis.)* « Par la porte de service. » Pis toi, t'es rentré par où ?
> **Cuisine :** Ta boue rouge part de la porte de service jusqu'à ma cafétéria. Y a pas de boue de même, icitte.
> **Cuisine :** *(Si Lou porte la lanterne.)* Pis ça, c'est la lanterne à Lila. Où est-ce qu'elle est, elle ?
> **Cuisine :** Vide ta sacoche.

Choix de Lou :
- **Vider la sacoche** : outils, carnet, lanterne… et le **paquet noué**. Lou refuse de l'ouvrir :
  « Ça, c'est à quelqu'un qui est mort. Ça ne te regarde pas. » Cuisine : « Correct. » Il voit que Lou
  cache quelque chose (il a raison), mais il respecte (pas de baisse).
- **Refuser** : « Non. » Faux pas (−1), mais honnête.
- **Dire la vérité** : « Je suis entré par là. J'ai laissé la porte ouverte. J'ai rallumé la
  génératrice. Mais les mordus étaient là avant moi. » Il reste au même niveau : « Prouve-le. »
- **Montrer la preuve** (si C5 est déjà validée) : retournement immédiat (M5).
- **Nier** : faux pas immédiat, la boue le contredit.

Sans preuve, la scène se termine ainsi : « Tant que tu me prouves pas le contraire, tu touches pas à mes
affaires. » Au tableau apparaît la question **« Comment prouver que je n'y suis pour rien ? »**

### M4 — Le commis (sauvetage, pendant M3 ou juste après)

Cuisine hors de sa chambre froide, c'est Cuisine **exposé**. Le commis mordu, fidèle à son habitude,
revient avec son plateau vide… et se tourne vers son ancien patron. Cuisine reste figé : « C'est… mon
commis. » Lou peut **le figer à la lampe** (coût : de la charge, le dilemme figer ou voir), faire
diversion, ou fuir.
- Le sauver : +1 marche, même si Lou est encore accusé. « …T'aurais pu me laisser là. Pourquoi ? »
- Fuir : −1 marche. « Je le savais. »

### M5 — Le retournement (quand Lou apporte la preuve)

Lou valide C5 au tableau, puis montre les cartes à Cuisine (à la chambre froide ou par l'interphone).

> **[Lou] La montre de l'infirmier : 2 h 14, la nuit de l'orage. Tes neuf traits. Le seuil : mes pas, et ceux de Lila, qui sortent. Aucun mordu n'est entré par là.**
> **Cuisine :** *(Long silence. Il pose le couperet.)* …Neuf jours. Ouin. T'étais pas là.
> **Cuisine :** Bon. J'me suis trompé. Ça arrive pas souvent. C'est quoi ton nom, déjà ?
> **[Lou] Lou.**
> **Cuisine :** Lou. *(Il barre « L'ÉTRANGER » sur sa porte.)* Mais si c'est pas toi… c'est qui ?

À l'interphone, **trois secondes de silence**, puis l'opératrice : « Je suis contente pour vous. » Sous
sa porte, la lueur verte s'éteint.

Le retournement **relance la vraie question** (qui a ouvert la chambre 1 ?) : c'est ainsi que la
fausse piste de l'étranger mène à la couche 3.

### M6 — La révélation et le choix de Lou

Après l'accusation juste (C4) et l'aveu (§ 15 de l'histoire), l'accusé d'hier a maintenant le pouvoir
d'accuser. Trois choix, tous valables :
1. **« Dites-le-lui vous-même. »** Elle avoue à Cuisine par l'interphone. Long silence, puis Cuisine :
   « …Ben. On a tous fermé une porte, c'te nuit-là. Moi, c'était l'armoire. » Ils resteront ensemble à
   la radio.
2. **Lou le dit à Cuisine.** Cuisine est en colère contre elle. Elle : « Vous avez eu raison. Moi, je
   ne l'ai pas fait pour vous. »
3. **Garder son secret.** Lou, qui a lui-même un secret, garde le sien. Cuisine ne saura pas. Le message
   radio vers le bas restera incomplet (§ 11).

### M7 — Le départ

Au couloir nord, selon la confiance de Cuisine :
- **Confiant** : il est là, avec une boîte de pêches. « Reviens pas mordu, Lou. »
- **Prudent** : de loin, à l'interphone : « Bonne chance, le bricoleur. »
- **Méfiant ou Hostile** : rien, ou « Bon débarras, l'étranger. »

---

## 10. Au tableau d'enquête

### Nouvelles cartes

- **Seuil de la porte de service** (entrée), gros plan + lampe UV : « Dans la poussière, de petits pas
  qui sortent, anciens. Une seule paire de bottes qui entre, toute fraîche : les miennes. À la lampe
  UV : rien. » *(Complète c1.)*
- **Traits sur la porte de Cuisine** (cafétéria, décor) : « Neuf traits à la craie. Un par jour depuis l'orage. »
- **Déclaration de l'opératrice** (au haut-parleur) : « J'ai vu le voyant de la porte de service, la nuit de l'orage. »
- **Accusation de Cuisine** : « Tu es entré par la porte de service. Depuis, ils marchent. »

### Nouvelles contradictions

| # | Carte A | ↔ Carte B | → Déduction | → Ce qui s'ouvre |
|---|---|---|---|---|
| **X8** | Accusation de Cuisine | Seuil de la porte de service **ou** traits de Cuisine + montre 2 h 14 | « Tout a commencé la nuit de l'orage, neuf jours avant moi, et personne n'est entré par là. » | La phrase **C5** gagne le mot « neuf jours ». |
| **X9** | Déclaration de l'opératrice (le voyant) | Cahier de relève (« 2 h 00 : orage, coupure ») | « Sans courant, pas de voyant. Elle n'a rien vu. Pourquoi l'inventer ? » | Nouvelle question à lui poser ; elle passe « sur la défensive ». |
| **X10** | Lanterne de Lila (dans la sacoche) | Liste de Lila n° 4 + seuil (petits pas qui sortent) | « Lila est sortie seule, avant la nuit, bien avant moi. » | Réplique de Cuisine sur Lila ; il cesse de parler de la lanterne. |

### Nouvelle phrase à trous

**C5 — L'étranger** *(couche 1, se débloque après l'accusation M3)*
> Personne n'est entré par **[la porte de service]** : le premier mordu est sorti de **[l'infirmerie]**,
> la nuit de l'orage. Je suis arrivé **[neuf jours]** plus tard. Ce qui les a remis en marche, c'est
> **[le bruit]** de la génératrice.

- Indices (≥ 3, dans ≥ 2 pièces) : seuil, poussière et UV (entrée) · traînée UV (infirmerie) · montre
  2 h 14 (infirmerie) · traits de Cuisine (cafétéria) · avis officiel, qui dit lui-même « pendant
  l'orage » (hub) · règle du bruit, vue à la zone extérieure et à la génératrice.
- La dernière case est un **aveu** : Lou reconnaît sa part. C'est la vérité qui disculpe, pas un plaidoyer.
- Débloque : **M5** (retournement), Cuisine peut atteindre **Confiant**.

### Pensées en cas d'erreur

| Erreur | Pensée |
|---|---|
| C5 avec « le guetteur » dans la dernière case | « Le guetteur est dehors. Ce qui a fait du bruit dedans, c'est moi. » |
| C5 avec « un jour » | « Il a tracé plus d'un trait sur sa porte. » |
| X8 avec Avis officiel + Accusation | « Ces deux-là disent la même chose. Il me faut un fait, pas une affiche. » |

### Aide en trois paliers (C5)

| 1. Orienter | 2. Pointer | 3. Relier |
|---|---|---|
| « Quand est-ce que tout a commencé, exactement ? » | « Cuisine compte tout. Même les jours. » | « Neuf traits, une montre à 2 h 14, un seuil sans trace : et moi, j'étais où ? » |

---

## 11. Conséquences sur l'étage 1, et graines pour les étages 2 à 4

### À l'étage 1

| Si… | Alors |
|---|---|
| Cuisine est **Confiant** | Clé de la réserve, boîte de pêches au départ, il raconte sa honte (C3 plus riche). |
| Cuisine est **Prudent** | Échanges justes, témoignage, mais pas de réserve avant C3. |
| Cuisine est **Méfiant / Hostile** | Il échange par la fente, plus cher. Aucun objectif n'est bloqué. |
| Lou est **disculpé** (C5) | M5 ; l'opératrice passe sur la défensive (indice pour C4). |
| Lou n'est **pas disculpé** | La question reste au tableau ; au départ : « Bon débarras, l'étranger. » |

### Le message radio vers le bas (le lien avec l'étage 2)

À la fin de l'étage, l'opératrice parle à la radio réparée. Ce qu'elle dit de Lou **dépend du joueur** :
- Affaire résolue + Lou disculpé + choix M6 n° 1 ou 2 : « Il y a un garçon avec nous. Il s'appelle Lou.
  Il n'y est pour rien. C'est moi qui ai ouvert. »
- Lou disculpé, affaire non résolue : « Un bricoleur est passé. Il n'y est pour rien. »
- Lou non disculpé (ou M6 n° 3) : « Un étranger est entré par la porte de service… et ils se sont remis
  à marcher. » *(Elle se tait sur elle-même.)*

### Graines pour les étages 2 à 4

- **Étage 2 (les réserves).** Le groupe d'Okafor a entendu le message radio. **La réputation de Lou
  arrive avant lui** : on l'accueille comme « Lou » ou comme « l'étranger de la porte de service ».
  Tension nouvelle : c'est **Okafor** qui a écrit l'avis « par la porte de service ». Un étranger
  accusé l'arrange : elle est tentée de répéter le mensonge, avec Lou dans le rôle du coupable.
- **Étage 3 (les machines).** Ceux d'en bas, enfermés depuis longtemps, n'ont jamais vu personne du
  dehors. Pour eux, « l'étranger » veut dire autre chose : ceux qui ont fermé la porte. Le triangle de
  la photo est identifié ; **la clé de Lou est découverte**. Les survivants avaient raison : il cachait
  quelque chose. Lou doit dire la promesse.
- **Étage 4 (le fond).** Le silo gardait le mal dedans. L'homme du dehors est venu tenir la porte. Le
  choix final : fermer de dehors, ou non. Chaque survivant qui fait confiance à Lou pèse dans ce choix.

**Règle de continuité :** la confiance gagnée à l'étage 1 ne se perd pas à l'étage 2 ; elle change
seulement de forme (une rumeur, une voix à la radio, un nom).

---

## 12. Ce qu'il faut modifier dans `HISTOIRE_PROPOSITION.md`

**Toutes ces modifications ont été appliquées** dans le document d'histoire. Les 7 notes canon, les 5
objectifs et les messages du jeu sont inchangés.

| Section | Modification |
|---|---|
| **En-tête et sommaire** | Mention de `MEFIANCE_SURVIVANTS.md`. |
| **§ 0. Ce qui est ajouté** | La méfiance envers Lou ; le secret de Lou (et le vieux Gaspard, jamais nommé à l'étage 1). |
| **§ 1. Résumé en 5 lignes** | Lignes 2 et 4 : l'étranger soupçonné, puis disculpé. |
| **§ 2. L'arc sur 4 étages** | Le « fil de Lou » : réputation et secret, étage par étage. |
| **§ 3. Comment l'enquête est construite** | Un point sur la méfiance (le héros est lui-même une fausse piste). |
| **§ 4. Micro-révélations** | Hub : l'accusation ; cafétéria : « depuis que t'es là ». |
| **§ 5. Personnages** | Le héros : ce qu'il dit, ce qu'il tait ; les noms qu'on lui donne ; la méfiance des deux survivants. |
| **§ 6. Chronologie** | Le jour de l'arrivée devient « J+9 », avec ses événements (porte laissée ouverte, génératrice, accusation). |
| **§ 9. Fausses pistes** | Quatrième fausse piste : l'étranger. Contradictions X8 à X10. |
| **§ 10. Déroulé pièce par pièce** | Seuil (entrée), traits sur la porte (cafétéria), accusation (hub). |
| **§ 11. Scènes muettes** | Cafétéria : les 9 traits ; entrée : les deux séries de pas. |
| **§ 12. Examiner** | Gros plan a15 (seuil) et a16 (paquet de Lou) ; pensées nouvelles (L1-L3, accusation). |
| **§ 13. Documents** | Les nouvelles cartes (seuil, traits, déclaration de l'opératrice). |
| **§ 15. Survivants** | Dialogues revus avec la méfiance, le nom de Lou, les scènes M1 à M7, la phrase d'aveu « Pardon, Lou ». |
| **§ 16. Tableau** | X8, X9, X10, C5, pensées d'erreur. |
| **§ 17. Aide** | Ligne C5. |
| **§ 18. Fair play** | L'innocence de Lou et les tells de l'opératrice. |
| **§ 19. Révélation** | Trois relectures nouvelles (« Pas tous », « mon garçon », l'avis). |
| **§ 20. Indices dormants** | Trois indices sur le secret de Lou (L1-L3). |
| **§ 21. Fin** | Le message radio et le départ selon la confiance. |
| **§ 22. Intégration technique** | État `trust`, `accused`, cartes et scènes nouvelles. |
| **§ 23. Résumé à lire à voix haute** | Réécrit avec la méfiance et le secret. |
| **Annexe** | Comptes mis à jour (10 contradictions, 5 phrases, 4 fausses pistes). |

---

## 13. Les pièges évités

| Piège | Ce qu'on fait |
|---|---|
| La méfiance qui bloque le jeu | Elle ne touche que le facultatif (réserve, témoignage, bonus). |
| La méfiance gratuite, « parce que » | Quatre raisons, toutes appuyées sur des faits vrais. |
| La jauge froide | Le nom, le corps, la porte, le partage, et la craie de Cuisine. |
| Les cadeaux qui achètent tout | Les grandes marches exigent vérité ou preuve. |
| La jauge cachée qui « dérive » | Des marches et des faux pas nommés, que le PNJ annonce. |
| Le rappel « X s'en souviendra » sans suite | Au plus 4 rappels, chacun avec une suite visible dans l'étage. |
| La coupable qui fabrique des preuves | L'opératrice ne fabrique rien : elle dit du vrai qui oriente, et ment une fois, de façon vérifiable. |
| Le héros qui sait avant le joueur | Lou ne pense jamais faux ; il se tait sur son passé, pas sur l'enquête. Il découvre « VIENS » avec le joueur. |
| Le secret qui rend le héros coupable | Le secret de Lou est une promesse, pas une faute ; il l'a même désobéie pour sauver les vivants. |

---

## 14. Sources

**Jeux**
- Game Developer, *The Walking Dead and the art of providing no good choice* : <https://www.gamedeveloper.com/design/-i-the-walking-dead-i-and-the-art-of-providing-no-good-choice>
- Game Informer, *Why your choices don't matter in Telltale games* : <https://www.gameinformer.com/b/features/archive/2015/02/03/why-your-choices-dont-matter-in-telltale-games.aspx>
- Den of Geek, *The Walking Dead: The False Promises of Telltale's Masterpiece* : <https://www.denofgeek.com/games/the-walking-dead-false-promises-telltale/>
- Eludamos, *"No Going Back": The Telltale Model as Thought Experiment* : <https://eludamos.org/index.php/eludamos/article/view/vol9no1-2>
- GamesBeat, *Why the illusion of player choice in The Walking Dead is important* : <https://gamesbeat.com/the-illusion-of-player-choice-in-the-walking-dead/>
- Walking Dead Wiki, *Long Road Ahead* (Lilly et les vivres) : <https://walkingdead.fandom.com/wiki/Long_Road_Ahead>
- Wikipedia, *Lee Everett* : <https://en.wikipedia.org/wiki/Lee_Everett>
- Wikipedia, *Kim Kitsuragi* : <https://en.wikipedia.org/wiki/Kim_Kitsuragi>
- Pathologic Wiki, *Plot: Pathologic 2* : <https://pathologic.fandom.com/wiki/Plot:_Pathologic_2> ; *Isidor Burakh* : <https://pathologic.wiki.gg/wiki/Isidor_Burakh/Pathologic_2> ; *Daniil (le Bachelier)* : <https://pathologic.wiki.gg/wiki/Daniil>
- *This War of Mine*, journal de joueur : <https://godisageek.com/2016/01/this-war-of-mine-diary/> ; Daily Dot, critique : <https://dailydot.com/this-war-of-mine-review>
- Xbox Wire, *The Meaningful Design of Frostpunk's Society System* : <https://news.xbox.com/en-us/2019/10/11/frostpunk-society-system-available-today/> ; PC Gamer, critique : <https://www.pcgamer.com/frostpunk-review/> ; Slant : <https://www.slantmagazine.com/games/review/frostpunk>
- Wikipedia, *Firewatch* : <https://en.wikipedia.org/wiki/Firewatch> ; Réka Törzsök, Acta Ludologica : <https://actaludologica.com/?p=2671>
- Haywire Magazine, *Opened World: Kentucky Route Zero Act III* : <https://haywiremag.com/columns/opened-world-kentucky-route-zero-act-iii/> ; Kill Screen : <https://www.killscreen.com/kentucky-route-zero-devs-says-moral-choices-games-are-pretty-worthless/>
- Game Developer, *Designing the bleak genius of Papers, Please* : <https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i->
- MCV, *Neil Druckmann on 'shooting for the insane' with The Last of Us* : <https://mcvuk.com/?p=74630> ; Wikipedia, *Development of The Last of Us* : <https://en.wikipedia.org/wiki/Development_of_The_Last_of_Us>
- Destructoid, *Character interaction in Dragon Age II* : <https://www.destructoid.com/keep-your-friends-close-character-interaction-in-dragon-age-ii/> ; Ashlander Analysis : <https://ashlanderanalysis.substack.com/p/remember-when-dragon-age-was-good-618>
- Wikipedia, *The Last Guardian* : <https://en.wikipedia.org/wiki/The_Last_Guardian>
- Mechanics of Magic, *Among Us — Critical Play: Social Deduction* : <https://mechanicsofmagic.com/2024/04/06/among-us-critical-play-social-deduction-amy-zhou/> ; *Critical Play: Social Deduction* : <https://mechanicsofmagic.com/2024/04/10/critical-play-social-deduction-adrian-rivas/>
- Town of Salem, rôles (Framer) : <https://gamersdecide.com/articles/town-of-salem-roles>
- Wikipedia, *Return of the Obra Dinn* : <https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn> ; récit complet : <https://gameplay.tips/guides/3237-return-of-the-obra-dinn.html>

**Littérature et cinéma**
- LitCharts, *Murder on the Orient Express* (l'intrusion maquillée, la neige) : <https://www.litcharts.com/lit/murder-on-the-orient-express/part-3-chapter-9>
- Goodreads, discussion *Dumb Witness* (*Témoin muet*) : <https://www.goodreads.com/topic/show/19907743-poirot-buddy-read-19-spoiler-thread-dumb-witness>
- eNotes, *And Then There Were None — Themes: Paranoia* : <https://www.enotes.com/topics/then-there-were-none/themes/paranoia>
- Bright Lights Film Journal, *A Stranger Arrives in Town* : <https://brightlightsfilm.com/a-stranger-arrives-in-town-francis-coppolas-twixt-2011/>

**Écrire des PNJ**
- Grand Text Auto, *Transparency or not? It remains unclear* : <https://grandtextauto.soe.ucsc.edu/2008/03/14/transparency-or-not-it-remains-unclear>
- ixie Gaming, *Agentic NPCs without breaking balance* : <https://www.ixiegaming.com/agentic-npcs-without-breaking-balance/>
- Sly Flourish, *Avoid NPC Betrayal* : <https://slyflourish.com/avoid_npc_betrayal.html>
- D&D Beyond (le PNJ trop serviable) : <https://www.dndbeyond.com/forums/dungeon-masters-only/94798-concerning-javelins/next>
