import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wolly_mobile/features/authentication/presentation/screens/email_link_sent_screen.dart';

class OtpLoginScreen extends StatefulWidget {
  const OtpLoginScreen({super.key});

  @override
  State<OtpLoginScreen> createState() => _OtpLoginScreenState();
}

class _OtpLoginScreenState extends State<OtpLoginScreen> {
  final TextEditingController _inputController = TextEditingController();
  final FocusNode _inputFocusNode = FocusNode();
  bool _isLoading = false;
  String _inputType = 'email'; // 'email' or 'phone'
  String _errorMessage = '';

  @override
  void dispose() {
    _inputController.dispose();
    _inputFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 60),
              _buildHeader(),
              const SizedBox(height: 48),
              _buildInputSection(),
              const SizedBox(height: 24),
              _buildErrorSection(),
              const SizedBox(height: 32),
              _buildLoginButton(),
              const SizedBox(height: 24),
              _buildToggleInputType(),
              const Spacer(),
              _buildFooter(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Welcome to Wolly',
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: Colors.grey[800],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Enter your ${_inputType == 'email' ? 'email address' : 'phone number'} to get started',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildInputSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _inputType == 'email' ? 'Email Address' : 'Phone Number',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _inputController,
          focusNode: _inputFocusNode,
          keyboardType: _inputType == 'email'
              ? TextInputType.emailAddress
              : TextInputType.phone,
          inputFormatters: _inputType == 'phone'
              ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9+]'))]
              : null,
          decoration: InputDecoration(
            hintText: _inputType == 'email'
                ? 'Enter your email address'
                : '+1234567890 (include country code)',
            prefixIcon: Icon(
              _inputType == 'email' ? Icons.email : Icons.phone,
              color: Colors.grey[600],
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.blue[700]!, width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
          ),
          onChanged: (value) {
            setState(() {
              _errorMessage = '';
            });
          },
        ),
      ],
    );
  }

  Widget _buildErrorSection() {
    if (_errorMessage.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red[600], size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _errorMessage,
              style: TextStyle(
                color: Colors.red[600],
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginButton() {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _handleLogin,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue[700],
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
        ),
        child: _isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Text(
                _inputType == 'email' ? 'Send Sign-in Link' : 'Send OTP',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Widget _buildToggleInputType() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Or use ${_inputType == 'email' ? 'phone number' : 'email address'}',
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 14,
          ),
        ),
        const SizedBox(width: 8),
        TextButton(
          onPressed: _toggleInputType,
          child: Text(
            _inputType == 'email' ? 'Phone' : 'Email',
            style: TextStyle(
              color: Colors.blue[700],
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        Text(
          'By continuing, you agree to our Terms of Service and Privacy Policy',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.grey[500],
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          _inputType == 'email'
              ? "We'll send a sign-in link to your email"
              : "We'll send a verification code via SMS",
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.grey[500],
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  void _toggleInputType() {
    setState(() {
      _inputType = _inputType == 'email' ? 'phone' : 'email';
      _inputController.clear();
      _errorMessage = '';
    });
    _inputFocusNode.requestFocus();
  }

  void _handleLogin() async {
    final input = _inputController.text.trim();

    if (input.isEmpty) {
      setState(() {
        _errorMessage =
            'Please enter your ${_inputType == 'email' ? 'email address' : 'phone number'}';
      });
      return;
    }

    if (_inputType == 'email' && !_isValidEmail(input)) {
      setState(() {
        _errorMessage = 'Please enter a valid email address';
      });
      return;
    }

    if (_inputType == 'phone' && !_isValidPhone(input)) {
      setState(() {
        _errorMessage =
            'Please enter a valid phone number with country code (e.g. +15551234567)';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      if (_inputType == 'email') {
        await _sendEmailLink(input);
      } else {
        await _sendPhoneOtp(input);
      }
    } on FirebaseAuthException catch (e) {
      setState(() {
        _errorMessage = e.message ?? 'Authentication failed. Please try again.';
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Network error. Please check your connection and try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _sendEmailLink(String email) async {
    final actionCodeSettings = ActionCodeSettings(
      url: 'https://wolly-1133d.firebaseapp.com',
      handleCodeInApp: true,
      androidPackageName: 'com.example.wolly',
      androidInstallApp: true,
      androidMinimumVersion: '21',
      iOSBundleId: 'com.example.wolly',
    );

    await FirebaseAuth.instance.sendSignInLinkToEmail(
      email: email,
      actionCodeSettings: actionCodeSettings,
    );

    // Save email so it can be retrieved when the link is opened
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_email_for_link', email);

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EmailLinkSentScreen(email: email),
        ),
      );
    }
  }

  Future<void> _sendPhoneOtp(String phoneNumber) async {
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      verificationCompleted: (PhoneAuthCredential credential) async {
        // Auto-resolution (Android only) — Firebase signs in automatically
        await FirebaseAuth.instance.signInWithCredential(credential);
      },
      verificationFailed: (FirebaseAuthException e) {
        if (mounted) {
          setState(() {
            _errorMessage = e.message ?? 'Failed to verify phone number. Please try again.';
            _isLoading = false;
          });
        }
      },
      codeSent: (String verificationId, int? resendToken) {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
          Navigator.of(context).pushNamed(
            '/otp_verify',
            arguments: {
              'verificationId': verificationId,
              'phoneNumber': phoneNumber,
            },
          );
        }
      },
      codeAutoRetrievalTimeout: (String verificationId) {},
    );
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  bool _isValidPhone(String phone) {
    // Require E.164 format: + followed by 7-15 digits
    return RegExp(r'^\+\d{7,15}$').hasMatch(phone);
  }
}
