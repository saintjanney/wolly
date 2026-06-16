import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import 'package:wolly_mobile/core/theme/app_theme.dart';
import 'package:wolly_mobile/features/authentication/data/auth_repository.dart';
import 'package:wolly_mobile/features/authentication/presentation/bloc/auth_bloc.dart';
import 'package:wolly_mobile/features/authentication/presentation/screens/account_creation_screen.dart';
import 'package:wolly_mobile/features/dashboard/data/dashboard_repository.dart';
import 'package:wolly_mobile/features/dashboard/presentation/bloc/dashboard_bloc.dart';
import 'package:wolly_mobile/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:wolly_mobile/features/genre/data/genre_repository.dart';
import 'package:wolly_mobile/features/genre/presentation/bloc/genre_bloc.dart';
import 'package:wolly_mobile/features/library/presentation/screens/file_download_example_screen.dart';
import 'package:wolly_mobile/features/library/presentation/screens/genre_books.dart';
import 'package:wolly_mobile/features/library/presentation/screens/genre_page.dart';
import 'package:wolly_mobile/features/genre/domain/models/genre.dart';
import 'package:wolly_mobile/providers/mock_profile_provider.dart';
import 'package:wolly_mobile/core/providers/reader_settings_provider.dart';
import 'package:wolly_mobile/core/config/app_config.dart';
import 'package:wolly_mobile/features/store/presentation/screens/book_detail_screen.dart';
import 'package:wolly_mobile/features/library/presentation/screens/search_screen.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';
import 'package:wolly_mobile/features/library/presentation/screens/library.dart';
import 'package:wolly_mobile/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:wolly_mobile/core/widgets/auth_gate.dart';
import 'package:wolly_mobile/Screens/login/otp_verify.dart';
import 'package:wolly_mobile/Screens/profile/profile_screen.dart';
import 'package:wolly_mobile/core/widgets/main_navigation.dart';
import 'package:wolly_mobile/features/authentication/presentation/screens/otp_login_screen.dart';
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

  // Create repositories
  final authRepository = AuthRepository();
  final dashboardRepository = DashboardRepository();
  final genreRepository = GenreRepository();

  runApp(
    MultiProvider(
      providers: [
        // BLoC providers
        BlocProvider<AuthBloc>(
          create: (context) => AuthBloc(authRepository: authRepository),
        ),
        BlocProvider<DashboardBloc>(
          create: (context) =>
              DashboardBloc(dashboardRepository: dashboardRepository),
        ),
        BlocProvider<GenreBloc>(
          create: (context) => GenreBloc(genreRepository: genreRepository),
        ),
        // ChangeNotifier providers
        ChangeNotifierProvider<MockProfileProvider>(
          create: (context) => MockProfileProvider(),
        ),
        ChangeNotifierProvider<ReaderSettingsProvider>(
          create: (context) => ReaderSettingsProvider(),
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
              final verificationId = args['verificationId'] as String;
              final phoneNumber = args['phoneNumber'] as String;

              return MaterialPageRoute(
                builder: (context) => OtpVerify(
                  verificationId: verificationId,
                  phoneNumber: phoneNumber,
                ),
              );
            case '/account_creation':
              final args = settings.arguments;
              String email = '';
              bool alreadyAuthenticated = false;
              if (args is String) {
                email = args;
              } else if (args is Map<String, dynamic>) {
                email = args['email'] as String? ?? '';
                alreadyAuthenticated =
                    args['alreadyAuthenticated'] as bool? ?? false;
              }
              return MaterialPageRoute(
                builder: (context) => AccountCreationScreen(
                  userEmail: email,
                  alreadyAuthenticated: alreadyAuthenticated,
                ),
              );
            // case '/':
            //   return MaterialPageRoute(
            //     builder: (context) => const Login(),
            //   );
            case '/':
              return MaterialPageRoute(
                builder: (context) => const AuthGate(),
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
            case '/search':
              return MaterialPageRoute(
                builder: (context) => const SearchScreen(),
              );
            case '/book_detail':
              final book = settings.arguments as Book;
              return MaterialPageRoute(
                builder: (context) => BookDetailScreen(book: book),
              );
            case '/onboarding':
              return MaterialPageRoute(
                builder: (context) => const OnboardingScreen(),
              );
            case '/login':
              return MaterialPageRoute(
                builder: (context) => const OtpLoginScreen(),
              );
            default:
              return MaterialPageRoute(
                builder: (context) => const OtpLoginScreen(),
              );
          }
        },
        theme: AppTheme.lightTheme,
        initialRoute: "/",
      ),
    );
  }
}
