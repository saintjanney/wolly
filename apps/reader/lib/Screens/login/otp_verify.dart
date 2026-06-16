import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:pinput/pinput.dart';
import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class OtpVerify extends StatefulWidget {
  final String verificationId;
  final String phoneNumber;

  const OtpVerify({
    Key? key,
    required this.verificationId,
    required this.phoneNumber,
  }) : super(key: key);

  @override
  State<OtpVerify> createState() => _OtpVerifyState();
}

class _OtpVerifyState extends State<OtpVerify> {
  late final TextEditingController pinController;
  late final FocusNode focusNode;
  late final GlobalKey<FormState> formKey;
  late Timer _timer;
  int _remainingSeconds = 60;
  bool _canResendOTP = false;
  bool _isVerifying = false;
  String _currentVerificationId = '';

  @override
  void initState() {
    super.initState();
    formKey = GlobalKey<FormState>();
    pinController = TextEditingController();
    focusNode = FocusNode();
    _currentVerificationId = widget.verificationId;
    startCountdown();
  }

  void startCountdown() {
    setState(() {
      _remainingSeconds = 60;
      _canResendOTP = false;
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;
        } else {
          _canResendOTP = true;
          timer.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    pinController.dispose();
    focusNode.dispose();
    _timer.cancel();
    super.dispose();
  }

  Future<void> _verifyCode(String code) async {
    if (code.length < 6) return;

    setState(() {
      _isVerifying = true;
    });

    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _currentVerificationId,
        smsCode: code,
      );

      final userCredential =
          await FirebaseAuth.instance.signInWithCredential(credential);
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
            arguments: {'email': '', 'alreadyAuthenticated': true},
          );
        }
      }
    } on FirebaseAuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message ?? 'Invalid code. Please try again.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isVerifying = false;
        });
      }
    }
  }

  Future<void> _resendCode() async {
    setState(() {
      _canResendOTP = false;
    });

    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: widget.phoneNumber,
      verificationCompleted: (PhoneAuthCredential credential) async {
        await FirebaseAuth.instance.signInWithCredential(credential);
      },
      verificationFailed: (FirebaseAuthException e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(e.message ?? 'Failed to resend code.')),
          );
        }
      },
      codeSent: (String verificationId, int? resendToken) {
        setState(() {
          _currentVerificationId = verificationId;
        });
        startCountdown();
      },
      codeAutoRetrievalTimeout: (String verificationId) {
        setState(() {
          _currentVerificationId = verificationId;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    const focusedBorderColor = Color.fromRGBO(23, 171, 144, 1);
    const fillColor = Color.fromRGBO(243, 246, 249, 0);
    const borderColor = Color.fromRGBO(23, 171, 144, 0.4);

    final defaultPinTheme = PinTheme(
      width: 56,
      height: 56,
      textStyle: const TextStyle(
        fontSize: 22,
        color: Color.fromRGBO(30, 60, 87, 1),
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: borderColor),
      ),
    );

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Enter OTP',
          style: TextStyle(
            fontSize: 16.rt,
            fontWeight: FontWeight.normal,
          ),
        ),
        backgroundColor: Colors.white,
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.1),
          Text(
            'Enter the code sent to',
            style: TextStyle(fontSize: 14.rt, color: Colors.grey[600]),
          ),
          const SizedBox(height: 4),
          Text(
            widget.phoneNumber,
            style: TextStyle(
                fontSize: 16.rt, fontWeight: FontWeight.w600),
          ),
          SizedBox(height: MediaQuery.of(context).size.height * 0.1),
          Directionality(
            textDirection: TextDirection.ltr,
            child: Center(
              child: Pinput(
                length: 6,
                controller: pinController,
                focusNode: focusNode,
                defaultPinTheme: defaultPinTheme,
                hapticFeedbackType: HapticFeedbackType.lightImpact,
                onCompleted: (pin) => _verifyCode(pin),
                cursor: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Container(
                      margin: EdgeInsets.only(bottom: 9.rh),
                      width: 22.rw,
                      height: 1.rh,
                      color: focusedBorderColor,
                    ),
                  ],
                ),
                focusedPinTheme: defaultPinTheme.copyWith(
                  decoration: defaultPinTheme.decoration!.copyWith(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: focusedBorderColor),
                  ),
                ),
                submittedPinTheme: defaultPinTheme.copyWith(
                  decoration: defaultPinTheme.decoration!.copyWith(
                    color: fillColor,
                    borderRadius: BorderRadius.circular(19),
                    border: Border.all(color: focusedBorderColor),
                  ),
                ),
                errorPinTheme: defaultPinTheme.copyBorderWith(
                  border: Border.all(color: Colors.redAccent),
                ),
              ),
            ),
          ),
          SizedBox(height: MediaQuery.of(context).size.height * 0.05),
          SizedBox(
            width: MediaQuery.of(context).size.width * 0.8,
            child: TextButton(
              style: TextButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10.rw),
                ),
                padding: EdgeInsets.symmetric(horizontal: 20.rw),
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
              ),
              onPressed: _isVerifying
                  ? null
                  : () => _verifyCode(pinController.text),
              child: _isVerifying
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text('Verify OTP'),
            ),
          ),
          SizedBox(height: MediaQuery.of(context).size.height * 0.05),
          TextButton(
            onPressed: _canResendOTP ? _resendCode : null,
            child: Text(
              _canResendOTP
                  ? "Haven't received OTP? Resend OTP"
                  : 'Resend OTP in $_remainingSeconds seconds',
              style: TextStyle(
                color: _canResendOTP ? Colors.blue : Colors.grey,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
