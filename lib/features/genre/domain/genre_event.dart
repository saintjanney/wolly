import 'package:equatable/equatable.dart';

abstract class GenreEvent extends Equatable {
  const GenreEvent();

  @override
  List<Object?> get props => [];
}

class LoadGenres extends GenreEvent {}

class RefreshGenres extends GenreEvent {}

class UpdateGenreBookCounts extends GenreEvent {} 