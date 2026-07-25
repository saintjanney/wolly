import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

/// A checkout that has been initialised server-side.
class CheckoutSession {
  /// The Paystack page to open.
  final String authorizationUrl;

  /// The server-generated reference. Verification is done against this, and the
  /// server has already stored it on a `pending` purchase document.
  final String reference;

  const CheckoutSession({
    required this.authorizationUrl,
    required this.reference,
  });
}

/// Thrown when the server refuses to start or verify a checkout. The message is
/// the server's own, which is written for the reader (already purchased, book
/// not published, free book, and so on).
class PaystackError implements Exception {
  final String message;
  const PaystackError(this.message);
  @override
  String toString() => message;
}

/// Paystack checkout, driven entirely by the server.
///
/// The client never decides that a payment happened. It used to: the old flow
/// built a `checkout.paystack.com` URL locally, and the caller wrote a purchase
/// document as soon as the browser opened, so merely launching checkout granted
/// ownership. Now:
///
///   1. [startCheckout] asks the server to initialise a transaction. The server
///      creates the purchase document as `pending` and returns an authorization
///      URL plus its own reference.
///   2. The caller opens that URL.
///   3. [verifyPayment] asks the server to confirm the transaction with
///      Paystack. Only the server may promote the purchase to `completed`, and
///      security rules deny every client write to `purchases`.
///
/// The functions live in `services/payments` and hold the Paystack secret key;
/// it is never in the app.
class PaystackService {
  PaystackService._();

  static const _base = 'https://us-central1-wolly-1133d.cloudfunctions.net';

  static Future<String?> _idToken() async {
    final user = FirebaseAuth.instance.currentUser;
    return user?.getIdToken();
  }

  static Future<Map<String, dynamic>> _post(
    String fn,
    Map<String, dynamic> body,
  ) async {
    final token = await _idToken();
    if (token == null) throw const PaystackError('Please sign in to buy books.');

    final res = await http.post(
      Uri.parse('$_base/$fn'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    Map<String, dynamic> decoded;
    try {
      decoded = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      throw PaystackError('Unexpected response from the server (${res.statusCode}).');
    }

    if (res.statusCode != 200) {
      // The functions report their own reasons; prefer them over a generic
      // message so the reader learns what actually went wrong.
      throw PaystackError(
        (decoded['error'] as String?) ?? 'Request failed (${res.statusCode}).',
      );
    }
    return decoded;
  }

  /// Asks the server to start a checkout. Throws [PaystackError] on refusal.
  static Future<CheckoutSession> startCheckout({required String bookId}) async {
    final data = await _post('initializePaystackCheckout', {'bookId': bookId});
    final url = data['authorizationUrl'] as String?;
    final reference = data['reference'] as String?;
    if (url == null || reference == null) {
      throw const PaystackError('The server did not return a checkout link.');
    }
    return CheckoutSession(authorizationUrl: url, reference: reference);
  }

  /// Opens the Paystack page. Returns whether the browser actually opened,
  /// which says nothing about payment.
  static Future<bool> openCheckout(CheckoutSession session) async {
    try {
      return await launchUrl(
        Uri.parse(session.authorizationUrl),
        mode: LaunchMode.externalApplication,
      );
    } catch (_) {
      return false;
    }
  }

  /// Asks the server whether the transaction actually completed.
  ///
  /// Returns true only when the server has verified the payment with Paystack
  /// and written `status: 'completed'`. A payment still in progress returns
  /// false rather than throwing, so the caller can simply ask again.
  static Future<bool> verifyPayment({
    required String bookId,
    required String reference,
  }) async {
    try {
      final data = await _post('verifyPaystackPayment', {
        'bookId': bookId,
        'reference': reference,
      });
      return data['success'] == true;
    } on PaystackError {
      // 402 (not completed) and similar arrive here. Not an error worth
      // surfacing: the reader may not have finished paying yet.
      return false;
    }
  }
}
