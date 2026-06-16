import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:wolly_mobile/core/utils/validators.dart';
import 'package:wolly_mobile/core/widgets/loading_button.dart';
import 'package:wolly_mobile/features/authentication/domain/auth_event.dart';
import 'package:wolly_mobile/features/authentication/domain/auth_state.dart';
import 'package:wolly_mobile/features/authentication/presentation/bloc/auth_bloc.dart';

class AccountCreationScreen extends StatefulWidget {
  final String userEmail;

  /// True when the user is already signed in via Firebase (phone auth or email
  /// link). In this case we save the profile to Firestore without calling
  /// createUserWithEmailAndPassword.
  final bool alreadyAuthenticated;

  const AccountCreationScreen({
    super.key,
    required this.userEmail,
    this.alreadyAuthenticated = false,
  });

  @override
  _AccountCreationScreenState createState() => _AccountCreationScreenState();
}

class _AccountCreationScreenState extends State<AccountCreationScreen> {
  late TextEditingController firstNameController;
  late TextEditingController lastNameController;
  late TextEditingController emailController;
  late TextEditingController phoneNumberController;
  late TextEditingController passwordController;
  late TextEditingController confirmPasswordController;
  String initialCountryCode = 'GH';
  bool obscureText = true;
  DateTime? selectedDate;
  final DateTime minimumDate =
      DateTime.now().subtract(const Duration(days: 365 * 8));

  @override
  void initState() {
    super.initState();
    firstNameController = TextEditingController();
    lastNameController = TextEditingController();
    // Pre-fill email from Firebase Auth if already authenticated
    final firebaseEmail =
        FirebaseAuth.instance.currentUser?.email ?? widget.userEmail;
    emailController = TextEditingController(text: firebaseEmail);
    phoneNumberController = TextEditingController();
    passwordController = TextEditingController();
    confirmPasswordController = TextEditingController();
  }

  bool validateForm() {
    final baseValid = Validators.validateNotEmpty(firstNameController.text) &&
        Validators.validateNotEmpty(lastNameController.text) &&
        Validators.validateDateBefore(selectedDate, minimumDate);

    if (widget.alreadyAuthenticated) {
      return baseValid;
    }

    return baseValid &&
        Validators.validateEmail(emailController.text) &&
        Validators.validatePassword(passwordController.text) &&
        Validators.validatePasswordsMatch(
            passwordController.text, confirmPasswordController.text);
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (widget.alreadyAuthenticated) {
          // For already-authenticated users, navigate when profileSaved becomes true
          if (state.profileSaved) {
            Navigator.pushReplacementNamed(context, '/onboarding');
          }
        } else {
          // For new sign-up flow, navigate when Firebase auth state becomes authenticated
          if (state.status == AuthStatus.authenticated) {
            Navigator.pushReplacementNamed(context, '/onboarding');
          }
        }
        if (state.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.errorMessage!)),
          );
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
        floatingActionButton: Padding(
          padding: const EdgeInsets.only(left: 16, right: 16, bottom: 30),
          child: BlocBuilder<AuthBloc, AuthState>(
            builder: (context, state) {
              return LoadingButton(
                text: 'Continue',
                isLoading: state.isLoading,
                onPressed: () {
                  if (!validateForm()) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content:
                              Text("Please fill all fields correctly")),
                    );
                    return;
                  }

                  if (widget.alreadyAuthenticated) {
                    context.read<AuthBloc>().add(
                          AuthSaveProfileEvent(
                            firstName: firstNameController.text,
                            lastName: lastNameController.text,
                            countryCode: initialCountryCode,
                            phoneNumber: phoneNumberController.text,
                            dateOfBirth: selectedDate!,
                          ),
                        );
                  } else {
                    context.read<AuthBloc>().add(
                          AuthSignUpEvent(
                            email: emailController.text,
                            password: passwordController.text,
                            firstName: firstNameController.text,
                            lastName: lastNameController.text,
                            countryCode: initialCountryCode,
                            phoneNumber: phoneNumberController.text,
                            dateOfBirth: selectedDate!,
                          ),
                        );
                  }
                },
                backgroundColor: Colors.blue,
                textColor: Colors.white,
              );
            },
          ),
        ),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const SizedBox(height: 100),
                const Text("Let's get you started",
                    style: TextStyle(fontSize: 24)),
                const SizedBox(height: 40),
                TextFormField(
                  controller: firstNameController,
                  decoration: const InputDecoration(
                      labelText: 'First Name',
                      border: OutlineInputBorder()),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: lastNameController,
                  decoration: const InputDecoration(
                      labelText: 'Last Name',
                      border: OutlineInputBorder()),
                ),
                const SizedBox(height: 20),
                InkWell(
                  onTap: () async {
                    final DateTime? picked = await showDatePicker(
                      context: context,
                      initialDate: minimumDate,
                      firstDate: DateTime(1900),
                      lastDate: minimumDate,
                    );
                    if (picked != null) {
                      setState(() {
                        selectedDate = picked;
                      });
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 16),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          selectedDate == null
                              ? 'Date of Birth'
                              : '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}',
                          style: TextStyle(
                            color: selectedDate == null
                                ? Colors.grey.shade600
                                : Colors.black,
                          ),
                        ),
                        const Icon(Icons.calendar_today),
                      ],
                    ),
                  ),
                ),
                if (!widget.alreadyAuthenticated) ...[
                  SizedBox(height: 64.rh),
                  Text("In case we can't email you",
                      style: TextStyle(fontSize: 12.rt)),
                  const Divider(),
                  SizedBox(height: 8.rh),
                  TextFormField(
                    controller: passwordController,
                    decoration: const InputDecoration(
                        labelText: 'Password',
                        border: OutlineInputBorder()),
                    obscureText: true,
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: confirmPasswordController,
                    decoration: const InputDecoration(
                        labelText: 'Confirm Password',
                        border: OutlineInputBorder()),
                    obscureText: true,
                  ),
                ],
                const SizedBox(height: 120),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
