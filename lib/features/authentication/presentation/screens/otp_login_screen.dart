import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';

class OtpLoginScreen extends StatefulWidget {
  const OtpLoginScreen({super.key});

  @override
  State<OtpLoginScreen> createState() => _OtpLoginScreenState();
}

class _OtpLoginScreenState extends State<OtpLoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final FocusNode _inputFocusNode = FocusNode();
  bool _isLoading = false;
  String _inputType = 'email'; // 'email' or 'phone'
  String _errorMessage = '';
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _inputFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 60),
              _buildHeader(),
              const SizedBox(height: 48),
              if (_inputType == 'email') ...[
                _buildEmailSection(),
                const SizedBox(height: 16),
                _buildPasswordSection(),
              ] else
                _buildPhoneSection(),
              const SizedBox(height: 24),
              _buildErrorSection(),
              const SizedBox(height: 32),
              _buildLoginButton(),
              const SizedBox(height: 24),
              _buildToggleInputType(),
              const SizedBox(height: 40),
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
          _inputType == 'email'
              ? 'Sign in with your email and password'
              : 'Enter your phone number to get started',
          style: TextStyle(fontSize: 16, color: Colors.grey[600]),
        ),
      ],
    );
  }

  Widget _buildEmailSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Email Address',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700])),
        const SizedBox(height: 8),
        TextField(
          controller: _emailController,
          focusNode: _inputFocusNode,
          keyboardType: TextInputType.emailAddress,
          decoration: _inputDecoration(
            hint: 'Enter your email address',
            icon: Icons.email,
          ),
          onChanged: (_) => setState(() => _errorMessage = ''),
        ),
      ],
    );
  }

  Widget _buildPasswordSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Password',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700])),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          decoration: _inputDecoration(
            hint: 'Enter your password',
            icon: Icons.lock,
          ).copyWith(
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                color: Colors.grey[600],
              ),
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          onChanged: (_) => setState(() => _errorMessage = ''),
          onSubmitted: (_) => _handleLogin(),
        ),
      ],
    );
  }

  Widget _buildPhoneSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Phone Number',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700])),
        const SizedBox(height: 8),
        TextField(
          controller: _phoneController,
          focusNode: _inputFocusNode,
          keyboardType: TextInputType.phone,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9+]'))
          ],
          decoration: _inputDecoration(
            hint: '+1234567890 (include country code)',
            icon: Icons.phone,
          ),
          onChanged: (_) => setState(() => _errorMessage = ''),
        ),
      ],
    );
  }

  InputDecoration _inputDecoration(
      {required String hint, required IconData icon}) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, color: Colors.grey[600]),
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
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
            child: Text(_errorMessage,
                style: TextStyle(color: Colors.red[600], fontSize: 14)),
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
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
        child: _isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(Colors.white)),
              )
            : Text(
                _inputType == 'email' ? 'Sign In' : 'Send OTP',
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w600),
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
          style: TextStyle(color: Colors.grey[600], fontSize: 14),
        ),
        const SizedBox(width: 8),
        TextButton(
          onPressed: _toggleInputType,
          child: Text(
            _inputType == 'email' ? 'Phone' : 'Email',
            style: TextStyle(
                color: Colors.blue[700], fontWeight: FontWeight.w600),
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
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
        const SizedBox(height: 8),
        Text(
          _inputType == 'email'
              ? "Don't have an account? Enter your email and password above and we'll get you set up."
              : "We'll send a verification code via SMS",
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
      ],
    );
  }

  void _toggleInputType() {
    setState(() {
      _inputType = _inputType == 'email' ? 'phone' : 'email';
      _errorMessage = '';
    });
    _inputFocusNode.requestFocus();
  }

  void _handleLogin() async {
    if (_inputType == 'email') {
      await _signInWithEmail();
    } else {
      await _sendPhoneOtp();
    }
  }

  Future<void> _signInWithEmail() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || !_isValidEmail(email)) {
      setState(() => _errorMessage = 'Please enter a valid email address');
      return;
    }
    if (password.isEmpty) {
      setState(() => _errorMessage = 'Please enter your password');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      await FirebaseAuth.instance
          .signInWithEmailAndPassword(email: email, password: password);
      // AuthBloc listens to authStateChanges and routes automatically
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found') {
        // New user — send to account creation
        if (mounted) {
          Navigator.of(context).pushNamed(
            '/account_creation',
            arguments: {'email': email, 'alreadyAuthenticated': false},
          );
        }
      } else if (e.code == 'wrong-password' || e.code == 'invalid-credential') {
        setState(() => _errorMessage =
            'Incorrect password. Please try again.');
      } else {
        setState(
            () => _errorMessage = e.message ?? 'Sign in failed. Please try again.');
      }
    } catch (e) {
      setState(() => _errorMessage =
          'Network error. Please check your connection and try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _sendPhoneOtp() async {
    final phoneNumber = _phoneController.text.trim();

    if (phoneNumber.isEmpty || !_isValidPhone(phoneNumber)) {
      setState(() => _errorMessage =
          'Please enter a valid phone number with country code (e.g. +15551234567)');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      verificationCompleted: (PhoneAuthCredential credential) async {
        await FirebaseAuth.instance.signInWithCredential(credential);
      },
      verificationFailed: (FirebaseAuthException e) {
        if (mounted) {
          setState(() {
            _errorMessage = e.message ??
                'Failed to verify phone number. Please try again.';
            _isLoading = false;
          });
        }
      },
      codeSent: (String verificationId, int? resendToken) {
        if (mounted) {
          setState(() => _isLoading = false);
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
    return RegExp(r'^\+\d{7,15}$').hasMatch(phone);
  }
}
