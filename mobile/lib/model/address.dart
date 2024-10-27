import 'package:json_annotation/json_annotation.dart';

part 'address.g.dart';

@JsonSerializable()
class Address {
  final String name;
  final String phone; // Ensure this is defined
  final String province;
  final String municipality;
  final String barangay;
  final String zip;
  final String street;
  final String region;

  Address({
    this.name = '',
    this.phone = '', // Initialize phone number
    this.province = '',
    this.municipality = '',
    this.barangay = '',
    this.zip = '',
    this.street = '',
    this.region = '',
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      name: json['name'] ?? '',
      phone: json['phone'] ?? '', // Ensure this key exists
      province: json['province'] ?? '',
      municipality: json['municipality'] ?? '',
      barangay: json['barangay'] ?? '',
      zip: json['zip'] ?? '',
      street: json['street'] ?? '',
      region: json['region'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phone': phone, // Include in JSON serialization
      'province': province,
      'municipality': municipality,
      'barangay': barangay,
      'zip': zip,
      'street': street,
    };
  }
}
