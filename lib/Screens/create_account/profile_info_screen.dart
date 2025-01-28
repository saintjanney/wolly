import 'package:flutter/material.dart';
import 'package:wolly/providers/auth_provider.dart';
import 'package:wolly/screens/create_account/persona_type_screen.dart';
import 'package:wolly/lumin_utll.dart';

class ProfileInfoScreen extends StatefulWidget {
  const ProfileInfoScreen({super.key});

  @override
  _ProfileInfoScreenState createState() => _ProfileInfoScreenState();
}

class _ProfileInfoScreenState extends State<ProfileInfoScreen> {
  final AuthProvider _authProvider = AuthProvider();
  bool isLoading = false;
  bool obscureText = true;

  String? gender;
  DateTime selectedDate =
      DateTime.now().subtract(const Duration(days: 365 * 12));

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime(1900),
      lastDate: DateTime.now().subtract(const Duration(days: 365 * 12)),
    );
    if (picked != null && picked != selectedDate) {
      setState(() {
        selectedDate = picked;
      });
    }
  }

  bool validateGender() {
    return gender != null && gender!.isNotEmpty;
  }

  bool validateDOB() {
    return selectedDate != DateTime.now();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 30),
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            minimumSize: const Size(double.infinity, 50),
          ),
          onPressed: () {
            bool isValid = validateGender() && validateDOB();
            if (isValid) {
              setState(() {
                isLoading = true;
              });
              _authProvider
                  .setGenderAndBirthday(
                gender: gender!,
                dob: selectedDate.toIso8601String(),
              )
                  .then((value) {
                setState(() {
                  isLoading = false;
                });
                if (value.isEmpty) {
                  Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const PersonaTypeScreen()));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(
                    value,
                  )));
                }
              });
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("Please fill all fields"),
                ),
              );
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
                  'Next',
                  style: TextStyle(color: Colors.white),
                ),
        ),
      ),
      backgroundColor: Colors.white,
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const SizedBox(
                height: 100,
              ),
              const Text("Tell us more about yourself",
                  style: TextStyle(fontSize: 24)),
              const SizedBox(
                height: 40,
              ),
              DropdownButtonFormField<String>(
                dropdownColor: Colors.white,
                value: gender,
                decoration: const InputDecoration(
                    labelText: 'Gender', border: OutlineInputBorder()),
                items: ['Male', 'Female'].map((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
                onChanged: (value) => gender = value!,
              ),
              const SizedBox(height: 20),
              ListTile(
                title: Text(
                  "Date of Birth: ${LuminUtll.formatDate(selectedDate)}",
                ),
                trailing: const Icon(Icons.calendar_today),
                onTap: () => _selectDate(context),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


//TODO: Prompt to ask user whether we can use their location to provide better service
//do some research on nationality vs location {let's do both tho}
