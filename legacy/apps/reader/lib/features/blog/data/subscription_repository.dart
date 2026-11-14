import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import 'package:wolly_mobile/features/blog/domain/models/publication.dart';

/// A subscription tier offered by a publication.
class SubscriptionTier {
  final String id;
  final String name;
  final String description;
  final List<String> benefits;

  /// Minor units (pesewas for GHS).
  final int monthlyPrice;
  final int? annualPrice;
  final String currency;

  const SubscriptionTier({
    required this.id,
    required this.name,
    this.description = '',
    this.benefits = const [],
    required this.monthlyPrice,
    this.annualPrice,
    this.currency = 'GHS',
  });

  factory SubscriptionTier.fromMap(Map<String, dynamic> map, String id) {
    return SubscriptionTier(
      id: id,
      name: map['name'] ?? 'Paid',
      description: map['description'] ?? '',
      benefits:
          (map['benefits'] as List?)?.whereType<String>().toList() ?? const [],
      monthlyPrice: (map['monthlyPrice'] ?? 0) as int,
      annualPrice: map['annualPrice'] as int?,
      currency: map['currency'] ?? 'GHS',
    );
  }

  String priceLabel(int minor) => '$currency ${(minor / 100).toStringAsFixed(2)}';
}

/// What the current reader's relationship to a publication is.
class SubscriptionStatus {
  final bool subscribed;
  final bool isPaid;

  const SubscriptionStatus({this.subscribed = false, this.isPaid = false});
}

class SubscriptionRepository {
  SubscriptionRepository({FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  static const _subscribeEndpoint =
      'https://europe-west2-wolly-1133d.cloudfunctions.net/initializeSubscription';

  String? get _uid => _auth.currentUser?.uid;

  Future<SubscriptionStatus> statusFor(String publicationId) async {
    final uid = _uid;
    if (uid == null) return const SubscriptionStatus();
    try {
      final doc = await _firestore
          .collection('subscriptions')
          .doc('${uid}_$publicationId')
          .get();
      if (!doc.exists) return const SubscriptionStatus();

      final data = doc.data()!;
      // Paid means paid AND not lapsed; the rules apply the same test.
      final end = data['currentPeriodEnd'];
      final active = data['isPaid'] == true &&
          end is Timestamp &&
          end.toDate().isAfter(DateTime.now());
      return SubscriptionStatus(subscribed: true, isPaid: active);
    } catch (_) {
      return const SubscriptionStatus();
    }
  }

  Future<List<SubscriptionTier>> tiersFor(String publicationId) async {
    try {
      final snap = await _firestore
          .collection('publications')
          .doc(publicationId)
          .collection('tiers')
          .get();
      return snap.docs
          .map((d) => SubscriptionTier.fromMap(d.data(), d.id))
          .where((t) => t.monthlyPrice > 0)
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Subscribes for free.
  ///
  /// Written directly because security rules permit a client to create its OWN
  /// free subscription and nothing else. Anything paid is written by the server
  /// after Paystack confirms payment.
  Future<bool> subscribeFree(Publication publication) async {
    final uid = _uid;
    if (uid == null) return false;
    try {
      await _firestore
          .collection('subscriptions')
          .doc('${uid}_${publication.id}')
          .set({
        'userId': uid,
        'publicationId': publication.id,
        'ownerUserId': publication.ownerUserId,
        'status': 'free',
        'isPaid': false,
        'cancelAtPeriodEnd': false,
        'emailOptIn': true,
        'source': 'reader',
        'createdAt': Timestamp.now(),
        'updatedAt': Timestamp.now(),
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Asks the server to start a paid checkout, returning the Paystack URL.
  ///
  /// The amount is never sent from here: the server reads it from the tier.
  Future<String> startPaidCheckout({
    required String publicationId,
    required String tierId,
    required String plan,
  }) async {
    final token = await _auth.currentUser?.getIdToken();
    if (token == null) throw Exception('Please sign in to subscribe.');

    final res = await http.post(
      Uri.parse(_subscribeEndpoint),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'data': {
          'publicationId': publicationId,
          'tierId': tierId,
          'plan': plan,
        }
      }),
    );

    final decoded = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      final error = decoded['error'];
      final message = error is Map<String, dynamic> ? error['message'] : null;
      throw Exception((message as String?) ?? 'Could not start checkout.');
    }

    final url =
        (decoded['result'] as Map<String, dynamic>?)?['authorizationUrl'] as String?;
    if (url == null) throw Exception('Could not start checkout.');
    return url;
  }
}
