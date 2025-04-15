import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import 'package:wolly/Providers/genre_provider.dart';
import 'package:wolly/Screens/wolly_admin.dart';
import 'package:wolly/core/theme/app_theme.dart';
import 'package:wolly/features/authentication/data/auth_repository.dart';
import 'package:wolly/features/authentication/presentation/bloc/auth_bloc.dart';
import 'package:wolly/features/authentication/presentation/screens/account_creation_screen.dart';
import 'package:wolly/features/dashboard/data/dashboard_repository.dart';
import 'package:wolly/features/dashboard/presentation/bloc/dashboard_bloc.dart';
import 'package:wolly/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:wolly/features/library/presentation/screens/file_download_example_screen.dart';
import 'package:wolly/features/library/presentation/screens/genre_books.dart';
import 'package:wolly/features/library/presentation/screens/genre_page.dart';
import 'package:wolly/features/platform/presentation/screens/platform_screen.dart';
import 'package:wolly/models/genre.dart';
import 'package:wolly/providers/mock_profile_provider.dart';
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

  // Initialize EmailOTP (using version 2.0.1 API)

  // Create repositories
  final authRepository = AuthRepository();
  final dashboardRepository = DashboardRepository();

  runApp(
    MultiProvider(
      providers: [
        // BLoC providers
        BlocProvider<AuthBloc>(
          create: (context) => AuthBloc(authRepository: authRepository),
        ),
        BlocProvider<DashboardBloc>(
          create: (context) => DashboardBloc(dashboardRepository: dashboardRepository),
        ),
        // ChangeNotifier providers
        ChangeNotifierProvider<MockProfileProvider>(
          create: (context) => MockProfileProvider(),
        ),
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
              final args = settings.arguments as Map<String, dynamic>;
              final email = args['email'] as String;

              return MaterialPageRoute(
                builder: (context) => OtpVerify(
                  email: email,
                ),
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
            case '/platform':
              return MaterialPageRoute(
                builder: (context) => const PlatformScreen(),
              );
            case '/dashboard':
              return MaterialPageRoute(
                builder: (context) => const DashboardScreen(),
              );
            case '/library':
              return MaterialPageRoute(
                builder: (context) => Library(),
              );
            case '/profile_info':
              return MaterialPageRoute(
                builder: (context) => const ProfileScreen(),
              );
            case '/file_download_example':
              return MaterialPageRoute(
                builder: (context) => const FileDownloadExampleScreen(),
              );
            case '/genres':
              return MaterialPageRoute(
                builder: (context) => const GenrePage(),
              );
            case '/genre_books':
              final genre = settings.arguments as Genre;
              return MaterialPageRoute(
                builder: (context) => GenreBooks(genre: genre),
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
