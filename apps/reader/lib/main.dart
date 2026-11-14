import 'package:flutter/material.dart';
import 'core/api/wolly_api.dart';

void main() => runApp(const WollyReader());

class WollyReader extends StatelessWidget {
  const WollyReader({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Wolly reader',
        theme: ThemeData(colorSchemeSeed: const Color(0xff224e43)),
        home: const ConnectionScreen(),
      );
}

class ConnectionScreen extends StatefulWidget {
  const ConnectionScreen({super.key});
  @override
  State<ConnectionScreen> createState() => _ConnectionScreenState();
}

class _ConnectionScreenState extends State<ConnectionScreen> {
  final api = WollyApi(const String.fromEnvironment('WOLLY_API_ORIGIN',
      defaultValue: 'http://127.0.0.1:8080'));
  late Future<List<Capability>> pending;
  @override
  void initState() {
    super.initState();
    pending = api.capabilities();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Wolly reader')),
        body: Padding(
            padding: const EdgeInsets.all(24),
            child: FutureBuilder<List<Capability>>(
              future: pending,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                            'The Wolly API is unavailable. Check your configured API origin.'),
                        FilledButton(
                            onPressed: () => setState(() {
                                  pending = api.capabilities();
                                }),
                            child: const Text('Retry')),
                      ]);
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                return ListView(children: [
                  const Text('API connected', style: TextStyle(fontSize: 26)),
                  const Text(
                      'Integration workspace. Reader features are not implemented yet.'),
                  ...snapshot.data!.map((item) => ListTile(
                      title: Text(item.id),
                      trailing: Text(item.enabled ? 'Available' : 'Planned'))),
                ]);
              },
            )),
      );
}
