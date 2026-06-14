import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_project_management/app.dart';

void main() {
  testWidgets('App should build without error', (WidgetTester tester) async {
    await tester.pumpWidget(const ProjectManagementApp());
    expect(find.text('Project Management'), findsNothing);
  });
}
