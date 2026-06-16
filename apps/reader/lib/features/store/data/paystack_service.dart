import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:wolly_mobile/core/config/app_config.dart';

class PaystackService {
  PaystackService._();

  static Future<void> init() async {
    // No-op: URL-based checkout requires no SDK init
  }

  /// Opens Paystack checkout in the browser.
  /// [amountInPesewas] e.g. GHS 9.99 → 999.
  /// Returns true if the URL was launched successfully.
  static Future<bool> checkout(
    BuildContext context, {
    required String email,
    required int amountInPesewas,
    required String reference,
    String? bookTitle,
  }) async {
    final uri = Uri.https('checkout.paystack.com', '/', {
      'key': AppConfig.paystackPublicKey,
      'email': email,
      'amount': amountInPesewas.toString(),
      'currency': AppConfig.paystackCurrency,
      'ref': reference,
      if (bookTitle != null) 'label': bookTitle,
    });

    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }

  static String generateReference(String bookId) {
    final ts = DateTime.now().millisecondsSinceEpoch;
    return 'WOLLY_${bookId}_\$ts';
  }
}
