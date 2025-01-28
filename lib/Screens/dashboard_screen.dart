import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wolly/providers/profile_provider.dart';
import 'package:wolly/providers/dashboard_provider.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Consumer2<DashboardProvider, ProfileProvider>(
          builder: (context, dataProvider, profileProvider, _) {
        if (!dataProvider.dataLoadStarted) {
          dataProvider.fetchData();
          // return const Center(child: CircularProgressIndicator());
        } else if (profileProvider.user == null) {
          profileProvider.fetchUserData("MxsFoheaU1WXeudFEQVJvUHbY822");
          return const Center(child: CircularProgressIndicator());
        }
        return SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(
                height: 64,
              ),
              Row(
                children: [
                  const CircleAvatar(
                    radius: 40,
                    backgroundImage: const NetworkImage(
                        'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'),
                  ),
                  const SizedBox(
                    width: 16,
                  ),
                  Text(
                    "Hi, ${profileProvider.user?.firstName ?? ""}👋🏾",
                    style: const TextStyle(fontSize: 18),
                  ),
                ],
              ),
              const SizedBox(
                height: 40,
              ),
              const Text(
                "Pick up where you left off",
                style: TextStyle(fontSize: 18),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text("Some book title"),
                leading: Container(
                  height: 50,
                  width: 50,
                  decoration: BoxDecoration(
                    color: Colors.grey,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                subtitle: LinearProgressIndicator(
                  value: 0.5,
                ),
                trailing: Icon(Icons.east),
                onTap: () {},
              ),
              const SizedBox(
                height: 40,
              ),
              Row(children: [
                const Text(
                  "Top Picks for you",
                  style: TextStyle(fontSize: 18),
                ),
                Spacer(),
                InkWell(onTap: () {}, child: Text("View All"))
              ]),
              SizedBox(
                height: 250,
                child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: 5,
                    padding: EdgeInsets.zero,
                    shrinkWrap: true,
                    itemBuilder: (context, index) {
                      return const Card(
                        color: Colors.grey,
                        child: Column(
                          children: [
                            Text("dataProvider.data[index].title)"),
                            Text("dataProvider.data[index].description"),
                          ],
                        ),
                      );
                    }),
              ),
              const SizedBox(
                height: 40,
              ),
              Row(children: [
                const Text(
                  "These might interest you",
                  style: TextStyle(fontSize: 18),
                ),
                const Spacer(),
                InkWell(onTap: () {}, child: const Text("Explore Wolly"))
              ]),
              GridView.builder(
                  padding: EdgeInsets.zero,
                  physics: const NeverScrollableScrollPhysics(),
                  shrinkWrap: true,
                  itemCount: 4,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2),
                  itemBuilder: (context, index) {
                    return const Card(
                      color: Colors.grey,
                      child: Column(
                        children: [
                          Text("dataProvider.data[index].title)"),
                          Text("dataProvider.data[index].description"),
                        ],
                      ),
                    );
                  }),
              const SizedBox(
                height: 66,
              )
            ],
          ),
        );
      }),
    );
  }
}
