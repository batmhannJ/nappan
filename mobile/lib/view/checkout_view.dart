
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import 'package:indigitech_shop/core/style/colors.dart';
import 'package:indigitech_shop/core/style/font_weights.dart';
import 'package:indigitech_shop/core/style/text_styles.dart';
import 'package:indigitech_shop/model/user.dart';
import 'package:indigitech_shop/services/address_service.dart';
import 'package:indigitech_shop/view/address_view.dart';
import 'package:indigitech_shop/view/layout/default_view_layout.dart';
import 'package:indigitech_shop/view_model/address_view_model.dart';
import 'package:indigitech_shop/view_model/auth_view_model.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http; // Add this import
import 'dart:convert';
import '../model/address.dart';
import '../model/product.dart';
import '../view_model/cart_view_model.dart';
import '../widget/buttons/custom_filled_button.dart';
import 'package:indigitech_shop/view/checkout_result.dart';
// ignore: depend_on_referenced_packages
import 'package:url_launcher/url_launcher.dart'; // Add this import for URL launching
// ignore: depend_on_referenced_packages
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart'; // Make sure to add geolocator package to your pubspec.yaml


class CheckoutView extends StatefulWidget {
  final User? user; // User information passed from AddressView
  final Address? address; // Address details passed from AddressView

  const CheckoutView({super.key, this.user, this.address});

  @override
  State<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends State<CheckoutView> {
  final AddressService _addressService =
      AddressService('https://isaacdarcilla.github.io/philippine-addresses');


  Future<void> proceedToPayment(BuildContext context) async {
    final userAddress = context.read<AuthViewModel>().address;
    
    if (userAddress == null) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text("Address Required"),
          content: Text("Please set your address before proceeding to payment."),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text("OK"),
            ),
          ],
        ),
      );
      return; // Stop if no address is set
    }
  final cartViewModel = context.read<CartViewModel>();
  final subtotal = cartViewModel.getSubtotal();

  // Prepare your payment request data here
  final paymentData = {
    //"intent": "SALE",
    "totalAmount": { // Correctly specify totalAmount as an object
      "currency": "PHP",
      "value": subtotal.toString(), // Ensure subtotal is a string
    },
    "requestReferenceNumber": DateTime.now().millisecondsSinceEpoch.toString(), // Generate a unique request reference number
  };

  const publicKey = 'pk-NCLk7JeDbX1m22ZRMDYO9bEPowNWT5J4aNIKIbcTy2a'; // Replace with your public key
  const secretKey = '8MqXdZYWV9UJB92Mc0i149CtzTWT7BYBQeiarM27iAi'; // Replace with your secret key
  final auth = base64Encode(utf8.encode('$publicKey:$secretKey'));


  final response = await http.post(
    Uri.parse("https://pg-sandbox.paymaya.com/checkout/v1/checkouts"),
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic $auth", // Set Authorization header
    },
    body: json.encode(paymentData),
  );

  if (response.statusCode == 200) {
    final responseData = json.decode(response.body);
    final checkoutUrl = responseData['redirectUrl']; // Extract the redirect URL

    // Launch the PayMaya checkout URL
    // ignore: deprecated_member_use
    if (await canLaunch(checkoutUrl)) {
      // ignore: deprecated_member_use
      await launch(checkoutUrl);
       Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => CheckoutSuccessView()), // Navigate on successful payment
      );
    } else {
      // Handle the error if the URL cannot be launched
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => CheckoutFailureView()),
      );
      print('Could not launch $checkoutUrl');
    }
  }  else {
   // Handle failure - navigate to CheckoutFailureView
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => CheckoutFailureView()),
    );
    print('Payment failed: ${response.body}');
  }
}

  List<dynamic> regions = [];
  List<dynamic> provinces = [];
  List<dynamic> cities = [];
  List<dynamic> barangays = [];

  String? selectedRegion;
  String? selectedProvince;
  String? selectedCity;
  String? selectedBarangay;

  @override
  void initState() {
    super.initState();
    final authViewModel = context.read<AuthViewModel>();
    authViewModel.fetchUserAddress().then((_) {
      setState(() {
        final userAddress = authViewModel.address;

        // Update drop-downs for region, province, city, and barangay
        selectedRegion = userAddress?.region;
        selectedProvince = userAddress?.province;
        selectedCity = userAddress?.municipality;
        selectedBarangay = userAddress?.barangay;

        // Fetch corresponding provinces, cities, and barangays based on address
        if (selectedRegion != null) {
          fetchProvinces(selectedRegion!);
        }
        if (selectedProvince != null) {
          fetchCities(selectedProvince!);
        }
        if (selectedCity != null) {
          fetchBarangays(selectedCity!);
        }
        print('Street: ${userAddress?.street}');
        print('Zip: ${userAddress?.zip}');

      });
    });

    // Fetch regions initially
    fetchRegions();

  }

Future<void> fetchRegions() async {
    try {
      regions = await _addressService.regions();
      setState(() {
        // Clear the previous selections to avoid duplicates
        if (selectedRegion != null && regions.any((region) => region['region_code'] == selectedRegion)) {
          // Keep selectedRegion if it is still valid
          selectedRegion = selectedRegion; 
        } else if (regions.isNotEmpty) {
          // Reset selectedRegion to the first one if not valid
          selectedRegion = regions[0]['region_code'];
        } else {
          selectedRegion = null; // Handle the case when there are no regions
        }
      });
    } catch (error) {
      print("Error fetching regions: $error");
    }
  }

Future<void> fetchProvinces(String regionCode) async {
  try {
    List<dynamic> fetchedProvinces = await _addressService.provinces(regionCode);
    setState(() {
      provinces.clear(); // Clear previous provinces to avoid duplicates
      provinces.addAll(fetchedProvinces);
      // Reset selectedProvince if it's not found in the new list
      if (provinces.any((province) => province['province_code'] == selectedProvince)) {
        // If selectedProvince exists in the new provinces
        selectedProvince = selectedProvince; 
      } else {
        selectedProvince = provinces.isNotEmpty ? provinces[0]['province_code'] : null; // Default to first province
      }
    });
  } catch (error) {
    print("Error fetching provinces: $error");
  }
}

Future<void> fetchCities(String provinceCode) async {
  try {
    List<dynamic> fetchedCities = await _addressService.cities(provinceCode);
    setState(() {
      cities.clear(); // Clear previous cities to avoid duplicates
      cities.addAll(fetchedCities);
      // Reset selectedCity if it's not found in the new list
      if (cities.any((city) => city['city_code'] == selectedCity)) {
        // If selectedCity exists in the new cities
        selectedCity = selectedCity;
      } else {
        selectedCity = cities.isNotEmpty ? cities[0]['city_code'] : null; // Default to first city
      }
      // Fetch barangays based on the newly selected city
      if (selectedCity != null) {
        fetchBarangays(selectedCity!);
      }
    });
  } catch (error) {
    print("Error fetching cities: $error");
  }
}

Future<void> fetchBarangays(String cityCode) async {
  try {
    List<dynamic> fetchedBarangays = await _addressService.barangays(cityCode);
    setState(() {
      barangays.clear(); // Clear previous barangays to avoid duplicates
      barangays.addAll(fetchedBarangays);
      // Reset selectedBarangay if it's not found in the new list
      if (barangays.any((barangay) => barangay['brgy_code'] == selectedBarangay)) {
        selectedBarangay = selectedBarangay; // Keep it as is if found
      } else {
        selectedBarangay = barangays.isNotEmpty ? barangays[0]['brgy_code'] : null; // Default to first barangay
      }
    });
  } catch (error) {
    print("Error fetching barangays: $error");
  }
}
String getRegionName(String? regionCode) {
  final region = regions.firstWhere(
    (r) => r['region_code'] == regionCode,
    orElse: () => {'region_name': "Not provided"}, // Ensure a valid map is returned
  ) as Map<String, dynamic>; // Cast to the expected type

  return region['region_name'] ?? "Not provided";
}

String getProvinceName(String? provinceCode) {
  final province = provinces.firstWhere(
    (p) => p['province_code'] == provinceCode,
    orElse: () => {'province_name': "Not provided"}, // Ensure a valid map is returned
  ) as Map<String, dynamic>; // Cast to the expected type

  return province['province_name'] ?? "Not provided";
}

String getCityName(String? cityCode) {
  final city = cities.firstWhere(
    (c) => c['city_code'] == cityCode,
    orElse: () => {'city_name': "Not provided"}, // Ensure a valid map is returned
  ) as Map<String, dynamic>; // Cast to the expected type

  return city['city_name'] ?? "Not provided";
}

String getBarangayName(String? barangayCode) {
  final barangay = barangays.firstWhere(
    (b) => b['brgy_code'] == barangayCode,
    orElse: () => {'brgy_name': "Not provided"}, // Ensure a valid map is returned
  ) as Map<String, dynamic>; // Cast to the expected type

  return barangay['brgy_name'] ?? "Not provided";
}


    @override
  Widget build(BuildContext context) {
    final authViewModel = context.read<AuthViewModel>();
    final userAddress = authViewModel.address;

    return DefaultViewLayout(
      title: "Checkout",
      background: AppColors.coolGrey,
      content: Stack(
        fit: StackFit.expand,
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              children: [
                orderDetailsCard(),
                itemsOrderedCard(context),
                userAddress != null ? 
                    shippingInformationCard(context) : 
                    addressPromptCard(context), // Show address prompt if no address
                orderSummaryCard(context),
              ],
            ),
          ),
        ],
      ),
    );
  }
Widget addressPromptCard(BuildContext context) {
    return InfoCard(
      title: "SET SHIPPING ADDRESS",
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "You haven't set a shipping address yet. Please set your address to proceed.",
            style: AppTextStyles.body2,
          ),
          const Gap(10),
          CustomButton(
            isExpanded: true,
            text: "Set Address",
            textStyle: AppTextStyles.button,
            command: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => AddressView()),
            ),
            height: 48,
            fillColor: AppColors.red,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
          ),
        ],
      ),
    );
  }


  Widget orderDetailsCard() {
  // Get the current date and format it
  String formattedDate = DateFormat('MMMM dd, yyyy').format(DateTime.now());

  return InfoCard(
    title: "ORDER DETAILS",
    content: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Date",
          style: AppTextStyles.body2.copyWith(fontWeight: AppFontWeights.semiBold),
        ),
        Text(
          formattedDate, // Use the formatted date here
          style: AppTextStyles.body2,
        ),
        const Gap(10),
        Text(
          "Order Number",
          style: AppTextStyles.body2.copyWith(fontWeight: AppFontWeights.semiBold),
        ),
        Text(
          "072102", // Keep this as is or modify if necessary
          style: AppTextStyles.body2,
        ),
      ],
    ),
  );
}


  Widget itemsOrderedCard(BuildContext context) {
    List<MapEntry<Product, int>> items =
        context.select<CartViewModel, List<MapEntry<Product, int>>>(
      (value) => value.items,
    );

    return InfoCard(
      title: "ITEMS ORDERED",
      content: ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        itemBuilder: (context, index) {
          MapEntry<Product, int> item = items[index];

          return Padding(
            padding: EdgeInsets.only(top: index != 0 ? 20 : 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  decoration: BoxDecoration(
                      border: Border.all(color: AppColors.greyAD)),
                   child: Image.network(
                    item.key.image as String, // Corrected: Access the single image URL from the product
                    width: 50,
                    fit: BoxFit.cover,
                  ),
                ),
                const Gap(10),
                SizedBox(
                  height: 80,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item.key.name,
                        style: AppTextStyles.body2.copyWith(
                          fontWeight: AppFontWeights.bold,
                        ),
                      ),
                      RichText(
                        text: TextSpan(
                          style: AppTextStyles.subtitle2,
                          text: "Quantity:  ",
                          children: [
                            TextSpan(
                              text: "${item.value}",
                              style: const TextStyle(
                                fontWeight: AppFontWeights.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  Widget shippingInformationCard(BuildContext context) {
  final authViewModel = context.read<AuthViewModel>();
  final userAddress = authViewModel.address;

  return InfoCard(
    title: "SHIPPING INFORMATION",
    content: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Street: ${userAddress?.street ?? "Not provided"}',
          style: TextStyle(fontSize: 16),
        ),
        Text(
          'Barangay: ${getBarangayName(selectedBarangay)}',
          style: TextStyle(fontSize: 16),
        ),
        Text(
          'City: ${getCityName(selectedCity)}',
          style: TextStyle(fontSize: 16),
        ),
        Text(
          'Province: ${getProvinceName(selectedProvince)}',
          style: TextStyle(fontSize: 16),
        ),
        Text(
          'Region: ${getRegionName(selectedRegion)}',
          style: TextStyle(fontSize: 16),
        ),
         Text(
          'Zip: ${userAddress?.zip ?? "Not provided"}',
          style: TextStyle(fontSize: 16),
        ),
      ],
    ),
  );
}


  Widget orderSummaryCard(BuildContext context) {
    return InfoCard(
      title: "ORDER SUMMARY",
      content: Column(
        children: [
          Table(
            columnWidths: const {
              0: IntrinsicColumnWidth(),
            },
            children: [
              TableRow(children: [
                Text(
                  "Subtotal:",
                  style: AppTextStyles.subtitle2,
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 15),
                  child: Text(
                    "₱${context.read<CartViewModel>().getSubtotal()}",
                    style: AppTextStyles.body2,
                  ),
                ),
              ]),
              TableRow(children: [
                Text(
                  "Shipping:",
                  style: AppTextStyles.subtitle2,
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 15),
                  child: Text(
                    "Free",
                    style: AppTextStyles.body2,
                  ),
                ),
              ]),
              TableRow(children: [
                Text(
                  "Total:",
                  style: AppTextStyles.subtitle2
                      .copyWith(fontWeight: AppFontWeights.bold),
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 15),
                  child: Text(
                    "₱${context.read<CartViewModel>().getSubtotal()}",
                    style: AppTextStyles.body2.copyWith(color: Colors.green),
                  ),
                ),
              ])
            ],
          ),
          const Gap(25),
          Row(
            children: [
              Expanded(
                child: CustomButton(
                  isExpanded: true,
                  text: "Proceed",
                  textStyle: AppTextStyles.button,
                  command: () => proceedToPayment(context), // Call the payment function here
                  height: 48,
                  fillColor: AppColors.red,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class InfoCard extends StatelessWidget {
  final String title;
  final Widget content;
  const InfoCard({
    super.key,
    required this.title,
    required this.content,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
          child: Text(
            title,
            style: AppTextStyles.subtitle1.copyWith(
              fontWeight: AppFontWeights.bold,
            ),
          ),
        ),
        Container(
          width: double.infinity,
          color: AppColors.primary,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: content,
        ),
      ],
    );
  }
}
