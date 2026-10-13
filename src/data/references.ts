/**
 * Bibliographie — toutes les références ont été vérifiées dans PubMed (PMID + DOI)
 * le 14/10/2026. Ne pas ajouter de référence sans PMID vérifié.
 */
export interface Reference {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  pmid: string;
  doi?: string;
}

export const REFERENCES: Record<string, Reference> = {
  // ─── Principes généraux ────────────────────────────────────────────────────
  schoenfeld2017volume: {
    id: 'schoenfeld2017volume', authors: 'Schoenfeld BJ, Ogborn D, Krieger JW', year: 2017,
    title: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis',
    journal: 'J Sports Sci 35(11):1073-1082', pmid: '27433992', doi: '10.1080/02640414.2016.1210197',
  },
  schoenfeld2016rest: {
    id: 'schoenfeld2016rest', authors: 'Schoenfeld BJ et al.', year: 2016,
    title: 'Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men',
    journal: 'J Strength Cond Res 30(7):1805-1812', pmid: '26605807', doi: '10.1519/JSC.0000000000001272',
  },
  refalo2023failure: {
    id: 'refalo2023failure', authors: 'Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ', year: 2023,
    title: 'Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis',
    journal: 'Sports Med 53(3):649-665', pmid: '36334240', doi: '10.1007/s40279-022-01784-y',
  },
  robinson2024rir: {
    id: 'robinson2024rir', authors: 'Robinson ZP et al.', year: 2024,
    title: 'Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions',
    journal: 'Sports Med 54(9):2209-2231', pmid: '38970765', doi: '10.1007/s40279-024-02069-2',
  },

  // ─── Pectoraux ─────────────────────────────────────────────────────────────
  rodriguezRidao2020: {
    id: 'rodriguezRidao2020', authors: 'Rodríguez-Ridao D et al.', year: 2020,
    title: 'Effect of Five Bench Inclinations on the Electromyographic Activity of the Pectoralis Major, Anterior Deltoid, and Triceps Brachii during the Bench Press Exercise',
    journal: 'Int J Environ Res Public Health 17(19):7339', pmid: '33049982', doi: '10.3390/ijerph17197339',
  },
  lehman2005: {
    id: 'lehman2005', authors: 'Lehman GJ', year: 2005,
    title: 'The influence of grip width and forearm pronation/supination on upper-body myoelectric activity during the flat bench press',
    journal: 'J Strength Cond Res 19(3):587-591', pmid: '16095407', doi: '10.1519/R-15024.1',
  },
  welsch2005: {
    id: 'welsch2005', authors: 'Welsch EA, Bird M, Mayhew JL', year: 2005,
    title: 'Electromyographic activity of the pectoralis major and anterior deltoid muscles during three upper-body lifts',
    journal: 'J Strength Cond Res 19(2):449-452', pmid: '15903389', doi: '10.1519/14513.1',
  },
  calatayud2015: {
    id: 'calatayud2015', authors: 'Calatayud J et al.', year: 2015,
    title: 'Bench press and push-up at comparable levels of muscle activity results in similar strength gains',
    journal: 'J Strength Cond Res 29(1):246-253', pmid: '24983847', doi: '10.1519/JSC.0000000000000589',
  },
  kikuchi2017: {
    id: 'kikuchi2017', authors: 'Kikuchi N, Nakazato K', year: 2017,
    title: 'Low-load bench press and push-up induce similar muscle hypertrophy and strength gain',
    journal: 'J Exerc Sci Fit 15(1):37-42', pmid: '29541130', doi: '10.1016/j.jesf.2017.06.003',
  },
  mckenzie2022: {
    id: 'mckenzie2022', authors: 'McKenzie A et al.', year: 2022,
    title: 'Fatigue Increases Muscle Activations but Does Not Change Maximal Joint Angles during the Bar Dip',
    journal: 'Int J Environ Res Public Health 19(21):14390', pmid: '36361276', doi: '10.3390/ijerph192114390',
  },

  // ─── Dos ───────────────────────────────────────────────────────────────────
  escamilla2000: {
    id: 'escamilla2000', authors: 'Escamilla RF et al.', year: 2000,
    title: 'A three-dimensional biomechanical analysis of sumo and conventional style deadlifts',
    journal: 'Med Sci Sports Exerc 32(7):1265-1275', pmid: '10912892', doi: '10.1097/00005768-200007000-00013',
  },
  fenwick2009: {
    id: 'fenwick2009', authors: 'Fenwick CM, Brown SH, McGill SM', year: 2009,
    title: 'Comparison of different rowing exercises: trunk muscle activation and lumbar spine motion, load, and stiffness',
    journal: 'J Strength Cond Res 23(2):350-358', pmid: '19197209', doi: '10.1519/JSC.0b013e3181942019',
  },
  lusk2010: {
    id: 'lusk2010', authors: 'Lusk SJ, Hale BD, Russell DM', year: 2010,
    title: 'Grip width and forearm orientation effects on muscle activity during the lat pull-down',
    journal: 'J Strength Cond Res 24(7):1895-1900', pmid: '20543740', doi: '10.1519/JSC.0b013e3181ddb0ab',
  },
  youdas2010: {
    id: 'youdas2010', authors: 'Youdas JW et al.', year: 2010,
    title: 'Surface electromyographic activation patterns and elbow joint motion during a pull-up, chin-up, or perfect-pullup rotational exercise',
    journal: 'J Strength Cond Res 24(12):3404-3414', pmid: '21068680', doi: '10.1519/JSC.0b013e3181f1598c',
  },

  // ─── Épaules ───────────────────────────────────────────────────────────────
  saeterbakken2013: {
    id: 'saeterbakken2013', authors: 'Saeterbakken AH, Fimland MS', year: 2013,
    title: 'Effects of body position and loading modality on muscle activity and strength in shoulder presses',
    journal: 'J Strength Cond Res 27(7):1824-1831', pmid: '23096062', doi: '10.1519/JSC.0b013e318276b873',
  },
  campos2020: {
    id: 'campos2020', authors: 'Campos YAC et al.', year: 2020,
    title: 'Different Shoulder Exercises Affect the Activation of Deltoid Portions in Resistance-Trained Individuals',
    journal: 'J Hum Kinet 75:5-14', pmid: '33312291', doi: '10.2478/hukin-2020-0033',
  },
  larsen2025: {
    id: 'larsen2025', authors: 'Larsen S et al.', year: 2025,
    title: 'Dumbbell versus cable lateral raises for lateral deltoid hypertrophy: an experimental study',
    journal: 'Front Physiol 16:1611468', pmid: '40692697', doi: '10.3389/fphys.2025.1611468',
  },
  reinold2004: {
    id: 'reinold2004', authors: 'Reinold MM et al.', year: 2004,
    title: 'Electromyographic analysis of the rotator cuff and deltoid musculature during common shoulder external rotation exercises',
    journal: 'J Orthop Sports Phys Ther 34(7):385-394', pmid: '15296366', doi: '10.2519/jospt.2004.34.7.385',
  },

  // ─── Bras ──────────────────────────────────────────────────────────────────
  oliveira2009: {
    id: 'oliveira2009', authors: 'Oliveira LF, Matta TT, Alves DS, Garcia MA, Vieira TM', year: 2009,
    title: 'Effect of the shoulder position on the biceps brachii EMG in different dumbbell curls',
    journal: 'J Sports Sci Med 8(1):24-29', pmid: '24150552',
  },
  kobayashi2026: {
    id: 'kobayashi2026', authors: 'Kobayashi Y et al.', year: 2026,
    title: 'Exercise-specific preferential hypertrophy of individual elbow flexor muscles after incline versus preacher dumbbell curl training',
    journal: 'J Sports Sci (en ligne)', pmid: '42829982', doi: '10.1080/02640414.2026.2741751',
  },
  zabaletaKorta2023: {
    id: 'zabaletaKorta2023', authors: 'Zabaleta-Korta A et al.', year: 2023,
    title: 'Regional Hypertrophy: The Effect of Exercises at Long and Short Muscle Lengths in Recreationally Trained Women',
    journal: 'J Hum Kinet 87:259-270', pmid: '37559762', doi: '10.5114/jhk/163561',
  },
  pedrosa2023curl: {
    id: 'pedrosa2023curl', authors: 'Pedrosa GF et al.', year: 2023,
    title: 'Training in the Initial Range of Motion Promotes Greater Muscle Adaptations Than at Final in the Arm Curl',
    journal: 'Sports (Basel) 11(2):39', pmid: '36828324', doi: '10.3390/sports11020039',
  },
  caufriez2018: {
    id: 'caufriez2018', authors: 'Caufriez B et al.', year: 2018,
    title: 'The Role of the Muscle Brachioradialis in Elbow Flexion: An Electromyographic Study',
    journal: 'J Hand Surg Asian Pac Vol 23(1):102-110', pmid: '29409427', doi: '10.1142/S2424835518500145',
  },
  maeo2023triceps: {
    id: 'maeo2023triceps', authors: 'Maeo S et al.', year: 2023,
    title: 'Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position',
    journal: 'Eur J Sport Sci 23(7):1240-1250', pmid: '35819335', doi: '10.1080/17461391.2022.2100279',
  },

  // ─── Jambes ────────────────────────────────────────────────────────────────
  kubo2019: {
    id: 'kubo2019', authors: 'Kubo K, Ikebukuro T, Yata H', year: 2019,
    title: 'Effects of squat training with different depths on lower limb muscle volumes',
    journal: 'Eur J Appl Physiol 119(9):1933-1942', pmid: '31230110', doi: '10.1007/s00421-019-04181-y',
  },
  gullett2009: {
    id: 'gullett2009', authors: 'Gullett JC et al.', year: 2009,
    title: 'A biomechanical comparison of back and front squats in healthy trained individuals',
    journal: 'J Strength Cond Res 23(1):284-292', pmid: '19002072', doi: '10.1519/JSC.0b013e31818546bb',
  },
  escamilla2001: {
    id: 'escamilla2001', authors: 'Escamilla RF et al.', year: 2001,
    title: 'Effects of technique variations on knee biomechanics during the squat and leg press',
    journal: 'Med Sci Sports Exerc 33(9):1552-1566', pmid: '11528346', doi: '10.1097/00005768-200109000-00020',
  },
  aygunPolat2025: {
    id: 'aygunPolat2025', authors: 'Aygun-Polat E et al.', year: 2025,
    title: 'Targeted muscle activation in Bulgarian split squat variations: effects of trunk position and suspension-based execution',
    journal: 'BMC Sports Sci Med Rehabil 17(1):251', pmid: '40867012', doi: '10.1186/s13102-025-01306-z',
  },
  pedrosa2022knee: {
    id: 'pedrosa2022knee', authors: 'Pedrosa GF et al.', year: 2022,
    title: 'Partial range of motion training elicits favorable improvements in muscular adaptations when carried out at long muscle lengths',
    journal: 'Eur J Sport Sci 22(8):1250-1260', pmid: '33977835', doi: '10.1080/17461391.2021.1927199',
  },
  ema2013: {
    id: 'ema2013', authors: 'Ema R et al.', year: 2013,
    title: 'Inhomogeneous architectural changes of the quadriceps femoris induced by resistance training',
    journal: 'Eur J Appl Physiol 113(11):2691-2703', pmid: '23949789', doi: '10.1007/s00421-013-2700-1',
  },
  mcallister2014: {
    id: 'mcallister2014', authors: 'McAllister MJ et al.', year: 2014,
    title: 'Muscle activation during various hamstring exercises',
    journal: 'J Strength Cond Res 28(6):1573-1580', pmid: '24149748', doi: '10.1519/JSC.0000000000000302',
  },
  maeo2021hamstrings: {
    id: 'maeo2021hamstrings', authors: 'Maeo S et al.', year: 2021,
    title: 'Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths',
    journal: 'Med Sci Sports Exerc 53(4):825-837', pmid: '33009197', doi: '10.1249/MSS.0000000000002523',
  },
  vanDyk2019: {
    id: 'vanDyk2019', authors: 'van Dyk N, Behan FP, Whiteley R', year: 2019,
    title: 'Including the Nordic hamstring exercise in injury prevention programmes halves the rate of hamstring injuries: a systematic review and meta-analysis of 8459 athletes',
    journal: 'Br J Sports Med 53(21):1362-1370', pmid: '30808663', doi: '10.1136/bjsports-2018-100045',
  },
  contreras2015: {
    id: 'contreras2015', authors: 'Contreras B et al.', year: 2015,
    title: 'A Comparison of Gluteus Maximus, Biceps Femoris, and Vastus Lateralis Electromyographic Activity in the Back Squat and Barbell Hip Thrust Exercises',
    journal: 'J Appl Biomech 31(6):452-458', pmid: '26214739', doi: '10.1123/jab.2014-0301',
  },
  plotkin2023: {
    id: 'plotkin2023', authors: 'Plotkin DL et al.', year: 2023,
    title: 'Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift',
    journal: 'Front Physiol 14:1279170', pmid: '37877099', doi: '10.3389/fphys.2023.1279170',
  },
  kinoshita2023: {
    id: 'kinoshita2023', authors: 'Kinoshita M et al.', year: 2023,
    title: 'Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training',
    journal: 'Front Physiol 14:1272106', pmid: '38156065', doi: '10.3389/fphys.2023.1272106',
  },
  kassiano2023: {
    id: 'kassiano2023', authors: 'Kassiano W et al.', year: 2023,
    title: 'Greater Gastrocnemius Muscle Hypertrophy After Partial Range of Motion Training Performed at Long Muscle Lengths',
    journal: 'J Strength Cond Res 37(9):1746-1753', pmid: '37015016', doi: '10.1519/JSC.0000000000004460',
  },
};

/** Références à afficher en tête de la bibliothèque (principes valables pour tous les exercices). */
export const GENERAL_EVIDENCE: { text: string; refs: string[] }[] = [
  { text: "Plus de séries par semaine et par muscle = plus d'hypertrophie (relation dose-réponse : ≈ +0,4 % de gain par série hebdomadaire supplémentaire dans la méta-analyse).", refs: ['schoenfeld2017volume'] },
  { text: "Les repos longs (~3 min) entre les séries donnent plus de force et d'hypertrophie que des repos d'1 min chez des pratiquants entraînés.", refs: ['schoenfeld2016rest'] },
  { text: "Aller jusqu'à l'échec n'est pas indispensable : l'hypertrophie augmente à mesure qu'on finit les séries près de l'échec (faible RIR), sans avantage net à l'échec total.", refs: ['refalo2023failure', 'robinson2024rir'] },
];
