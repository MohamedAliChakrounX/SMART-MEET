# Meeting AI Mobile — Flutter 🚀

Version mobile Flutter de l'application **meeting-ai** (React/Vite).

## Pages

| Route | Page | Description |
|---|---|---|
| `/archive` | Archive Library | Liste des réunions + recherche/filtre |
| `/upload` | Upload | Upload fichier + enregistrement micro |
| `/transcription` | Transcription | Segments speaker-diarisés |
| `/summary` | Refine Summary | Éditeur de résumé + export |
| `/overview` | Overview | Vue d'ensemble avec analytics |
| `/analytics` | Behavioral Analytics | Graphiques (PieChart, BarChart) |

## Installation

### Prérequis
- [Flutter SDK](https://flutter.dev/docs/get-started/install/windows) ≥ 3.0
- Android Studio ou VS Code avec extensions Flutter/Dart
- Émulateur Android ou appareil physique

### Commandes

```bash
# Installer les dépendances
flutter pub get

# Vérifier l'environnement
flutter doctor

# Lancer l'app sur l'émulateur
flutter run

# Build APK debug
flutter build apk --debug
```

## Structure du projet

```
lib/
├── main.dart               # Point d'entrée
├── router.dart             # Navigation (go_router)
├── theme/
│   └── app_theme.dart      # Light/Dark theme
├── providers/
│   └── app_state.dart      # State global (darkMode, audioFile)
├── models/
│   └── models.dart         # Classes de données
├── data/
│   └── mock_data.dart      # Données de démonstration
├── widgets/
│   └── scaffold_with_nav.dart  # BottomNavigationBar shell
└── pages/
    ├── archive_library/
    ├── upload/
    ├── transcription/
    ├── refine_summary/
    ├── overview/
    └── behavioral_analytics/
```

## Dépendances principales

- `go_router` — Navigation
- `provider` — State management
- `fl_chart` — Graphiques (PieChart, BarChart)
- `google_fonts` — Typographie Inter
- `file_picker` — Sélection fichier audio
- `record` — Enregistrement microphone
