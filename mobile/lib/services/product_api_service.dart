import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:indigitech_shop/model/product.dart';
import 'package:indigitech_shop/core/constant/enum/product_size.dart';
import 'package:indigitech_shop/model/review.dart';

class ProductApiService {
  static const String baseUrl =
      'http://localhost:4000'; // Use your actual backend URL

  static Future<List<Product>> fetchProducts() async {
    final response = await http.get(Uri.parse('$baseUrl/allproducts'));

    if (response.statusCode == 200) {
      List<dynamic> productsJson = json.decode(response.body);
      return productsJson.map((json) => _parseProduct(json)).toList();
    } else {
      throw Exception('Failed to load products');
    }
  }

  static Product _parseProduct(Map<String, dynamic> json) {
    double old_price = (json['old_price'] ?? 0).toDouble();
    double new_price = (json['new_price'] ?? old_price).toDouble();
    double discount = old_price > 0 ? ((old_price - new_price) / old_price) : 0;

    return Product(
      name: json['name'] ?? '',
      old_price: old_price,
      new_price: new_price,
      discount: discount,
      description: json['description'] ?? '',
      reviews: (json['reviews'] as List<dynamic>?)
              ?.map((r) => Review(
                    name: r['name'] ?? '',
                    rate: (r['rate'] ?? 0).toDouble(),
                    comment: r['comment'] ?? '',
                  ))
              .toList() ??
          [],
      stocks: {
        ProductSize.s: json['s_stock'] ?? 0,
        ProductSize.m: json['m_stock'] ?? 0,
        ProductSize.l: json['l_stock'] ?? 0,
        ProductSize.xl: json['xl_stock'] ?? 0,
      },
      category: json['category'] ?? '',
      tags: List<String>.from(json['tags'] ?? []),
      image: json['image'] != null && json['image'] is List
        ? List<String>.from(json['image'])
        : [json['image']], // Assuming you have a fallback for single images
      available: json['available'] ?? false,
      isNew: DateTime.now().difference(DateTime.parse(json['date'])).inDays <= 30, // Check if it's recent
    );
  }
}
