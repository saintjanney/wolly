import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly/core/utils/validators.dart';
import 'package:wolly/core/widgets/loading_button.dart';
import 'package:wolly/features/authentication/domain/auth_event.dart';
import 'package:wolly/features/authentication/domain/auth_state.dart';
import 'package:wolly/features/authentication/presentation/bloc/auth_bloc.dart';

class AccountCreationScreen extends StatefulWidget {
  final String userEmail;
  const AccountCreationScreen({super.key, required this.userEmail});

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
    emailController = TextEditingController();
    phoneNumberController = TextEditingController();
    passwordController = TextEditingController();
    confirmPasswordController = TextEditingController();
  }

  bool validateForm() {
    return Validators.validateNotEmpty(firstNameController.text) &&
        Validators.validateNotEmpty(lastNameController.text) &&
        Validators.validateEmail(emailController.text) &&
        Validators.validatePassword(passwordController.text) &&
        Validators.validatePasswordsMatch(
            passwordController.text, confirmPasswordController.text) &&
        Validators.validateDateBefore(selectedDate, minimumDate);
  }

  @override
  Widget build(BuildContext context) {
    emailController.text = widget.userEmail;
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.authenticated) {
          Navigator.pushReplacementNamed(context, '/platform');
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
                      const SnackBar(content: Text("Please fill all fields correctly")),
                    );
                    return;
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
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
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
                SizedBox(
                  height: 64.rh,
                ),
                Text("In case we can't email you",
                    style: TextStyle(fontSize: 12.rt)),
                Divider(),
                SizedBox(
                  height: 8.rh,
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
      ),
    );
  }
} 