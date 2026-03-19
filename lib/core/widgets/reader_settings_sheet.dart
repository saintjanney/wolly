import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wolly_mobile/core/models/reader_settings.dart';
import 'package:wolly_mobile/core/providers/reader_settings_provider.dart';

void showReaderSettingsSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (ctx) => const _ReaderSettingsSheet(),
  );
}

class _ReaderSettingsSheet extends StatelessWidget {
  const _ReaderSettingsSheet();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ReaderSettingsProvider>();
    final settings = provider.settings;

    return Container(
      decoration: BoxDecoration(
        color: settings.appBarColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.only(
        top: 16,
        left: 24,
        right: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: settings.textColor.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Title
          Text(
            'Reading Settings',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: settings.textColor,
            ),
          ),
          const SizedBox(height: 24),

          // Theme section
          _SectionLabel(label: 'Theme', textColor: settings.textColor),
          const SizedBox(height: 12),
          Row(
            children: [
              _ThemeOption(
                label: 'Light',
                bg: const Color(0xFFFFFFFF),
                textColor: const Color(0xFF1A1A1A),
                isSelected: settings.theme == ReaderTheme.light,
                onTap: () => context.read<ReaderSettingsProvider>().updateTheme(ReaderTheme.light),
              ),
              const SizedBox(width: 12),
              _ThemeOption(
                label: 'Sepia',
                bg: const Color(0xFFF5E6C8),
                textColor: const Color(0xFF3B2A1A),
                isSelected: settings.theme == ReaderTheme.sepia,
                onTap: () => context.read<ReaderSettingsProvider>().updateTheme(ReaderTheme.sepia),
              ),
              const SizedBox(width: 12),
              _ThemeOption(
                label: 'Dark',
                bg: const Color(0xFF1A1A2E),
                textColor: const Color(0xFFE8E8E8),
                isSelected: settings.theme == ReaderTheme.dark,
                onTap: () => context.read<ReaderSettingsProvider>().updateTheme(ReaderTheme.dark),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Font Size section
          _SectionLabel(label: 'Font Size', textColor: settings.textColor),
          const SizedBox(height: 12),
          Row(
            children: [
              _IconButton(
                icon: Icons.text_decrease,
                onTap: () => context.read<ReaderSettingsProvider>().decreaseFontSize(),
                textColor: settings.textColor,
                enabled: settings.fontSize.index > 0,
              ),
              Expanded(
                child: Center(
                  child: Text(
                    '${settings.fontSizePt.toInt()} pt',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: settings.textColor,
                    ),
                  ),
                ),
              ),
              _IconButton(
                icon: Icons.text_increase,
                onTap: () => context.read<ReaderSettingsProvider>().increaseFontSize(),
                textColor: settings.textColor,
                enabled: settings.fontSize.index < ReaderFontSize.values.length - 1,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Font Family section
          _SectionLabel(label: 'Font', textColor: settings.textColor),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _ToggleChip(
                  label: 'Sans-serif',
                  sublabel: 'Aa',
                  fontFamily: 'Roboto',
                  isSelected: settings.fontFamily == ReaderFontFamily.sansSerif,
                  textColor: settings.textColor,
                  onTap: () => context.read<ReaderSettingsProvider>().updateFontFamily(ReaderFontFamily.sansSerif),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ToggleChip(
                  label: 'Serif',
                  sublabel: 'Aa',
                  fontFamily: 'serif',
                  isSelected: settings.fontFamily == ReaderFontFamily.serif,
                  textColor: settings.textColor,
                  onTap: () => context.read<ReaderSettingsProvider>().updateFontFamily(ReaderFontFamily.serif),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Line Height section
          _SectionLabel(label: 'Line Spacing', textColor: settings.textColor),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _LineHeightChip(
                  label: 'Compact',
                  icon: Icons.format_line_spacing,
                  isSelected: settings.lineHeight == ReaderLineHeight.compact,
                  textColor: settings.textColor,
                  onTap: () => context.read<ReaderSettingsProvider>().updateLineHeight(ReaderLineHeight.compact),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _LineHeightChip(
                  label: 'Normal',
                  icon: Icons.format_line_spacing,
                  isSelected: settings.lineHeight == ReaderLineHeight.normal,
                  textColor: settings.textColor,
                  onTap: () => context.read<ReaderSettingsProvider>().updateLineHeight(ReaderLineHeight.normal),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _LineHeightChip(
                  label: 'Relaxed',
                  icon: Icons.format_line_spacing,
                  isSelected: settings.lineHeight == ReaderLineHeight.relaxed,
                  textColor: settings.textColor,
                  onTap: () => context.read<ReaderSettingsProvider>().updateLineHeight(ReaderLineHeight.relaxed),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  final Color textColor;
  const _SectionLabel({required this.label, required this.textColor});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.8,
        color: textColor.withOpacity(0.6),
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  final String label;
  final Color bg;
  final Color textColor;
  final bool isSelected;
  final VoidCallback onTap;

  const _ThemeOption({
    required this.label,
    required this.bg,
    required this.textColor,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          height: 64,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? const Color(0xFF6366F1) : Colors.grey.withOpacity(0.3),
              width: isSelected ? 2.5 : 1,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: const Color(0xFF6366F1).withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
                : null,
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: textColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              if (isSelected)
                Positioned(
                  top: 6,
                  right: 8,
                  child: Container(
                    width: 16,
                    height: 16,
                    decoration: const BoxDecoration(
                      color: Color(0xFF6366F1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check, size: 10, color: Colors.white),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color textColor;
  final bool enabled;

  const _IconButton({
    required this.icon,
    required this.onTap,
    required this.textColor,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: textColor.withOpacity(enabled ? 0.3 : 0.1)),
        ),
        child: Icon(icon, color: textColor.withOpacity(enabled ? 1.0 : 0.3), size: 20),
      ),
    );
  }
}

class _ToggleChip extends StatelessWidget {
  final String label;
  final String sublabel;
  final String fontFamily;
  final bool isSelected;
  final Color textColor;
  final VoidCallback onTap;

  const _ToggleChip({
    required this.label,
    required this.sublabel,
    required this.fontFamily,
    required this.isSelected,
    required this.textColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 56,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF6366F1) : textColor.withOpacity(0.2),
            width: isSelected ? 2 : 1,
          ),
          color: isSelected ? const Color(0xFF6366F1).withOpacity(0.1) : Colors.transparent,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              sublabel,
              style: TextStyle(
                fontFamily: fontFamily,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isSelected ? const Color(0xFF6366F1) : textColor,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: isSelected ? const Color(0xFF6366F1) : textColor.withOpacity(0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LineHeightChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final Color textColor;
  final VoidCallback onTap;

  const _LineHeightChip({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.textColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 48,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF6366F1) : textColor.withOpacity(0.2),
            width: isSelected ? 2 : 1,
          ),
          color: isSelected ? const Color(0xFF6366F1).withOpacity(0.1) : Colors.transparent,
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isSelected ? const Color(0xFF6366F1) : textColor.withOpacity(0.7),
            ),
          ),
        ),
      ),
    );
  }
}
