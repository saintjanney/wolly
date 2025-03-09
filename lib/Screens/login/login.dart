import 'package:email_otp/email_otp.dart';
import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:wolly/Screens/login/otp_verify.dart';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  bool isLoading = false;
  @override
  Widget build(BuildContext context) {
    TextEditingController emailController = TextEditingController();
    return Scaffold(
      backgroundColor: Colors.white,
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: 20.rw),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: MediaQuery.of(context).size.height * 0.1),
            Text("Welcome to Wolly",
                style: TextStyle(
                  fontSize: 24.rt,
                  fontWeight: FontWeight.bold,
                )),
            SizedBox(height: MediaQuery.of(context).size.height * 0.2),
            TextFormField(
              controller: emailController,
              decoration: InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Email',
                labelStyle: TextStyle(
                  fontSize: 12.rt,
                  fontWeight: FontWeight.normal,
                ),
                contentPadding: EdgeInsets.symmetric(horizontal: 10.rw),
                hintText: 'Enter your email',
                hintStyle: TextStyle(
                  fontSize: 12.rt,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ),
            SizedBox(height: MediaQuery.of(context).size.height * 0.05),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                style: TextButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10.rw),
                  ),
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                onPressed: () async {
                  if (emailController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Email is required")));
                    return;
                  }
                  if (isLoading) {
                    return;
                  }
                  setState(() {
                    isLoading = true;
                  });
                  EmailOTP myAuth = EmailOTP();
                  myAuth.setConfig(
                    appName: "Wolly",
                    userEmail: emailController.text,
                    otpLength: 6,
                    otpType: OTPType.digitsOnly
                  );
                  bool res = await myAuth.sendOTP();
                  setState(() {
                    isLoading = false;
                  });
                  if (res) {
                    Navigator.pushReplacementNamed(
                      context, 
                      '/otp_verify',
                      arguments: {
                        'email': emailController.text,
                        'myAuth': myAuth,
                      }
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("OTP failed sent")));
                  }
                },
                child: isLoading
                    ? const CircularProgressIndicator.adaptive()
                    : Text('Continue',
                        style: TextStyle(
                          fontSize: 14.rt,
                          fontWeight: FontWeight.normal,
                        )),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
