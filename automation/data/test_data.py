import os

class TestData:
    # Environment & Base URL
    DEFAULT_BASE_URL = "https://charan5287.github.io/pdd/"

    # Authentication Test Data
    VALID_USERS = [
        {"email": "patient@medinow.org", "password": "Password123!", "role": "Patient"},
        {"email": "pharmacy@medinow.org", "password": "PharmacyPass123!", "role": "Pharmacy"},
        {"email": "doctor@medinow.org", "password": "DoctorPass123!", "role": "Doctor"}
    ]

    INVALID_LOGIN_DATA = [
        {"email": "invalid_user@medinow.org", "password": "WrongPassword!", "expected_error": "Invalid credentials"},
        {"email": "nonexistent@domain.com", "password": "Password123!", "expected_error": "User not found"},
        {"email": "", "password": "Password123!", "expected_error": "Email is required"},
        {"email": "patient@medinow.org", "password": "", "expected_error": "Password is required"},
        {"email": "invalid-email-format", "password": "Password123!", "expected_error": "Invalid email format"}
    ]

    SIGNUP_FORM_DATA = [
        {"name": "John Doe", "email": "john.doe@example.com", "password": "Password123!", "phone": "+1234567890"},
        {"name": "Jane Smith", "email": "jane.smith@example.com", "password": "SecurePassword456!", "phone": "+1987654321"}
    ]

    # Medicine Management Test Data
    MEDICINE_ITEMS = [
        {"name": "Paracetamol 500mg", "dosage": "1 tablet", "frequency": "3 times daily", "category": "Pain Relief", "stock": 50},
        {"name": "Amoxicillin 250mg", "dosage": "2 capsules", "frequency": "Twice daily", "category": "Antibiotic", "stock": 30},
        {"name": "Metformin 850mg", "dosage": "1 tablet", "frequency": "With meals", "category": "Diabetes", "stock": 100},
        {"name": "Atorvastatin 20mg", "dosage": "1 tablet", "frequency": "At bedtime", "category": "Cholesterol", "stock": 45}
    ]

    REMINDER_DATA = [
        {"medicine": "Paracetamol", "time": "08:00 AM", "repeat": "Daily", "notes": "Take after breakfast"},
        {"medicine": "Amoxicillin", "time": "02:00 PM", "repeat": "Every 12 hours", "notes": "Complete full course"}
    ]

    # Chat Assistant Prompts
    CHAT_PROMPTS = [
        "What are the common side effects of Metformin?",
        "How should I store Amoxicillin suspension?",
        "Can I take Paracetamol with Ibuprofen?",
        "What is the recommended dosage for Vitamin D3?"
    ]

    # Boundary & Input Validation Sets
    BOUNDARY_STRINGS = {
        "max_length_500": "A" * 500,
        "max_length_1000": "B" * 1000,
        "special_chars": "!@#$%^&*()_+-=[]{}|;':\",./<>?",
        "sql_injection_attempt": "' OR '1'='1",
        "xss_script_attempt": "<script>alert('xss')</script>",
        "unicode_utf8": "こんにちは世界 / 💊 🏥 👨‍⚕️ / 测试"
    }

    # Viewports for Responsive Testing
    VIEWPORTS = {
        "desktop": (1920, 1080),
        "laptop": (1366, 768),
        "tablet": (768, 1024),
        "mobile_large": (414, 896),
        "mobile_small": (375, 667)
    }

    # Sample File Path for Upload Tests
    @staticmethod
    def get_sample_prescription_path() -> str:
        sample_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'sample_prescription.jpg')
        if not os.path.exists(sample_path):
            with open(sample_path, 'wb') as f:
                # 1x1 dummy jpeg bytes
                f.write(b'\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xBF\x00\xFF\xD9')
        return sample_path
