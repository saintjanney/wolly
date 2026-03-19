import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wolly_mobile/core/models/reader_settings.dart';

class ReaderSettingsProvider extends ChangeNotifier {
  static const _keyTheme = 'reader_theme';
  static const _keyFontSize = 'reader_font_size';
  static const _keyLineHeight = 'reader_line_height';
  static const _keyFontFamily = 'reader_font_family';

  ReaderSettings _settings = const ReaderSettings();
  ReaderSettings get settings => _settings;

  ReaderSettingsProvider() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();

    final themeIndex = prefs.getInt(_keyTheme) ?? 0;
    final fontSizeIndex = prefs.getInt(_keyFontSize) ?? 1;
    final lineHeightIndex = prefs.getInt(_keyLineHeight) ?? 1;
    final fontFamilyIndex = prefs.getInt(_keyFontFamily) ?? 0;

    _settings = ReaderSettings(
      theme: ReaderTheme.values[themeIndex.clamp(0, ReaderTheme.values.length - 1)],
      fontSize: ReaderFontSize.values[fontSizeIndex.clamp(0, ReaderFontSize.values.length - 1)],
      lineHeight: ReaderLineHeight.values[lineHeightIndex.clamp(0, ReaderLineHeight.values.length - 1)],
      fontFamily: ReaderFontFamily.values[fontFamilyIndex.clamp(0, ReaderFontFamily.values.length - 1)],
    );
    notifyListeners();
  }

  Future<void> updateTheme(ReaderTheme theme) async {
    _settings = _settings.copyWith(theme: theme);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyTheme, theme.index);
  }

  Future<void> updateFontSize(ReaderFontSize fontSize) async {
    _settings = _settings.copyWith(fontSize: fontSize);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyFontSize, fontSize.index);
  }

  Future<void> updateLineHeight(ReaderLineHeight lineHeight) async {
    _settings = _settings.copyWith(lineHeight: lineHeight);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyLineHeight, lineHeight.index);
  }

  Future<void> updateFontFamily(ReaderFontFamily fontFamily) async {
    _settings = _settings.copyWith(fontFamily: fontFamily);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyFontFamily, fontFamily.index);
  }

  void increaseFontSize() {
    final idx = _settings.fontSize.index;
    if (idx < ReaderFontSize.values.length - 1) {
      updateFontSize(ReaderFontSize.values[idx + 1]);
    }
  }

  void decreaseFontSize() {
    final idx = _settings.fontSize.index;
    if (idx > 0) {
      updateFontSize(ReaderFontSize.values[idx - 1]);
    }
  }
}
