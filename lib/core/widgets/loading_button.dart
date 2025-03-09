import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';

/// A button that shows a loading indicator when loading is true
class LoadingButton extends StatelessWidget {
  /// The text to display on the button
  final String text;
  
  /// Whether the button is in a loading state
  final bool isLoading;
  
  /// The callback when the button is pressed
  final VoidCallback onPressed;
  
  /// The background color of the button
  final Color? backgroundColor;
  
  /// The text color of the button
  final Color? textColor;
  
  /// The width of the button
  final double? width;
  
  /// The height of the button
  final double? height;

  /// Creates a loading button
  const LoadingButton({
    super.key,
    required this.text,
    required this.isLoading,
    required this.onPressed,
    this.backgroundColor,
    this.textColor,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width ?? double.infinity,
      height: height ?? 50,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor,
          foregroundColor: textColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        child: isLoading
            ? SizedBox(
                height: 20.rs,
                width: 20.rs,
                child: CircularProgressIndicator.adaptive(
                  valueColor: AlwaysStoppedAnimation<Color>(
                    textColor ?? Colors.white,
                  ),
                ),
              )
            : Text(
                text,
                style: TextStyle(
                  fontSize: 16.rt,
                ),
              ),
      ),
    );
  }
} 