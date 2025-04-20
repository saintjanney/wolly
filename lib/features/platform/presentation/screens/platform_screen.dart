import 'package:flutter/material.dart';
import 'package:flexify/flexify.dart';
import 'package:wolly/features/library/presentation/screens/library.dart';
import 'package:wolly/Screens/profile/profile_screen.dart';
import 'package:wolly/features/dashboard/presentation/screens/dashboard_screen.dart';

class PlatformScreen extends StatefulWidget {
  const PlatformScreen({super.key});

  @override
  State<PlatformScreen> createState() => _PlatformScreenState();
}

class _PlatformScreenState extends State<PlatformScreen> {
  int _currentIndex = 0;
  
  // List of screens to be shown in the navigation
  final List<Widget> _screens = [
    const DashboardScreen(),
    Library(),
    const ProfileScreen(),
  ];

  // Navigation items
  final List<NavigationItem> _navigationItems = [
    const NavigationItem(
      icon: Icons.home_outlined,
      activeIcon: Icons.home,
      label: 'Home',
    ),
    const NavigationItem(
      icon: Icons.library_books_outlined,
      activeIcon: Icons.library_books,
      label: 'Library',
    ),
    const NavigationItem(
      icon: Icons.person_outline,
      activeIcon: Icons.person,
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
    // Determine if we're on a mobile or desktop device
    final isDesktop = MediaQuery.of(context).size.width >= 768;
    
    if (isDesktop) {
      // Web/desktop layout with side menu
      return Scaffold(
        body: Row(
          children: [
            // Side Menu
            Container(
              width: 220.rs,
              color: Colors.white,
              child: Column(
                children: [
                  // Logo/Brand
                  Container(
                    padding: EdgeInsets.symmetric(vertical: 24.rs),
                    child: Text(
                      'Wolly',
                      style: TextStyle(
                        fontSize: 24.rt,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                  ),
                  // Menu Items
                  Expanded(
                    child: ListView.builder(
                      itemCount: _navigationItems.length,
                      itemBuilder: (context, index) {
                        final item = _navigationItems[index];
                        final isSelected = index == _currentIndex;
                        
                        return Container(
                          margin: EdgeInsets.symmetric(horizontal: 16.rs, vertical: 4.rs),
                          decoration: BoxDecoration(
                            color: isSelected ? Theme.of(context).primaryColor.withOpacity(0.1) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8.rs),
                          ),
                          child: ListTile(
                            leading: Icon(
                              isSelected ? item.activeIcon : item.icon,
                              color: isSelected ? Theme.of(context).primaryColor : Colors.grey,
                            ),
                            title: Text(
                              item.label,
                              style: TextStyle(
                                fontSize: 14.rt,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: isSelected ? Theme.of(context).primaryColor : Colors.grey[700],
                              ),
                            ),
                            onTap: () => _onTabTapped(index),
                          ),
                        );
                      },
                    ),
                  ),
                  
                  // User info at bottom
                  Container(
                    padding: EdgeInsets.all(16.rs),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 16.rs,
                          backgroundColor: Colors.grey[200],
                          child: Icon(
                            Icons.person,
                            size: 20.rs,
                            color: Colors.grey[600],
                          ),
                        ),
                        SizedBox(width: 12.rs),
                        Expanded(
                          child: Text(
                            'User',
                            style: TextStyle(
                              fontSize: 14.rt,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // Main Content
            Expanded(
              child: _screens[_currentIndex],
            ),
          ],
        ),
      );
    } else {
      // Mobile layout with bottom navigation
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
            items: _navigationItems.map((item) => BottomNavigationBarItem(
              icon: Icon(item.icon),
              activeIcon: Icon(item.activeIcon),
              label: item.label,
            )).toList(),
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
}

// Helper class for navigation items
class NavigationItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const NavigationItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });

  BottomNavigationBarItem toBottomNavItem() {
    return BottomNavigationBarItem(
      icon: Icon(icon),
      activeIcon: Icon(activeIcon),
      label: label,
    );
  }
} 