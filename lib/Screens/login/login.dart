import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:wolly/providers/auth_provider.dart';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  final AuthProvider _authProvider = AuthProvider();
  late TextEditingController emailController;
  late TextEditingController passwordController;
  bool isLoading = false;
  bool obscureText = true;

  @override
  void initState() {
    super.initState();
    emailController = TextEditingController();
    passwordController = TextEditingController();
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  bool validateEmail() {
    const emailPattern = r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$';
    final regExp = RegExp(emailPattern);
    return regExp.hasMatch(emailController.text);
  }

  bool validatePassword() {
    return passwordController.text.length >= 6;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(
                height: 100,
              ),
              const Text("Welcome to Wolly", style: TextStyle(fontSize: 24)),
              const Text("Enter your email and password to login",
                  style: TextStyle(fontSize: 16)),
              const SizedBox(
                height: 40,
              ),
              TextFormField(
                controller: emailController,
                decoration: const InputDecoration(
                    labelText: 'Email Address', border: OutlineInputBorder()),
          
                // onSaved: (value) => password = value!,
              ),
              const SizedBox(
                height: 20,
              ),
              TextFormField(
                controller: passwordController,
                decoration: InputDecoration(
                    suffixIcon: IconButton(
                      icon: Icon(
                          obscureText ? Icons.visibility : Icons.visibility_off),
                      onPressed: () {
                        setState(() {
                          obscureText = !obscureText;
                        });
                      },
                    ),
                    labelText: 'Password',
                    border: const OutlineInputBorder()),
                obscureText: obscureText,
          
                // onSaved: (value) => password = value!,
              ),
              const SizedBox(
                height: 20,
              ),
              const Align(
                  alignment: Alignment.centerRight,
                  child: Text("Forgot Password?")),
              const SizedBox(
                height: 60,
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  minimumSize: const Size(double.infinity, 50),
                ),
                onPressed: () {
                  bool isValid = validateEmail() && validatePassword();
          
                  if (!isValid) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                        content: Text("Invalid email or password")));
                    return;
                  } else {
                    setState(() {
                      isLoading = true;
                    });
                    _authProvider
                        .login(
                            email: emailController.text,
                            password: passwordController.text)
                        .then((value) {
                      setState(() {
                        isLoading = false;
                      });
                      if (value == "") {
                        Navigator.pushReplacementNamed(context, '/root');
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(value.toString())));
                      }
                    });
                  }
                },
                child: isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Login',
                        style: TextStyle(color: Colors.white),
                      ),
              ),
              const SizedBox(
                height: 10,
              ),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                      width: 100,
                      child: Divider(
                        color: Colors.black,
                      )),
                  SizedBox(
                    width: 10,
                  ),
                  Align(
                    alignment: Alignment.center,
                    child: Text(
                      "Or",
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                  SizedBox(
                    width: 10,
                  ),
                  SizedBox(
                      width: 100,
                      child: Divider(
                        color: Colors.black,
                      )),
                ],
              ),
              const SizedBox(
                height: 10,
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: Colors.black),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  minimumSize: const Size(double.infinity, 50),
                ),
                onPressed: () {},
                child: const Text(
                  'Continue with Google',
                  style: TextStyle(color: Colors.black),
                ),
              ),
              const SizedBox(
                height: 20,
              ),
              Align(
                alignment: Alignment.center,
                child: RichText(
                    text: TextSpan(
                        style: const TextStyle(color: Colors.black),
                        children: [
                      const TextSpan(
                        text: "Don't have an account? ",
                      ),
                      TextSpan(
                          text: "Sign Up",
                          style: const TextStyle(color: Colors.black),
                          recognizer: TapGestureRecognizer()
                            ..onTap = () {
                              Navigator.pushReplacementNamed(
                                  context, '/account_creation');
                            })
                    ])),
              ),
              const SizedBox(
                height: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
