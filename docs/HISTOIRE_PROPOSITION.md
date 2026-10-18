# SILLO 8 — Proposition d'histoire et d'enquête

> Document de travail, à valider avant toute intégration. Rien n'est encore dans le jeu.
> Le jeu aura **4 étages** ; seul l'étage 1 est détaillé ici, les étages 2 à 4 sont esquissés.
> Cette version part **uniquement** de ce qui existe déjà : les notes de `game/notes.ts` (inchangées,
> mot pour mot), la carte de l'étage 1, le héros de la fiche personnage, les 5 objectifs, le signal
> radio qui répond d'en bas. Les mordus sont de **vrais zombies**. L'enquête porte sur **ce qui s'est
> passé** dans le silo, construite comme un roman d'Agatha Christie, et suit les principes de
> `docs/RECHERCHE_ENQUETE.md` (checklist en annexe). La méfiance des survivants envers Lou et le
> secret de Lou sont détaillés dans `docs/MEFIANCE_SURVIVANTS.md`.

**Sommaire**
0. Ce qui est repris, ce qui est ajouté · 1. Résumé · 2. L'arc sur 4 étages · 3. Principes de
l'enquête · 4. La première minute et le rythme des découvertes · 5. Personnages · 6. La vérité de
l'étage 1 · 7. Les mordus · 8. Survie : pourquoi tout manque · 9. Couches, fausses pistes,
contradictions · 10. Déroulé pièce par pièce · 11. Immersion · 12. Examiner : les quatre formes ·
13. Documents · 14. Énigmes · 15. Survivants · 16. Tableau d'enquête · 17. Aide en trois paliers ·
18. Fair play · 19. La révélation qui recontextualise · 20. Indices dormants · 21. Fin de l'étage 1 ·
22. Intégration technique · 23. Résumé à lire à voix haute · Annexe : checklist

---

## 0. Ce qui est repris tel quel, ce qui est ajouté

### Repris tel quel du jeu (rien n'est modifié ni contredit)

**Le lieu et le ton**
- SILLO 8, abri souterrain à étages ; l'étage 1 et ses pièces exactes : entrée (extérieur), zone extérieure, sécurité, hub central, couloir nord, accès étage 2, couloir ouest, dortoirs, pièce cachée, entrepôt, cafétéria, génératrice, couloir est, salle de contrôle, infirmerie, atelier, serre.
- Le monde dehors, post-apocalyptique : épaves, rochers, grillages.
- L'accroche du jeu : « Le silo est tombé. Les morts marchent encore. Descendez. »
- Les **mordus** : de vrais morts qui marchent, qui craignent la lumière vive et entendent le bruit.

**Le héros** : le bricoleur de la fiche personnage, tel quel (bonnet olive, veste moutarde, sacoche
en cuir, clé à molette, lance-clous, lampe, carnet).

**Les 5 objectifs**, sans changement : explorer l'entrée ; alimenter la génératrice avec 3 ferrailles ;
accéder au hub central ; réparer la communication (module radio à l'atelier, puis console) ; obtenir
la clé de l'étage 2 (note de Lila → mur creux des dortoirs → pièce cachée → escalier).

**Les ressources existantes** : piles et charge de lampe, borne de recharge du poste de sécurité,
conserves, bandages, trousses, ferraille, clous.

**Les 7 notes existantes, mot pour mot, aux mêmes endroits**
- `note_entrance` — Consigne de garde, **Sgt. Bérard**, poste d'entrée.
- `note_generator` — Journal de maintenance, **Équipe technique**, page arrachée.
- `note_cafeteria` — Menu du jour, **Cuisine** (pêches en conserve ; on pique les piles dans l'entrepôt).
- `note_infirmary` — Rapport médical n° 12, **Dr Okafor** (les mordus supportent mal la lumière vive).
- `note_control` — Relève radio, **Opératrice de nuit** (l'émetteur a grillé pendant l'orage).
- `note_storage` — Liste de Lila, **Lila** (la clé est au fond des dortoirs, le mur sonne creux).
- `note_secret` — Dernier mot, **Lila** (« Les autres sont descendus. Prends la clé, et ne fais pas confiance au silence. »).

**Les messages du jeu**, mot pour mot :
- « La génératrice tousse… puis tourne. »
- « Communication rétablie. Une voix grésille… quelque part plus bas. »
- « Le mur creux cède sous l'épaule. Une pièce cachée ! »
- La fin : « La clé glisse dans le lecteur. L'escalier de service s'ouvre sur le noir. Quelque part plus bas, le signal radio répond encore. L'étage 2 vous attend… bientôt. »

### Ce qui est ajouté

**Des secrets et des liens** pour les personnages existants (§ 5) :
- **Bérard** a fait entrer un homme mordu, et en a laissé un autre dehors.
- **Okafor** a soigné ce mordu en secret ; son rapport n° 12 vient de là.
- **Cuisine** a cadenassé les dernières piles.
- **L'opératrice de nuit** était la femme du mordu. C'est elle qui a ouvert sa porte.
- **Lila**, aide de l'infirmerie, portait les piles ; elle est restée en haut pour ceux qu'on avait oubliés.

**Un seul personnage vraiment nouveau, indispensable : Marceau**, chef de l'équipe technique (l'équipe
existe déjà dans les notes). C'est le premier mordu de l'étage 1. On ne le rencontre qu'en mordu.

**Trois figurants sans nom**, pris dans les groupes que les notes citent déjà : un guetteur de la garde
de Bérard, un commis de la cuisine, un infirmier d'Okafor. Ce sont trois des cinq mordus, reconnus à
leur badge de fonction.

**La méfiance envers Lou** (détail dans `MEFIANCE_SURVIVANTS.md`) : les deux survivants soupçonnent
« l'étranger » d'avoir laissé entrer les mordus. Lou doit se disculper par l'enquête, pendant que la
vraie coupable, gentille avec lui, laisse faire. Un système de confiance sans jauge (le nom qu'on lui
donne, la porte, l'arme, ce qu'on partage).

**Le secret de Lou** : il n'est pas venu seulement chercher un abri. Il a fait une promesse à un vieux
serrurier du dehors (proposé : « le vieux Gaspard », **jamais nommé à l'étage 1**), qui a posé les
verrous côté dehors. Lou n'est coupable de rien. Le joueur sait **dès la première minute** que Lou cache
quelque chose (« Je ne devais pas entrer… », un paquet qu'il n'ouvre pas), sans savoir quoi. Le secret
est révélé aux étages 3 et 4. Règle : les pensées de Lou peuvent se taire, jamais mentir au joueur.

**Le reste :**
- Un prénom pour le héros (proposé, à choisir).
- De nouveaux documents, objets et traces (§ 12, § 13).
- Trois énigmes, deux survivants (Cuisine et l'opératrice de nuit), le tableau d'enquête.
- Deux petits espaces aménagés **à l'intérieur** des pièces existantes : « la chambre 1 » (infirmerie) et « le local technique » (salle de contrôle).
- L'arc sur 4 étages (§ 2) et 5 indices dormants (§ 20).

---

## 1. Résumé en 5 lignes

1. Un jeune bricoleur venu du dehors entre dans SILLO 8. Sur la grande porte, quelqu'un a écrit à la craie : « ILS SONT DESCENDUS. PAS TOUS. »
2. L'affiche officielle accuse des mordus entrés par la porte de service pendant l'orage. Le héros est entré par cette porte, et les mordus se remettent à marcher « depuis qu'il est là » : les survivants soupçonnent « l'étranger ». Les traces disent autre chose : le premier mordu est sorti de l'infirmerie, neuf jours avant son arrivée.
3. Marceau, le chef technique, avait été mordu en expédition. Bérard l'a fait entrer, Okafor l'a gardé sous des lampes, Lila portait les piles, Cuisine les a enfermées.
4. La nuit de l'orage, quelqu'un a ouvert sa porte. Disculpé, le joueur écarte les suspects un par un et démasque celle qui l'a guidé depuis le début, et qui l'a laissé accuser : l'opératrice de nuit, sa femme.
5. La radio réparée capte la voix d'Okafor (« ne descendez pas ») et un signal tapé à la main, venu de **plus bas que l'étage 2** : « VIENS ».

---

## 2. L'arc sur 4 étages

**La grande question des 4 étages :** *Pourquoi SILLO 8 est-il tombé, vraiment… et qu'y a-t-il au fond ?*
Chaque étage résout **une affaire locale** et révèle **une couche** du grand mystère, puis se termine sur
une réponse qui crée une nouvelle question.

| Étage | Lieu et « métier » | L'affaire de l'étage | Ce qu'il révèle du grand mystère | La question qui pousse à descendre |
|---|---|---|---|---|
| **1. Ceux d'en haut** *(détaillé ici)* | Quartiers de vie : dortoirs, cuisine, infirmerie, radio, serre | Qui a ouvert la chambre 1 la nuit de l'orage ? | Le premier mordu de l'étage venait **de l'intérieur**, et les chefs ont menti pour le cacher. Mais certains indices disent que **les mordus étaient déjà connus du silo bien avant**. | Qui tape « VIENS », plus bas que l'étage 2, et où est Lila ? |
| **2. Les réserves** *(esquisse)* | Stocks, hôpital de fortune, le refuge du groupe d'Okafor | Le groupe descendu s'est divisé. Pourquoi Okafor dit-elle « ne descendez pas » ? | Okafor a scellé l'accès à l'étage 3 sous ses pieds : le signal vient de là, et des mordus aussi. Lila est passée par les conduits d'aération. | Qui vit à l'étage 3, derrière une porte soudée bien avant l'épidémie ? |
| **3. Les machines** *(esquisse)* | Air, eau, pompes, la salle des fondateurs | Le secteur muré : qui l'a muré, et quand ? | Une **première épidémie**, à la fondation, étouffée par les fondateurs. La personne de dos sur la photo de l'inauguration (étage 1) est identifiée. | Qu'ont-ils enfermé au fond ? |
| **4. Le fond** *(esquisse)* | Archives, la plus vieille partie du silo | L'origine | **SILLO 8 n'a pas été construit pour protéger des mordus, mais pour les garder.** La règle n° 1 (« aucun mordu ne franchit la porte ») voulait d'abord dire : *aucun ne sort*. Les verrous de la grande porte, côté dehors, prennent leur sens. | Fin du jeu : que fait-on de la vérité, et de ceux qui sont encore en bas ? |

**Le fil de Lou : sa réputation et son secret** (détail dans `MEFIANCE_SURVIVANTS.md`)

| Étage | Ce qu'on croit de Lou | Ce qu'on apprend de son secret |
|---|---|---|
| **1** | « L'étranger » qui a laissé entrer les mordus. Il se disculpe par l'enquête (C5). | Qu'il cache quelque chose, dès la première minute (« Je ne devais pas entrer… », un paquet noué qu'il n'ouvre pas). Puis deux indices discrets : son trouble devant le triangle de la photo, son gant sur les verrous. |
| **2** | Sa réputation le précède par le message radio de l'opératrice : « Lou » ou « l'étranger de la porte de service ». Okafor, autrice de l'avis mensonger, est tentée de le désigner à nouveau. | Les survivants sentent qu'il cache quelque chose. |
| **3** | Pour ceux d'en bas, « l'étranger » veut dire : ceux qui ont fermé la porte. | Le triangle est la marque des fondateurs. **Le paquet est ouvert : une clé de laiton au triangle**, la clé des verrous du dehors. Lou doit dire sa promesse. |
| **4** | Le silo gardait le mal dedans : l'homme du dehors était venu tenir la porte. | Le mot du vieux serrurier : « Si le 8 tombe, ferme-le. De dehors. » Choix final : tenir la promesse, ou non, avec des vivants en bas. |

**Le thème qui relie tout :** dans un silo, on croit que le mal vient du dehors. À l'étage 1, il venait
de l'infirmerie ; à l'étage 4, il venait du fond. Et l'étranger qu'on accuse était le gardien.

**Règle d'or pour l'étage 1** : le joueur repart **satisfait** (il a résolu l'affaire de la chambre 1,
il sait qui a menti et pourquoi) **et intrigué** (il ne sait ni d'où viennent vraiment les mordus, ni
qui l'appelle d'en bas, ni où est Lila). Rien de ce que l'étage 1 révèle ne sera contredit plus bas :
seulement élargi.

---

## 3. Comment l'enquête est construite

- **Une question forte dès la première minute.** « ILS SONT DESCENDUS. PAS TOUS. » Qui est resté ? (§ 4)
- **Puis une question qu'on ne connaissait pas.** Une fois la chambre 1 découverte : *qui l'a ouverte ?*
  Le joueur la découvre en même temps que le héros.
- **Chaque personnage a un secret**, presque toujours un petit secret vrai qui explique pourquoi il
  a l'air coupable (§ 5). Un seul a ouvert la porte.
- **La coupable est présente dès la première pièce**, sans paraître suspecte : c'est sa voix, douce et
  inquiète, que le héros entend en premier à la radio de la guérite.
- **Des indices en pleine vue** : la lampe verte, le mot « Nuit » dans sa signature canon, le
  « silence » de la note de Lila.
- **Le joueur affirme, le jeu vérifie** : il relie des contradictions et complète des phrases à trous
  avec des mots gagnés en explorant (§ 16). Une erreur ne punit jamais.
- **Le savoir ouvre les portes** : un cadenas qui s'ouvre avec un mot lu sur le menu, une armoire
  qu'on pousse parce qu'on a compris, un mot de passe qui est un nom.
- **Les mordus servent l'enquête** : cinq seulement, chacun porte un indice et refait une habitude.
  On peut les éviter. Aucun passage clé n'exige de les vaincre.
- **La survie sert la tension** (§ 8) : la rareté des piles est le cœur du drame, et le joueur la vit.
- **Le héros est lui-même une fausse piste.** Les survivants soupçonnent l'étranger ; il se disculpe
  avec des preuves (C5), et ce retournement relance la vraie question. La coupable, elle, a intérêt à
  ce qu'on l'accuse.

---

## 4. La première minute et le rythme des découvertes

### La première minute

1. **L'image.** Le héros arrive sur le chemin de terre (point de départ actuel). Devant lui, la grande
   porte de sécurité, morte. Dessus, à la craie, en grosses lettres d'enfant : **« ILS SONT DESCENDUS.
   PAS TOUS. »** La caméra s'attarde une seconde dessus.
2. **La voix.** En approchant de la guérite, une radio grésille. Une voix de femme, douce, fatiguée :
   « …ici l'opératrice de nuit… c'est l'heure de la relève… il y a quelqu'un ? » Puis la pile de la
   radio meurt. Plus rien.
3. **La pensée du héros** : « Pas tous. Alors quelqu'un est encore là-dedans. » Sa main se pose sur
   sa sacoche, sur un paquet noué. Deuxième pensée, qui hésite : **« Je ne devais pas entrer… »** Puis
   rien. Dès la première minute, **le joueur sait que Lou cache quelque chose**, sans savoir quoi.
   *(Règle : les pensées de Lou peuvent se taire, jamais mentir au joueur. Cette phrase est vraie : il
   avait promis de fermer le silo de dehors, sans entrer. On ne le saura qu'aux étages 3 et 4.)*
4. **Le détail qui ne paiera que bien plus tard** (indice dormant) : les gros verrous de la porte sont
   **du côté dehors**. Pensée : « Drôle de porte. On dirait qu'elle ferme de l'extérieur. »

En une minute, le joueur a une question (qui est resté ?), une voix à retrouver, un héros qui tait
quelque chose, et un détail étrange qu'il ne comprendra qu'à l'étage 4.

### Une micro-révélation par pièce

Chaque pièce pose une petite question et donne une petite réponse, en moins de 5 minutes.

| Pièce | La question qu'elle pose | La petite réponse qu'elle donne |
|---|---|---|
| Entrée | Qui est resté ? Qui parle à la radio ? | Une opératrice de nuit est vivante quelque part. |
| Zone extérieure | Pourquoi une lanterne d'enfant si loin de la porte ? | Quelqu'un (Lila) est sorti chercher des pièces. Un garde mordu porte une feuille d'expédition. |
| Génératrice | Pourquoi ce mordu ne fait-il aucun bruit ? | Il porte un bracelet d'infirmerie : « Chambre 1 ». Il était soigné avant de mourir. |
| Sécurité | Que notait Bérard ? | Il a menti sur une expédition (énigme 3). |
| Hub | Comment est-ce arrivé ? | Version officielle : « par la porte de service ». Le joueur a une affirmation à vérifier. Plus tard, Cuisine y accuse Lou, devant l'affiche. |
| Cafétéria | Qui frappe dans la chambre froide ? | Un vivant : Cuisine. Il se méfie de « l'étranger » (« depuis que t'es là… ») et accuse Lila d'avoir volé les piles. |
| Entrepôt | Pourquoi un cadenas sur des piles ? | Les piles étaient comptées ; le cuisinier en a refusé une, le soir de l'orage. |
| Infirmerie | Qu'y a-t-il derrière l'armoire ? | La chambre 1 : on y gardait un mordu sous des lampes. |
| Atelier | Qui était Marceau ? | Le meilleur ami de Bérard. Une photo signée « N. ». |
| Salle de contrôle | Pourquoi l'opératrice ne répondait-elle plus ? | Sa pile était morte… et son verrou était fermé de l'intérieur. |
| Dortoirs | Qui a vu quelque chose ? | Lila : une lampe **verte**, à 2 h 05. |
| Pièce cachée | Où est la clé ? | La clé, et l'étiquette d'Okafor : « Pour Lila — ferme derrière toi. » |

---

## 5. Personnages

### Le héros : le bricoleur de la fiche

- Un jeune homme, tel que sur la fiche : bonnet olive, veste moutarde, gants et bottes, sacoche en cuir.
- **Venu du dehors.** On ne sait presque rien de lui, et il n'en dit pas plus. Il a l'habitude d'être
  seul et répare tout ce qu'il touche.
- **Ce qu'il dit :** il cherche un abri, puis il veut savoir qui est encore vivant (« pas tous »).
- **Ce qu'il tait (son secret, révélé aux étages 3 et 4) :** il a appris son métier auprès d'un vieux
  serrurier du dehors (proposé : « le vieux Gaspard »), qui avait posé les **verrous côté dehors** de
  SILLO 8. Avant de mourir, le vieux lui a confié un paquet noué (une clé de laiton marquée d'un
  **triangle**, et un mot) et une promesse : « Si un jour le 8 tombe, va le fermer. De dehors. Et
  n'entre pas. » Lou ne sait pas pourquoi. Devant la porte, il lit « PAS TOUS » : des vivants sont
  dedans. **Il désobéit et entre.** Il n'est coupable de rien.
  *Deux autres options étudiées (le message reçu, la lettre à remettre) : voir `MEFIANCE_SURVIVANTS.md` § 4.*
- **Le joueur sait dès le début qu'il cache quelque chose** (le paquet noué de sa sacoche, qu'il
  n'ouvre jamais ; la pensée « Je ne devais pas entrer… » dès la première minute), sans savoir quoi.
- **Pas de famille dans le silo.** Il découvre l'histoire de l'étage en même temps que le joueur.
- **Prénom : Lou** (choisi par l'auteur). Comment on l'appelle dit la confiance qu'on lui fait :
  « **l'étranger** » (méfiance), « **le bricoleur** » (prudence), « **Lou** » (confiance). L'opératrice
  dit « **mon garçon** » en face et « l'étranger » dans son dos ; elle ne dit « Lou » qu'après son aveu.
- **Ses pensées** (§ 12 b) : courtes, pratiques, un peu ironiques. Elles **posent des questions**, elles
  ne donnent jamais la réponse avant le joueur. Sur son passé, il **se tait** mais ne pense jamais
  quelque chose de faux (comme le narrateur du *Meurtre de Roger Ackroyd*, il omet sans mentir).

### Les cinq suspects et leur secret

La question de l'étage : **qui a ouvert la chambre 1, la nuit de l'orage ?**

| Personnage (canon) | Ce que disent les notes du jeu | Son secret (vrai) | Pourquoi on le soupçonne | Ce qui l'innocente (ou l'accuse) |
|---|---|---|---|---|
| **Sgt Bérard**, poste d'entrée | Consigne de garde : « ne restez pas dehors à la nuit tombée ». | Au retour d'une expédition, il a laissé le guetteur mordu **dehors** (règle n° 1)… et fait **entrer Marceau**, son ami, mordu lui aussi. Il a arraché la page qui le trahissait et co-écrit la fausse version officielle. | Il est à l'origine de tout ; il voulait peut-être libérer son ami. | Journal du poste : à 2 h 00 et 2 h 15, il est **à l'entrée**, à l'autre bout du silo. |
| **Dr Okafor**, infirmerie | Rapport n° 12 : les mordus craignent la lumière vive. | Elle a gardé Marceau dans la chambre 1, sous deux lampes, et l'a étudié en secret (rapports 1 à 11). Le n° 12 vient de lui. Elle a décidé de le « sortir à l'aube », puis a fait descendre tout le monde et condamné l'étage. | C'est sa chambre, son patient. | Note de l'infirmier : « Dr O. dort enfin. » Et elle écrit « *elle* lui parle » : elle parle de quelqu'un d'autre. |
| **Cuisine**, cafétéria | « On les compte, maintenant. » | Il a cadenassé les piles et en a refusé une à Lila le soir de l'orage. Sans piles, les lampes de la chambre 1 ont faibli. Il s'en veut. | Rancune contre la « voleuse », clés de tout, mensonge par omission. | Feuille de comptage : à 2 h 10, il vérifie son cadenas **à l'entrepôt**, dans l'aile ouest. |
| **Lila**, aide de l'infirmerie | Elle a caché la clé ; « ne fais pas confiance au silence ». | Elle « piquait » les piles, pour Okafor. Elle a vu passer quelqu'un. Elle est restée pour ceux qu'on avait oubliés. | L'infirmier écrit : « ça doit être la petite avec les piles ». | Sa liste : « ma lampe aussi est morte ». La personne qui passe a une lampe **allumée**, et **verte**. |
| **L'opératrice de nuit**, salle de contrôle | Relève radio : « l'émetteur a grillé pendant l'orage ». | **La femme de Marceau.** Il l'appelait « ma Nuit ». À 1 h 50, elle entend à la radio interne : « À l'aube, on le sort. » À 2 h 05, elle quitte son poste avec sa lampe verte pour lui dire adieu. L'orage a coupé le courant : la porte électrique de la chambre 1 s'ouvre d'une poussée. Elle pose sa lampe près de lui ; il reste calme… jusqu'à ce que la pile meure. Elle s'enfuit, s'enferme, et ne dit plus rien. | Personne : c'est la voix gentille de la première minute, et elle aide le héros. Elle oriente même les soupçons vers « l'étranger ». | Lampe verte, alliance, signature, trou dans son cahier, verrou fermé de l'intérieur, faux voyant de la porte de service (§ 16). |

**Son mobile** : l'amour et la peur, pas la méchanceté. Elle voulait un adieu, pas une catastrophe. Elle
se tait par honte. C'est ce qui rend la révélation triste plutôt que choquante.

### Les autres

- **Marceau** (le seul personnage nouveau), chef de l'équipe technique. Mordu à l'avant-bras pendant
  l'expédition ; il a dit « c'est la tôle ». C'est le premier mordu de l'étage, et le seul qui ne
  grogne pas : **le Silencieux**.
- **Lila, aujourd'hui :** elle est sortie chercher les pièces de la génératrice, avant la nuit, et
  n'est pas revenue. Sa lanterne est aux épaves. **Elle n'est pas morte à l'écran** : son sort est la
  question qui relie les étages 1 et 2.

### Les deux survivants vivants

| Qui | Où | Comment on le rencontre |
|---|---|---|
| **Cuisine** (« Tout le monde m'appelle Cuisine, alors… ») | Barricadé dans la chambre froide de la **cafétéria** | Il frappe quand on approche. Il n'ouvre qu'après une question : « Les mordus, ça parle pas. Dis-moi un truc que seul un vivant dirait. » Et seulement sur la chaîne, couperet à la main. |
| **L'opératrice de nuit** (« Mon nom ? Ça fait longtemps que plus personne ne l'utilise. ») | Enfermée dans le **local technique** de la salle de contrôle | Entendue dès la première minute ; muette ensuite (pile morte). Elle reparle quand on rallume le circuit CONTRÔLE (énigme 2). |

**Leur méfiance envers Lou** (détail dans `MEFIANCE_SURVIVANTS.md`)
- **Cuisine** : méfiance **franche et bourrue**. Il compte tout, même les jours (9 traits sur sa porte
  depuis l'orage), et il compte Lou. Il l'accuse, puis devient son allié s'il est disculpé.
- **L'opératrice** : **gentille en face, elle laisse accuser.** Tant qu'on soupçonne l'étranger, personne
  ne cherche qui a ouvert la chambre 1. Elle ne fabrique aucune preuve : elle dit des choses vraies qui
  orientent, et ment une seule fois, de façon vérifiable (X9).

**Le système de confiance (Cuisine)** : quatre niveaux, sans jauge.

| Niveau | Il appelle Lou… | Porte et arme | Ce qu'il partage |
|---|---|---|---|
| Hostile | « l'étranger », « toi, là » | Fermée ; couperet levé | Échanges par la fente, rien de gratuit |
| **Méfiant** (départ) | « l'étranger » | Sur la chaîne ; couperet baissé | Des infos sur lui |
| Prudent | « le bricoleur » | Ouverte ; couperet posé | Témoignage, échanges justes ; il demande le nom de Lou |
| Confiant | « Lou » | Il sort, il tourne le dos | Clé de la réserve, sa honte, des pêches pour la route |

**Ce qui fait monter** : partager une ressource rare, dire la vérité quand elle coûte, montrer le bon
indice, tenir parole (refermer la porte de service), sauver de mordus. **Ce qui fait baisser** : mentir
et être démasqué, fouiller ses affaires sous ses yeux, faire du bruit qui attire les mordus, promettre
sans tenir, fuir devant un mordu. On n'atteint **Confiant** qu'une fois disculpé. La méfiance ne bloque
**jamais** les 5 objectifs.

---

## 6. La vérité de l'étage 1 (dans l'ordre)

Le joueur ne lit jamais ce tableau tel quel : il le reconstitue.

| Quand | Ce qui s'est passé | Où le joueur l'apprend |
|---|---|---|
| **Avant** | SILLO 8 abrite une trentaine de personnes. Règle n° 1 du silo : aucun mordu ne franchit la porte. *(Son vrai sens ne viendra qu'à l'étage 4.)* | Affiche de la règle n° 1 (entrée), consigne de Bérard. |
| **J−12** | Le régulateur de la génératrice fatigue ; la ferraille manque. Expédition aux épaves : Bérard, Marceau, un guetteur. Retour à la nuit tombée, attaque. Le guetteur est mordu : Bérard le laisse dehors. Marceau aussi est mordu ; Bérard le fait entrer et note « RAS ». | Feuille d'expédition (sur le guetteur), journal de maintenance, page arrachée. |
| **J−11** | Okafor installe Marceau dans la chambre 1 (officiellement « condamnée, humidité »), sous deux lampes : la lumière le calme. Elle écrit les rapports 1 à 11. Le commis pose les plateaux devant la porte. | Plan de l'infirmerie, ticket de plateau, dossier de la chambre 1. |
| **J−10 à J−1** | Les lampes mangent 4 piles par nuit. Lila les prend à l'entrepôt. Cuisine remarque le vol (« on les compte, maintenant »). Le silo se vide de piles. | Menu du jour (canon), liste de Lila n° 2, feuille de comptage. |
| **Nuit de l'orage, 1 h 50** | Sur le canal 2 de la radio interne, Okafor dit à Bérard : « À l'aube, on le sort. Règle n° 1. » L'opératrice, à la console, entend tout. | Journal du poste (terminal de Bérard). |
| **Le soir même** | Cuisine cadenasse l'armoire à piles et refuse une pile à Lila. | Feuille de comptage, liste de Lila n° 2. |
| **2 h 00** | La foudre : l'émetteur grille (canon), la génératrice saute. La serrure électrique de la chambre 1 se libère. | Relève radio (canon), cahier de relève, serrure de la chambre 1. |
| **2 h 05** | Une lampe verte passe dans le couloir est. L'opératrice a quitté son poste (rien dans son cahier entre 2 h 00 et 2 h 20). Elle entre dans la chambre 1. | Liste de Lila n° 3, cahier de relève, éclat de verre vert, empreintes UV. |
| **2 h 10** | L'infirmier voit « quelqu'un avec une lampe » et croit que c'est Lila. Okafor dort. Cuisine est à l'entrepôt. Bérard est à l'entrée. | Mot de l'infirmier, feuille de comptage, journal du poste. |
| **2 h 14** | La pile de la lampe verte meurt. Dans le noir, Marceau se lève sans un bruit. L'infirmier est le premier mordu. L'opératrice s'enfuit et s'enferme dans le local technique. | Montre de l'infirmier arrêtée à 2 h 14, traînées UV. |
| **Le lendemain** | Okafor et Bérard affichent : « des mordus sont entrés par la porte de service pendant l'orage ». Le commis est mordu. Okafor organise la descente et condamne l'étage 1. Bérard couvre la retraite dans le couloir nord et y est mordu. | Avis officiel (hub), brouillon (tiroir d'Okafor), Bérard devant l'escalier. |
| **La descente** | Okafor confie la clé de l'étage 2 à Lila : « ferme derrière toi ». Lila ne descend pas : Cuisine et l'opératrice sont restés. Elle cache la clé, écrit ses notes, frappe à la porte de la radio (pas de réponse, mais du vert sous la porte), et écrit à la craie sur la grande porte : « ILS SONT DESCENDUS. PAS TOUS. » | Notes de Lila (canon), liste n° 3, message à la craie. |
| **Après** | Lila sort par la porte de service chercher les 3 ferrailles pour rallumer l'étage. Elle n'est pas revenue. Cuisine trace un trait par jour sur sa porte. | Liste de Lila n° 4, lanterne près des épaves, petits pas qui sortent sur le seuil, traits de Cuisine. |
| **J+9 (le jour du jeu)** | Le bricoleur arrive. Il entre par la porte de service et la laisse entrouverte. Il relance la génératrice : le bruit remet les mordus en marche. Au retour du courant, l'opératrice voit « PORTE DE SERVICE : OUVERTE » et désigne « l'étranger » ; Cuisine l'accuse. Lou finit, sans le savoir, ce que Lila avait commencé. | Seuil (une seule paire de bottes qui entre), boue rouge, M1 à M5 (§ 15). |

**Ce que l'étage 1 ne dit pas** (volontairement) : pourquoi Okafor connaissait déjà si bien les mordus ;
pourquoi les verrous de la grande porte sont dehors ; qui est la personne de dos sur la photo ; où est
Lila ; qui tape le signal ; ce que Lou garde dans son paquet noué (§ 20).

---

## 7. Les mordus : cinq anciens habitants, chacun porte un indice

**Les règles, fixées et montrées avant de servir :**
1. Ce sont de vrais morts qui marchent. Ils ne se soignent pas, ne reviennent pas.
2. **La lumière vive les fige** (rapport n° 12, canon) — montré dès la génératrice.
3. **Le bruit les attire** (coups de lance-clous, leviers ratés) — montré à la zone extérieure.
4. **Ils refont une habitude de leur vie** — montré au premier mordu croisé (le guetteur qui regarde la route).
5. **La morsure contamine.** Un mordu mord ; un mordu ne sort pas d'une tombe.

**Comment on joue avec eux :** peu nombreux, lents, prévisibles. On peut les éviter (s'accroupir,
attendre la fin d'une ronde, contourner). Un mordu figé par la lampe peut être **examiné** (`E`) le
temps de lire ce qu'il porte. Les abattre coûte des clous et du bruit, ce qui en attire d'autres. Un
mordu abattu tombe et ne se relève pas (pas de sang, style jouet) ; l'objet qu'il portait reste au sol.
**Aucun passage clé n'exige de vaincre un mordu.**

| Mordu | Qui c'était | Où il erre | Son habitude | L'indice qu'il porte |
|---|---|---|---|---|
| **Le guetteur** | Garde laissé dehors après l'expédition | **Zone extérieure**, autour des épaves | Il se poste face à la route et « guette », puis repart. | **Feuille d'expédition** pliée dans son brassard « GARDE ». |
| **Marceau, le Silencieux** | Chef de l'équipe technique | **Génératrice** | Il tapote le moteur, comme pour le régler. **Aucun son** : la musique se coupe quand il approche. | **Bracelet** « CHAMBRE 1 — DR O. » et **alliance** gravée « M. — à ma Nuit ». |
| **Le commis** | Aide de Cuisine | **Cafétéria** | Il porte un plateau vide jusqu'à la chambre froide, le pose, frappe deux fois, repart. | **Ticket de plateau** « Chambre 1 — frapper deux fois, ne pas entrer. Dr O. » |
| **L'infirmier** | Infirmier de garde la nuit de l'orage | **Infirmerie** | Il fait le tour des lits, s'arrête devant l'armoire. | **Montre arrêtée à 2 h 14** et un **mot** dans sa blouse. |
| **Sgt Bérard** | Chef de la garde ; a couvert la descente | **Couloir nord**, devant l'accès étage 2 | Il garde encore la porte, va et vient. | **La page arrachée**, dans la poche de poitrine, avec son sifflet. |

**Changement dans le plan :** on garde `walker_ext` (guetteur), `walker_gen` (Marceau), `crawler_cafe`
(commis) ; `walker_control` devient l'infirmier (déplacé à l'infirmerie) ; `walker_dorms` devient Bérard
(déplacé dans le couloir nord). On retire les cinq autres. **Les pièces où l'on lit longtemps
(dortoirs, hub, entrepôt, atelier, salle de contrôle, pièce cachée) n'ont pas de mordu.**

---

## 8. Survie : pourquoi tout manque (et ce que ça raconte)

Pas de nouveau système : on garde les ressources existantes et la borne de recharge. Mais **chaque
manque a une raison dans l'histoire**, et la rareté vécue par le joueur lui fait comprendre les mobiles.

| Ressource | Pourquoi elle manque | Ce que le joueur trouve | Ce qu'on lui demande |
|---|---|---|---|
| **Piles** (lampe) | Les lampes de la chambre 1 en ont mangé 4 par nuit pendant 10 nuits. Le silo s'est vidé. Le reste est sous cadenas. | Très peu : quelques piles isolées, 3 dans l'armoire de Cuisine (énigme 1), 2 dans sa réserve. | L'opératrice demande **1 pile** pour sa lampe. |
| **Charge de la lampe** | Les piles sont rares (ci-dessus) : la borne ne peut pas tout compenser. | La borne du poste de sécurité recharge la lampe **une fois par visite** : il faut ressortir et revenir pour la réutiliser (point sûr, pas une source infinie). | **Choix permanent** : dépenser la charge pour **figer** un mordu, ou pour **révéler** des traces à la lampe UV. Se protéger ou voir. |
| **Conserves** | Le groupe descendu a emporté le reste. Il ne reste que des pêches (canon). | Quelques boîtes de pêches. | — |
| **Bandages / trousses** | Okafor a descendu le stock de l'infirmerie. | L'armoire à pharmacie est vide, sauf un bandage. | Cuisine demande **1 bandage** (il s'est coupé en barricadant sa porte). |
| **Ferraille** | C'est elle qui manquait au régulateur : la cause de l'expédition, donc de la morsure de Marceau. | Les 3 pièces de la génératrice, dont une posée par Lila près de sa lanterne. | La génératrice (objectif 2), le module radio (objectif 4). |

**Les deux dilemmes « ressource contre information » :**
- **Une pile pour l'opératrice** : la donner, c'est moins de lumière pour soi ; en échange, elle parle,
  et sa radio deviendra la voix de la fin d'étage.
- **Un bandage pour Cuisine** : en échange, la clé de sa réserve et son témoignage.

**Ce que le joueur comprend en jouant :** quand il compte lui-même ses piles, il comprend pourquoi
Cuisine a mis un cadenas, et pourquoi une seule pile qui meurt a pu tout faire basculer.

**Règles de dosage :** jamais de pénurie pendant la lecture ou au tableau ; assez de ressources pour
finir l'étage en jouant prudemment, un petit surplus pour qui observe bien ; la rareté montera d'un
étage à l'autre.

---

## 9. Les couches, les fausses pistes, les contradictions

**Trois couches à l'étage 1, chacune fermée avant d'ouvrir la suivante :**

| Couche | Question | Réponse donnée à l'étage 1 |
|---|---|---|
| 1. Entrée → génératrice → hub | *Qui est resté ? Comment les mordus sont-ils entrés ? Est-ce l'étranger ?* | Deux vivants sont restés. Les mordus ne sont **pas** entrés par la porte de service : le premier venait de l'infirmerie, neuf jours avant Lou. |
| 2. Cafétéria, entrepôt, infirmerie, atelier | *Qui était dans la chambre 1, et qui l'a caché ?* | Marceau, mordu en expédition, caché par Bérard et Okafor ; Lila portait les piles. |
| 3. Salle de contrôle, dortoirs, pièce cachée | *Qui a ouvert la chambre 1 ?* | L'opératrice de nuit. |

Puis **une seule grande question ouverte** : qui tape « VIENS », plus bas que l'étage 2 ?

**Trois fausses pistes, chacune expliquée par un vrai petit secret :**

| Fausse piste | Le vrai petit secret qui l'explique | L'indice qui l'écarte |
|---|---|---|
| **La porte de service** (version officielle) | Bérard et Okafor protégeaient leur secret. | Aucune trace UV au seuil ; brouillon de l'avis de la main d'Okafor. |
| **Lila, voleuse de piles** (l'infirmier la croit coupable) | Elle volait pour les lampes d'Okafor. | « Ma lampe aussi est morte. » |
| **Cuisine** (rancune, cadenas) | Il a refusé une pile et s'en veut. | Sa feuille de comptage : à 2 h 10 il est à l'entrepôt. |
| **L'étranger, Lou** (Cuisine l'accuse, l'opératrice laisse faire) | Lou est vraiment entré par la porte de service, l'a laissée ouverte, a relancé la génératrice (le bruit remet les mordus en marche), porte peut-être la lanterne de Lila… et cache un secret, sans rapport avec l'orage. | Le seuil (poussière et UV), la montre à 2 h 14, les 9 traits de Cuisine : C5. |

**Contradictions à repérer (le geste de base du tableau) :**
- Avis officiel (« porte de service ») ↔ seuil de la porte de service à la lampe UV (rien).
- Feuille d'expédition (« Marceau : RAS ») ↔ empreinte de la page arrachée (« avant-bras bandé »).
- Plan de l'infirmerie (« chambre 1 condamnée ») ↔ ticket de plateau (« chambre 1 : frapper deux fois »).
- Mot de l'infirmier (« ça doit être la petite ») ↔ liste de Lila (« ma lampe aussi est morte »).
- L'opératrice dit qu'elle était « coincée » ↔ le loquet manuel est fermé **de l'intérieur**.
- Cuisine : « c'est l'étranger » ↔ le seuil, la montre à 2 h 14 et les 9 traits (tout a commencé neuf jours avant Lou).
- L'opératrice : « j'ai vu le voyant de la porte de service, la nuit de l'orage » ↔ cahier de relève : « 2 h 00 : orage, coupure ».
- La lanterne de Lila dans la sacoche de Lou ↔ liste de Lila n° 4 et petits pas qui sortent.

---

## 10. Déroulé pièce par pièce

Suit l'ordre des objectifs. ⭐ = facultatif pour finir l'étage, mais utile à l'enquête.

| Pièce | Objectif | Ce qu'on y trouve | Mordu |
|---|---|---|---|
| **Entrée (extérieur)** | 1 | Craie « ILS SONT DESCENDUS. PAS TOUS. », voix de l'opératrice (première minute). Consigne de Bérard (canon). ⭐ Affiche de la règle n° 1, verrous côté dehors, photo de l'inauguration à la guérite. ⭐ Seuil de la porte de service (a15 : poussière, deux séries de pas). | — |
| **Zone extérieure** | 2 | Ferrailles dans les épaves. ⭐ Lanterne de Lila et une ferraille posée à côté. | Le guetteur |
| **Génératrice** | 2 | Journal de maintenance (canon). ⭐ **Énigme 2** une fois le courant revenu. ⭐ Moitié de consigne. | Marceau, le Silencieux |
| **Sécurité** | 3 | Borne de recharge (**une fois par visite**) : **point sûr**. ⭐ **Énigme 3** (terminal de Bérard). ⭐ Autre moitié de consigne. | — |
| **Hub central** | 3 | ⭐ Avis officiel. Valises abandonnées en file vers le nord. **Scène M3 : Cuisine accuse Lou** devant l'avis. | — |
| **Couloir nord / Accès étage 2** | fin | Porte de l'étage 2, verrouillée. | Bérard |
| **Cafétéria** | — | Menu du jour (canon). ⭐ Post-it de Cuisine. ⭐ 9 traits sur la porte de la chambre froide. **Survivant : Cuisine.** | Le commis |
| **Entrepôt** | 5 | **Liste de Lila (canon).** ⭐ **Énigme 1** : armoire à piles. | — |
| **Dortoirs** | 5 | Mur creux (canon). ⭐ Liste de Lila n° 3. | — |
| **Pièce cachée** | 5 | Clé, dernier mot de Lila (canon). ⭐ Dessin de Lila. | — |
| **Infirmerie** | — | Rapport n° 12 (canon). ⭐ Plan, lampe UV, tiroir d'Okafor, liste de Lila n° 2. ⭐ **Chambre 1**, derrière l'armoire. | L'infirmier |
| **Atelier** | 4 | Établi (module radio). ⭐ Casier de Marceau. | — |
| **Salle de contrôle** | 4 | Console, relève radio (canon). ⭐ Cahier de relève. **Survivante : l'opératrice.** | — |
| **Serre** | 2 | Ferraille. ⭐ Liste de Lila n° 4. | — |

---

## 11. Immersion : une scène muette par pièce

Chaque pièce raconte une scène **sans texte**, lisible en vue de dessus, qui pose une question.

| Pièce | Scène muette | La question qu'elle pose | Lumière / son |
|---|---|---|---|
| **Entrée** | Craie sur la porte. Gros verrous côté dehors. Une marelle d'enfant qui s'arrête à la case 4. Au seuil de la porte de service, de petits pas qui sortent, à demi effacés. | Qui est resté ? Pourquoi verrouiller de dehors ? Qui est sorti ? | Lanterne de guérite qui grésille ; vent. |
| **Zone extérieure** | Une lanterne d'enfant posée sur une épave, à côté d'une ferraille bien rangée. Des pas qui vont vers les épaves, aucun qui revient. | Qui est sorti, et pourquoi pas rentré ? | Corbeaux, tôle qui grince. |
| **Génératrice** | Une chaise et une gamelle à côté du moteur ; une silhouette qui le tapote en silence. | Pourquoi celui-là ne fait-il aucun bruit ? | Noir, puis vague d'allumage des néons. |
| **Sécurité** | Registre ouvert, stylo tombé, borne qui clignote. | Que s'est-il passé à 2 h 15 ? | Bip régulier de la borne : le seul son rassurant. |
| **Hub** | Valises en file vers le nord, une sur le côté, ouverte. L'avis officiel bien droit au milieu. | Pourquoi sont-ils partis si vite ? | Ventilation qui « respire ». |
| **Cafétéria** | Un plateau vide posé devant la chambre froide, et un autre, et un autre : une pile de plateaux. Sur la porte, 9 traits à la craie. | Qui apporte des plateaux à une porte fermée ? Qui compte les jours ? | Couverts qui tintent. |
| **Entrepôt** | Une armoire cadenassée ; à côté, un panier à piles vide, retourné. | Pourquoi enfermer des piles ? | Ampoule nue qui se balance. |
| **Dortoirs** | Des lits faits au carré ; un seul défait, avec un petit oreiller de travers (celui de Lila). | Qui dormait là, et a fui en pleine nuit ? | Silence total, même la ventilation s'arrête. |
| **Infirmerie** | Des raclures au sol devant une armoire ; deux lampes neuves visibles au-dessus, par une fente. | Pourquoi cette armoire a-t-elle tant bougé ? | Néon qui clignote. |
| **Chambre 1** | Un lit, deux lampes au plafond, une lampe de chevet vide, un plateau propre. | Qui vivait ici en cachette ? | Silence. |
| **Atelier** | Un casier aux outils rangés au millimètre, un nom à demi arraché. | Qui était si soigneux ? | Lampe d'établi chaude : pièce refuge. |
| **Salle de contrôle** | Fauteuil de l'opératrice repoussé, comme si elle s'était levée d'un bond ; une tasse pleine ; une lueur verte sous une porte. | Pourquoi est-elle partie en plein service ? | Grésillement de la console. |
| **Serre** | Une seule rangée de plants bien arrosée, le reste à l'abandon ; un petit arrosoir d'enfant. | Qui s'occupait encore de ça ? | Arrosage qui crachote. |
| **Pièce cachée** | Une cabane en couverture, des dessins, une boîte à chaussures. | Pourquoi une cachette ici ? | La dernière veilleuse de Lila. |
| **Accès étage 2** | Des marques de chariot qui descendent, aucune qui remonte. | Pourquoi personne n'est remonté ? | Air froid qui monte. |

---

## 12. Examiner : les quatre formes

### (a) Gros plan sur un objet qu'on tourne, avec un détail caché

`E` → l'objet s'affiche en grand ; on le **tourne** (glisser, stick droit) et on **zoome** (loupe). Le
détail caché devient une carte du tableau. Tout objet examinable a un **contour** quand on est à portée.

| # | Pièce | Objet | Au premier regard | Le détail caché |
|---|---|---|---|---|
| a1 | Entrée | Photo de l'inauguration (guérite) | Trente personnes souriantes devant la porte neuve. | Au dos : « Jour de la porte. » Au premier plan, quelqu'un de **dos**, en blouse, tient une valise marquée d'un triangle. En zoomant sur le triangle, la main de Lou se pose sur sa sacoche. *(Dormants : étage 3 ; L2.)* |
| a2 | Génératrice | Journal de maintenance (canon) | La note de l'équipe technique, page arrachée. | À la loupe, sur la page suivante : l'empreinte en creux du texte arraché. |
| a3 | Génératrice | Alliance de Marceau *(mordu figé)* | Un anneau terni. | À l'intérieur : « M. — à ma Nuit ». |
| a4 | Génératrice | Bracelet de Marceau | Bracelet d'hôpital. | « CHAMBRE 1 — DR O. — PATIENT n° 1 ». |
| a5 | Extérieur | Lanterne de Lila | Lanterne cabossée, verre **blanc**. | Gravé au crayon sur le socle : « Lila ». Réservoir vide. |
| a6 | Infirmerie | Montre de l'infirmier *(mordu figé)* | Montre bracelet. | Arrêtée à **2 h 14**, verre fendu. |
| a7 | Chambre 1 | Lampe de chevet | Douille vide. | Un **éclat de verre vert** coincé dans la douille. Les lampes de l'infirmerie sont blanches. |
| a8 | Chambre 1 | Serrure de la porte | Serrure électrique. | Sans courant, elle s'ouvre d'une poussée. Pas de clé, pas de code. |
| a9 | Atelier | Photo des inséparables (casier de Marceau) | Bérard et Marceau, bras dessus bras dessous. | Au dos : « Mes deux inséparables. — N. » |
| a10 | Contrôle | Lampe de l'opératrice | Lampe de poche à filtre **vert** (« pour ne pas éblouir les écrans »). | Le filtre est ébréché : il manque un éclat. |
| a11 | Contrôle | Loquet du local technique | Un verrou électrique. | Le loquet manuel est tourné **de l'intérieur**. |
| a12 | Couloir nord | Page arrachée *(sur Bérard)* | Une feuille pliée. | Le texte entier, et en bas : « Ne rien dire. — B. » |
| a13 | Pièce cachée | Clé d'accès | Carte-clé. | Étiquette : « Pour Lila — ferme derrière toi. — Dr O. » |
| a14 | Pièce cachée | Dessin de Lila | Le silo dessiné en coupe. | **Quatre** étages ; une croix sur le dernier ; une flèche « ICI ÇA TAPE » au troisième. *(Dormant : étages 3 et 4.)* |
| a15 | Entrée | Seuil de la porte de service | Une marche usée, de la poussière. | De petits pas d'enfant qui **sortent**, anciens, à demi recouverts ; une seule paire de bottes qui **entre**, toute fraîche, avec de la boue rouge des épaves : celles de Lou. À la lampe UV, rien (c1). |
| a16 | Sacoche de Lou | Paquet noué dans un chiffon | Un chiffon noué, lourd. | **Rien** : Lou ne le défait pas (« Pas maintenant. »). *(Dormant L1 : étage 3.)* |

### (b) Pensées du héros, en bulle

Une bulle au-dessus de sa tête, 2 à 4 secondes, quand il **remarque** quelque chose. Les pensées
posent des questions ; elles ne concluent jamais à la place du joueur.

| Pièce | Déclencheur | Pensée |
|---|---|---|
| Entrée | Craie sur la porte | « Pas tous. Alors quelqu'un est encore là-dedans. » |
| Entrée | Voix à la radio, puis silence | « Elle a dit “la relève”. À qui parle-t-elle ? » |
| Entrée | Verrous | « Drôle de porte. On dirait qu'elle ferme de l'extérieur. » Puis Lou passe le gant sur un verrou, une seconde, sans rien penser. *(Dormant L3.)* |
| Entrée | Craie, juste après la pensée canon | « Je ne devais pas entrer… » *(Le joueur sait dès lors que Lou cache quelque chose.)* |
| Entrée | Triangle de la photo (a1) | « Ce triangle… » puis une bulle vide : « … ». *(Dormant L2. Lou se tait, il ne dit pas « rien ».)* |
| Sacoche | Examiner le paquet (a16) | « Pas maintenant. » *(Dormant L1.)* |
| Entrée | Affiche de la règle n° 1 | « Aucun mordu ne franchit la porte. Et pourtant… » |
| Extérieur | Lanterne + ferraille | « Une lanterne de gamin et une pièce bien rangée. Quelqu'un faisait le même boulot que moi. » |
| Extérieur | Le guetteur | « Un brassard de garde. Il gardait la porte… de dehors ? » |
| Génératrice | Premier passage de Marceau | « Celui-là ne grogne pas. Je ne l'ai pas entendu venir. » |
| Génératrice | Page arrachée | « Quelqu'un a arraché une page. Mais un crayon, ça appuie. » |
| Génératrice | Bracelet (a4) | « Un bracelet d'infirmerie. On le soignait. Avant ou après ? » |
| Sécurité | Terminal | « Le poste de Bérard. Il notait tout. Presque tout ? » |
| Hub | Avis officiel | « “Par la porte de service.” Ça se vérifie, une porte. » |
| Cafétéria | Coups dans la chambre froide | « Un mordu ne frappe pas en rythme. » |
| Cafétéria | Le commis et ses plateaux | « Il pose un plateau, frappe deux fois, repart. Il a fait ça souvent. Pour qui ? » |
| Cafétéria | « Depuis que t'es là » (M1) | « Le moteur fait du bruit. Le bruit les attire. …Il n'a pas tout à fait tort. » |
| Hub | Accusation (M3) | « Je sais que ce n'est pas moi. Eux, il faut le leur montrer. » |
| Cafétéria | Les 9 traits | « Neuf traits. Neuf jours. Moi, je suis arrivé ce matin. Ça se prouve, ça ? » |
| Partout | L'opératrice au haut-parleur (M2) | « Elle dit vrai. Presque tout. » |
| Entrepôt | Armoire cadenassée | « Un cadenas sur des piles. Ici, la lumière valait de l'or. » |
| Dortoirs | Lits vides | « “Là où personne ne dort plus.” » |
| Infirmerie | Raclures au sol | « Cette armoire a bougé. Souvent. » |
| Infirmerie | Montre (a6) | « 2 h 14. Qu'est-ce qui s'est passé à 2 h 14 ? » |
| Chambre 1 | Entrée | « Une chambre “condamnée”, avec deux lampes neuves et un plateau propre ? » |
| Chambre 1 | Éclat vert (a7) | « Du verre vert. D'où vient-il ? » |
| Atelier | Casier | « Ses outils sont rangés au millimètre. Le genre de type qui ne ment pas. » |
| Contrôle | Elle tourne son alliance | « Elle tourne sa bague. Encore. » |
| Contrôle | Loquet (a11) | « Fermé de l'intérieur. Coincée… vraiment ? » |
| Tableau | Avant l'accusation | **Défi au joueur** : « J'ai tout vu. Qui a ouvert la chambre 1 ? » |
| Pièce cachée | Clé (a13) | « “Ferme derrière toi.” Elle n'a pas fermé. Elle a attendu. » |
| Accès étage 2 | Grille | « Des marques qui descendent. Aucune qui remonte. » |

### (c) Lampe UV et loupe

**La lampe UV d'Okafor**, trouvée dans son bureau (« pour examiner les morsures »), se fixe sur la lampe
du héros. Un appui long sur LAMPE passe en lumière noire : faisceau violet, **ne fige pas** les mordus,
consomme la même charge. C'est le dilemme de survie : **figer ou voir**. Elle fait luire **les
traînées laissées par les mordus** (une bave luisante, style dessin animé) et le **tampon invisible**
de l'infirmerie. La **loupe** fait partie du gros plan (a).

| # | Pièce | Révélé | Ce que ça apprend |
|---|---|---|---|
| c1 | Entrée (porte de service) | **Rien.** Pas une trace de mordu au seuil. | L'avis officiel est faux. |
| c2 | Infirmerie | Une traînée part de l'armoire (porte de la chambre 1). | Le premier mordu sortait de derrière l'armoire. |
| c3 | Couloirs → génératrice | La même traînée, sans détour, jusqu'au moteur. | Le Silencieux est retourné à son poste de travail. |
| c4 | Chambre 1 | Deux empreintes de semelles fines près du lit, **vivantes** (pas de bave). | Quelqu'un de vivant se tenait près de lui. |
| c5 | Infirmerie | Sous « CONDAMNÉE » sur le plan, au tampon invisible : « PATIENT n° 1 ». | La chambre servait. |
| c6 | Génératrice | **Loupe** sur le journal (a2). | Le texte de la page arrachée. |
| c7 | Contrôle | **Loupe** sur le cahier de relève : rien entre 2 h 00 et 2 h 20, alors que les autres nuits ont une ligne toutes les 10 minutes. | Elle n'était pas à son poste. |
| c8 | Contrôle | Traînées de mordu **devant** le local technique, aucune derrière. | Elle s'est enfermée avant leur arrivée. |

### (d) Événements étranges, scriptés et légers

Chacun n'arrive **qu'une fois**. Du bizarre, jamais de « jump scare » violent. Chacun découle de
l'histoire.

| # | Pièce | Déclencheur | Ce qui se passe | Pensée |
|---|---|---|---|---|
| d1 | Entrée | Approche de la guérite | La radio grésille : « …ici l'opératrice de nuit… c'est l'heure de la relève… il y a quelqu'un ? » Puis plus rien. | « Elle a dit “la relève”. » |
| d2 | Génératrice | Premier passage | Marceau traverse le champ **sans un son** ; la musique se coupe. | « Je ne l'ai pas entendu. » |
| d3 | Génératrice | Relance | Les néons s'allument **en vague** ; une seule lueur reste verte, à l'est. | « Pourquoi du vert ? » |
| d4 | Sécurité | Retour du courant | Le haut-parleur crache un bout d'enregistrement en boucle : « …canal 2… à l'aube… » | « À l'aube, quoi ? » |
| d5 | Hub | Première entrée | Une valise glisse et s'ouvre : vêtements, une photo de groupe retournée. | — |
| d6 | Cafétéria | Approche de la chambre froide | Trois coups **de l'intérieur**, réguliers. | « Un mordu ne frappe pas en rythme. » |
| d7 | Couloir est | Vu depuis le hub | Une **lueur verte** passe sous la porte de la salle de contrôle, puis s'éteint. | « Quelqu'un est vivant là-bas. Et ne veut pas qu'on le sache ? » |
| d8 | Entrepôt | Après la note de Lila (canon) | Une porte claque loin à l'ouest (courant d'air du mur creux). | — |
| d9 | Infirmerie | Entrée | L'armoire grince d'un centimètre (pression d'air). | « …Courant d'air. Sûrement. » |
| d10 | Contrôle | Radio réparée | Message canon + la voix d'Okafor (§ 13). | — |
| d11 | Contrôle | Juste après | Des bips **tapés à la main** répondent. L'opératrice les traduit (§ 21). | — |
| d12 | Accès étage 2 | Clé en main | Des petits coups montent de sous la grille, puis s'arrêtent. | « Ça tape. Plus bas que bas. » |

---

## 13. Tous les documents

Légende : 📝 note · 🎙️ enregistrement · 📷 photo. Les 7 notes **canon** restent mot pour mot. Chaque
nouveau document fait **5 lignes au plus**.

### ENTRÉE (EXTÉRIEUR)

**Craie sur la grande porte** *(décor, carte du tableau)*
> ILS SONT DESCENDUS. PAS TOUS.

**📝 `note_entrance` — Consigne de garde** *(canon)*
> La porte de sécurité tire son courant de la génératrice. Si tout tombe, passez par la porte de
> service, à l'ouest de l'entrée. Ne restez pas dehors à la nuit tombée.
> — Sgt. Bérard, poste d'entrée

**📝 `poster_rule` — Affiche, à côté de la porte**
> RÈGLE N° 1
> Aucun mordu ne franchit la porte. Pas d'exception.
> — Les fondateurs

**📷 `photo_inauguration` — Photo de la guérite** *(dormant)*
> *Recto :* trente personnes devant la porte neuve. Au premier plan, quelqu'un de dos, en blouse,
> une valise marquée d'un triangle à la main.
> *Verso :* « Jour de la porte. »

**Seuil de la porte de service** *(gros plan a15, carte du tableau)*
> De petits pas qui sortent, anciens. Une seule paire de bottes qui entre, fraîche : les miennes.
> À la lampe UV : rien.

### ZONE EXTÉRIEURE

**📝 `note_expedition` — Feuille d'expédition** *(sur le guetteur)*
> Expédition aux épaves, pièces pour le régulateur. Retour à la nuit tombée.
> Sgt Bérard : RAS. Marceau (technique) : RAS.
> Guetteur : mordu. Laissé dehors, règle n° 1. — B.

### GÉNÉRATRICE

**📝 `note_generator` — Journal de maintenance** *(canon)*
> Le régulateur réclame trois pièces. On en a vu traîner dans les épaves, dehors, et dans la
> serre. Après ça, elle repart au quart de tour. Normalement.

**📝 `note_torn_imprint` — Empreinte de la page arrachée** *(loupe)*
> …Marceau, retour d'expédition : avant-bras bandé. Tient mal la clé.
> Il dit que c'est la tôle. On n'a pas de tôle, aux épaves…

**📝 `note_shed_left` — Consigne de délestage (moitié gauche)** *(énigme 2)*
> APRÈS UN REDÉMARRAGE, un circuit à la fois :
> – Jamais le CONTRÔLE en premier : la console tire trop.
> – L'INFIRMERIE passe juste après la *(déchiré)*

### SÉCURITÉ

**📝 `note_shed_right` — Consigne de délestage (moitié droite)** *(énigme 2)*
> *(déchiré)* CAFÉTÉRIA.
> – Les DORTOIRS toujours avant la cafétéria : les petits dorment.
> – Le CONTRÔLE en dernier.

**📝 `note_terminal_postit` — Post-it sur le terminal de Bérard** *(énigme 3)*
> Mot de passe : le nom de celui que je n'aurais jamais laissé dehors.

**📝 `terminal_log` — Journal du poste** *(après l'énigme 3)*
> J−12. Retour d'expédition. M. entre avec moi. Personne ne saura.
> Orage. 1 h 50, canal 2, Dr O. : « À l'aube, on le sort. Règle n° 1. » J'ai dit oui.
> 2 h 00 : RAS. 2 h 15 : alarme infirmerie.
> Lendemain : version officielle avec le Dr O. : la porte de service.

### HUB CENTRAL

**📝 `poster_notice` — Avis à tous**
> AVIS À TOUS. Pendant l'orage, des mordus sont entrés par la porte de service.
> Le Dr Okafor et le Sgt Bérard organisent la descente vers l'étage 2.
> Ne prenez que le nécessaire. Ne remontez pas.

### CAFÉTÉRIA

**📝 `note_cafeteria` — Menu du jour** *(canon)*
> Pêches en conserve. Encore. Et quelqu'un pique les piles dans l'entrepôt : on les compte,
> maintenant.

**📝 `note_cook_postit` — Post-it de Cuisine** *(énigme 1)*
> Code de l'armoire à piles : ce qu'on mange ENCORE.
> (Comme ça, même le commis s'en souviendra.)

**Traits sur la porte de la chambre froide** *(décor, carte du tableau)*
> Neuf traits à la craie, un par jour depuis l'orage.
> *(Facultatif : en dessous, une colonne au titre changeant, « L'ÉTRANGER », puis « LE BRICOLEUR », puis « LOU ».)*

**📝 `note_tray_ticket` — Ticket de plateau** *(sur le commis)*
> Plateau — chambre 1. Le poser devant la porte, frapper deux fois.
> NE PAS ENTRER. — Dr O.

### ENTREPÔT

**📝 `note_storage` — Liste de Lila** *(canon ; indice du mur creux)*
> J'ai caché la clé de l'étage 2 là où personne ne dort plus. Au fond des dortoirs, le mur sonne
> creux, à côté du dernier lit. Poussez fort.

**📝 `note_battery_count` — Feuille de comptage** *(dans l'armoire, énigme 1)*
> Lundi : 31. Mardi : 27. Mercredi : 23. Il en manque 4 par nuit.
> Nuit de l'orage, 2 h 10 : cadenas vérifié. Aucune sortie.
> La petite est venue en demander une, ce soir. J'ai dit non. — Cuisine

### INFIRMERIE

**📝 `note_infirmary` — Rapport médical n° 12** *(canon)*
> Les mordus supportent mal la lumière vive : un faisceau en pleine face les fige quelques
> secondes. Gardez vos lampes chargées. Bandages pour les égratignures, trousses pour le reste.

**📝 `note_infirmary_map` — Plan de l'infirmerie** *(au mur)*
> Lits 1 à 6. Pharmacie. Bureau du Dr Okafor.
> Chambre 1 : CONDAMNÉE (humidité). Ne pas déplacer l'armoire.

**📝 `note_nurse` — Mot de l'infirmier** *(sur l'infirmier mordu)*
> Dr O. dort enfin. Je garde.
> 2 h 10 : quelqu'un vient dans le couloir, avec une lampe.
> Ça doit être la petite, avec les piles.

**📝 `note_lila_2` — Liste de Lila n° 2** *(panier vide, bureau d'Okafor)*
> Pour le Dr O. :
> 1. Quatre piles par nuit, pour les deux lampes de la chambre 1.
> 2. Ne rien dire à Cuisine.
> 3. Ce soir : armoire fermée. Plus rien.

**📝 `note_room1_file` — Dossier de la chambre 1** *(dans la chambre 1)*
> Rapport n° 1 : patient M., morsure à l'avant-bras. Même forme que dans le vieux dossier du fond. *(dormant)*
> Rapport n° 7 : sous deux lampes, il reste assis. Il se calme quand *elle* lui parle.
> Rapport n° 11 : il ne parle plus. Il ne grogne plus. Plus aucun bruit. — Dr O.

**📝 `note_notice_draft` — Brouillon de l'avis** *(tiroir d'Okafor, débloqué par déduction)*
> AVIS À TOUS. Pendant l'orage, des mordus sont entrés par la porte de service…
> *(En marge :)* B. — c'est mieux ainsi. Personne ne doit savoir pour M.

### ATELIER

**📷 `photo_inseparables` — Photo du casier de Marceau** *(débloqué par déduction)*
> *Recto :* Bérard et Marceau, couverts de cambouis, hilares, devant la génératrice.
> *Verso :* « Mes deux inséparables. — N. »

### SALLE DE CONTRÔLE

**📝 `note_control` — Relève radio** *(canon)*
> L'émetteur a grillé pendant l'orage. Un module de rechange se bricole à l'atelier avec deux
> pièces, puis il suffit de l'enficher dans la console.
> — Opératrice de nuit

**📝 `note_radio_logbook` — Cahier de relève de nuit**
> 1 h 40 : RAS. 1 h 50 : canal 2 (Dr O. / Sgt B.).
> 2 h 00 : orage, coupure.
> 2 h 20 : RAS.

### DORTOIRS

**📝 `note_lila_3` — Liste de Lila n° 3** *(sous un oreiller)*
> Nuit de l'orage.
> 1. Plus de piles. Ma lampe aussi est morte.
> 2. 2 h 05 : une lampe VERTE passe dans le couloir est. Pas un bruit.
> 3. Le lendemain : je frappe à la radio. Personne. Mais du vert sous la porte.
> 4. Quelqu'un sait, et ne dit rien.

### SERRE

**📝 `note_lila_4` — Liste de Lila n° 4**
> Pour rallumer l'étage : 3 pièces.
> 1. Une dans la serre. 2. Deux dans les épaves, dehors.
> 3. Les poser près de la porte de service. Avant la nuit.
> Si je reviens pas : la clé est où j'ai dit.

### PIÈCE CACHÉE

**📝 `note_secret` — Dernier mot** *(canon)*
> Si tu lis ça, tu as trouvé ma cachette. Les autres sont descendus. Prends la clé, et ne fais pas
> confiance au silence.
> — Lila

### PAROLES (cartes de témoignage)

**🎙️ `say_cook_accuse` — Accusation de Cuisine** *(M1, M3)*
> « T'es rentré par la porte de service. Depuis que t'es là, ils marchent. »

**🎙️ `say_operator_door` — Déclaration de l'opératrice** *(haut-parleur, M2)*
> « Mon tableau dit que la porte de service est ouverte. L'étranger est entré par là.
> La nuit de l'orage aussi, j'ai vu le voyant s'allumer. J'étais à ma console. »

### RADIO (après la réparation)

**🎙️ `audio_below` — La voix qui grésille** *(après le message canon)*
> « …ici l'étage 2… Dr Okafor… L'étage 1 est condamné. Ne descendez pas.
> Lila ? Lila, si tu m'entends… tu n'es jamais arrivée. Pardon. »

**🎙️ `audio_tapping` — Le signal** *(traduit par l'opératrice)*
> Des bips tapés à la main : · · · – / · · / · / – · / · · ·
> **V · I · E · N · S**

---

## 14. Les énigmes

Chacune s'ouvre avec **une information**, pas un objet.

### Énigme 1 — L'armoire à piles (ENTREPÔT)

- **Problème :** l'armoire à piles a un cadenas **à lettres** (6 molettes).
- **Indices en pleine vue :** le post-it de Cuisine (« ce qu'on mange ENCORE ») ; le menu du jour,
  canon, lu dès le début : « Pêches en conserve. **Encore.** »
- **Solution : PECHES.**
- **Erreur :** pensée « Qu'est-ce qu'on mange *encore* et *encore*, ici ? »
- **Récompense :** 3 piles, une trousse, et la **feuille de comptage** (alibi de Cuisine, et preuve
  qu'il a refusé une pile à Lila).

### Énigme 2 — L'ordre des leviers (GÉNÉRATRICE)

- **Problème :** après la relance, 4 leviers remettent le courant dans **DORTOIRS**, **CAFÉTÉRIA**,
  **INFIRMERIE**, **CONTRÔLE**. Le circuit CONTRÔLE alimente l'interphone et la serrure du local technique.
- **Indices :** une moitié de consigne à la génératrice, l'autre à la sécurité ; en secours, des traits
  à la craie « D C I C » à moitié effacés.
- **Solution : DORTOIRS → CAFÉTÉRIA → INFIRMERIE → CONTRÔLE.**
- **Erreur :** le disjoncteur claque, 3 secondes de noir, un grand bruit : Marceau se tourne vers le
  tableau, **sans un son**. Les leviers retombent. Pas d'autre punition.
- **Récompense :** l'interphone du local technique se rallume ; l'opératrice reparle.

### Énigme 3 — Le terminal de Bérard (SÉCURITÉ)

- **Problème :** le terminal du poste demande un mot de passe.
- **Indices :** le post-it (« celui que je n'aurais jamais laissé dehors ») ; la feuille d'expédition
  (le guetteur a été laissé dehors, Marceau est entré) ; la photo des inséparables ou le bracelet.
- **Solution : MARCEAU.**
- **Fausses réponses :** « GUETTEUR » → « Non. Celui-là, il l'a laissé dehors. » ; « OKAFOR » →
  « Elle n'est jamais sortie. Il parle de quelqu'un qu'il aurait dû laisser dehors. »
- **Récompense :** le journal du poste.

---

## 15. Les survivants : dialogues et petites quêtes

Dialogues écrits à l'avance. Entre crochets : les choix du joueur.

### Le ton

Cuisine parle un **français familier québécois léger** (« T'es qui, toi ? », « C'est-tu toi qui… ? »,
« ben », « icitte », un ou deux marqueurs par réplique au plus). L'opératrice parle un **français
standard, poli, au vouvoiement** : sa politesse fait partie de son masque. Lou et tous les documents
restent en français standard. Entre crochets : les choix du joueur.

### Cuisine — la chambre froide (CAFÉTÉRIA)

**M1 — À travers la porte** *(toujours après la relance de la génératrice ; Cuisine est Méfiant)*
> **Cuisine :** Toc toc toc… Si t'es un mordu, t'es très poli. Dis-moi un truc qu'un vivant dirait.
> **[Lou] J'ai faim, et j'en ai marre des pêches.**
> **Cuisine :** *(Rire étouffé. Clic. La porte s'ouvre sur la chaîne : un œil, une moustache, un couperet.)* Ça, c'est un vivant. T'es qui, toi ? T'es pas d'ici.
> **Cuisine :** Ça fait neuf jours que c'est mort, icitte. Pis là, ça se remet à marcher. Depuis que t'es là.
> **Cuisine :** C'est-tu toi qui as rallumé la génératrice ?
> **[Lou] Oui. Ça fait du bruit, je sais.** → **Cuisine :** …Au moins, tu mens pas.
> **[Lou] Non.** → *(Faux pas différé : la boue et la génératrice le contrediront.)*

**Ensuite, selon la confiance**
> **Cuisine :** Tout le monde m'appelle Cuisine, alors… Cuisine.
> **[Lou] Qu'est-ce qui s'est passé ?**
> **Cuisine :** L'orage. La porte de service. C'est ce qu'ils ont affiché. Moi, j'étais à l'entrepôt,
> à compter mes piles, quand ça a crié. Je me suis enfermé ici. Depuis, je compte les pêches.
> **[Lou] Qui a écrit « pas tous » sur la porte ?**
> **Cuisine :** La petite Lila, sûrement. Elle est venue taper ici. J'ai pas ouvert. J'avais peur.
> **[Lou] Qui volait les piles ?**
> **Cuisine :** Elle aussi. Je l'ai vue. J'ai mis un cadenas, et ce soir-là elle est venue m'en
> réclamer une. J'ai dit non. *(Il regarde ses mains.)* Une gamine qui vole, ça se punit, non ?
> **[Lou] Pourquoi tu me regardes comme ça ?**
> **Cuisine :** Tu tiens ta sacoche comme si y avait un bébé dedans. Qu'est-ce que tu caches ?
> **[Lou] Chercher un abri, c'est tout.** → **Cuisine :** Mouais. *(Demi-mensonge à Cuisine, choisi par le joueur ; on s'en souviendra à l'étage 3.)*
> **[Lou] J'ai fait une promesse. Je ne peux pas en dire plus.** → **Cuisine :** Correct. Garde-la. *(Compte comme une vérité.)*

**M2 — La voix au haut-parleur** *(après l'énigme 2)* : l'opératrice annonce, sur le circuit général,
que la porte de service est ouverte et que « l'étranger est entré par là » ; elle ajoute qu'elle a vu
le voyant la nuit de l'orage (mensonge, X9). Cuisine passe à **Hostile** (ou de Prudent à Méfiant).
> **Cuisine :** *(Porte fermée.)* C'est-tu toi qui les as laissés rentrer ? Recule. Tu passes ton affaire par la fente.

**M3 — L'accusation publique (HUB)** : pour la première fois en neuf jours, Cuisine sort, couperet à la main, devant l'avis officiel.
> **Cuisine :** « Par la porte de service. » Pis toi, t'es rentré par où ?
> **Cuisine :** Ta boue rouge part de la porte de service jusqu'à ma cafétéria.
> **Cuisine :** *(Si Lou porte la lanterne de Lila.)* Ça, c'est la lanterne à Lila. Où est-ce qu'elle est, elle ?
> **Cuisine :** Vide ta sacoche.
> **[Lou] Vider la sacoche.** → Le paquet noué reste fermé : « Ça, c'est à quelqu'un qui est mort. » **Cuisine :** Correct.
> **[Lou] « Je suis entré par là. J'ai laissé la porte ouverte. Mais ils étaient là avant moi. »** → **Cuisine :** Prouve-le.
> **[Lou] Montrer la preuve** *(si C5 est validée)* → retournement immédiat (M5).
> **Cuisine :** *(Sans preuve.)* Tant que tu me prouves pas le contraire, tu touches pas à mes affaires.
Au tableau apparaît : **« Comment prouver que je n'y suis pour rien ? »**

**M4 — Le commis** : Cuisine, hors de sa chambre froide, voit son commis mordu revenir avec son plateau.
Lou peut le figer à la lampe (coût : de la charge). Le sauver fait monter la confiance d'une marche,
même accusé : « …T'aurais pu me laisser là. Pourquoi ? » Fuir la fait baisser : « Je le savais. »

**Petite quête : « Pour qui, les piles ? »**
1. Lui donner **1 bandage** (dilemme : c'est le seul de l'infirmerie). Passé par la fente s'il est Hostile.
2. Établir au tableau que les piles allaient à la chambre 1 (C3), puis revenir :

> **[Lou] Elle ne volait pas pour elle. C'était pour les lampes d'Okafor.**
> **Cuisine :** *(Long silence.)* …Et j'ai fermé l'armoire. Le soir même.

**M5 — Le retournement** *(C5 validée, cartes montrées)*
> **[Lou] La montre de l'infirmier : 2 h 14, la nuit de l'orage. Tes neuf traits. Sur le seuil, mes pas, et ceux de Lila, qui sortent.**
> **Cuisine :** *(Il pose le couperet.)* …Neuf jours. Ouin. T'étais pas là.
> **Cuisine :** Bon. J'me suis trompé. Ça arrive pas souvent. C'est quoi ton nom, déjà ?
> **[Lou] Lou.**
> **Cuisine :** Lou. Mais si c'est pas toi… c'est qui ?
À l'interphone, trois secondes de silence ; l'opératrice : « Je suis contente pour vous. » La lueur verte s'éteint.

**Confiant** *(disculpé, et C3 faite)*
> **[Lou] Quelqu'un a ouvert la porte. Ce n'est pas toi qui l'as ouverte.**
> **Cuisine :** *(Il te tourne le dos, fouille une étagère, sort une clé.)* La réserve, derrière les
> fourneaux. Prends ce qu'il te faut, Lou. Et trouve qui a ouvert. J'ai besoin de savoir.

- **Récompense :** clé de la réserve (2 piles, 1 trousse, 1 boîte de clous). Atteinte **seulement si
  Lou est disculpé** ; sinon, Cuisine échange les mêmes objets un par un, plus cher.

### L'opératrice de nuit — le local technique (SALLE DE CONTRÔLE)

**Avant l'énigme 2 :** silence total. Une lueur verte qui s'éteint quand on approche (d7).

**Après l'énigme 2**
> **Opératrice :** *(Par l'interphone.)* …Le courant ? Vous êtes celui que j'ai entendu, à la
> guérite ? *(Clic.)* Je suis restée coincée depuis l'orage. Le courant, la serrure… vous voyez.
> **[Lou] Qui êtes-vous ?**
> **Opératrice :** L'opératrice de nuit. Mon nom… ça fait longtemps que plus personne ne l'utilise.
> *(Elle tourne son alliance.)*
> **[Lou] La radio peut-elle remarcher ?**
> **Opératrice :** L'émetteur a grillé pendant l'orage. Je l'ai écrit sur la relève. Un module, à
> l'atelier. Si vous le réparez, ils nous entendront, en bas. Il faut qu'ils m'entendent.

**Le masque** *(tant que Lou est accusé)* : elle l'appelle « mon garçon » en face et « l'étranger » au
haut-parleur. Elle ne fabrique aucune preuve : elle dit du vrai qui oriente, et ment une fois (X9).
> **Opératrice :** Ne lui en voulez pas, mon garçon. Il a peur. Moi, je vous crois.
> **Opératrice :** Mais c'est vrai que vous êtes entré par là… Vous comprenez qu'il se pose des questions.
> *(Si Lou touche sa sacoche, ou dit « j'ai fait une promesse »)* **Opératrice :** Vous aussi, vous gardez quelque chose. Je connais ce geste. Moi aussi.

**Petite quête : « La voix d'en bas »**
1. Lui donner **1 pile** (dilemme : « Je ne supporte plus le noir. »).
2. Réparer la radio (objectif 4) et écouter avec elle.

**Ses répliques-indices (fair play)** :
- Si on parle du mordu de la génératrice avant d'avoir dit qu'il ne grogne pas :
  > **Opératrice :** Il ne fait aucun bruit, n'est-ce pas ? *(Elle se reprend.)* C'est ce qu'on dit d'eux.
- Si on parle de Marceau :
  > **Opératrice :** Il réparait tout. Il sifflait en travaillant. Il… sifflait, oui.
- Si on montre l'éclat vert :
  > **Opératrice :** Du verre. Il y en a partout, depuis l'orage.
- Après X9 (le voyant) :
  > **Opératrice :** Le voyant ? J'ai dû me tromper. Il faisait noir. Parlons de la radio, voulez-vous ?

**Après l'accusation juste (elle confirme ce que le joueur a établi)**
> **Opératrice :** *(Elle pose sa lampe verte sur la console.)* Il m'appelait « ma Nuit ».
> J'ai entendu : « À l'aube, on le sort. » Je voulais juste lui dire au revoir.
> La porte s'est ouverte toute seule. Il était si calme, sous le vert… et la pile est morte.
> Lila a frappé à ma porte, après. Je n'ai pas répondu. Le silence, c'était moi aussi.
> Et quand ils vous ont accusé, je n'ai rien dit. C'était plus facile. Pardon, Lou.

**M6 — Le choix de Lou** (l'accusé d'hier peut maintenant accuser ; trois choix valables)
> **[Lou] Dites-le-lui vous-même.** → Elle avoue à Cuisine par l'interphone. **Cuisine :** …Ben. On a tous fermé une porte, c'te nuit-là. Moi, c'était l'armoire.
> **[Lou] Je vais le lui dire.** → Cuisine est en colère contre elle. **Opératrice :** Vous avez eu raison.
> **[Lou] (Garder son secret.)** → Cuisine ne saura pas ; le message radio vers le bas restera incomplet (§ 21).

> **[Lou] Venez avec moi, en bas.**
> **Opératrice :** Non. Quelqu'un doit rester à la radio, pour dire la vérité à ceux d'en bas. Va, Lou.

**Après une accusation fausse :** elle reste aimable, et continue de dire « mon garçon ». Le joueur peut descendre sans avoir trouvé.

---

## 16. Le tableau d'enquête

### Les deux gestes

Un onglet **TABLEAU** dans le carnet. Le jeu remplit les **cartes** tout seul (chaque document, gros
plan, trace, réplique). Le joueur, lui, assemble. Deux gestes :

1. **« Ça ne colle pas »** : glisser une carte sur une autre pour signaler une **contradiction**. Si elle
   est juste : fil rouge, petite déduction, et souvent **quelque chose s'ouvre**.
2. **Phrases à trous** : les grandes conclusions sont des phrases à compléter avec une **banque de
   mots**. Un mot n'apparaît dans la banque **qu'après avoir trouvé l'indice** qui le contient. La phrase
   n'est validée que **toute entière** ; si une ou deux cases sont fausses : « Presque… un détail
   cloche. » Aucune pénalité.

### Les contradictions (et ce qu'elles débloquent)

| # | Carte A | ↔ Carte B | → Déduction | → Ce qui s'ouvre |
|---|---|---|---|---|
| **X1** | Avis officiel | Seuil de la porte de service (UV) | « Personne n'est entré par la porte de service. » | La traînée de l'infirmerie (c2) devient un repère : l'armoire. |
| **X2** | Plan de l'infirmerie (« condamnée ») | Ticket de plateau **ou** habitude du commis | « On nourrissait quelqu'un dans une chambre condamnée. » | **L'armoire se pousse** : chambre 1. *(X1 ou X2 suffit.)* |
| **X3** | Feuille d'expédition (« RAS ») | Empreinte de la page arrachée | « Marceau était blessé au retour. Bérard a menti. » | Le **casier de Marceau** (atelier). |
| **X4** | Avis officiel | Brouillon de l'avis | « L'avis a été écrit pour cacher “M.” » | La **phrase C2** gagne le mot « mensonge ». |
| **X5** | Mot de l'infirmier (« la petite ») | Liste de Lila n° 3 (« ma lampe est morte ») | « Ce n'était pas Lila. » | Lila sort de la liste des suspects. |
| **X6** | Opératrice : « coincée » | Loquet fermé de l'intérieur | « Elle n'était pas coincée. Elle se cachait. » | Nouvelle question à lui poser (« Pourquoi vous cacher ? ») : elle détourne la conversation. |
| **X7** | Relève radio (canon), signée « Opératrice de nuit » | Alliance « à ma Nuit » **ou** photo « — N. » | « “Ma Nuit”… c'est elle, sa femme. » | Le mot « femme » dans la banque. |
| **X8** | Accusation de Cuisine | Seuil de la porte de service **ou** traits de Cuisine + montre 2 h 14 | « Tout a commencé la nuit de l'orage, neuf jours avant moi, et personne n'est entré par là. » | Le mot « neuf jours » dans la banque (C5). |
| **X9** | Déclaration de l'opératrice (le voyant) | Cahier de relève (« 2 h 00 : orage, coupure ») | « Sans courant, pas de voyant. Elle n'a rien vu. Pourquoi l'inventer ? » | Nouvelle question à lui poser ; elle passe sur la défensive. |
| **X10** | Lanterne de Lila (sacoche de Lou) | Liste de Lila n° 4 **ou** seuil (petits pas qui sortent) | « Lila est sortie seule, avant la nuit, bien avant moi. » | Cuisine cesse de parler de la lanterne. |

### Les phrases à trous (les conclusions de l'étage)

Chaque conclusion **obligatoire pour résoudre l'affaire** a **au moins trois indices, dans au moins
deux pièces**. Deux suffisent pour trouver.

**C1 — L'origine (couche 1)**
> Les mordus ne sont pas entrés par **[la porte de service]**. Le premier est sorti de **[la chambre 1]**,
> à **[l'infirmerie]**.

- Indices : seuil UV (entrée) · traînée UV (infirmerie) · plan + ticket de plateau (infirmerie, cafétéria) · dossier de la chambre 1.
- Débloque : le **tiroir d'Okafor** (brouillon de l'avis).

**C2 — Le secret (couche 2)**
> Le patient était **[Marceau]**, mordu pendant **[l'expédition]**. **[Bérard]** l'a fait entrer,
> **[Okafor]** l'a gardé sous des lampes, et l'avis officiel est un **[mensonge]**.

- Indices : bracelet (génératrice) · page arrachée (génératrice, couloir nord) · feuille d'expédition (extérieur) · journal du poste (sécurité) · dossier de la chambre 1 · brouillon (infirmerie).
- Débloque : à la console, le **canal 2** ; la voix d'Okafor en entier après la réparation.

**C3 — Les piles (couche 2)**
> Les piles volées servaient aux **[lampes]** de la chambre 1. **[Lila]** les portait ; **[Cuisine]**
> les a enfermées le soir de l'orage.

- Indices : menu du jour (cafétéria) · liste de Lila n° 2 (infirmerie) · feuille de comptage (entrepôt) · témoignage de Cuisine.
- Débloque : la réplique de Cuisine → **clé de la réserve** (si Lou est aussi disculpé par C5).

**C5 — L'étranger (couche 1)** *(se débloque après l'accusation M3)*
> Personne n'est entré par **[la porte de service]** : le premier mordu est sorti de **[l'infirmerie]**,
> la nuit de l'orage. Je suis arrivé **[neuf jours]** plus tard. Ce qui les a remis en marche, c'est
> **[le bruit]** de la génératrice.

- Indices : seuil, poussière et UV (entrée) · traînée UV (infirmerie) · montre 2 h 14 (infirmerie) · traits de Cuisine (cafétéria) · avis officiel, qui dit lui-même « pendant l'orage » (hub) · règle du bruit (extérieur, génératrice).
- La dernière case est un aveu : Lou reconnaît sa part. C'est la vérité qui disculpe.
- Débloque : le **retournement** (M5, § 15) ; Cuisine peut devenir Confiant.

**C4 — L'accusation (couche 3)** *(précédée du « Défi au joueur »)*
> La nuit de l'orage, **[l'opératrice de nuit]** a ouvert la chambre 1 vers **[2 h 05]**, avec une lampe
> **[verte]**. Elle était sa **[femme]**. Elle voulait lui **[dire adieu]**.

- Banque de mots : les 5 suspects, plusieurs heures (1 h 50, 2 h 05, 2 h 14…), plusieurs couleurs, plusieurs liens, plusieurs mobiles (« le libérer », « le soigner », « dire adieu », « se venger »…).
- Indices de la lampe verte : liste de Lila n° 3 (dortoirs) · éclat vert (chambre 1) · lampe ébréchée (contrôle) · lueurs vertes d3 et d7.
- Indices de l'heure : liste de Lila n° 3 · cahier de relève (contrôle) · mot de l'infirmier (infirmerie).
- Indices du lien : alliance (génératrice) · photo « — N. » (atelier) · signature canon (contrôle).
- Indices du mobile : journal du poste (« à l'aube, on le sort ») · cahier de relève (canal 2 à 1 h 50) · dossier (« il se calme quand *elle* lui parle »).
- Débloque : la **scène où elle confirme** (§ 15), et la ligne de fin « vérité trouvée ».

### Les pensées en cas d'erreur

**Erreurs précises :**

| Erreur | Pensée du héros |
|---|---|
| C4 avec **Lila** | « Sa lampe était morte, elle l'a écrit. Celle qui est passée avait une lampe allumée. » |
| C4 avec **Cuisine** | « À 2 h 10, il comptait ses piles à l'entrepôt. On ne peut pas être aux deux bouts du silo. » |
| C4 avec **Bérard** | « Il était à son poste, son journal le dit. Il a menti sur Marceau, pas sur ses heures. » |
| C4 avec **Okafor** | « Elle dormait. Et elle écrit “*elle* lui parle”. C'est quelqu'un d'autre. » |
| C4 avec « le libérer » | « Si elle voulait le libérer, pourquoi s'enfermer juste après ? » |
| C1 avec « la serre » | « Rien ne luit dans la serre. La traînée part de l'infirmerie. » |
| C2 avec « Okafor l'a fait entrer » | « Elle ne sortait jamais. Qui était à l'expédition ? » |
| X sur Avis officiel + Rapport n° 12 | « La lumière et la porte de service, ça n'a rien à voir. Regarde le seuil, de près. » |
| X sur Éclat vert + Lanterne de Lila | « La lanterne de Lila est blanche. Ce vert vient d'ailleurs. » |
| C5 avec « le guetteur » dans la dernière case | « Le guetteur est dehors. Ce qui a fait du bruit dedans, c'est moi. » |
| C5 avec « un jour » | « Il a tracé plus d'un trait sur sa porte. » |
| X sur Avis officiel + Accusation de Cuisine | « Ces deux-là disent la même chose. Il me faut un fait, pas une affiche. » |

**Pensées génériques** (au hasard) :
- « Non… ces deux-là ne se parlent pas. Pas encore. »
- « Je force la pièce. Quand ça ne rentre pas, c'est que ce n'est pas la bonne. »
- « Il me manque un morceau. Peut-être dans une pièce que je n'ai pas fouillée. »

### La colonne « Questions sans réponse »

Toujours visible, d'un étage à l'autre (§ 20) :
- Pourquoi les verrous de la grande porte sont-ils dehors ?
- Qui est la personne de dos, sur la photo de la porte ?
- Quel « vieux dossier du fond » Okafor connaissait-elle ?
- Où est Lila ? Qui tape « VIENS » ?
- *(Tant que C5 n'est pas faite)* Comment prouver que je n'y suis pour rien ?

---

## 17. L'aide en trois paliers (bouton « Réfléchir »)

Proposée après 2-3 minutes sans progrès ou 3 erreurs. Jamais la phrase complète en un clic.

| Conclusion | 1. Orienter | 2. Pointer | 3. Relier |
|---|---|---|---|
| C1 | « Je n'ai pas bien regardé la porte de service. » | « Et si je l'éclairais à la lampe UV ? » | « Aucune trace au seuil, mais une traînée à l'infirmerie : d'où part-elle ? » |
| C2 | « Ce bracelet d'infirmerie… à qui appartenait-il ? » | « La page arrachée de la génératrice, elle parlait de quelqu'un. » | « Bracelet “chambre 1”, avant-bras bandé, feuille “RAS” : le même homme. » |
| C3 | « Le menu parle de piles volées. Volées pour quoi ? » | « Il y a une liste dans le panier à piles de l'infirmerie. » | « Quatre piles par nuit, deux lampes, une chambre. » |
| C5 | « Quand est-ce que tout a commencé, exactement ? » | « Cuisine compte tout. Même les jours. » | « Neuf traits, une montre à 2 h 14, un seuil sans trace : et moi, j'étais où ? » |
| C4 | « Qui avait une lumière allumée, cette nuit-là ? » | « Lila parle d'une couleur. Où ai-je vu cette couleur ? » | « Lampe verte, “ma Nuit”, un trou dans le cahier à 2 h 10. » |

---

## 18. Fair play : où se trouve chaque élément de la solution

Tous ces éléments sont trouvables **avant** l'accusation, la plupart en pleine vue.

| Élément | Où | Visible dès… |
|---|---|---|
| Elle existe et elle est douce | Sa voix à la guérite (d1) | **La première minute.** |
| Quelqu'un « sait et ne dit rien » | Dernier mot de Lila (canon), liste n° 3 | Les dortoirs, la pièce cachée. |
| Une lumière verte à l'est | d3, d7 | La relance de la génératrice. |
| Sa lampe est verte, ébréchée | Chaque rencontre, gros plan a10 | La rencontre. |
| « Nuit » / « ma Nuit » / « N. » | Signature canon de la relève, alliance, photo | La génératrice et la salle de contrôle. |
| Elle a entendu « à l'aube, on le sort » | Cahier de relève (canal 2 à 1 h 50), journal du poste | Contrôle, sécurité. |
| Le trou dans sa relève | Cahier (loupe) | Contrôle. |
| Elle n'était pas coincée | Loquet a11 | L'ouverture du local technique. |
| Elle connaît le silence du mordu | Sa réplique | La conversation. |
| Les alibis des autres | Feuille de comptage, journal du poste, mot de l'infirmier, liste de Lila | Entrepôt, sécurité, infirmerie, dortoirs. |
| Elle laisse accuser l'étranger, et ment sur le voyant | M2, déclaration au haut-parleur, X9 | L'énigme 2. |
| Elle dit « mon garçon » en face, « l'étranger » dans son dos, jamais « Lou » | Ses répliques | La rencontre. |
| **L'innocence de Lou** (pour C5) | Seuil (a15), montre 2 h 14, 9 traits, avis « pendant l'orage », liste de Lila n° 4 | L'entrée, l'infirmerie, la cafétéria, le hub. |

---

## 19. La révélation qui recontextualise l'étage

Une fois l'affaire résolue, chaque note **canon**, sans qu'un mot ait changé, se relit autrement :

- **La voix de la première minute** : « …c'est l'heure de la relève… » C'était la coupable, fidèle à
  son poste, qui appelait au secours.
- **Bérard** : « Ne restez pas dehors à la nuit tombée. » L'homme qui a laissé son guetteur dehors à
  la nuit tombée, et fait entrer son ami.
- **Équipe technique** : « Elle repart au quart de tour. Normalement. » La page juste avant parlait de Marceau.
- **Cuisine** : « On les compte, maintenant. » La phrase qui a éteint les lampes.
- **Dr Okafor** : « Un faisceau en pleine face les fige. » Ce qu'elle savait, elle l'a appris sur Marceau.
- **Opératrice de nuit** : « Il suffit de l'enficher dans la console. » Elle voulait que la radio
  marche pour avouer à ceux d'en bas.
- **Lila** : « Ne fais pas confiance au silence. » Le mordu qui ne grogne pas… et la femme derrière
  la porte, qui n'a pas répondu.
- **La craie** : « PAS TOUS. » Lila parlait de Cuisine et de l'opératrice : les deux vivants que le héros a trouvés.
- **« Mon garçon »** : chaque fois qu'elle l'appelait ainsi, elle évitait son nom, et dans son dos elle disait « l'étranger ».
- **L'avis officiel** : « des mordus sont entrés par la porte de service ». Le vieux mensonge du « mal venu du dehors », que l'opératrice a laissé retomber sur l'étranger.
- *(Plus tard, étages 3 et 4)* **La pensée de la première minute**, « Pas tous. Alors quelqu'un est encore là-dedans. » : c'est la phrase qui a fait entrer Lou, alors qu'il avait promis de fermer de dehors.

---

## 20. Les indices dormants (planter tôt, payer plus bas)

Ils intriguent à l'étage 1 sans bloquer, et restent dans la colonne « Questions sans réponse ».

| Indice dormant | Où à l'étage 1 | Ce qu'on en pense à l'étage 1 | Où il paie | Ce qu'il voudra dire |
|---|---|---|---|---|
| Les **verrous de la grande porte, côté dehors** | Entrée (première minute) | « Drôle de porte. » | Étage 4 | Le silo a été construit pour **garder** quelque chose dedans. |
| La **règle n° 1** signée « Les fondateurs » | Entrée | Une règle de survie. | Étage 4 | « Aucun mordu ne franchit la porte » voulait dire *aucun ne sort*. |
| La **personne de dos** en blouse, valise au triangle | Photo de la guérite | Un inconnu. | Étage 3 | Un fondateur, médecin de la première épidémie. |
| Le **« vieux dossier du fond »** | Rapport n° 1, dossier de la chambre 1 | Okafor avait une référence. | Étages 2 et 3 | Les mordus étaient connus du silo **bien avant** Marceau. |
| Le **dessin de Lila** : 4 étages, « ICI ÇA TAPE » au 3ᵉ, croix au 4ᵉ | Pièce cachée | Un dessin d'enfant. | Étages 2, 3, 4 | Lila avait entendu le signal **avant tout le monde**. |
| Le **signal « VIENS »** tapé à la main | Radio (fin d'étage) | Lila ? | Étage 2 (puis 3) | Ce n'est pas Lila : quelqu'un d'enfermé plus bas depuis longtemps. |
| **L1 — Le paquet noué** de Lou (a16) et « Je ne devais pas entrer… » | Sacoche (inventaire, dès le début) ; première minute | Lou cache quelque chose, c'est sûr. Quoi ? « Pas maintenant. » | Étage 3 | Une clé de laiton au triangle : la clé des verrous du dehors. |
| **L2 — Le trouble devant le triangle** de la photo | Entrée (a1) | « Ce triangle… » puis « … ». | Étage 3 | Le même triangle est gravé sur sa clé : la marque des fondateurs. |
| **L3 — Le gant sur le verrou** | Entrée (première minute) | Un geste sans pensée. | Étage 4 | Le vieux serrurier de Lou a posé ces verrous ; il lui a fait promettre de fermer le silo de dehors. |

**Ce qui ne sera jamais contredit plus bas :** Marceau était le premier mordu **de l'étage 1** ; Bérard
et Okafor ont menti ; l'opératrice a ouvert la porte ; **Lou n'y est pour rien**. Son secret est une
promesse, pas une faute. Les étages suivants **élargissent** (il y avait
eu des mordus avant), ils ne reviennent pas dessus.

---

## 21. Fin de l'étage 1 : une réponse qui crée une question brûlante

1. **La réponse (récompense).** Si l'accusation est faite, le tableau se complète et le héros résume en
   trois phrases : « Marceau était le premier. Ils ont menti pour le cacher. Et c'est elle qui a ouvert. »
2. **La radio** (objectif 4, message canon : « Une voix grésille… quelque part plus bas »). La voix
   d'Okafor : « Ne descendez pas… Lila ? Tu n'es jamais arrivée. Pardon. »
   → **Lila n'est pas en bas.** Elle n'est pas en haut non plus.
3. **Le signal.** Puis des bips tapés à la main. L'opératrice tend l'oreille, traduit lettre par
   lettre : **V… I… E… N… S.** Et elle pâlit : « Ce n'est pas le poste de l'étage 2. Cette fréquence…
   elle vient de **plus bas**. Il n'y a rien, plus bas. Il ne devrait rien y avoir. »
4. **La clé** de Lila, dans la cachette (canon : « Le mur creux cède sous l'épaule. Une pièce cachée ! »).
   **Ce que l'opératrice dit de Lou à la radio** dépend du joueur : affaire résolue, Lou disculpé, et
   choix M6 « dites-le-lui » ou « je vais le lui dire » : « Il y a un garçon avec nous. Il s'appelle Lou.
   Il n'y est pour rien. C'est moi qui ai ouvert. » Lou disculpé seulement : « Un bricoleur est passé.
   Il n'y est pour rien. » Lou non disculpé, ou secret gardé : « Un étranger est entré par la porte de
   service… et ils se sont remis à marcher. » **C'est la réputation qui attend Lou à l'étage 2.**
5. **L'escalier.** Couloir nord : Bérard mordu garde encore la porte ; on le fige ou on le contourne.
   Selon sa confiance, Cuisine est là avec une boîte de pêches (« Reviens pas mordu, Lou. »), parle à
   l'interphone (« Bonne chance, le bricoleur. ») ou se tait (« Bon débarras, l'étranger. »).
   Des petits coups montent de sous la grille (d12). Le héros ouvre.
6. **Texte de fin, canon, inchangé :** « La clé glisse dans le lecteur. L'escalier de service s'ouvre
   sur le noir. Quelque part plus bas, le signal radio répond encore. L'étage 2 vous attend… bientôt. »
7. **Une ligne en plus, selon l'enquête :**
   - affaire résolue : « Derrière toi, à la radio, une voix commence enfin à raconter. »
   - affaire non résolue : « Une question te suit dans l'escalier : qui a ouvert la chambre 1 ? »

**La question brûlante :** *Okafor dit qu'il n'y a personne plus bas. Alors qui appelle « VIENS » ?*

---

## 22. Intégration technique (pour le développeur)

> `game/narrative.json` et les identifiants `mother` / `n7` de `game/dialogue.ts` et `ui/story.ts`
> sont des **restes de SILO 9** (MÈRE, N-7, relais, SCAN ÉCHO, noyau). Cette proposition n'en
> réutilise rien ; ils sont à remplacer. `ENDINGS.floor2` reste tel quel, avec une ligne optionnelle.
> Pas de nouveau système de survie (pas de cycle jour-nuit) : on réutilise les ressources existantes.

**État (`game/state.ts`)**
- `FACT_IDS` **inchangé** : les 5 objectifs, `REQUIRES` et la sauvegarde actuelle n'en dépendent pas.
- Nouvelles listes sauvegardées et validées comme `notes` : `examined` (gros plans, traces UV),
  `words` (banque de mots débloqués), `contradictions` (`x1`…`x10`), `conclusions` (`c1`…`c5`),
  `puzzles` (`locker`, `shed`, `terminal`), `unlocked` (armoire, tiroir, casier, canal 2, réserve),
  `survivors` (`cook`, `operator` : 0 fermé · 1 rencontré · 2 quête en cours · 3 quête finie),
  `trust` (`cook` : `hostile` | `wary` | `careful` | `trusting` ; `operator` : `mask` | `defensive` |
  `ashamed` | `true`), `accused` (Lou soupçonné, jusqu'à C5), `promises` (porte de service refermée…),
  `scenes` (M1 à M7 jouées), `verdict` (choix M6, pour le message radio),
  `uvLamp`, `hints` (paliers d'aide utilisés), `dormant` (questions sans réponse, à garder entre étages).
  Augmenter la version de sauvegarde.
- Nouveau `game/investigation.ts` : contradictions `{ a, b, text, unlock }`, phrases à trous
  `{ id, template, slots, answers, words }`, pensées d'erreur, paliers d'aide.

**Documents et examens**
- `game/notes.ts` : les 7 notes **inchangées** ; champs `kind` (`note` | `audio` | `photo`) et `recto` ;
  une vingtaine de nouveaux documents (§ 13), 5 lignes au plus.
- Nouveau `game/examine.ts` : gros plans a1–a14, traces c1–c8, pensées, événements d1–d12.

**Plan (`game/level.ts`)** — positions indicatives, dans les pièces existantes :
- Chambre 1 : cloison au sud-est de l'infirmerie (≈ x 18–22, z 4–8), porte masquée par l'armoire `room1_cabinet` (18, 3.5).
- Local technique : cloison au nord-est de la salle de contrôle (≈ x 26–30, z −22 à −18), porte `operator_door` (26, −20).
- Entrée : `chalk_door` (0, 23.2), `poster_rule` (2.5, 23.6), `door_bolts` (−1.5, 23.4), `guard_radio` + `photo_inauguration` (4, 25).
- Autres : `note_shed_left` (−13, 21.5) ; `note_shed_right` (−4, 15) ; `terminal` + post-it (3, 16) ;
  `poster_notice` (−5, −5) ; `note_cook_postit` (−12.5, 17) ; `battery_locker` (−30, −4.5) ;
  `note_infirmary_map` (11, −7) ; `uv_lamp` + `okafor_drawer` (16, −7) ; `note_lila_2` (15, −6.5) ;
  `note_room1_file` (21, 6) ; `marceau_locker` (35, −6) ; `note_radio_logbook` (16, −20) ;
  `note_lila_3` (−29, −17) ; `note_lila_4` (27, 10) ; `lila_lantern` (40, 30) ; `lila_drawing` (−36, −17).
- Méfiance : `service_threshold` au seuil de la porte de service (la porte `plaza_generator`, −11, 27,
  « à l'ouest de l'entrée ») ; `cook_tally` sur la porte de la chambre froide (près de `cook`) ; la
  porte `plaza_generator` garde un état ouvert/fermé pour la scène « refermer la porte ».
- PNJ : `cook` (−30, 18), `operator` (28, −20). Cuisine peut sortir au hub pour M3 (devant `poster_notice`).
- `ENEMIES` : garder 5 (`walker_ext`, `walker_gen`, `crawler_cafe`, `walker_control` déplacé à
  l'infirmerie, `walker_dorms` déplacé au couloir nord), avec `resident`, `carries`, `habit`, `silent`
  (Marceau) ; retirer les 5 autres.

**Progression (`game/progress.ts`)**
- Nouveaux cas dans `interactWith` : cadenas à lettres, leviers, terminal, gros plan, examiner un mordu
  figé, PNJ, armoire / tiroir / casier / réserve (si déduction faite), console canal 2.
- `checkTriggers` : première minute (craie, voix), pensées et événements, une seule fois chacun.
- Le chemin des 5 objectifs reste **inchangé** : `tests/unit/journey.test.ts` passe sans retouche.
  Ajouter un test « enquête complète » (X1–X10, C1–C5). La confiance ne doit bloquer aucun objectif.
- Scènes M1 à M7 (§ 15) : déclenchées une seule fois chacune ; la porte de service a un état
  ouvert/fermé (Lou la laisse ouverte en entrant, peut la refermer).

**Mordus (`game/enemy.ts`, `game/combat.ts`)**
- 5 mordus coriaces (favoriser l'évitement), chacun avec une ronde d'habitude ; pendant le gel par la
  lampe, `E` = Examiner. Marceau : aucun son ; la musique se coupe quand il est proche.
- Lampe UV : même charge que la lampe, ne fige pas.
- Borne de recharge : une seule recharge par visite du poste de sécurité (réarmée quand on quitte la pièce).
- Exactement **5 mordus** à l'étage 1, tous **évitables** ; aucune scène (y compris M4, le commis) n'oblige à en vaincre un.

**Interface (`ui/`)**
- Carnet : onglets **Notes / Enregistrements / Photos / Tableau**.
- Tableau : glisser une carte sur une autre ; phrases à trous avec banque de mots ; colonne
  « Questions sans réponse » ; bouton « Réfléchir » (3 paliers).
- Vue **gros plan** (rotation + loupe, contour à portée), **bulle de pensée**, écrans cadenas à
  lettres / leviers / terminal, appui long pour la **lampe UV**.
- Dialogues écrits pour Cuisine et l'opératrice, avec variantes selon `trust` et le nom donné à Lou.
- Fiche de survivant dans le carnet : un petit dessin dont la pose change, et la ligne « Il t'appelle :
  « l'étranger » ». Aucune jauge chiffrée. Rappel rare en bas d'écran : « Cuisine a remarqué. »
- Haut-parleur général (circuit CONTRÔLE) pour la voix de l'opératrice (M2).
- `ui/story.ts` : personnages `cook`, `operator`, `voice_below` ; ligne optionnelle de fin.

**Rendu (`game/render/`)**
- Seuil de la porte de service (deux séries de pas), boue rouge des bottes de Lou, traits sur la porte
  de Cuisine, Cuisine hors de la chambre froide (couperet), paquet noué dans la sacoche.
- Craie sur la porte, verrous côté dehors, cloisons de la chambre 1 et du local technique, armoire
  déplaçable, lampe verte, costumes et objets portés des 5 mordus, traînées luisantes en UV, vague
  d'allumage des néons.

---

## 23. Résumé à lire à voix haute

SILLO 8 est un abri souterrain de quatre étages, et l'histoire est pensée pour les quatre. On commence
par l'étage un. Un jeune bricoleur venu du dehors, Lou, bonnet olive et veste moutarde, arrive devant la
grande porte du silo. Dessus, quelqu'un a écrit à la craie, en lettres d'enfant : « Ils sont
descendus. Pas tous. » Près de la guérite, une radio grésille. Une voix de femme, douce et fatiguée,
dit : « Ici l'opératrice de nuit, il y a quelqu'un ? » Puis plus rien. Lou pose la main sur un paquet
noué dans sa sacoche et pense : « Je ne devais pas entrer… » En une minute, le joueur veut savoir qui
est resté, et il sait que son héros cache quelque chose.

À l'intérieur, cinq mordus errent encore. Ce sont de vrais zombies, mais chacun était un habitant,
répète une vieille habitude et porte un indice. On peut les éviter, ou les figer à la lampe pour les
examiner. Les piles sont rares, et ce manque est au cœur de l'histoire.

Lou entre par la porte de service et rallume la génératrice. Le bruit remet les mordus en marche. Les
deux survivants se méfient aussitôt de « l'étranger ». Le cuisinier, barricadé dans sa chambre froide,
lui lance : « T'es qui, toi ? C'est-tu toi qui les as laissés rentrer ? Depuis que t'es là, ils
marchent. » L'affiche officielle dit justement que les mordus sont entrés par la porte de service, et
l'opératrice, si gentille avec Lou, rappelle à tout le monde que l'étranger est entré par là. Le
cuisinier finit par l'accuser devant l'affiche. Lou doit prouver son innocence, et il le peut : sur le
seuil de la porte, il n'y a que ses pas et ceux d'une enfant qui sortait, aucune trace de mordu. Tout a
commencé neuf jours avant lui. Le cuisinier pose son couperet, demande enfin son nom, et l'appelle Lou.

La vraie enquête commence. À la lampe ultraviolette, la traînée part de l'infirmerie, derrière une
armoire. Là se trouve une chambre secrète. Marceau, le chef technique, avait été mordu pendant une
expédition. Le sergent Bérard, son ami, l'a fait entrer en cachette. Le docteur Okafor l'a gardé sous
deux lampes. Lila, son aide, volait les piles pour ces lampes, et le cuisinier a fini par les enfermer
sous cadenas.

La nuit de l'orage, qui a ouvert la porte de Marceau ? Lila n'avait plus de lumière, le cuisinier
était à l'entrepôt, Bérard à l'entrée, Okafor dormait. Reste une lampe verte vue dans le couloir, une
alliance gravée « à ma Nuit », et un trou dans le cahier de radio, juste à l'heure du drame. C'est
l'opératrice de nuit, la voix gentille du début. Elle était la femme de Marceau. Elle voulait lui dire
adieu, et la pile de sa lampe s'est éteinte. Puis elle a laissé accuser l'étranger, parce que c'était
plus facile. Pour la première fois, elle l'appelle par son nom : « Pardon, Lou. »

Le joueur relie les indices dans son carnet et complète des phrases. Une erreur ne punit jamais, elle
fait réfléchir. Les bonnes déductions ouvrent des passages, et elles gagnent la confiance des survivants.

Mais l'étage un ne dit pas tout. Pourquoi les verrous de la grande porte sont-ils du côté dehors ? Qui
est l'inconnu de dos sur la vieille photo, avec sa valise marquée d'un triangle ? Et pourquoi Lou,
devant ce triangle, pose-t-il la main sur un paquet qu'il n'ouvre jamais ? Les survivants avaient
raison sur un point : il cache quelque chose. Pas ce qu'ils croient. On ne le saura que tout en bas. À
la fin, la radio réparée capte la voix d'Okafor : « Ne descendez pas. Lila, tu n'es jamais arrivée. »
Puis un signal tapé à la main, que l'opératrice traduit lettre par lettre : « Viens ». Il vient de plus
bas que l'étage deux, là où il ne devrait y avoir personne. Lou prend la clé cachée par Lila, et descend.
Ce que l'opératrice a dit de lui à la radio l'attend déjà en bas.

---

## Annexe — Relecture avec la checklist de `RECHERCHE_ENQUETE.md`

✅ = respecté · ⚠️ = respecté en partie, avec la limite indiquée.

**Le mystère**
- ✅ **Vérité complète en 5 lignes.** Qui : l'opératrice de nuit. Quoi : elle a ouvert la chambre 1. Comment : coupure de courant pendant l'orage, lampe verte. Pourquoi : un adieu à son mari avant qu'on le « sorte » à l'aube. Pourquoi c'est caché : Bérard et Okafor mentaient déjà sur Marceau, et elle s'est tue par honte.
- ✅ **Chronologie jour par jour, sans contradiction.** Elle est au § 6. Les heures sont cohérentes partout : 1 h 50, 2 h 00, 2 h 05, 2 h 10, 2 h 14, 2 h 15, 2 h 20.
- ✅ **Règles des mordus fixées et montrées avant de servir.** Liste au § 7 : la lumière (génératrice), le bruit (extérieur), l'habitude (guetteur), la morsure (expédition).
- ✅ **Coupable dans la première pièce, sans paraître suspecte.** C'est sa voix à la guérite, dès la première minute.
- ✅ **Mobile personnel et compréhensible.** L'amour, un adieu, puis la honte.

**Le fair play**
- ✅ **3 indices au moins, dans 2 pièces au moins, par déduction obligatoire.** Liste pour C1 à C4 au § 16 : chaque case de C4 a 3 sources ou plus.
- ✅ **Aucun indice nécessaire après la révélation.** La scène d'aveu confirme seulement ce qui est déjà établi (§ 18).
- ✅ **Le héros ne conclut jamais avant le joueur.** Ses pensées posent des questions ; son résumé arrive *après* la validation de C4.
- ✅ **Moment « Défi au joueur ».** Pensée « J'ai tout vu. Qui a ouvert la chambre 1 ? », juste avant C4.
- ✅ **Au moins 5 détails changent de sens à la relecture.** Il y en a 8 au § 19.

**Les fausses pistes**
- ✅ **2 ou 3 fausses pistes, chacune expliquée par un vrai petit secret.** La porte de service, Lila, Cuisine (§ 9). S'y ajoutent Bérard et Okafor, coupables d'autre chose, et **Lou lui-même** (l'étranger accusé), écarté par C5.
  - ⚠️ Quatre fausses pistes principales : un peu plus que la cible. La porte de service et l'étranger se défont en partie avec les mêmes indices (le seuil), ce qui allège la charge.
- ✅ **Chaque fausse piste s'écarte avec un indice trouvable.** UV, liste n° 3, feuille de comptage, seuil + montre + 9 traits (C5).
- ✅ **Aucune fausse piste ne repose sur un mensonge du jeu.** Seuls les personnages mentent : l'avis officiel, l'infirmier qui se trompe, l'opératrice. Les notes canon disent vrai, seulement pas tout. Lou ne pense jamais faux : il se tait sur son passé.

**Le joueur qui déduit**
- ✅ **Le joueur affirme au moins 5 fois.** 10 contradictions et 5 phrases à trous.
- ✅ **Erreur possible, remarquée, réparable.** « Presque… », pensées d'erreur, aucune pénalité.
- ✅ **Une porte au moins s'ouvre par une information.** PECHES, MARCEAU, l'armoire (X1/X2), le canal 2.
- ✅ **Impossible de gagner en essayant tout.** La validation porte sur la phrase entière, avec des mots débloqués seulement par les indices.
  - ⚠️ C4 a 5 cases et une petite banque : à surveiller en test pour que la force brute reste fastidieuse.

**Le décor et les mordus**
- ✅ **Une scène muette par pièce, qui pose une question.** Tableau du § 11.
- ⚠️ **Chaque mordu a un nom, une habitude et un indice.** Les habitudes et les indices sont là. Trois mordus n'ont qu'un nom de fonction (guetteur, commis, infirmier), par choix, pour ne pas créer de nouveaux personnages.
- ✅ **On peut traverser l'étage en évitant la plupart des mordus.** Rondes prévisibles, lampe, contournements, aucun passage clé gardé sans alternative.
- ✅ **Pièces de lecture calmes, pièces de passage tendues.** Aucun mordu dans les dortoirs, le hub, l'entrepôt, l'atelier, le contrôle et la pièce cachée.

**Téléphone**
- ✅ **Aucune note de plus de 5 lignes.** Les notes canon font 3 ou 4 lignes ; les nouvelles, 5 au plus.
- ✅ **Indices obligatoires assez gros et surlignés.** Contour à portée, gros plans.
  - ⚠️ L'éclat vert (a7) est petit dans le décor, mais il passe par un gros plan et il est doublé par la lampe ébréchée et les lueurs vertes.
- ✅ **Aide en 3 paliers, jamais la phrase complète.** § 17.
- ⚠️ **Chaque pièce se termine sur une découverte en moins de 5 minutes.** C'est prévu (§ 4), à vérifier en test.
- ⚠️ **Un testeur termine l'étage et sait raconter ce qui s'est passé.** À faire : 5 à 7 tests avec des joueurs qui découvrent le jeu.

**La fin**
- ✅ **Les questions des couches 1 à 3 ont une réponse.** Comment, qui a caché, qui a ouvert.
- ✅ **Une seule grande question ouverte, née de la révélation.** « Qui appelle “VIENS”, plus bas que l'étage 2 ? » Elle découle de la voix d'Okafor. Les autres questions sont des indices dormants, rangés dans leur colonne.

**Les 4 étages**
- ✅ **Affaire locale résolue, grand mystère laissé dans l'ombre.** § 2 et § 6.
- ✅ **3 à 5 indices dormants, avec étage de paiement.** 6 au tableau du § 20 pour le silo, dont 2 liés (verrous et règle n° 1), plus 3 très discrets sur le secret de Lou (L1-L3).
- ✅ **Rien de révélé à l'étage 1 ne sera contredit sans explication.** Les étages suivants élargissent seulement (§ 20).
- ✅ **La fin est une réponse qui crée une question.** Lila n'est pas en bas, et quelqu'un appelle de plus bas.

**Survie et enquête**
- ✅ **On peut finir l'étage sans vaincre de mordu.** C'est la règle du § 7.
- ✅ **Une ressource sert à survivre et à enquêter.** La charge de la lampe : figer ou révéler.
- ✅ **Un dilemme ressource contre information.** Il y en a deux : une pile pour l'opératrice, un bandage pour Cuisine. S'y ajoute la charge de lampe dépensée pour sauver Cuisine du commis (M4) : de la lumière contre de la confiance.
- ✅ **Aucune pénurie pendant la lecture ou la déduction.** § 8, règles de dosage.
- ✅ **La rareté vécue éclaire les mobiles.** Les piles comptées expliquent le cadenas de Cuisine et la lampe qui s'éteint.

**Comptage des indices** (cible : 25 à 35). Le joueur trouve environ **36 cartes** :
- 7 notes canon et la craie ;
- 19 nouveaux documents et enregistrements, plus 2 paroles (accusation de Cuisine, déclaration de l'opératrice) ;
- environ 7 gros plans ou traces qui ne doublent pas un document : alliance, bracelet, montre, éclat vert, loquet, seuil (poussière et UV), traits de Cuisine.
- ⚠️ Un peu au-dessus de la cible : les cartes de la méfiance resservent pour C1 (le seuil), donc la charge réelle reste modérée.

Environ un tiers sert aux conclusions C1 à C4.
