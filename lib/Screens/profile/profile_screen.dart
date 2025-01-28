import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wolly/providers/auth_provider.dart';
import 'package:wolly/providers/profile_provider.dart';
import 'package:wolly/screens/login/login.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final AuthProvider _authProvider = AuthProvider();
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: const Text('Profile'),
      ),
      backgroundColor: Colors.white,
      body: Consumer<ProfileProvider>(builder: (context, profileProvider, _) {
        if (profileProvider.user == null) {
          profileProvider.fetchUserData("MxsFoheaU1WXeudFEQVJvUHbY822");
          return const Center(
            child: CircularProgressIndicator(),
          );
        } else {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(
                  height: 16,
                  width: double.infinity,
                ),
                const Center(
                  child: CircleAvatar(
                    radius: 50,
                    backgroundImage: NetworkImage(
                        'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'),
                  ),
                ),
                const SizedBox(
                  height: 16,
                ),
                Center(
                  child: Text(
                    profileProvider.user!.firstName ?? "",
                  ),
                ),
                const SizedBox(
                  height: 8,
                ),
                const Center(child: Text("Creater | Reader")),
                const SizedBox(
                  height: 16,
                ),
                Center(
                  child: SizedBox(
                    width: MediaQuery.sizeOf(context).width * 0.6,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        minimumSize: const Size(double.infinity, 50),
                      ),
                      onPressed: () {
                        setState(() {
                          isLoading = true;
                        });
                        _authProvider.signOut().whenComplete(() {
                          Navigator.of(context, rootNavigator: true)
                              .pushAndRemoveUntil(
                            MaterialPageRoute(
                              builder: (BuildContext context) {
                                return const Login();
                              },
                            ),
                            (_) => false,
                          );
                        });
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
                              'Logout',
                              style: TextStyle(color: Colors.white),
                            ),
                    ),
                  ),
                ),
                const SizedBox(
                  height: 40,
                ),
                const Text("Content Preferences",
                    style: TextStyle(fontSize: 20)),
                const SizedBox(
                  height: 8,
                ),
                for (String s in profileProvider.user!.contentPreference)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Container(
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            color: Colors.grey[200]),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 4),
                        child: Text(s)),
                  ),
              ],
            ),
          );
        }
      }),
    );
  }
}
