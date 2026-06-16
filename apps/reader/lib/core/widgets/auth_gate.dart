import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly_mobile/features/authentication/domain/auth_state.dart';
import 'package:wolly_mobile/features/authentication/presentation/bloc/auth_bloc.dart';
import 'package:wolly_mobile/features/authentication/presentation/screens/otp_login_screen.dart';
import 'package:wolly_mobile/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'main_navigation.dart';

/// Root widget that routes based on Firebase auth state.
/// - Loading  → splash/spinner
/// - Unauthenticated → OtpLoginScreen
/// - Authenticated, no genre_prefs → OnboardingScreen
/// - Authenticated, prefs set → MainNavigation
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        switch (state.status) {
          case AuthStatus.initial:
            return const _Splash();

          case AuthStatus.unauthenticated:
            return const OtpLoginScreen();

          case AuthStatus.authenticated:
            return const _OnboardingCheck();
        }
      },
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.menu_book_rounded, size: 64, color: Color(0xFF667EEA)),
            SizedBox(height: 16),
            CircularProgressIndicator(
              color: Color(0xFF667EEA),
              strokeWidth: 2,
            ),
          ],
        ),
      ),
    );
  }
}

/// Checks Firestore for genre_prefs; shows onboarding if missing.
class _OnboardingCheck extends StatefulWidget {
  const _OnboardingCheck();

  @override
  State<_OnboardingCheck> createState() => _OnboardingCheckState();
}

class _OnboardingCheckState extends State<_OnboardingCheck> {
  bool _checking = true;
  bool _needsOnboarding = false;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      setState(() { _checking = false; _needsOnboarding = false; });
      return;
    }
    try {
      final doc = await FirebaseFirestore.instance.collection('users').doc(uid).get();
      final data = doc.data();
      final prefs = data?['genre_prefs'];
      final completed = data?['onboardingCompleted'] == true;
      final hasPrefs = prefs is List && (prefs as List).isNotEmpty;
      setState(() {
        _needsOnboarding = !completed && !hasPrefs;
        _checking = false;
      });
    } catch (_) {
      setState(() { _checking = false; _needsOnboarding = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) return const _Splash();
    if (_needsOnboarding) return const OnboardingScreen();
    return const MainNavigation();
  }
}
