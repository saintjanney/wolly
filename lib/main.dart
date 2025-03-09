import 'package:email_otp/email_otp.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly/core/theme/app_theme.dart';
import 'package:wolly/features/authentication/data/auth_repository.dart';
import 'package:wolly/features/authentication/presentation/bloc/auth_bloc.dart';
import 'package:wolly/features/authentication/presentation/screens/account_creation_screen.dart';
// import 'package:wolly/features/dashboard/presentation/bloc/dashboard_bloc.dart';
// import 'package:wolly/features/library/presentation/bloc/library_bloc.dart';
// import 'package:wolly/features/profile/presentation/bloc/profile_bloc.dart';
import 'package:wolly/Screens/library/library.dart';
import 'package:wolly/Screens/login/otp_verify.dart';
import 'package:wolly/Screens/profile/profile_screen.dart';
import 'package:wolly/screens/login/login.dart';
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

  // Create repositories
  final authRepository = AuthRepository();

  runApp(
    MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (context) => AuthBloc(authRepository: authRepository),
        ),
        // Add other BLoC providers here as they are implemented
        // BlocProvider<ProfileBloc>(
        //   create: (context) => ProfileBloc(),
        // ),
        // BlocProvider<LibraryBloc>(
        //   create: (context) => LibraryBloc(),
        // ),
        // BlocProvider<DashboardBloc>(
        //   create: (context) => DashboardBloc(),
        // ),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
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
        theme: AppTheme.lightTheme,
        initialRoute: "/",
      ),
    );
  }
}
