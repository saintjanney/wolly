import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wolly/providers/mock_auth_provider.dart';
import 'package:wolly/providers/mock_profile_provider.dart';
import 'package:wolly/features/platform/presentation/widgets/platform_app_bar.dart';
import 'package:wolly/screens/login/login.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final MockAuthProvider _authProvider = MockAuthProvider();
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
  }

  void _handleLogout() async {
    setState(() {
      isLoading = true;
    });
    
    try {
      await _authProvider.signOut();
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (BuildContext context) => const Login(),
          ),
          (_) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error during logout: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const PlatformAppBar(
        title: 'Profile',
      ),
      backgroundColor: Colors.white,
      body: Consumer<MockProfileProvider>(builder: (context, profileProvider, _) {
        if (profileProvider.user == null) {
          // This should not happen with our MockProfileProvider as it loads data in the constructor
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
                    "${profileProvider.user!.firstName} ${profileProvider.user!.lastName}",
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(
                  height: 8,
                ),
                Center(
                  child: Text(
                    profileProvider.user!.persona ?? "Reader",
                    style: const TextStyle(
                      color: Colors.grey,
                    ),
                  ),
                ),
                const SizedBox(
                  height: 32,
                ),
                // Account Settings Section
                const Text(
                  "Account Settings",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.edit),
                  title: const Text("Edit Profile"),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    // Navigate to edit profile page
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.notifications_outlined),
                  title: const Text("Notification Settings"),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    // Navigate to notifications settings
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text(
                    "Logout",
                    style: TextStyle(color: Colors.red),
                  ),
                  onTap: _handleLogout,
                ),
                const SizedBox(height: 32),
                // Content Preferences Section
                const Text(
                  "Content Preferences",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (var preference in profileProvider.user!.contentPreference)
                      Chip(
                        label: Text(preference.toString()),
                        backgroundColor: Colors.blue.withOpacity(0.1),
                      ),
                  ],
                ),
              ],
            ),
          );
        }
      }),
    );
  }
}
