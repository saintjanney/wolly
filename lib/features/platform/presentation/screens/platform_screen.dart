import 'package:flutter/material.dart';
import 'package:flexify/flexify.dart';
import 'package:wolly/Screens/library/library.dart';
import 'package:wolly/Screens/profile/profile_screen.dart';
import 'package:wolly/features/dashboard/presentation/screens/dashboard_screen.dart';

class PlatformScreen extends StatefulWidget {
  const PlatformScreen({super.key});

  @override
  State<PlatformScreen> createState() => _PlatformScreenState();
}

class _PlatformScreenState extends State<PlatformScreen> {
  int _currentIndex = 0;
  
  // List of screens to be shown in the bottom navigation bar
  final List<Widget> _screens = [
    const DashboardScreen(),
    Library(),
    const ProfileScreen(),
  ];

  // Navigation items
  final List<BottomNavigationBarItem> _navigationItems = [
    const BottomNavigationBarItem(
      icon: Icon(Icons.home_outlined),
      activeIcon: Icon(Icons.home),
      label: 'Home',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.library_books_outlined),
      activeIcon: Icon(Icons.library_books),
      label: 'Library',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.person_outline),
      activeIcon: Icon(Icons.person),
      label: 'Profile',
    ),
  ];

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Theme(
        data: Theme.of(context).copyWith(
          // Set the bottom navigation bar theme colors
          splashColor: Colors.transparent,
          highlightColor: Colors.transparent,
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabTapped,
          items: _navigationItems,
          type: BottomNavigationBarType.fixed,
          showSelectedLabels: true,
          showUnselectedLabels: true,
          selectedItemColor: Theme.of(context).primaryColor,
          unselectedItemColor: Colors.grey,
          backgroundColor: Colors.white,
          selectedFontSize: 12.rt,
          unselectedFontSize: 12.rt,
          elevation: 8,
        ),
      ),
    );
  }
} 