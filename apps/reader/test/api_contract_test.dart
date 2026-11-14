import 'package:flutter_test/flutter_test.dart';
import 'package:wolly_reader/core/api/wolly_api.dart';

void main() {
  test('validates capability types and version before presenting features', () {
    expect(
        WollyApi.decodeCapabilities(
                '{"data":{"contractVersion":"v1","modules":[{"id":"catalog","enabled":false}]}}')
            .single
            .enabled,
        false);
    for (final body in [
      '{}',
      '{"data":{"contractVersion":"v2","modules":[]}}',
      '{"data":{"contractVersion":"v1","modules":[{"id":"catalog","enabled":"yes"}]}}'
    ]) {
      expect(() => WollyApi.decodeCapabilities(body), throwsFormatException);
    }
  });
}
