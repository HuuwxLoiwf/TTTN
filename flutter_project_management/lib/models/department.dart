class Department {
  final String id;
  final String name;
  final String? description;
  final String workspaceId;
  final int projectCount;

  Department({
    required this.id,
    required this.name,
    this.description,
    required this.workspaceId,
    this.projectCount = 0,
  });

  factory Department.fromJson(Map<String, dynamic> json) {
    return Department(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      workspaceId: json['workspaceId'],
      projectCount: json['_count']?['projects'] ?? 0,
    );
  }
}
