import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly_mobile/features/authentication/domain/auth_event.dart';
import 'package:wolly_mobile/features/authentication/presentation/bloc/auth_bloc.dart';
import '../../features/library/presentation/screens/library.dart';
import '../../features/library/presentation/screens/search_screen.dart';
import '../../features/dashboard/presentation/screens/world_class_home_screen.dart';
import '../../features/store/presentation/screens/purchase_history_screen.dart';

class MainNavigation extends StatefulWidget {
  final int initialIndex;

  const MainNavigation({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void _onBottomNavTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _buildAppBar(),
      body: _buildCurrentScreen(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onBottomNavTapped,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.blue[700],
        unselectedItemColor: Colors.grey[600],
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.library_books),
            label: 'Library',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      title: Text(
        _getAppBarTitle(),
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      centerTitle: false,
      backgroundColor: Colors.white,
      foregroundColor: Colors.black,
      elevation: 0,
      actions: [
        IconButton(
          icon: const Icon(Icons.search),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SearchScreen()),
            );
          },
          tooltip: 'Search Books',
        ),
      ],
    );
  }

  String _getAppBarTitle() {
    switch (_currentIndex) {
      case 0:
        return 'Home';
      case 1:
        return 'Library';
      case 2:
        return 'Profile';
      default:
        return 'Wolly';
    }
  }

  Widget _buildCurrentScreen() {
    switch (_currentIndex) {
      case 0:
        return _buildHomeScreen();
      case 1:
        return _buildLibraryScreen();
      case 2:
        return _buildProfileScreen();
      default:
        return _buildHomeScreen();
    }
  }

  Widget _buildHomeScreen() {
    return const WorldClassHomeScreen();
  }

  Widget _buildLibraryScreen() {
    return Library();
  }


  void _signOut() {
    // Show confirmation dialog
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Sign Out'),
          content: const Text('Are you sure you want to sign out?'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _performSignOut();
              },
              child: const Text(
                'Sign Out',
                style: TextStyle(color: Colors.red),
              ),
            ),
          ],
        );
      },
    );
  }

  void _performSignOut() {
    // Fire the sign-out event through AuthBloc → Firebase sign out
    context.read<AuthBloc>().add(AuthSignOutEvent());
    // Navigate back to root (AuthGate will show login screen)
    Navigator.of(context).pushNamedAndRemoveUntil(
      '/',
      (Route<dynamic> route) => false,
    );
  }

  Widget _buildProfileScreen() {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    return StreamBuilder<DocumentSnapshot>(
      stream: uid != null
          ? FirebaseFirestore.instance.collection('users').doc(uid).snapshots()
          : const Stream.empty(),
      builder: (context, snap) {
        final userData = (snap.hasData && snap.data!.exists)
            ? snap.data!.data() as Map<String, dynamic>
            : <String, dynamic>{};
        final name = userData['name'] ?? 'Reader';
        final email = FirebaseAuth.instance.currentUser?.email ?? '';
        final booksRead = (userData['booksRead'] ?? 0).toString();
        final hoursRead = (userData['hoursRead'] ?? 0).toString();
        final streak = (userData['readingStreak'] ?? 0).toString();
        final genreCount = userData['genre_prefs'] is List
            ? (userData['genre_prefs'] as List).length.toString()
            : '0';

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: Colors.white.withOpacity(0.25),
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : '?',
                        style: const TextStyle(fontSize: 28, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name,
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text(email,
                              style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.8)),
                              overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text('Active Reader',
                                style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Stats
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 2))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Reading Stats', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(child: _statItem('Books Read', booksRead, Icons.book_outlined, const Color(0xFF667EEA))),
                        const SizedBox(width: 12),
                        Expanded(child: _statItem('Hours Read', '${hoursRead}h', Icons.timer_outlined, const Color(0xFF4CAF50))),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _statItem('Genres', genreCount, Icons.category_outlined, const Color(0xFFFF9800))),
                        const SizedBox(width: 12),
                        Expanded(child: _statItem('Day Streak', '$streak days', Icons.local_fire_department_outlined, const Color(0xFF9C27B0))),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _buildProfileActions(),
            ],
          ),
        );
      },
    );
  }

  Widget _statItem(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(value,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildProfileActions() {
    return Column(
      children: [
        // Account Actions Section
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Account Actions',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildActionTile('Edit Profile', Icons.edit, () {}),
              _buildActionTile('Purchase History', Icons.receipt_long, () {
                Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => const PurchaseHistoryScreen(),
                ));
              }),
              _buildActionTile('Reading Preferences', Icons.settings, () {}),
              _buildActionTile('Privacy Settings', Icons.privacy_tip, () {}),
              _buildActionTile('Help & Support', Icons.help, () {}),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // App Settings Section
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'App Settings',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildSettingsTile('Reading Notifications', Icons.notifications, true),
              _buildSettingsTile('Dark Mode', Icons.dark_mode, false),
              _buildSettingsTile('Auto-sync Progress', Icons.sync, true),
              _buildSettingsTile('Reading Analytics', Icons.analytics, true),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Security & Privacy Section
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Security & Privacy',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildActionTile('Change Password', Icons.lock, () {}),
              _buildActionTile('Two-Factor Authentication', Icons.security, () {}),
              _buildActionTile('Data & Privacy', Icons.privacy_tip, () {}),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Sign Out Section
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            children: [
              _buildActionTile('Sign Out', Icons.logout, () {
                _signOut();
              }, isDestructive: true),
              const SizedBox(height: 8),
              _buildActionTile('Delete Account', Icons.delete_forever, () {}, isDestructive: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionTile(String title, IconData icon, VoidCallback onTap, {bool isDestructive = false}) {
    return ListTile(
      leading: Icon(
        icon,
        color: isDestructive ? Colors.red : Colors.grey[600],
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isDestructive ? Colors.red : Colors.grey[800],
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Icon(
        Icons.arrow_forward_ios,
        size: 16,
        color: Colors.grey[400],
      ),
      onTap: onTap,
    );
  }


  Widget _buildSettingsTile(String title, IconData icon, bool value) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey[600]),
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Switch(
        value: value,
        onChanged: (newValue) {
          // Handle setting change
        },
        activeColor: Colors.blue[700],
      ),
    );
  }
}
