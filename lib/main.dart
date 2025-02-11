import 'package:email_otp/email_otp.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:wolly/Screens/library/library.dart';
import 'package:wolly/Screens/login/otp_verify.dart';
import 'package:wolly/Screens/profile/profile_screen.dart';
import 'package:wolly/providers/dashboard_provider.dart';
import 'package:wolly/providers/genre_provider.dart';
import 'package:wolly/providers/library_provider.dart';
import 'package:wolly/providers/profile_provider.dart';
import 'package:wolly/screens/login/login.dart';
import 'package:wolly/screens/create_account/account_creation.dart';
import 'firebase_options.dart';
import 'package:flexify/flexify.dart';

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

  EmailOTP.config(
    appName: 'Wolly',
    otpType: OTPType.numeric,
    emailTheme: EmailTheme.v1,
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
    return Flexify(
      designWidth: 390,
      designHeight: 844,
      app: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Wolly',
        onGenerateRoute: (settings) {
          switch (settings.name) {
            case '/otp_verify':
              final email = settings.arguments as String;
              return MaterialPageRoute(
                builder: (context) => OtpVerify(email: email),
              );
            case '/account_creation':
              final email = settings.arguments as String;
              return MaterialPageRoute(
                builder: (context) => AccountCreationScreen(
                  userEmail: email,
                ),
              );
            case '/':
              return MaterialPageRoute(
                builder: (context) => const Login(),
              );
            case '/library':
              return MaterialPageRoute(
                builder: (context) => Library(),
              );
            case '/profile_info':
              return MaterialPageRoute(
                builder: (context) => const ProfileScreen(),
              );
            default:
              return MaterialPageRoute(
                builder: (context) => const Login(),
              );
          }
        },
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
          useMaterial3: true,
        ),
        initialRoute: "/",
      ),
    );
  }
}
