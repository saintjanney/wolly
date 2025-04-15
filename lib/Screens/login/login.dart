import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:wolly/Screens/login/otp_verify.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  bool isLoading = false;

  // void requestOTP() {
  //   final url = 'https://requestotp-dg5lwqjwha-uc.a.run.app';

  //   final request = html.HttpRequest();
  //   request.open('POST', url, async: true);
  //   request.setRequestHeader('Content-Type', 'application/json');

  //   request.onLoadEnd.listen((_) {
  //     if (request.status == 200) {
  //       print('Success: ${request.responseText}');
  //     } else {
  //       print('Error: ${request.status} - ${request.responseText}');
  //     }
  //   });

  //   request.send(json.encode({
  //     'email': 'allenjanney@gmail.com',
  //     'tenantId': '9bJeg81yOoYFSuEhexuC',
  //     'otpLength': 6
  //   }));
  // }

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
              keyboardType: TextInputType.emailAddress,
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

                  try {
                    final response = await http.post(
                      Uri.parse('https://requestotp-dg5lwqjwha-uc.a.run.app'),
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization':
                            'Bearer 221fb1b6-2ea8-4592-b399-bfaeb89417a9'
                      },
                      body: json.encode({
                        'email': emailController.text,
                        'tenantId': '9bJeg81yOoYFSuEhexuC',
                        'otpLength': 6
                      }),
                    );
                    setState(() {
                      isLoading = false;
                    });
                    print(response.statusCode);
                    if (response.statusCode == 200) {
                      Navigator.pushReplacementNamed(context, '/otp_verify',
                          arguments: {
                            'email': emailController.text,
                          });
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content:
                              Text("Failed to send OTP: ${response.body}")));
                    }
                  } catch (e) {
                    setState(() {
                      isLoading = false;
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text("Error sending OTP: $e")));
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
