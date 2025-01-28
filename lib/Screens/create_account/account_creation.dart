import 'package:country_code_text_field/country_code_text_field.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:wolly/providers/auth_provider.dart';
import 'package:wolly/screens/create_account/profile_info_screen.dart';

class AccountCreationScreen extends StatefulWidget {
  const AccountCreationScreen({super.key});

  @override
  _AccountCreationScreenState createState() => _AccountCreationScreenState();
}

class _AccountCreationScreenState extends State<AccountCreationScreen> {
  final AuthProvider _authProvider = AuthProvider();
  String initialCountryCode = 'GH';
  late TextEditingController firstNameController;
  late TextEditingController lastNameController;
  late TextEditingController emailController;
  late TextEditingController phoneNumberController;
  late TextEditingController passwordController;
  late TextEditingController confirmPasswordController;
  bool isLoading = false;
  bool obscureText = true;

  @override
  void initState() {
    super.initState();
    firstNameController = TextEditingController();
    lastNameController = TextEditingController();
    emailController = TextEditingController();
    phoneNumberController = TextEditingController();
    passwordController = TextEditingController();
    confirmPasswordController = TextEditingController();
  }

  bool validateFirstName() {
    return firstNameController.text.isNotEmpty;
  }

  bool validateLastName() {
    return lastNameController.text.isNotEmpty;
  }

  bool validateEmail() {
    const emailPattern = r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$';
    final regExp = RegExp(emailPattern);
    return regExp.hasMatch(emailController.text);
  }

  bool validatePhoneNumber() {
    return phoneNumberController.text.isNotEmpty &&
        phoneNumberController.text.length == 10;
  }

  bool validatePassword() {
    return passwordController.text.length >= 6;
  }

  bool validateConfirmPassword() {
    return confirmPasswordController.text == passwordController.text;
  }

  @override
  Widget build(BuildContext context) { 
    return Scaffold(
      backgroundColor: Colors.white,
      persistentFooterButtons: [
        Padding(
          padding: const EdgeInsets.only(
            top: 16,
          ),
          child: Align(
            alignment: Alignment.center,
            child: RichText(
                text: TextSpan(
                    style: const TextStyle(color: Colors.black),
                    children: [
                  const TextSpan(
                    text: "Already have an account? ",
                  ),
                  TextSpan(
                      text: "Sign in",
                      style: const TextStyle(color: Colors.black),
                      recognizer: TapGestureRecognizer()
                        ..onTap = () {
                          Navigator.pushReplacementNamed(context, '/');
                        })
                ])),
          ),
        ),
      ],
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 30),
        child: ElevatedButton(
          onPressed: () {
            bool isValid = validateFirstName() &&
                validateLastName() &&
                validateEmail() &&
                validatePhoneNumber() &&
                validatePassword() &&
                validateConfirmPassword();

            if (!isValid) {
              ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Please fill all fields")));
              return;
            } else {
              setState(() {
                isLoading = true;
              });
              _authProvider
                  .signUpUser(
                      name: firstNameController.text,
                      lastName: lastNameController.text,
                      email: emailController.text,
                      countryCode: initialCountryCode,
                      phoneNumber: phoneNumberController.text,
                      password: passwordController.text)
                  .then((value) {
                setState(() {
                  isLoading = false;
                });
                if (value.isEmpty) {
                  Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const ProfileInfoScreen()));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(
                    value,
                  )));
                }
              });
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            minimumSize: const Size(double.infinity, 50),
          ),
          child: isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                  ),
                )
              : const Text(
                  'Next',
                  style: TextStyle(color: Colors.white),
                ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const SizedBox(
                height: 100,
              ),
              const Text("Let's get you started",
                  style: TextStyle(fontSize: 24)),
              const SizedBox(
                height: 40,
              ),
              TextFormField(
                controller: firstNameController,
                decoration: const InputDecoration(
                    labelText: 'First Name', border: OutlineInputBorder()),
              ),
              const SizedBox(
                height: 20,
              ),
              TextFormField(
                controller: lastNameController,
                decoration: const InputDecoration(
                    labelText: 'Last Name', border: OutlineInputBorder()),
              ),
              const SizedBox(
                height: 20,
              ),
              TextFormField(
                controller: emailController,
                decoration: const InputDecoration(
                    labelText: 'Email', border: OutlineInputBorder()),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(
                height: 20,
              ),
              CountryCodeTextField(
                controller: phoneNumberController,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  border: OutlineInputBorder(
                    borderSide: BorderSide(),
                  ),
                ),
                initialCountryCode: initialCountryCode,
                onCountryChanged: (value) {
                  setState(() {
                    initialCountryCode = value.code;
                  });
                },
              ),
              const SizedBox(
                height: 20,
              ),
              TextFormField(
                controller: passwordController,
                decoration: const InputDecoration(
                    labelText: 'Password', border: OutlineInputBorder()),
                obscureText: true,
              ),
              const SizedBox(
                height: 20,
              ),
              TextFormField(
                controller: confirmPasswordController,
                decoration: const InputDecoration(
                    labelText: 'Confirm Password',
                    border: OutlineInputBorder()),
                obscureText: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
