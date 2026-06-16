import 'package:flutter/material.dart';

enum ReaderTheme { light, sepia, dark }

enum ReaderFontSize { small, medium, large, xlarge }

enum ReaderLineHeight { compact, normal, relaxed }

enum ReaderFontFamily { sansSerif, serif }

class ReaderSettings {
  final ReaderTheme theme;
  final ReaderFontSize fontSize;
  final ReaderLineHeight lineHeight;
  final ReaderFontFamily fontFamily;

  const ReaderSettings({
    this.theme = ReaderTheme.light,
    this.fontSize = ReaderFontSize.medium,
    this.lineHeight = ReaderLineHeight.normal,
    this.fontFamily = ReaderFontFamily.sansSerif,
  });

  ReaderSettings copyWith({
    ReaderTheme? theme,
    ReaderFontSize? fontSize,
    ReaderLineHeight? lineHeight,
    ReaderFontFamily? fontFamily,
  }) {
    return ReaderSettings(
      theme: theme ?? this.theme,
      fontSize: fontSize ?? this.fontSize,
      lineHeight: lineHeight ?? this.lineHeight,
      fontFamily: fontFamily ?? this.fontFamily,
    );
  }

  // Resolved values
  double get fontSizePt {
    switch (fontSize) {
      case ReaderFontSize.small:
        return 14;
      case ReaderFontSize.medium:
        return 16;
      case ReaderFontSize.large:
        return 18;
      case ReaderFontSize.xlarge:
        return 22;
    }
  }

  double get lineHeightMultiplier {
    switch (lineHeight) {
      case ReaderLineHeight.compact:
        return 1.2;
      case ReaderLineHeight.normal:
        return 1.5;
      case ReaderLineHeight.relaxed:
        return 1.8;
    }
  }

  String get fontFamilyName {
    switch (fontFamily) {
      case ReaderFontFamily.sansSerif:
        return 'Roboto';
      case ReaderFontFamily.serif:
        return 'serif';
    }
  }

  Color get backgroundColor {
    switch (theme) {
      case ReaderTheme.light:
        return const Color(0xFFFFFFFF);
      case ReaderTheme.sepia:
        return const Color(0xFFF5E6C8);
      case ReaderTheme.dark:
        return const Color(0xFF1A1A2E);
    }
  }

  Color get textColor {
    switch (theme) {
      case ReaderTheme.light:
        return const Color(0xFF1A1A1A);
      case ReaderTheme.sepia:
        return const Color(0xFF3B2A1A);
      case ReaderTheme.dark:
        return const Color(0xFFE8E8E8);
    }
  }

  Color get appBarColor {
    switch (theme) {
      case ReaderTheme.light:
        return const Color(0xFFF8F8F8);
      case ReaderTheme.sepia:
        return const Color(0xFFEDD8B0);
      case ReaderTheme.dark:
        return const Color(0xFF121222);
    }
  }

  Color get appBarTextColor {
    switch (theme) {
      case ReaderTheme.light:
        return const Color(0xFF1A1A1A);
      case ReaderTheme.sepia:
        return const Color(0xFF3B2A1A);
      case ReaderTheme.dark:
        return const Color(0xFFE8E8E8);
    }
  }

  Brightness get statusBarBrightness {
    return theme == ReaderTheme.dark ? Brightness.dark : Brightness.light;
  }
}
