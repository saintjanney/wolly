# Wolly

A Flutter application for reading books.

## Project Architecture

This project follows a feature-first architecture with BLoC pattern for state management.

### Directory Structure

```
lib/
├── core/                  # Core functionality used across features
│   ├── services/          # Common services
│   ├── theme/             # App theme
│   ├── utils/             # Utility functions
│   └── widgets/           # Shared widgets
│
├── features/              # Features of the application
│   ├── authentication/    # Authentication feature
│   │   ├── data/          # Data layer (repositories, data sources)
│   │   ├── domain/        # Domain layer (entities, events, states)
│   │   └── presentation/  # Presentation layer
│   │       ├── bloc/      # BLoC classes
│   │       ├── screens/   # UI screens
│   │       └── widgets/   # Feature-specific widgets
│   │
│   ├── dashboard/         # Dashboard feature
│   ├── library/           # Library feature
│   └── profile/           # Profile feature
│
├── firebase_options.dart  # Firebase configuration
└── main.dart              # Entry point
```

### State Management

This project uses the BLoC (Business Logic Component) pattern for state management. Each feature has its own BLoC that handles the business logic and state for that feature.

### Key Components

- **Repository**: Handles data operations and abstracts the data source
- **BLoC**: Manages state and business logic
- **Events**: Represent actions that can be performed
- **States**: Represent the current state of the application
- **Screens**: UI components that display data and handle user interactions

## Getting Started

1. Clone the repository
2. Run `flutter pub get` to install dependencies
3. Run `flutter run` to start the application
