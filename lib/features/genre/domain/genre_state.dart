import 'package:equatable/equatable.dart';
import 'package:wolly/features/genre/domain/models/genre.dart';

enum GenreStatus { initial, loading, loaded, error }

class GenreState extends Equatable {
  final GenreStatus status;
  final List<Genre> genres;
  final String? errorMessage;

  const GenreState({
    this.status = GenreStatus.initial,
    this.genres = const [],
    this.errorMessage,
  });

  GenreState copyWith({
    GenreStatus? status,
    List<Genre>? genres,
    String? errorMessage,
  }) {
    return GenreState(
      status: status ?? this.status,
      genres: genres ?? this.genres,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, genres, errorMessage];
} 