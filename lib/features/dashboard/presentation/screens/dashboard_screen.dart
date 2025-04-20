import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flexify/flexify.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import 'package:wolly/features/dashboard/presentation/bloc/dashboard_bloc.dart';
import 'package:wolly/features/dashboard/presentation/bloc/dashboard_event.dart';
import 'package:wolly/features/dashboard/presentation/bloc/dashboard_state.dart';
import 'package:wolly/features/dashboard/presentation/widgets/book_recommendation_card.dart';
import 'package:wolly/features/dashboard/presentation/widgets/reading_progress_card.dart';
import 'package:wolly/features/platform/presentation/widgets/platform_app_bar.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    context.read<DashboardBloc>().add(LoadDashboard());
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 768;
    
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: isDesktop 
          ? AppBar(
              backgroundColor: Colors.white,
              title: Text(
                'Wolly',
                style: TextStyle(
                  fontSize: 20.rt,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
              elevation: 0,
            )
          : const PlatformAppBar(
              title: 'Wolly',
            ),
      body: BlocBuilder<DashboardBloc, DashboardState>(
        builder: (context, state) {
          switch (state.status) {
            case DashboardStatus.initial:
            case DashboardStatus.loading:
              return const Center(
                child: CircularProgressIndicator(),
              );
            
            case DashboardStatus.loaded:
              return RefreshIndicator(
                onRefresh: () async {
                  context.read<DashboardBloc>().add(RefreshDashboard());
                },
                child: _buildDashboardContent(context, state),
              );
            
            case DashboardStatus.error:
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Something went wrong',
                      style: TextStyle(
                        fontSize: 16.rt,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(height: 16.rs),
                    ElevatedButton(
                      onPressed: () {
                        context.read<DashboardBloc>().add(RefreshDashboard());
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              );
          }
        },
      ),
    );
  }

  Widget _buildDashboardContent(BuildContext context, DashboardState state) {
    final isDesktop = MediaQuery.of(context).size.width >= 768;
    
    return CustomScrollView(
      slivers: [
        // Reading Progress Section
        if (state.readingProgress.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16.rs, 24.rs, 16.rs, 8.rs),
              child: Text(
                'Continue Reading',
                style: TextStyle(
                  fontSize: 24.rt,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 160.rs,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: state.readingProgress.length,
                itemBuilder: (context, index) {
                  return ReadingProgressCard(
                    book: state.readingProgress[index],
                    width: isDesktop ? 400.rs : 300.rs,
                  );
                },
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(height: 20.rs),
          ),
        ],

        // Book Recommendations
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(16.rs, 16.rs, 16.rs, 8.rs),
            child: Text(
              'Recommended for You',
              style: TextStyle(
                fontSize: 24.rt,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        
        // Display recommendations as a grid or list
        isDesktop
            ? _buildDesktopRecommendations(state)
            : _buildMobileRecommendations(state),
      ],
    );
  }
  
  Widget _buildDesktopRecommendations(DashboardState state) {
    if (state.recommendations.isEmpty) {
      return SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(32.rs),
            child: Text(
              'No recommendations available yet',
              style: TextStyle(
                fontSize: 14.rt,
                color: Colors.grey[600],
              ),
            ),
          ),
        ),
      );
    }
    
    return SliverPadding(
      padding: EdgeInsets.all(16.rs),
      sliver: SliverGrid(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          childAspectRatio: 0.7,
          mainAxisSpacing: 16.rs,
          crossAxisSpacing: 16.rs,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            return BookRecommendationCard(
              book: state.recommendations[index],
              height: 280.rs,
            );
          },
          childCount: state.recommendations.length,
        ),
      ),
    );
  }
  
  Widget _buildMobileRecommendations(DashboardState state) {
    if (state.recommendations.isEmpty) {
      return SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(32.rs),
            child: Text(
              'No recommendations available yet',
              style: TextStyle(
                fontSize: 14.rt,
                color: Colors.grey[600],
              ),
            ),
          ),
        ),
      );
    }
    
    return SliverPadding(
      padding: EdgeInsets.symmetric(horizontal: 8.rs),
      sliver: SliverMasonryGrid.count(
        crossAxisCount: 2,
        mainAxisSpacing: 8.rs,
        crossAxisSpacing: 8.rs,
        childCount: state.recommendations.length,
        itemBuilder: (context, index) {
          return BookRecommendationCard(
            book: state.recommendations[index],
            height: 220.rs,
          );
        },
      ),
    );
  }
} 