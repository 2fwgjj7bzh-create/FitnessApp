/**
 * Fiches des exercices de base : muscles, consignes, erreurs fréquentes et ce que dit la
 * recherche (références vérifiées dans PubMed, cf. data/references.ts).
 * Les clés correspondent exactement aux noms de data/exerciseDatabase.ts.
 */
export interface ExerciseGuide {
  primary: string[];
  secondary: string[];
  cues: string[];
  errors: string[];
  evidence: { text: string; refs: string[] }[];
}

export const EXERCISE_GUIDE: Record<string, ExerciseGuide> = {
  // ─── Pectoraux ─────────────────────────────────────────────────────────────
  'Développé couché barre': {
    primary: ['Grand pectoral'],
    secondary: ['Deltoïde antérieur', 'Triceps'],
    cues: [
      'Omoplates serrées et basses, pieds ancrés au sol, légère cambrure naturelle.',
      'Descendre la barre sous contrôle vers le bas des pectoraux, avant-bras verticaux.',
      'Coudes à ~45–70° du buste, pousser en remontant légèrement vers les épaules.',
    ],
    errors: ['Rebondir la barre sur la poitrine', 'Fesses qui décollent du banc', 'Coudes à 90° (épaules en souffrance)'],
    evidence: [
      { text: "Rapprocher les mains augmente le travail du triceps et réduit un peu celui de la portion sterno-claviculaire du pectoral, mais les écarts restent faibles : choisis la prise la plus confortable.", refs: ['lehman2005'] },
      { text: 'Barre et haltères donnent une activation du pectoral et du deltoïde antérieur comparable : ils sont interchangeables.', refs: ['welsch2005'] },
    ],
  },
  'Développé couché haltères': {
    primary: ['Grand pectoral'],
    secondary: ['Deltoïde antérieur', 'Triceps'],
    cues: [
      'Haltères au-dessus des épaules, omoplates serrées.',
      'Descendre jusqu\'à sentir l\'étirement des pectoraux, coudes sous les poignets.',
      'Remonter en rapprochant légèrement les haltères, sans les cogner.',
    ],
    errors: ['Amplitude raccourcie en bas', 'Coudes qui s\'ouvrent à 90°', 'Poignets cassés en arrière'],
    evidence: [
      { text: "Activation du grand pectoral et du deltoïde antérieur équivalente au développé barre ; l'écarté, lui, sollicite le muscle moins longtemps.", refs: ['welsch2005'] },
    ],
  },
  'Développé incliné barre': {
    primary: ['Grand pectoral (chef claviculaire)'],
    secondary: ['Deltoïde antérieur', 'Triceps'],
    cues: [
      'Banc à ~30° : au-delà de 45°, le deltoïde antérieur prend le relais.',
      'Barre vers le haut des pectoraux (sous les clavicules).',
      'Garder les omoplates serrées comme au couché.',
    ],
    errors: ['Banc trop incliné (développé épaules déguisé)', 'Dos qui se décolle pour pousser'],
    evidence: [
      { text: "C'est à 30° que le haut du pectoral est le plus activé ; à partir de 45° le deltoïde antérieur domine et le pectoral travaille moins.", refs: ['rodriguezRidao2020'] },
    ],
  },
  'Développé incliné haltères': {
    primary: ['Grand pectoral (chef claviculaire)'],
    secondary: ['Deltoïde antérieur', 'Triceps'],
    cues: ['Banc à ~30°.', 'Grande amplitude en bas, coudes sous les poignets.', 'Remonter vers le haut des pectoraux.'],
    errors: ['Banc à 45–60°', 'Demi-répétitions en bas'],
    evidence: [
      { text: "Inclinaison optimale du banc pour le haut du pectoral : ~30°.", refs: ['rodriguezRidao2020'] },
    ],
  },
  'Écarté poulie croisé': {
    primary: ['Grand pectoral'],
    secondary: ['Deltoïde antérieur'],
    cues: [
      'Coudes légèrement fléchis et fixes : le mouvement vient de l\'épaule.',
      'Chercher l\'étirement en position ouverte, contrôler le retour.',
      'Régler la hauteur des poulies selon la partie visée (haute → bas des pecs, basse → haut).',
    ],
    errors: ['Transformer le mouvement en développé (coudes qui se plient)', 'Charge trop lourde, buste qui bascule'],
    evidence: [
      { text: "Les mouvements d'écarté sollicitent le pectoral moins longtemps par répétition que les développés : à placer en exercice complémentaire.", refs: ['welsch2005'] },
    ],
  },
  'Machine pec deck': {
    primary: ['Grand pectoral'],
    secondary: ['Deltoïde antérieur'],
    cues: ['Régler le siège pour avoir les poignées à hauteur de poitrine.', 'Dos plaqué, épaules basses.', 'Contrôler la phase d\'ouverture.'],
    errors: ['Épaules qui montent', 'Ouverture trop loin derrière le plan du corps'],
    evidence: [
      { text: "Exercice d'isolation : utile en complément des développés, qui restent la base pour charger lourd.", refs: ['welsch2005'] },
    ],
  },
  'Pompes': {
    primary: ['Grand pectoral'],
    secondary: ['Triceps', 'Deltoïde antérieur', 'Gainage'],
    cues: ['Corps gainé en planche, fessiers serrés.', 'Mains un peu plus larges que les épaules, coudes à ~45°.', 'Poitrine jusqu\'au sol.'],
    errors: ['Bassin qui s\'affaisse', 'Amplitude partielle', 'Tête qui part en avant'],
    evidence: [
      { text: 'Avec une intensité comparable (lest ou élastique), les pompes donnent des gains de force similaires au développé couché.', refs: ['calatayud2015'] },
      { text: "Des pompes à charge équivalente à ~40 % du 1RM au développé donnent une hypertrophie comparable sur 8 semaines.", refs: ['kikuchi2017'] },
    ],
  },
  'Dips pectoraux': {
    primary: ['Grand pectoral', 'Triceps'],
    secondary: ['Deltoïde antérieur'],
    cues: ['Buste légèrement penché en avant pour les pectoraux.', 'Descendre jusqu\'à ce que les épaules passent légèrement sous les coudes, sans douleur.', 'Épaules basses, loin des oreilles.'],
    errors: ['Descente trop profonde avec douleur à l\'épaule', 'Épaules qui remontent'],
    evidence: [
      { text: "Le dip cible efficacement le grand pectoral et le triceps ; la fatigue augmente leur activation sans dégrader la technique.", refs: ['mckenzie2022'] },
    ],
  },

  // ─── Dos ───────────────────────────────────────────────────────────────────
  'Soulevé de terre': {
    primary: ['Fessiers', 'Ischio-jambiers', 'Érecteurs du rachis'],
    secondary: ['Quadriceps', 'Trapèzes', 'Avant-bras'],
    cues: [
      'Barre au-dessus du milieu du pied, tibias proches de la barre.',
      'Dos neutre, « casser » la barre pour engager les dorsaux avant de tirer.',
      'Pousser le sol avec les jambes, la barre frôle les cuisses.',
    ],
    errors: ['Dos qui s\'arrondit sous la charge', 'Barre qui s\'éloigne du corps', 'Hyperextension en fin de mouvement'],
    evidence: [
      { text: "Conventionnel et sumo diffèrent surtout aux genoux et aux chevilles ; les moments à la hanche sont similaires : choisis le style adapté à ta morphologie.", refs: ['escamilla2000'] },
    ],
  },
  'Rowing barre': {
    primary: ['Grand dorsal', 'Trapèzes moyens', 'Rhomboïdes'],
    secondary: ['Deltoïde postérieur', 'Biceps', 'Érecteurs du rachis'],
    cues: ['Buste penché à ~45°, dos neutre.', 'Tirer la barre vers le bas du ventre, coudes vers les hanches.', 'Contrôler la descente sans relâcher le gainage.'],
    errors: ['Se redresser pour tricher', 'Dos arrondi', 'Tirer avec les bras seulement'],
    evidence: [
      { text: "Le rowing penché debout active fortement tout le dos mais charge davantage le rachis lombaire que les autres rowings ; le rowing inversé est le moins contraignant pour le bas du dos.", refs: ['fenwick2009'] },
    ],
  },
  'Rowing haltère unilatéral': {
    primary: ['Grand dorsal', 'Rhomboïdes'],
    secondary: ['Deltoïde postérieur', 'Biceps'],
    cues: ['Main et genou en appui sur le banc, dos plat.', 'Tirer le coude vers la hanche.', 'Laisser l\'omoplate s\'étirer en bas.'],
    errors: ['Rotation du buste pour tricher', 'Coude qui part vers l\'extérieur (trapèzes au lieu des dorsaux)'],
    evidence: [
      { text: "Parmi les rowings comparés, le rowing penché debout est celui qui charge le plus le rachis lombaire ; l'appui sur le banc soulage le bas du dos.", refs: ['fenwick2009'] },
    ],
  },
  'Rowing câble assis': {
    primary: ['Grand dorsal', 'Trapèzes moyens', 'Rhomboïdes'],
    secondary: ['Biceps', 'Deltoïde postérieur'],
    cues: ['Buste droit, léger penché en avant à l\'étirement.', 'Tirer vers le nombril en serrant les omoplates.', 'Retour lent bras tendus.'],
    errors: ['Balancer le buste d\'avant en arrière', 'Épaules qui montent'],
    evidence: [
      { text: "Le rowing penché debout est la variante qui charge le plus le rachis lombaire : le rowing assis à la poulie est une alternative quand le bas du dos est fatigué.", refs: ['fenwick2009'] },
    ],
  },
  'Tirage poulie haute prise large': {
    primary: ['Grand dorsal'],
    secondary: ['Biceps', 'Trapèzes moyens/inférieurs'],
    cues: ['Tirer la barre devant, vers le haut de la poitrine.', 'Buste légèrement incliné, poitrine sortie.', 'Contrôler la remontée jusqu\'à l\'étirement complet.'],
    errors: ['Tirer derrière la nuque', 'Se pencher en arrière pour tricher', 'Amplitude partielle en haut'],
    evidence: [
      { text: "Prise en pronation : plus d'activation du grand dorsal qu'en supination, quelle que soit la largeur de prise. Tirage devant recommandé.", refs: ['lusk2010'] },
    ],
  },
  'Tractions prise large': {
    primary: ['Grand dorsal'],
    secondary: ['Biceps', 'Trapèze inférieur', 'Grand pectoral'],
    cues: ['Partir bras tendus, épaules engagées.', 'Monter la poitrine vers la barre, coudes vers les côtes.', 'Redescendre en contrôle jusqu\'en bas.'],
    errors: ['Demi-répétitions', 'Kipping (élan)', 'Épaules aux oreilles en bas'],
    evidence: [
      { text: "Le mouvement est initié par le trapèze inférieur et le pectoral, puis terminé par le grand dorsal et le biceps.", refs: ['youdas2010'] },
    ],
  },
  'Tractions supination': {
    primary: ['Grand dorsal', 'Biceps'],
    secondary: ['Trapèze inférieur', 'Grand pectoral'],
    cues: ['Paumes vers soi, mains largeur d\'épaules.', 'Menton au-dessus de la barre sans tendre le cou.', 'Descente complète.'],
    errors: ['Amplitude partielle', 'Élan avec les jambes'],
    evidence: [
      { text: "En supination (chin-up), le biceps et le pectoral sont plus actifs qu'en pronation ; le trapèze inférieur l'est plus en pronation. Le grand dorsal est très sollicité dans les deux cas.", refs: ['youdas2010'] },
    ],
  },
  'Face pull': {
    primary: ['Deltoïde postérieur', 'Trapèzes moyens'],
    secondary: ['Rotateurs externes (infra-épineux, petit rond)'],
    cues: ['Poulie à hauteur du visage, corde.', 'Tirer vers le front en écartant les mains, pouces vers l\'arrière.', 'Finir en rotation externe, coudes hauts.'],
    errors: ['Charge trop lourde, buste qui recule', 'Coudes bas (devient un rowing)'],
    evidence: [
      { text: "L'abduction horizontale avec rotation externe (bras à ~100°) donne la plus forte activation du deltoïde postérieur et moyen parmi les exercices de rotation externe étudiés.", refs: ['reinold2004'] },
    ],
  },

  // ─── Épaules ───────────────────────────────────────────────────────────────
  'Développé militaire barre': {
    primary: ['Deltoïde antérieur'],
    secondary: ['Deltoïde moyen', 'Triceps', 'Trapèzes'],
    cues: ['Fessiers et abdos serrés, pas de cambrure excessive.', 'Barre devant le visage puis la tête passe sous la barre.', 'Verrouiller bras tendus au-dessus de la nuque.'],
    errors: ['Se cambrer pour pousser', 'Coudes trop écartés vers l\'arrière'],
    evidence: [
      { text: "Debout, l'activation des deltoïdes est plus élevée qu'assis ; la barre permet de pousser plus lourd que les haltères.", refs: ['saeterbakken2013'] },
    ],
  },
  'Développé militaire haltères': {
    primary: ['Deltoïde antérieur'],
    secondary: ['Deltoïde moyen', 'Triceps'],
    cues: ['Haltères à hauteur d\'oreilles, coudes légèrement vers l\'avant.', 'Pousser à la verticale sans cogner les haltères.', 'Gainage serré.'],
    errors: ['Descente partielle', 'Cambrure excessive'],
    evidence: [
      { text: "La version debout aux haltères (la plus instable) donne la plus forte activation des deltoïdes, mais le 1RM le plus faible.", refs: ['saeterbakken2013'] },
    ],
  },
  'Élévation latérale haltères debout': {
    primary: ['Deltoïde moyen'],
    secondary: ['Trapèze supérieur', 'Supra-épineux'],
    cues: ['Légère flexion des coudes, monter les bras dans le plan de l\'omoplate (un peu en avant).', 'Monter jusqu\'à l\'horizontale.', 'Descente contrôlée, sans élan.'],
    errors: ['Balancer le buste', 'Hausser les épaules', 'Charge trop lourde'],
    evidence: [
      { text: "L'élévation latérale et le développé épaules activent davantage le deltoïde moyen que les exercices de pectoraux.", refs: ['campos2020'] },
      { text: "Haltères et poulie donnent une hypertrophie du deltoïde moyen similaire à amplitude égale.", refs: ['larsen2025'] },
    ],
  },
  'Élévation latérale câble': {
    primary: ['Deltoïde moyen'],
    secondary: ['Trapèze supérieur', 'Supra-épineux'],
    cues: ['Poulie basse, câble passant devant ou derrière le corps.', 'Monter jusqu\'à l\'horizontale, coude légèrement fléchi.', 'Contrôler la descente.'],
    errors: ['Tirer avec le trapèze', 'Buste qui s\'incline pour tricher'],
    evidence: [
      { text: "Aussi efficace que la version haltères pour l'hypertrophie du deltoïde moyen : choisis selon ton matériel et ton confort.", refs: ['larsen2025'] },
    ],
  },
  'Oiseau haltères': {
    primary: ['Deltoïde postérieur'],
    secondary: ['Trapèzes moyens', 'Rhomboïdes'],
    cues: ['Buste penché presque à l\'horizontale, dos plat.', 'Ouvrir les bras sur les côtés, coudes légèrement fléchis.', 'Pouces légèrement vers l\'extérieur.'],
    errors: ['Serrer les omoplates au lieu d\'ouvrir les bras (rhomboïdes au lieu des deltoïdes)', 'Élan du buste'],
    evidence: [
      { text: "L'abduction horizontale buste penché fait partie des exercices qui activent le plus le deltoïde postérieur.", refs: ['reinold2004'] },
    ],
  },

  // ─── Biceps ────────────────────────────────────────────────────────────────
  'Curl barre droite': {
    primary: ['Biceps brachial'],
    secondary: ['Brachial', 'Brachio-radial'],
    cues: ['Coudes fixes le long du corps.', 'Monter sans avancer les coudes, descendre jusqu\'à bras tendus.', 'Pas d\'élan du dos.'],
    errors: ['Balancer le buste', 'Remonter les coudes', 'Descente incomplète'],
    evidence: [
      { text: "Le travail en début d'amplitude (bras presque tendus, muscle étiré) donne plus d'hypertrophie distale du biceps que la fin d'amplitude : ne néglige pas le bas du mouvement.", refs: ['pedrosa2023curl'] },
    ],
  },
  'Curl incliné haltères': {
    primary: ['Biceps brachial'],
    secondary: ['Brachial', 'Brachio-radial'],
    cues: ['Banc à 45–60°, bras pendants derrière le buste.', 'Garder les coudes immobiles.', 'Descente complète, biceps étiré.'],
    errors: ['Coudes qui avancent', 'Épaules qui s\'enroulent'],
    evidence: [
      { text: "Le curl incliné maintient une activation élevée du biceps sur toute l'amplitude, comme le curl debout.", refs: ['oliveira2009'] },
      { text: "Comparé au curl pupitre, il a donné un peu plus d'hypertrophie du biceps, et le pupitre plus du brachial et du brachio-radial, pour un gain total similaire.", refs: ['kobayashi2026'] },
    ],
  },
  'Curl marteau haltères': {
    primary: ['Brachio-radial', 'Brachial'],
    secondary: ['Biceps brachial'],
    cues: ['Prise neutre (pouces vers le haut).', 'Coudes fixes, montée contrôlée.', 'Descente complète.'],
    errors: ['Balancer', 'Coudes qui partent vers l\'avant'],
    evidence: [
      { text: "Le brachio-radial est un fléchisseur majeur du coude dans toutes les positions de l'avant-bras (neutre, pronation, supination).", refs: ['caufriez2018'] },
    ],
  },
  'Curl pupitre barre': {
    primary: ['Biceps brachial', 'Brachial'],
    secondary: ['Brachio-radial'],
    cues: ['Aisselles calées en haut du pupitre.', 'Descendre presque bras tendus sans verrouiller brutalement.', 'Remonter sans décoller les coudes.'],
    errors: ['Rebond en bas', 'Amplitude coupée en bas (là où le pupitre est le plus efficace)'],
    evidence: [
      { text: "L'activation du biceps est élevée surtout sur une partie de l'amplitude (bras tendus).", refs: ['oliveira2009'] },
      { text: "Le curl pupitre fait grossir la partie distale du bras et favorise le brachial et le brachio-radial.", refs: ['zabaletaKorta2023', 'kobayashi2026'] },
    ],
  },

  // ─── Triceps ───────────────────────────────────────────────────────────────
  'Skull crusher barre EZ': {
    primary: ['Triceps (3 chefs)'],
    secondary: [],
    cues: ['Bras légèrement inclinés vers l\'arrière (pas à la verticale).', 'Descendre la barre derrière le front, coudes fixes.', 'Étendre sans écarter les coudes.'],
    errors: ['Coudes qui s\'écartent', 'Transformer en développé'],
    evidence: [
      { text: "Les extensions bras au-dessus de la tête font plus grossir le triceps (surtout le long chef) que bras le long du corps : le skull crusher, bras inclinés vers l'arrière, se situe entre les deux.", refs: ['maeo2023triceps'] },
    ],
  },
  'Extension triceps corde poulie': {
    primary: ['Triceps (chefs latéral et médial)'],
    secondary: ['Long chef'],
    cues: ['Coudes collés au corps.', 'Écarter la corde en bas et verrouiller.', 'Remonter jusqu\'à ~90° sans décoller les coudes.'],
    errors: ['Buste qui s\'enroule pour pousser', 'Coudes qui avancent'],
    evidence: [
      { text: "Bras le long du corps, le long chef est raccourci : pour lui, l'extension au-dessus de la tête est nettement plus efficace. Garde les deux dans ton programme.", refs: ['maeo2023triceps'] },
    ],
  },
  'Extension triceps overhead câble': {
    primary: ['Triceps (long chef)'],
    secondary: ['Chefs latéral et médial'],
    cues: ['Dos à la poulie, bras au-dessus de la tête.', 'Descendre derrière la nuque jusqu\'à l\'étirement.', 'Étendre en gardant les coudes fixes.'],
    errors: ['Coudes qui s\'écartent', 'Amplitude courte en bas'],
    evidence: [
      { text: "Hypertrophie du triceps nettement supérieure en position bras au-dessus de la tête qu'en position neutre, surtout pour le long chef, même avec des charges plus faibles.", refs: ['maeo2023triceps'] },
    ],
  },
  'Développé couché prise serrée': {
    primary: ['Triceps', 'Grand pectoral'],
    secondary: ['Deltoïde antérieur'],
    cues: ['Mains à largeur d\'épaules (pas plus serré).', 'Coudes près du corps.', 'Barre vers le bas des pectoraux.'],
    errors: ['Mains collées (poignets en souffrance)', 'Coudes qui s\'ouvrent'],
    evidence: [
      { text: "Resserrer la prise augmente l'activité du triceps au développé couché.", refs: ['lehman2005'] },
    ],
  },

  // ─── Quadriceps ────────────────────────────────────────────────────────────
  'Squat barre haute': {
    primary: ['Quadriceps', 'Fessiers'],
    secondary: ['Adducteurs', 'Érecteurs du rachis'],
    cues: ['Barre sur les trapèzes, pieds largeur d\'épaules, pointes légèrement ouvertes.', 'Genoux dans l\'axe des pieds.', 'Descendre au moins cuisses parallèles, idéalement plus bas.'],
    errors: ['Genoux qui rentrent', 'Talons qui décollent', 'Dos qui s\'arrondit en bas (« butt wink » marqué)'],
    evidence: [
      { text: "Le squat complet fait plus grossir les fessiers et les adducteurs que le demi-squat ; les quadriceps progressent pareil. Il ne fait pas grossir le droit fémoral ni les ischios.", refs: ['kubo2019'] },
    ],
  },
  'Squat avant barre': {
    primary: ['Quadriceps'],
    secondary: ['Fessiers', 'Gainage'],
    cues: ['Barre sur les deltoïdes avant, coudes hauts.', 'Buste plus droit qu\'au squat arrière.', 'Descendre profond, genoux vers l\'avant.'],
    errors: ['Coudes qui tombent', 'Buste qui plonge vers l\'avant'],
    evidence: [
      { text: "Le squat avant recrute autant les muscles que le squat arrière, avec moins de compression au genou : intéressant en cas de genoux sensibles.", refs: ['gullett2009'] },
    ],
  },
  'Presse à cuisses 45°': {
    primary: ['Quadriceps'],
    secondary: ['Fessiers', 'Adducteurs'],
    cues: ['Bas du dos plaqué contre le dossier.', 'Descendre tant que le bassin ne décolle pas.', 'Ne pas verrouiller les genoux brutalement en haut.'],
    errors: ['Bassin qui s\'enroule en bas', 'Amplitude minuscule avec charge énorme'],
    evidence: [
      { text: "Le squat produit plus d'activité musculaire que la presse, mais les forces au genou augmentent avec la flexion dans les deux cas : la presse permet de doser ces contraintes.", refs: ['escamilla2001'] },
    ],
  },
  'Hack squat machine': {
    primary: ['Quadriceps'],
    secondary: ['Fessiers'],
    cues: ['Dos plaqué contre le dossier.', 'Pieds au milieu de la plateforme, descendre profond.', 'Pousser sur tout le pied.'],
    errors: ['Talons qui décollent', 'Amplitude partielle'],
    evidence: [
      { text: "Les forces au genou augmentent avec la flexion (squat comme presse) : descends aussi bas que tes genoux le tolèrent sans douleur.", refs: ['escamilla2001'] },
    ],
  },
  'Split squat bulgare haltères': {
    primary: ['Quadriceps', 'Fessiers'],
    secondary: ['Adducteurs', 'Ischio-jambiers'],
    cues: ['Pied arrière sur le banc, pied avant assez loin.', 'Descendre verticalement jusqu\'à ce que le genou arrière frôle le sol.', 'Pousser sur le talon avant.'],
    errors: ['Pied avant trop près (genou qui part loin)', 'Bassin qui tourne'],
    evidence: [
      { text: "Pencher le buste en avant augmente l'activation du grand fessier et des ischios (et du droit fémoral) ; buste droit = plus de travail des érecteurs du rachis en version suspendue.", refs: ['aygunPolat2025'] },
    ],
  },
  'Extension quadriceps machine': {
    primary: ['Quadriceps (dont droit fémoral)'],
    secondary: [],
    cues: ['Genou aligné avec l\'axe de la machine.', 'Partir genoux bien fléchis (muscle étiré).', 'Contrôler la descente.'],
    errors: ['Élan', 'Ne travailler que la fin du mouvement'],
    evidence: [
      { text: "Le travail en début d'amplitude (genoux fléchis, quadriceps étiré) a donné plus d'hypertrophie régionale que le travail en fin d'amplitude.", refs: ['pedrosa2022knee'] },
      { text: "L'hypertrophie du quadriceps n'est pas uniforme entre les chefs ni le long du muscle : varier les exercices a du sens.", refs: ['ema2013'] },
    ],
  },

  // ─── Ischios / Fessiers ────────────────────────────────────────────────────
  'Romanian deadlift barre': {
    primary: ['Ischio-jambiers', 'Fessiers'],
    secondary: ['Érecteurs du rachis', 'Avant-bras'],
    cues: ['Genoux légèrement fléchis et fixes.', 'Pousser les hanches vers l\'arrière, barre collée aux cuisses.', 'Descendre jusqu\'à l\'étirement des ischios, dos neutre.'],
    errors: ['Dos qui s\'arrondit', 'Plier les genoux (devient un soulevé de terre)', 'Barre loin des jambes'],
    evidence: [
      { text: "Le RDL et le glute-ham raise maximisent l'activité des ischio-jambiers parmi les exercices étudiés.", refs: ['mcallister2014'] },
    ],
  },
  'Curl jambes assis machine': {
    primary: ['Ischio-jambiers'],
    secondary: ['Gastrocnémiens'],
    cues: ['Hanches fléchies (assis), cuisses bloquées.', 'Fléchir complètement les genoux.', 'Revenir lentement jusqu\'à l\'étirement.'],
    errors: ['Bassin qui glisse', 'Amplitude coupée'],
    evidence: [
      { text: "Le leg curl assis (ischios étirés à la hanche) fait plus grossir les ischio-jambiers que le leg curl couché.", refs: ['maeo2021hamstrings'] },
    ],
  },
  'Nordic curl': {
    primary: ['Ischio-jambiers (excentrique)'],
    secondary: ['Fessiers', 'Gainage'],
    cues: ['Chevilles bloquées, corps aligné des genoux à la tête.', 'Freiner la descente le plus longtemps possible.', 'Se rattraper avec les mains, remonter en s\'aidant.'],
    errors: ['Casser aux hanches', 'Tomber sans freiner'],
    evidence: [
      { text: "Les programmes qui incluent le Nordic curl divisent environ par deux le taux de blessures des ischio-jambiers.", refs: ['vanDyk2019'] },
    ],
  },
  'Hip thrust barre': {
    primary: ['Grand fessier'],
    secondary: ['Ischio-jambiers', 'Quadriceps'],
    cues: ['Haut du dos sur le banc (bas des omoplates).', 'Menton rentré, côtes basses.', 'Monter jusqu\'à l\'alignement genoux-hanches-épaules, serrer 1 s.'],
    errors: ['Se cambrer au lieu d\'étendre la hanche', 'Pieds trop loin (ischios) ou trop près (quadriceps)'],
    evidence: [
      { text: "Activation EMG du grand fessier plus élevée au hip thrust qu'au squat.", refs: ['contreras2015'] },
      { text: "Pourtant, à volume égal, hip thrust et squat ont donné une hypertrophie des fessiers similaire ; le squat fait en plus grossir les cuisses.", refs: ['plotkin2023'] },
    ],
  },

  // ─── Mollets ───────────────────────────────────────────────────────────────
  'Mollets debout machine': {
    primary: ['Gastrocnémiens', 'Soléaire'],
    secondary: [],
    cues: ['Genoux tendus.', 'Descendre talons bas jusqu\'à l\'étirement maximal, pause 1 s.', 'Monter sur la pointe sans rebond.'],
    errors: ['Rebondir en bas', 'Amplitude minuscule en haut'],
    evidence: [
      { text: "Les mollets debout (genoux tendus) font beaucoup plus grossir les gastrocnémiens que les mollets assis.", refs: ['kinoshita2023'] },
      { text: "Le travail dans la partie étirée (talons bas) a donné plus d'hypertrophie des gastrocnémiens que l'amplitude complète ou la partie haute.", refs: ['kassiano2023'] },
    ],
  },
  'Mollets assis machine': {
    primary: ['Soléaire'],
    secondary: ['Gastrocnémiens (peu)'],
    cues: ['Genoux à 90°, coussin sur le bas des cuisses.', 'Étirement complet en bas.', 'Montée contrôlée.'],
    errors: ['Rebond', 'Amplitude partielle'],
    evidence: [
      { text: "Genou fléchi, les gastrocnémiens travaillent peu : la version assise sert surtout au soléaire, qui a progressé autant qu'en version debout.", refs: ['kinoshita2023'] },
    ],
  },
};

export function getGuide(exerciseName: string): ExerciseGuide | undefined {
  return EXERCISE_GUIDE[exerciseName];
}
