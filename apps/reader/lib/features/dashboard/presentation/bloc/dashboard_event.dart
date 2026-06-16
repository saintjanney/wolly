import 'package:equatable/equatable.dart';

abstract class DashboardEvent extends Equatable {
  const DashboardEvent();

  @override
  List<Object?> get props => [];
}

class LoadDashboard extends DashboardEvent {}

class RefreshDashboard extends DashboardEvent {}

class UpdateReadingProgress extends DashboardEvent {
  final String bookId;
  final int pagesRead;
  final int totalPages;

  const UpdateReadingProgress({
    required this.bookId,
    required this.pagesRead,
    required this.totalPages,
  });

  @override
  List<Object?> get props => [bookId, pagesRead, totalPages];
} 