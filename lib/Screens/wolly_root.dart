import "package:flutter/material.dart";
import "package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart";
import "package:wolly/features/library/presentation/screens/library.dart";
import "package:wolly/screens/dashboard_screen.dart";

import "package:wolly/screens/profile/profile_screen.dart";

class MinimalExample extends StatelessWidget {
  const MinimalExample({super.key});

  List<PersistentTabConfig> _tabs() => [
        PersistentTabConfig(
          screen: const DashboardScreen(),
          item: ItemConfig(
            icon: const Icon(Icons.home),
            title: "Home",
          ),
        ),
        PersistentTabConfig(
          screen: Library(),
          item: ItemConfig(
            icon: const Icon(Icons.library_books),
            title: "Library",
          ),
        ),
        PersistentTabConfig(
          screen: const ProfileScreen(),
          item: ItemConfig(
            icon: const Icon(Icons.person),
            title: "Profile",
          ),
        ),
      ];

  @override
  Widget build(BuildContext context) => PersistentTabView(
        backgroundColor: Colors.white,
        tabs: _tabs(),
        navBarBuilder: (navBarConfig) => Style1BottomNavBar(
          navBarConfig: navBarConfig,
          navBarDecoration: const NavBarDecoration(color: Colors.transparent),
        ),
        navBarOverlap: NavBarOverlap.none(),
        // navBarOverlap: const NavBarOverlap.full(),
      );
}
