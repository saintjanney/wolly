import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wolly/providers/auth_provider.dart';
import 'package:wolly/providers/genre_provider.dart';

class ContentPreferencesScreen extends StatefulWidget {
  const ContentPreferencesScreen({super.key});

  @override
  _ContentPreferencesScreenState createState() =>
      _ContentPreferencesScreenState();
}

class _ContentPreferencesScreenState extends State<ContentPreferencesScreen> {
  List<String> preferences = [];

  bool isLoading = false;
  final AuthProvider _authProvider = AuthProvider();

  bool validateContentPreferences() {
    return preferences.isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<GenreProvider>(builder: (context, genreProvider, _) {
      if (genreProvider.genres.isEmpty) {
        genreProvider.fetchAllGenres();
      }
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
              bool isValid = validateContentPreferences();
              if (isValid) {
                setState(() {
                  isLoading = true;
                });
                _authProvider
                    .setContentPreferences(
                  contentPreferences: preferences,
                )
                    .then((value) {
                  setState(() {
                    isLoading = false;
                  });
                  if (value.isEmpty) {
                    Navigator.pushReplacementNamed(context, "/root");
                    // Navigator.pushReplacement(
                    //     context,
                    //     MaterialPageRoute(
                    //         builder: (context) => ProfileScreen()));
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
                    content: Text("Select at least one genre"),
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const SizedBox(
                height: 100,
              ),
              const Text("Select your preferred genres",
                  style: TextStyle(fontSize: 24)),
              const SizedBox(
                height: 40,
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: genreProvider.genres.length,
                  itemBuilder: (context, index) {
                    return CheckboxListTile(
                      title: Text(genreProvider.genres[index].name),
                      value: preferences
                          .contains(genreProvider.genres[index].name),
                      onChanged: (bool? value) {
                        setState(() {
                          if (value == true) {
                            preferences.add(genreProvider.genres[index].name);
                          } else {
                            preferences
                                .remove(genreProvider.genres[index].name);
                          }
                        });
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    });
  }
}
