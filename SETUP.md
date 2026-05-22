# 🏋️ FitnessApp — Guide d'installation

## Prérequis

### 1. Installer Node.js
Télécharge et installe Node.js (version 18+) depuis :
https://nodejs.org/fr/download

### 2. Installer Expo CLI
```bash
npm install -g expo-cli
```

### 3. Installer les dépendances du projet
```bash
cd ~/FitnessApp
npm install
```

## Lancer l'application

### Sur iPhone (recommandé)
1. Installe l'app **Expo Go** depuis l'App Store
2. Lance le projet :
   ```bash
   cd ~/FitnessApp
   npx expo start
   ```
3. Scanne le QR code avec l'appareil photo de ton iPhone

### Sur simulateur iOS (Mac avec Xcode)
```bash
npx expo start --ios
```

### Sur Android
```bash
npx expo start --android
```

## Fonctionnalités

| Onglet | Fonctionnalités |
|--------|----------------|
| **Accueil** | Dashboard avec résumé du jour, séances récentes, dernier bilan |
| **Workout** | Créer des séances, ajouter des exercices, logger séries/reps/poids, timer intégré |
| **Nutrition** | Journaliser les repas (4 types), suivi calories/macros, suivi eau |
| **Bilan** | Check-in hebdomadaire : poids, mensurations, photo, ressenti (1-5), sommeil |
| **Stats** | Graphiques poids, fréquence séances, calories — Records personnels |

## Structure du projet

```
FitnessApp/
├── App.tsx                          # Point d'entrée
├── src/
│   ├── types/index.ts               # Types TypeScript
│   ├── storage/index.ts             # Persistence (AsyncStorage)
│   ├── theme/index.ts               # Couleurs, espacements, typographie
│   ├── utils/helpers.ts             # Fonctions utilitaires
│   ├── navigation/AppNavigator.tsx  # Navigation
│   └── screens/
│       ├── DashboardScreen.tsx      # Accueil
│       ├── WorkoutListScreen.tsx    # Liste des séances
│       ├── WorkoutSessionScreen.tsx # Séance en cours
│       ├── NutritionScreen.tsx      # Nutrition du jour
│       ├── BodyListScreen.tsx       # Liste des bilans
│       ├── NewCheckinScreen.tsx     # Nouveau bilan / modification
│       ├── TimerScreen.tsx          # Timer & chronomètre
│       └── StatsScreen.tsx          # Statistiques & graphiques
```
