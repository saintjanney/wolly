import 'dart:async';
import 'package:bloc/bloc.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:wolly/features/authentication/data/auth_repository.dart';
import 'package:wolly/features/authentication/domain/auth_event.dart';
import 'package:wolly/features/authentication/domain/auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;
  late StreamSubscription<User?> _authStateSubscription;

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(const AuthState()) {
    on<AuthCheckStatusEvent>(_onAuthCheckStatus);
    on<AuthLoginEvent>(_onAuthLogin);
    on<AuthSignUpEvent>(_onAuthSignUp);
    on<AuthSetGenderAndBirthdayEvent>(_onAuthSetGenderAndBirthday);
    on<AuthSetPersonaEvent>(_onAuthSetPersona);
    on<AuthSetContentPreferencesEvent>(_onAuthSetContentPreferences);
    on<AuthSignOutEvent>(_onAuthSignOut);

    _authStateSubscription = _authRepository.authStateChanges.listen((user) {
      add(AuthCheckStatusEvent());
    });
  }

  Future<void> _onAuthCheckStatus(
    AuthCheckStatusEvent event,
    Emitter<AuthState> emit,
  ) async {
    final user = _authRepository.currentUser;
    if (user != null) {
      emit(state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
      ));
    } else {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
      ));
    }
  }

  Future<void> _onAuthLogin(
    AuthLoginEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    try {
      final result = await _authRepository.login(
        email: event.email,
        password: event.password,
      );
      if (result.isEmpty) {
        // Login successful, AuthCheckStatusEvent will handle the state update
      } else {
        emit(state.copyWith(
          isLoading: false,
          errorMessage: result,
        ));
      }
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> _onAuthSignUp(
    AuthSignUpEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    try {
      final result = await _authRepository.signUpUser(
        email: event.email,
        password: event.password,
        name: event.firstName,
        lastName: event.lastName,
        countryCode: event.countryCode,
        phoneNumber: event.phoneNumber,
        dateOfBirth: event.dateOfBirth,
      );
      if (result.isEmpty) {
        // Sign up successful, AuthCheckStatusEvent will handle the state update
      } else {
        emit(state.copyWith(
          isLoading: false,
          errorMessage: result,
        ));
      }
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> _onAuthSetGenderAndBirthday(
    AuthSetGenderAndBirthdayEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    try {
      final result = await _authRepository.setGenderAndBirthday(
        gender: event.gender,
        dob: event.dob,
      );
      emit(state.copyWith(
        isLoading: false,
        errorMessage: result.isEmpty ? null : result,
      ));
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> _onAuthSetPersona(
    AuthSetPersonaEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    try {
      final result = await _authRepository.setPersona(
        role: event.role,
      );
      emit(state.copyWith(
        isLoading: false,
        errorMessage: result.isEmpty ? null : result,
      ));
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> _onAuthSetContentPreferences(
    AuthSetContentPreferencesEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    try {
      final result = await _authRepository.setContentPreferences(
        contentPreferences: event.contentPreferences,
      );
      emit(state.copyWith(
        isLoading: false,
        errorMessage: result.isEmpty ? null : result,
      ));
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> _onAuthSignOut(
    AuthSignOutEvent event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authRepository.signOut();
      // AuthCheckStatusEvent will handle the state update
    } catch (e) {
      emit(state.copyWith(
        errorMessage: e.toString(),
      ));
    }
  }

  @override
  Future<void> close() {
    _authStateSubscription.cancel();
    return super.close();
  }
} 