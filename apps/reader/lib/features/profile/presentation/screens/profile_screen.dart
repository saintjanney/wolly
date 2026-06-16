import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly_mobile/features/authentication/presentation/bloc/auth_bloc.dart';
import 'package:wolly_mobile/features/authentication/domain/auth_event.dart';
import 'package:wolly_mobile/features/profile/presentation/bloc/profile_cubit.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<ProfileCubit>(
      create: (_) => ProfileCubit()..load(),
      child: const _ProfileView(),
    );
  }
}

class _ProfileView extends StatelessWidget {
  const _ProfileView();

  void _handleLogout(BuildContext context) {
    context.read<AuthBloc>().add(AuthSignOutEvent());
    Navigator.of(context, rootNavigator: true)
        .pushNamedAndRemoveUntil('/', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: BlocBuilder<ProfileCubit, ProfileState>(
        builder: (context, state) {
          if (state.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          final user = state.user;
          if (user == null) {
            return Center(
              child: Text(state.error ?? 'No profile found'),
            );
          }

          final fullName = [user.firstName, user.lastName]
              .where((p) => p != null && p.isNotEmpty)
              .join(' ');

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 12),
              Center(
                child: CircleAvatar(
                  radius: 44,
                  backgroundColor: const Color(0xFF6366F1),
                  backgroundImage: (user.photoUrl != null && user.photoUrl!.isNotEmpty)
                      ? NetworkImage(user.photoUrl!)
                      : null,
                  child: (user.photoUrl == null || user.photoUrl!.isEmpty)
                      ? Text(
                          (fullName.isNotEmpty ? fullName[0] : '?').toUpperCase(),
                          style: const TextStyle(fontSize: 32, color: Colors.white),
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  fullName.isEmpty ? 'Reader' : fullName,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
              ),
              Center(
                child: Text(
                  user.persona ?? 'Reader',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ),
              const SizedBox(height: 24),
              if (user.email != null) _InfoTile(label: 'Email', value: user.email!),
              if (user.phoneNumber != null)
                _InfoTile(label: 'Phone', value: user.phoneNumber!),
              if (user.gender != null) _InfoTile(label: 'Gender', value: user.gender!),
              if (user.birthday != null)
                _InfoTile(label: 'Birthday', value: user.birthday!),
              if (user.contentPreference.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text('Interests',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final pref in user.contentPreference)
                      Chip(label: Text(pref.toString())),
                  ],
                ),
              ],
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () => _handleLogout(context),
                icon: const Icon(Icons.logout),
                label: const Text('Log out'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String label;
  final String value;
  const _InfoTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
