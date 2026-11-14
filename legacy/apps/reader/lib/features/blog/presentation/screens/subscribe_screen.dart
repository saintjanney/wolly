import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:wolly_mobile/features/blog/data/blog_repository.dart';
import 'package:wolly_mobile/features/blog/data/subscription_repository.dart';
import 'package:wolly_mobile/features/blog/domain/models/publication.dart';

/// Subscribe to a publication, free or paid.
///
/// Free subscribing writes straight to Firestore under owner-scoped rules. Paid
/// subscribing hands off to Paystack in the browser; the server grants access
/// only when Paystack confirms payment, so nothing here can unlock content.
class SubscribeScreen extends StatefulWidget {
  final String publicationId;

  const SubscribeScreen({super.key, required this.publicationId});

  @override
  State<SubscribeScreen> createState() => _SubscribeScreenState();
}

class _SubscribeScreenState extends State<SubscribeScreen>
    with WidgetsBindingObserver {
  final _blogRepo = BlogRepository();
  final _subRepo = SubscriptionRepository();

  Publication? _publication;
  List<SubscriptionTier> _tiers = const [];
  SubscriptionStatus _status = const SubscriptionStatus();
  bool _loading = true;
  String? _busy;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Re-check on resume: the reader may have just paid in the browser, and the
  /// webhook grants access out-of-band.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshStatus();
  }

  Future<void> _load() async {
    final publication = await _blogRepo.fetchPublication(widget.publicationId);
    final tiers = await _subRepo.tiersFor(widget.publicationId);
    final status = await _subRepo.statusFor(widget.publicationId);
    if (!mounted) return;
    setState(() {
      _publication = publication;
      _tiers = tiers;
      _status = status;
      _loading = false;
    });
  }

  Future<void> _refreshStatus() async {
    final status = await _subRepo.statusFor(widget.publicationId);
    if (mounted) setState(() => _status = status);
  }

  Future<void> _subscribeFree() async {
    final publication = _publication;
    if (publication == null) return;
    setState(() => _busy = 'free');
    final ok = await _subRepo.subscribeFree(publication);
    if (!mounted) return;
    setState(() => _busy = null);
    if (ok) {
      await _refreshStatus();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Subscribed to ${publication.name}.')),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not subscribe. Please try again.')),
      );
    }
  }

  Future<void> _subscribePaid(SubscriptionTier tier, String plan) async {
    setState(() => _busy = '${tier.id}-$plan');
    try {
      final url = await _subRepo.startPaidCheckout(
        publicationId: widget.publicationId,
        tierId: tier.id,
        plan: plan,
      );
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      // Access is granted by the webhook, so simply re-check on return.
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final publication = _publication;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        title: const Text('Subscribe'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : publication == null
              ? const Center(child: Text('Publication not found.'))
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Text(
                      publication.name,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (publication.tagline != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        publication.tagline!,
                        style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                      ),
                    ],
                    const SizedBox(height: 24),

                    if (_status.isPaid)
                      _Banner(
                        text: 'You have full access to ${publication.name}.',
                        color: Colors.green,
                      )
                    else ...[
                      _TierCard(
                        title: 'Free',
                        subtitle: 'Every free post, as soon as it is published.',
                        actionLabel: _status.subscribed
                            ? 'Subscribed'
                            : (_busy == 'free' ? 'Subscribing…' : 'Subscribe free'),
                        onPressed: _status.subscribed || _busy != null
                            ? null
                            : _subscribeFree,
                        outlined: true,
                      ),
                      for (final tier in _tiers) ...[
                        const SizedBox(height: 12),
                        _TierCard(
                          title: tier.name,
                          subtitle: tier.description.isNotEmpty
                              ? tier.description
                              : 'Unlock every paid post.',
                          benefits: tier.benefits,
                          actionLabel: _busy == '${tier.id}-monthly'
                              ? 'Opening…'
                              : '${tier.priceLabel(tier.monthlyPrice)} / month',
                          onPressed: _busy != null
                              ? null
                              : () => _subscribePaid(tier, 'monthly'),
                          secondaryLabel: tier.annualPrice != null
                              ? (_busy == '${tier.id}-annual'
                                  ? 'Opening…'
                                  : '${tier.priceLabel(tier.annualPrice!)} / year')
                              : null,
                          onSecondary: tier.annualPrice != null && _busy == null
                              ? () => _subscribePaid(tier, 'annual')
                              : null,
                          // Mobile money cannot hold a renewing mandate, so the
                          // yearly option is the only route for many readers.
                          footnote: tier.annualPrice != null
                              ? 'Paying by mobile money? Choose yearly: it is charged once instead of renewing.'
                              : null,
                        ),
                      ],
                    ],
                  ],
                ),
    );
  }
}

class _Banner extends StatelessWidget {
  final String text;
  final MaterialColor color;

  const _Banner({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color[200]!),
      ),
      child: Text(text, style: TextStyle(color: color[900], fontWeight: FontWeight.w600)),
    );
  }
}

class _TierCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<String> benefits;
  final String actionLabel;
  final VoidCallback? onPressed;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final String? footnote;
  final bool outlined;

  const _TierCard({
    required this.title,
    required this.subtitle,
    this.benefits = const [],
    required this.actionLabel,
    this.onPressed,
    this.secondaryLabel,
    this.onSecondary,
    this.footnote,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: outlined ? Colors.grey[300]! : Colors.indigo[300]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(subtitle, style: TextStyle(color: Colors.grey[600])),
          if (benefits.isNotEmpty) ...[
            const SizedBox(height: 10),
            for (final b in benefits)
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text('• $b', style: const TextStyle(fontSize: 14)),
              ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: outlined
                ? OutlinedButton(onPressed: onPressed, child: Text(actionLabel))
                : ElevatedButton(
                    onPressed: onPressed,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigo[600],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(actionLabel),
                  ),
          ),
          if (secondaryLabel != null) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onSecondary,
                child: Text(secondaryLabel!),
              ),
            ),
          ],
          if (footnote != null) ...[
            const SizedBox(height: 10),
            Text(
              footnote!,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ],
      ),
    );
  }
}
