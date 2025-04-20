import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly/features/genre/data/genre_repository.dart';
import 'package:wolly/features/genre/domain/genre_event.dart';
import 'package:wolly/features/genre/domain/genre_state.dart';

class GenreBloc extends Bloc<GenreEvent, GenreState> {
  final GenreRepository _genreRepository;

  GenreBloc({required GenreRepository genreRepository})
      : _genreRepository = genreRepository,
        super(const GenreState()) {
    on<LoadGenres>(_onLoadGenres);
    on<RefreshGenres>(_onRefreshGenres);
    on<UpdateGenreBookCounts>(_onUpdateGenreBookCounts);
    
    // Load genres automatically on initialization
    add(LoadGenres());
  }

  Future<void> _onLoadGenres(
    LoadGenres event,
    Emitter<GenreState> emit,
  ) async {
    emit(state.copyWith(status: GenreStatus.loading));
    
    try {
      final genres = await _genreRepository.fetchGenres();
      emit(state.copyWith(
        status: GenreStatus.loaded,
        genres: genres,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: GenreStatus.error,
        errorMessage: 'Failed to load genres: $e',
      ));
    }
  }

  Future<void> _onRefreshGenres(
    RefreshGenres event,
    Emitter<GenreState> emit,
  ) async {
    try {
      final genres = await _genreRepository.fetchGenres();
      emit(state.copyWith(
        status: GenreStatus.loaded,
        genres: genres,
        errorMessage: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: GenreStatus.error,
        errorMessage: 'Failed to refresh genres: $e',
      ));
    }
  }

  Future<void> _onUpdateGenreBookCounts(
    UpdateGenreBookCounts event,
    Emitter<GenreState> emit,
  ) async {
    try {
      await _genreRepository.updateGenreBookCounts(state.genres);
      add(RefreshGenres());
    } catch (e) {
      emit(state.copyWith(
        errorMessage: 'Failed to update genre book counts: $e',
      ));
    }
  }
} 