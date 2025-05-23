import 'package:flutter/material.dart';
import 'package:flexify/flexify.dart';

class PlatformAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final VoidCallback? onBackPressed;

  const PlatformAppBar({
    super.key,
    required this.title,
    this.actions,
    this.onBackPressed,
  });

  @override
  Widget build(BuildContext context) {
    return AppBar(
      automaticallyImplyLeading: false,
      centerTitle: true,
      title: Text(
        title,
        style: TextStyle(
          fontSize: 18.rt,
          fontWeight: FontWeight.bold,
        ),
      ),
      actions: actions,
      elevation: 0,
      backgroundColor: Colors.white,
      foregroundColor: Colors.black,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
