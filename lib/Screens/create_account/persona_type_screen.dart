import 'package:flutter/material.dart';
import 'package:wolly/providers/auth_provider.dart';
import 'package:wolly/screens/create_account/content_preferences.dart';

class PersonaTypeScreen extends StatefulWidget {
  const PersonaTypeScreen({super.key});

  @override
  _PersonaTypeScreenState createState() => _PersonaTypeScreenState();
}

class _PersonaTypeScreenState extends State<PersonaTypeScreen> {
  final AuthProvider _authProvider = AuthProvider();
  bool isLoading = false;
  String selectedPersona = '';

  bool validatePersonaType() {
    return selectedPersona.isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
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
            bool isValid = validatePersonaType();
            if (isValid) {
              setState(() {
                isLoading = true;
              });
              _authProvider
                  .setPersona(
                role: selectedPersona,
              )
                  .then((value) {
                setState(() {
                  isLoading = false;
                });
                if (value.isEmpty) {
                  Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                          builder: (context) =>
                              const ContentPreferencesScreen()));
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
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const SizedBox(
                height: 100,
              ),
              const Text("How do you plan to use Wolly?",
                  style: TextStyle(fontSize: 24)),
              const SizedBox(
                height: 40,
              ),
              ListTile(
                title: const Text('Creator'),
                leading: Radio<String>(
                  value: 'Creator',
                  groupValue: selectedPersona,
                  onChanged: (value) {
                    setState(() {
                      selectedPersona = value!;
                    });
                  },
                ),
              ),
              ListTile(
                title: const Text('Reader'),
                leading: Radio<String>(
                  value: 'Reader',
                  groupValue: selectedPersona,
                  onChanged: (value) {
                    setState(() {
                      selectedPersona = value!;
                    });
                  },
                ),
              ),
              ListTile(
                title: const Text('Both'),
                leading: Radio<String>(
                  value: 'Both',
                  groupValue: selectedPersona,
                  onChanged: (value) {
                    setState(() {
                      selectedPersona = value!;
                    });
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
