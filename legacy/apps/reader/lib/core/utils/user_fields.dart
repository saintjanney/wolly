/// Helpers for reading the shared `users` document.
///
/// The reader and the creator-hub write the same concepts under different keys
/// (see `WollyUser` in `@wolly/schema` and the "known divergence" section of
/// SCHEMA.md). Rather than repeat the fallback chain at every call site, read
/// user fields through these helpers.
library;

/// Genre document ids the user is interested in.
///
/// The reader writes `genre_prefs`; the creator-hub writes `selectedGenres`.
/// They mean the same thing, so a profile created by either app resolves here.
/// Without this fallback a user who onboarded in the creator-hub arrives in the
/// reader with no interests and is sent back through onboarding.
List<String> genrePrefsFrom(Map<String, dynamic>? data) {
  if (data == null) return const [];
  for (final key in const ['genre_prefs', 'selectedGenres']) {
    final value = data[key];
    if (value is List && value.isNotEmpty) {
      return value.whereType<String>().toList();
    }
  }
  return const [];
}

/// Whether the user has finished onboarding in either app.
bool hasCompletedOnboarding(Map<String, dynamic>? data) {
  if (data == null) return false;
  return data['onboardingCompleted'] == true || genrePrefsFrom(data).isNotEmpty;
}
