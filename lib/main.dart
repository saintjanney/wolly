import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:wolly/Screens/library/library.dart';
import 'package:wolly/providers/dashboard_provider.dart';
import 'package:wolly/providers/genre_provider.dart';
import 'package:wolly/providers/library_provider.dart';
import 'package:wolly/providers/profile_provider.dart';
import 'package:wolly/screens/login/login.dart';
import 'package:wolly/screens/create_account/account_creation.dart';
import 'package:wolly/screens/profile/profile_screen.dart';
import 'package:wolly/screens/wolly_root.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // make navigation bar transparent
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      systemNavigationBarColor: Colors.transparent,
    ),
  );
  // make flutter draw behind navigation bar
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(MultiProvider(providers: [
    ChangeNotifierProvider<ProfileProvider>(
        create: (context) => ProfileProvider()),
    ChangeNotifierProvider<LibraryProvider>(
        create: (context) => LibraryProvider()),
    ChangeNotifierProvider(create: (cotenxt) => DashboardProvider()),
    ChangeNotifierProvider(create: (cotenxt) => GenreProvider()),
  ], child: const MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    // GenreProvider.fetchAndStoreEpubs();
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Wolly',
      routes: {
        "/": (context) => Library() //const Login(),
        // "/account_creation": (context) => const AccountCreationScreen(),
        // '/profile_info': (context) => const ProfileScreen(),
        // "/root": (context) => const MinimalExample(),
      },
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      initialRoute: "/",
    );
  }
}
