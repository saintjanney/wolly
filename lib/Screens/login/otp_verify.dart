import 'package:flexify/flexify.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pinput/pinput.dart';
import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import 'package:wolly/features/library/presentation/screens/library.dart';

/// This is the basic usage of Pinput
/// For more examples check out the demo directory
class OtpVerify extends StatefulWidget {
  final String email; // Add parameter to pass the EmailOTP instance
  const OtpVerify({
    Key? key,
    required this.email,
  }) : super(key: key);

  @override
  State<OtpVerify> createState() => _OtpVerifyState();
}

class _OtpVerifyState extends State<OtpVerify> {
  late final SmsRetriever smsRetriever;
  late final TextEditingController pinController;
  late final FocusNode focusNode;
  late final GlobalKey<FormState> formKey;
  late Timer _timer;
  int _remainingSeconds = 60;
  bool _canResendOTP = false;

  @override
  void initState() {
    super.initState();
    // On web, disable the browser's context menu since this example uses a custom
    // Flutter-rendered context menu.
    if (kIsWeb) {
      BrowserContextMenu.disableContextMenu();
    }
    formKey = GlobalKey<FormState>();
    pinController = TextEditingController();
    focusNode = FocusNode();

    // Use the passed EmailOTP instance or create a new one

    /// In case you need an SMS autofill feature
    // smsRetriever = SmsRetrieverImpl(
    //   SmartAuth(),
    // );

    // Start the initial countdown
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
    if (kIsWeb) {
      BrowserContextMenu.enableContextMenu();
    }
    pinController.dispose();
    focusNode.dispose();
    _timer.cancel();
    super.dispose();
  }

  Future<bool> checkUserExists(String email) async {
    try {
      // Query Firestore to check if user document exists
      final QuerySnapshot result = await FirebaseFirestore.instance
          .collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();

      return result.docs.isNotEmpty;
    } catch (e) {
      debugPrint('Error checking user existence: $e');
      return false;
    }
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

    /// Optionally you can use form to validate the Pinput
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
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.25,
          ),
          Directionality(
            // Specify direction if desired
            textDirection: TextDirection.ltr,
            child: Center(
              child: Pinput(
                length: 6,
                controller: pinController,
                focusNode: focusNode,
                defaultPinTheme: defaultPinTheme,
                validator: (value) {
                  return null;
                  // return value == '2222' ? null : 'Pin is incorrect';
                },
                hapticFeedbackType: HapticFeedbackType.lightImpact,
                onCompleted: (pin) {
                  debugPrint('onCompleted: $pin');
                },
                onChanged: (value) {
                  debugPrint('onChanged: $value');
                },
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
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.05,
          ),
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
              onPressed: () async {
                focusNode.unfocus();
                try {
                  final response = await http.post(
                    Uri.parse('https://verifyotp-dg5lwqjwha-uc.a.run.app'),
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization':
                          'Bearer 221fb1b6-2ea8-4592-b399-bfaeb89417a9'
                    },
                    body: json.encode({
                      'email': widget.email,
                      'tenantId': '9bJeg81yOoYFSuEhexuC',
                      'otp': pinController.text
                    }),
                  );

                  if (response.statusCode == 200 &&
                      jsonDecode(response.body)['message'] ==
                          'OTP verified successfully') {
                    print(response.body);
                    final userExists = await checkUserExists(widget.email);
                    if (userExists) {
                      Navigator.pushReplacementNamed(context, '/platform');
                    } else {
                      if (mounted) {
                        Navigator.pushReplacementNamed(
                          context,
                          '/account_creation',
                          arguments: widget.email,
                        );
                      }
                    }
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text("Invalid OTP: ${response.body}")),
                    );
                  }
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text("Error verifying OTP: $e")),
                  );
                }
              },
              child: const Text('Verify OTP'),
            ),
          ),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.05,
          ),
          TextButton(
            onPressed: _canResendOTP
                ? () async {
                    try {
                      final response = await http.post(
                        Uri.parse('https://requestotp-dg5lwqjwha-uc.a.run.app'),
                        headers: {'Content-Type': 'application/json'},
                        body: json.encode({
                          'email': widget.email,
                          'tenantId': '9bJeg81yOoYFSuEhexuC',
                          'otpLength': 6
                        }),
                      );

                      if (response.statusCode == 200) {
                        startCountdown(); // Restart countdown after successful OTP send
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content:
                                  Text("Failed to send OTP: ${response.body}")),
                        );
                      }
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text("Error sending OTP: $e")),
                      );
                    }
                  }
                : null,
            child: Text(
              _canResendOTP
                  ? 'Haven\'t received OTP? Resend OTP'
                  : 'Resend OTP in $_remainingSeconds seconds',
              style: TextStyle(
                color: _canResendOTP ? Colors.blue : Colors.grey,
              ),
            ),
          )
        ],
      ),
    );
  }
}

/// You, as a developer should implement this interface.
/// You can use any package to retrieve the SMS code. in this example we are using SmartAuth
// class SmsRetrieverImpl implements SmsRetriever {
//   const SmsRetrieverImpl(this.smartAuth);

//   // final SmartAuth smartAuth;

//   @override
//   Future<void> dispose() {
//     return smartAuth.removeSmsListener();
//   }

//   @override
//   Future<String?> getSmsCode() async {
//     final signature = await smartAuth.getAppSignature();
//     debugPrint('App Signature: $signature');
//     final res = await smartAuth.getSmsCode(
//       useUserConsentApi: true,
//     );
//     if (res.succeed && res.codeFound) {
//       return res.code!;
//     }
//     return null;
//   }

//   @override
//   bool get listenForMultipleSms => false;
// }
