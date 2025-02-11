import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:wolly/providers/auth_provider.dart';

class AccountCreationScreen extends StatefulWidget {
  final String userEmail;
  const AccountCreationScreen({super.key, required this.userEmail});

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

  bool validateDateOfBirth() {
    if (selectedDate == null) return false;
    return selectedDate!.isBefore(minimumDate);
  }

  @override
  Widget build(BuildContext context) {
    emailController.text = widget.userEmail;
    return Scaffold(
      backgroundColor: Colors.white,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 30),
        child: ElevatedButton(
          onPressed: () {
            bool isValid = validateFirstName() &&
                validateLastName() &&
                validateEmail() &&
                validateDateOfBirth() &&
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
                      password: passwordController.text,
                      dateOfBirth: selectedDate!)
                  .then((value) {
                setState(() {
                  isLoading = false;
                });
                if (value.isEmpty) {
                  Navigator.pushReplacementNamed(context, '/library');
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
              ? SizedBox(
                  height: 20.rs,
                  width: 20.rs,
                  child: CircularProgressIndicator.adaptive(),
                )
              : Text(
                  'Continue',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16.rt,
                  ),
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
    );
  }
}
