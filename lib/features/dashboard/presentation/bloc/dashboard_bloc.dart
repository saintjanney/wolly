import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly/features/dashboard/data/dashboard_repository.dart';
import 'package:wolly/features/dashboard/presentation/bloc/dashboard_event.dart';
import 'package:wolly/features/dashboard/presentation/bloc/dashboard_state.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final DashboardRepository _dashboardRepository;

  DashboardBloc({required DashboardRepository dashboardRepository}) 
    : _dashboardRepository = dashboardRepository,
      super(const DashboardState()) {
    on<LoadDashboard>(_onLoadDashboard);
    on<RefreshDashboard>(_onRefreshDashboard);
  }

  Future<void> _onLoadDashboard(
    LoadDashboard event, 
    Emitter<DashboardState> emit
  ) async {
    emit(state.copyWith(status: DashboardStatus.loading));
    
    try {
      final readingProgress = await _dashboardRepository.getUserReadingProgress();
      final recommendations = await _dashboardRepository.getBookRecommendations();
      
      emit(state.copyWith(
        status: DashboardStatus.loaded,
        readingProgress: readingProgress,
        recommendations: recommendations,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: DashboardStatus.error,
        errorMessage: 'Failed to load dashboard: $e',
      ));
    }
  }

  Future<void> _onRefreshDashboard(
    RefreshDashboard event, 
    Emitter<DashboardState> emit
  ) async {
    try {
      final readingProgress = await _dashboardRepository.getUserReadingProgress();
      final recommendations = await _dashboardRepository.getBookRecommendations();
      
      emit(state.copyWith(
        status: DashboardStatus.loaded,
        readingProgress: readingProgress,
        recommendations: recommendations,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: DashboardStatus.error,
        errorMessage: 'Failed to refresh dashboard: $e',
      ));
    }
  }
} 