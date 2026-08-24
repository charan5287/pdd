import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';

class NetworkDebugScreen extends StatefulWidget {
  const NetworkDebugScreen({super.key});

  @override
  State<NetworkDebugScreen> createState() => _NetworkDebugScreenState();
}

class _NetworkDebugScreenState extends State<NetworkDebugScreen> {
  final _urlController = TextEditingController();
  final _customIpController = TextEditingController();
  
  String _status = 'Idle';
  String _details = 'Select a server target and press "Test Connection" to perform API latency diagnostics.';
  bool _isTesting = false;
  int? _latencyMs;
  bool _testSuccess = false;

  // Presets: 'render', 'emulator', 'localhost', 'custom_ip', 'raw_url'
  String _selectedPreset = 'render';

  @override
  void initState() {
    super.initState();
    final activeUrl = ApiService.baseUrl;
    _urlController.text = activeUrl;

    if (activeUrl == 'https://medinow-api.onrender.com') {
      _selectedPreset = 'render';
    } else if (activeUrl == 'http://10.0.2.2:8000') {
      _selectedPreset = 'emulator';
    } else if (activeUrl == 'http://127.0.0.1:8000') {
      _selectedPreset = 'localhost';
    } else if (activeUrl.startsWith('http://') && activeUrl.endsWith(':8000')) {
      _selectedPreset = 'custom_ip';
      // Extract IP address from http://ip:8000
      final ip = activeUrl.replaceAll('http://', '').replaceAll(':8000', '');
      _customIpController.text = ip;
    } else {
      _selectedPreset = 'raw_url';
    }
  }

  @override
  void dispose() {
    _urlController.dispose();
    _customIpController.dispose();
    super.dispose();
  }

  void _onPresetChanged(String? preset) {
    if (preset == null) return;
    setState(() {
      _selectedPreset = preset;
      if (preset == 'render') {
        _urlController.text = 'https://medinow-api.onrender.com';
      } else if (preset == 'emulator') {
        _urlController.text = 'http://10.0.2.2:8000';
      } else if (preset == 'localhost') {
        _urlController.text = 'http://127.0.0.1:8000';
      } else if (preset == 'custom_ip') {
        final ip = _customIpController.text.trim();
        _urlController.text = 'http://${ip.isNotEmpty ? ip : "192.168.1.100"}:8000';
      }
    });
  }

  void _onIpChanged(String val) {
    if (_selectedPreset == 'custom_ip') {
      setState(() {
        _urlController.text = 'http://${val.trim().isNotEmpty ? val.trim() : "192.168.1.100"}:8000';
      });
    }
  }

  Future<void> _testConnection() async {
    final targetUrl = _urlController.text.trim();
    if (targetUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Target URL cannot be empty!')),
      );
      return;
    }

    setState(() {
      _isTesting = true;
      _status = 'Testing...';
      _details = 'Sending GET ping request to $targetUrl...';
      _latencyMs = null;
      _testSuccess = false;
    });

    final stopwatch = Stopwatch()..start();

    try {
      final response = await Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
        headers: {'Bypass-Tunnel-Reminder': 'true'},
      )).get(targetUrl);
      
      stopwatch.stop();
      
      setState(() {
        _isTesting = false;
        _testSuccess = true;
        _latencyMs = stopwatch.elapsedMilliseconds;
        _status = 'Connected Successfully!';
        _details = '✅ Server is responsive.\n\n'
            'Response Data:\n${response.data}\n\n'
            'API endpoint is completely reachable from this device.';
      });
    } catch (e) {
      stopwatch.stop();
      String failMsg = e.toString();
      
      if (e is DioException) {
        if (e.type == DioExceptionType.connectionTimeout) {
          failMsg = 'Connection Timeout (6s exceeded). The server IP exists but did not respond, or it is blocked by a firewall.';
        } else if (e.type == DioExceptionType.connectionError) {
          failMsg = 'Connection Refused/Failed. Either the backend is not running, or your phone cannot reach this IP address over the network.';
        } else if (e.response != null) {
          failMsg = 'Server reached, but returned status code: ${e.response?.statusCode}\nResponse: ${e.response?.data}';
        }
      }

      setState(() {
        _isTesting = false;
        _testSuccess = false;
        _status = 'Connection Failed';
        _details = '❌ Error:\n$failMsg\n\n'
            '💡 Troubleshooting Tips for Mobile Devices:\n'
            '1. SAME NETWORK: Ensure both your PC and your phone are connected to the SAME WiFi network.\n'
            '2. PORT CHECK: Double-check that your PC\'s local IP address matches what you entered.\n'
            '3. RUNNING BACKEND: Verify the FastAPI server is running on your PC (e.g. uvicorn listening on 0.0.0.0:8000).\n'
            '4. FIREWALL: Windows Defender Firewall may block external connections. Try temporarily disabling it or creating an inbound rule for Port 8000.';
      });
    }
  }

  void _saveAndApply() async {
    final finalUrl = _urlController.text.trim();
    if (finalUrl.isEmpty) return;

    await ApiService.updateBaseUrl(finalUrl);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Backend configured to: $finalUrl'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text(
          'Network Diagnostics',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        centerTitle: true,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: AppColors.primaryGradient,
          ),
        ),
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Info Card
            _buildHeaderCard(),
            const SizedBox(height: 20),

            // Server Selection Form
            _buildConfigurationCard(),
            const SizedBox(height: 20),

            // Diagnostics Action Card
            _buildDiagnosticsCard(),
            const SizedBox(height: 30),

            // Save & Apply Button
            _buildActionButtons(),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.network_ping_rounded,
              color: AppColors.primary,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Multi-Device Sync',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Configure where the app connects. Essential for running all features seamlessly on physical mobile devices.',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfigurationCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Select Server Target',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),

          // Render Cloud
          _buildPresetRadio(
            title: 'Render Cloud Backend',
            subtitle: 'https://medinow-api.onrender.com',
            value: 'render',
            icon: Icons.cloud_done_outlined,
          ),
          
          // Android Emulator Localhost
          _buildPresetRadio(
            title: 'Android Emulator Localhost',
            subtitle: 'http://10.0.2.2:8000',
            value: 'emulator',
            icon: Icons.android_outlined,
          ),

          // iOS Simulator Localhost
          _buildPresetRadio(
            title: 'iOS Simulator / Web Localhost',
            subtitle: 'http://127.0.0.1:8000',
            value: 'localhost',
            icon: Icons.computer_outlined,
          ),

          // Custom IP
          _buildPresetRadio(
            title: 'Custom PC Local IP',
            subtitle: 'Connect phone directly to your computer',
            value: 'custom_ip',
            icon: Icons.settings_input_antenna_outlined,
          ),

          if (_selectedPreset == 'custom_ip') ...[
            const SizedBox(height: 12),
            TextFormField(
              controller: _customIpController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: GoogleFonts.inter(fontSize: 15),
              decoration: InputDecoration(
                labelText: 'PC Local IP Address',
                hintText: 'e.g. 192.168.1.15',
                prefixIcon: const Icon(Icons.laptop_chromebook),
                filled: true,
                fillColor: Colors.grey.shade50,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: _onIpChanged,
            ),
          ],

          // Raw custom URL override
          _buildPresetRadio(
            title: 'Raw URL Override',
            subtitle: 'Manually specify custom address',
            value: 'raw_url',
            icon: Icons.edit_note_rounded,
          ),

          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),

          Text(
            'Target Backend URL',
            style: GoogleFonts.outfit(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _urlController,
            enabled: _selectedPreset == 'raw_url',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: _selectedPreset == 'raw_url' ? AppColors.textPrimary : AppColors.textSecondary,
            ),
            decoration: InputDecoration(
              filled: true,
              fillColor: _selectedPreset == 'raw_url' ? Colors.white : Colors.grey.shade100,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPresetRadio({
    required String title,
    required String subtitle,
    required String value,
    required IconData icon,
  }) {
    final isSelected = _selectedPreset == value;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected ? AppColors.primary : Colors.grey.shade200,
          width: isSelected ? 1.8 : 1.0,
        ),
        color: isSelected ? AppColors.primary.withOpacity(0.02) : Colors.white,
      ),
      child: RadioListTile<String>(
        value: value,
        groupValue: _selectedPreset,
        onChanged: _onPresetChanged,
        activeColor: AppColors.primary,
        secondary: Icon(
          icon,
          color: isSelected ? AppColors.primary : AppColors.textSecondary,
        ),
        title: Text(
          title,
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: isSelected ? AppColors.primary : AppColors.textPrimary,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: GoogleFonts.inter(
            fontSize: 11,
            color: AppColors.textSecondary,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
      ),
    );
  }

  Widget _buildDiagnosticsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Connection Diagnostics',
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              if (_latencyMs != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _testSuccess ? AppColors.success.withOpacity(0.12) : AppColors.error.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.speed_rounded,
                        size: 13,
                        color: _testSuccess ? AppColors.success : AppColors.error,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$_latencyMs ms',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _testSuccess ? AppColors.success : AppColors.error,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _isTesting
                            ? Colors.amber
                            : _testSuccess
                                ? AppColors.success
                                : _status == 'Idle'
                                    ? Colors.grey
                                    : AppColors.error,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Diagnostic Status: $_status',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  _details,
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
                    height: 1.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _isTesting ? null : _testConnection,
            icon: _isTesting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.flash_on_rounded, size: 16),
            label: Text(
              _isTesting ? 'Testing Connectivity...' : 'Test Connection',
              style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton(
          onPressed: _isTesting ? null : _saveAndApply,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.secondary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            elevation: 3,
            shadowColor: AppColors.secondary.withOpacity(0.3),
          ),
          child: Text(
            'Save & Apply Server Configuration',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 10),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancel and Keep Original',
            style: GoogleFonts.inter(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
