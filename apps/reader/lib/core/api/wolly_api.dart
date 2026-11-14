import 'dart:convert';
import 'dart:io';

class Capability {
  final String id;
  final bool enabled;
  const Capability(this.id, this.enabled);
}

class WollyApi {
  final Uri origin;
  WollyApi(String origin) : origin = Uri.parse(origin);
  static List<Capability> decodeCapabilities(String body) {
    final value = jsonDecode(body);
    if (value is! Map<String, dynamic>) {
      throw const FormatException('Invalid envelope');
    }
    final data = value['data'];
    if (data is! Map<String, dynamic> ||
        data['contractVersion'] != 'v1' ||
        data['modules'] is! List) {
      throw const FormatException('Unsupported capability contract');
    }
    return (data['modules'] as List).map((item) {
      if (item is! Map<String, dynamic> ||
          item['id'] is! String ||
          item['enabled'] is! bool) {
        throw const FormatException('Invalid capability');
      }
      return Capability(item['id'] as String, item['enabled'] as bool);
    }).toList();
  }

  Future<List<Capability>> capabilities() async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 5);
    try {
      final request = await client
          .getUrl(origin.resolve('/api/v1/capabilities'))
          .timeout(const Duration(seconds: 5));
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      final response =
          await request.close().timeout(const Duration(seconds: 5));
      if (response.statusCode != 200) {
        throw HttpException('API returned ${response.statusCode}');
      }
      final body = await utf8.decoder
          .bind(response)
          .join()
          .timeout(const Duration(seconds: 5));
      return decodeCapabilities(body);
    } finally {
      client.close(force: true);
    }
  }
}
