# Reader mobile module

Independent Flutter application. Active source has no cloud SDK. Original reader screens, BLoC and rendering behavior are retained at `../../legacy/apps/reader` as migration reference; the active app currently verifies capability connectivity only. Port each feature behind domain repository interfaces and `lib/core/api/`, using the Go contract and coordinated DTO verification.

```
flutter pub get
flutter test
flutter run --dart-define=WOLLY_API_ORIGIN=http://10.0.2.2:8080
```

Start `make api` at the repository root. `10.0.2.2` is the Android emulator's host alias; a physical device needs a reachable LAN/HTTPS origin and API binding. Debug Android permits local HTTP; release connections should use HTTPS. iOS generated platform scaffolding is present, but no iOS distribution/device acceptance is claimed. Browser consumption is the separate `apps/storefront` module; this reader uses native HTTP and is not currently a Flutter web build.

Feature folders should contain domain/repository contracts, API adapters, and presentation/BLoC; API responses are wire DTOs, never database documents. Authentication/secure storage, profile sessions, ebook/audio readers and offline behavior remain roadmap work. The current client validates the executable capability wire contract; future typed client generation is a prerequisite to adding business DTOs.

Native application IDs remain `com.example.wolly` for continuity. Version/build numbers and production signing must be checked against the actual release inventory before distribution; no production/debug-key release signing is configured here. The new scaffolding does not migrate old device cache/auth data automatically.
