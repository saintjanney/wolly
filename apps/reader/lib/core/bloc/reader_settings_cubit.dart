import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wolly_mobile/core/models/reader_settings.dart';

/// Holds the reader's display preferences (theme, font, spacing) and persists
/// them to SharedPreferences. State is the [ReaderSettings] value itself.
class ReaderSettingsCubit extends Cubit<ReaderSettings> {
  static const _keyTheme = 'reader_theme';
  static const _keyFontSize = 'reader_font_size';
  static const _keyLineHeight = 'reader_line_height';
  static const _keyFontFamily = 'reader_font_family';

  ReaderSettingsCubit() : super(const ReaderSettings()) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();

    final themeIndex = prefs.getInt(_keyTheme) ?? 0;
    final fontSizeIndex = prefs.getInt(_keyFontSize) ?? 1;
    final lineHeightIndex = prefs.getInt(_keyLineHeight) ?? 1;
    final fontFamilyIndex = prefs.getInt(_keyFontFamily) ?? 0;

    emit(ReaderSettings(
      theme: ReaderTheme.values[themeIndex.clamp(0, ReaderTheme.values.length - 1)],
      fontSize: ReaderFontSize.values[fontSizeIndex.clamp(0, ReaderFontSize.values.length - 1)],
      lineHeight: ReaderLineHeight.values[lineHeightIndex.clamp(0, ReaderLineHeight.values.length - 1)],
      fontFamily: ReaderFontFamily.values[fontFamilyIndex.clamp(0, ReaderFontFamily.values.length - 1)],
    ));
  }

  Future<void> updateTheme(ReaderTheme theme) async {
    emit(state.copyWith(theme: theme));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyTheme, theme.index);
  }

  Future<void> updateFontSize(ReaderFontSize fontSize) async {
    emit(state.copyWith(fontSize: fontSize));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyFontSize, fontSize.index);
  }

  Future<void> updateLineHeight(ReaderLineHeight lineHeight) async {
    emit(state.copyWith(lineHeight: lineHeight));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyLineHeight, lineHeight.index);
  }

  Future<void> updateFontFamily(ReaderFontFamily fontFamily) async {
    emit(state.copyWith(fontFamily: fontFamily));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyFontFamily, fontFamily.index);
  }

  void increaseFontSize() {
    final idx = state.fontSize.index;
    if (idx < ReaderFontSize.values.length - 1) {
      updateFontSize(ReaderFontSize.values[idx + 1]);
    }
  }

  void decreaseFontSize() {
    final idx = state.fontSize.index;
    if (idx > 0) {
      updateFontSize(ReaderFontSize.values[idx - 1]);
    }
  }
}
