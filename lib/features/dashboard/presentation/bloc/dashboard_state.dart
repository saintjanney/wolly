import 'package:equatable/equatable.dart';
import 'package:wolly/features/library/domain/models/book.dart';

enum DashboardStatus { initial, loading, loaded, error }

class DashboardState extends Equatable {
  final DashboardStatus status;
  final List<Book> readingProgress;
  final List<Book> recommendations;
  final String errorMessage;

  const DashboardState({
    this.status = DashboardStatus.initial,
    this.readingProgress = const [],
    this.recommendations = const [],
    this.errorMessage = '',
  });

  DashboardState copyWith({
    DashboardStatus? status,
    List<Book>? readingProgress,
    List<Book>? recommendations,
    String? errorMessage,
  }) {
    return DashboardState(
      status: status ?? this.status,
      readingProgress: readingProgress ?? this.readingProgress,
      recommendations: recommendations ?? this.recommendations,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, readingProgress, recommendations, errorMessage];
} 