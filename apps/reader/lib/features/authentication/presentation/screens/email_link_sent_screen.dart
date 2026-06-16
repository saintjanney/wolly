import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class EmailLinkSentScreen extends StatefulWidget {
  final String email;

  const EmailLinkSentScreen({super.key, required this.email});

  @override
  State<EmailLinkSentScreen> createState() => _EmailLinkSentScreenState();
}

class _EmailLinkSentScreenState extends State<EmailLinkSentScreen> {
  late final AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSub;
  bool _isVerifying = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _appLinks = AppLinks();
    _checkInitialLink();
    _listenForLinks();
  }

  Future<void> _checkInitialLink() async {
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        await _handleIncomingLink(initialUri.toString());
      }
    } catch (_) {}
  }

  void _listenForLinks() {
    _linkSub = _appLinks.uriLinkStream.listen(
      (uri) => _handleIncomingLink(uri.toString()),
      onError: (_) {},
    );
  }

  Future<void> _handleIncomingLink(String link) async {
    if (!FirebaseAuth.instance.isSignInWithEmailLink(link)) return;

    setState(() {
      _isVerifying = true;
      _errorMessage = '';
    });

    try {
      String email = widget.email;

      // Fallback: read from SharedPreferences if email was lost (e.g. app restarted)
      if (email.isEmpty) {
        final prefs = await SharedPreferences.getInstance();
        email = prefs.getString('auth_email_for_link') ?? '';
      }

      if (email.isEmpty) {
        setState(() {
          _errorMessage =
              'Could not retrieve your email. Please go back and try again.';
          _isVerifying = false;
        });
        return;
      }

      final userCredential = await FirebaseAuth.instance.signInWithEmailLink(
        email: email,
        emailLink: link,
      );

      // Clean up stored email
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_email_for_link');

      final uid = userCredential.user?.uid;
      if (uid != null && mounted) {
        final doc = await FirebaseFirestore.instance
            .collection('users')
            .doc(uid)
            .get();

        if (doc.exists) {
          Navigator.pushReplacementNamed(context, '/');
        } else {
          Navigator.pushReplacementNamed(
            context,
            '/account_creation',
            arguments: {'email': email, 'alreadyAuthenticated': true},
          );
        }
      }
    } on FirebaseAuthException catch (e) {
      setState(() {
        _errorMessage =
            e.message ?? 'Sign-in failed. Please request a new link.';
        _isVerifying = false;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'An error occurred. Please request a new link.';
        _isVerifying = false;
      });
    }
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: BackButton(color: Colors.grey[800]),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              Icon(Icons.mark_email_read_outlined,
                  size: 80, color: Colors.blue[700]),
              const SizedBox(height: 32),
              Text(
                'Check your email',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'We sent a sign-in link to',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: Colors.grey[600]),
              ),
              const SizedBox(height: 4),
              Text(
                widget.email,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Tap the link in the email to sign in. The link will open this app automatically.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              ),
              const SizedBox(height: 32),
              if (_isVerifying)
                const Column(
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 12),
                    Text('Signing you in…'),
                  ],
                ),
              if (_errorMessage.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red[200]!),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline,
                          color: Colors.red[600], size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage,
                          style: TextStyle(
                              color: Colors.red[600], fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
