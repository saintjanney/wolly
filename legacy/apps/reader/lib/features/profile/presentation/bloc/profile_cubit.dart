import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:equatable/equatable.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly_mobile/models/wolly_user.dart';

class ProfileState extends Equatable {
  final bool isLoading;
  final WollyUser? user;
  final String? error;

  const ProfileState({this.isLoading = false, this.user, this.error});

  ProfileState copyWith({bool? isLoading, WollyUser? user, String? error}) {
    return ProfileState(
      isLoading: isLoading ?? this.isLoading,
      user: user ?? this.user,
      error: error,
    );
  }

  @override
  List<Object?> get props => [isLoading, user, error];
}

/// Loads the signed-in reader's profile document from the `users` collection.
class ProfileCubit extends Cubit<ProfileState> {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  ProfileCubit({FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        super(const ProfileState());

  Future<void> load() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) {
      emit(const ProfileState(error: 'Not signed in'));
      return;
    }
    emit(state.copyWith(isLoading: true, error: null));
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      final data = Map<String, dynamic>.from(doc.data() ?? {});
      data['content_preferences'] ??= <dynamic>[];
      data['email'] ??= _auth.currentUser?.email;
      emit(ProfileState(isLoading: false, user: WollyUser.fromMap(data)));
    } catch (e) {
      emit(ProfileState(isLoading: false, error: e.toString()));
    }
  }
}
