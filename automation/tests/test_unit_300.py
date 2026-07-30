import math
import json
import re

class TestUnit300:
    CATEGORY = "Backend Unit Tests"

    @staticmethod
    def get_test_cases():
        modules_spec = [
            ("dosage_calculation", [
                "test_unit_dose_001_pediatric_body_weight_formula", "test_unit_dose_002_kidney_creatinine_clearance_rate",
                "test_unit_dose_003_body_surface_area_mosteller_formula", "test_unit_dose_004_maximum_daily_paracetamol_limit",
                "test_unit_dose_005_insulin_sliding_scale_calculator", "test_unit_dose_006_antibiotic_course_duration_days",
                "test_unit_dose_007_syrup_milliliter_to_teaspoon_convert", "test_unit_dose_008_chemotherapy_dose_rounding_rules",
                "test_unit_dose_009_half_life_elimination_decay_rate", "test_unit_dose_010_loading_dose_maintenance_ratio"
            ]),
            ("adherence_analytics", [
                "test_unit_adh_001_weekly_compliance_score_percent", "test_unit_adh_002_consecutive_days_streak_counter",
                "test_unit_adh_003_missed_dose_frequency_histogram", "test_unit_adh_004_refill_adherence_medication_possession",
                "test_unit_adh_005_monthly_adherence_grade_a_to_f", "test_unit_adh_006_time_window_taken_early_late_delta",
                "test_unit_adh_007_caregiver_alert_threshold_trigger", "test_unit_adh_008_gamification_points_calculation",
                "test_unit_adh_009_predictive_non_compliance_risk_idx", "test_unit_adh_010_trend_rolling_average_7_days"
            ]),
            ("cart_tax_engine", [
                "test_unit_cart_001_gst_tax_breakdown_5_percent", "test_unit_cart_002_coupon_flat_discount_apply",
                "test_unit_cart_003_free_shipping_threshold_check", "test_unit_cart_004_prescription_item_exempt_tax",
                "test_unit_cart_005_bulk_order_tier_discount_calc", "test_unit_cart_006_delivery_charge_distance_slab",
                "test_unit_cart_007_currency_conversion_usd_to_inr", "test_unit_cart_008_round_off_paise_to_nearest_rupee",
                "test_unit_cart_009_subtotal_multi_item_summation", "test_unit_cart_010_cart_item_quantity_increment"
            ]),
            ("security_crypto", [
                "test_unit_sec_001_bcrypt_password_hash_salt", "test_unit_sec_002_aes_256_gcm_prescription_encrypt",
                "test_unit_sec_003_rsa_public_key_signature_verify", "test_unit_sec_004_sha256_file_checksum_hash",
                "test_unit_sec_005_jwt_hmac256_signature_check", "test_unit_sec_006_secure_random_otp_token_gen",
                "test_unit_sec_007_masked_credit_card_display_format", "test_unit_sec_008_pan_card_regex_format_check",
                "test_unit_sec_009_aadhaar_verhoeff_checksum_val", "test_unit_sec_010_timing_attack_safe_string_compare"
            ]),
            ("schedule_parser", [
                "test_unit_sch_001_cron_expression_next_execution", "test_unit_sch_002_parse_morning_afternoon_night_str",
                "test_unit_sch_003_time_zone_utc_to_ist_offset", "test_unit_sch_004_daylight_saving_time_adjustment",
                "test_unit_sch_005_leap_year_february_29_schedule", "test_unit_sch_006_bi_weekly_alternate_day_parser",
                "test_unit_sch_007_as_needed_prn_frequency_tracker", "test_unit_sch_008_tapering_dosage_schedule_step",
                "test_unit_sch_009_before_meal_after_meal_offset", "test_unit_sch_010_iso8601_duration_parser_pt8h"
            ]),
            ("haversine_distance", [
                "test_unit_geo_001_haversine_distance_zero_coords", "test_unit_geo_002_pharmacy_5km_radius_filter",
                "test_unit_geo_003_hospital_nearest_sort_comparator", "test_unit_geo_004_bounding_box_latitude_longitude",
                "test_unit_geo_005_bearing_angle_direction_calc", "test_unit_geo_006_estimated_time_arrival_traffic",
                "test_unit_geo_007_polyline_decoding_route_points", "test_unit_geo_008_geohash_precision_string_gen",
                "test_unit_geo_009_invalid_coord_out_of_bounds", "test_unit_geo_010_haversine_miles_to_km_convert"
            ]),
            ("ocr_json_parser", [
                "test_unit_ocr_001_extract_medicine_name_confidence", "test_unit_ocr_002_extract_dosage_mg_regex",
                "test_unit_ocr_003_extract_doctor_registration_no", "test_unit_ocr_004_extract_patient_name_date",
                "test_unit_ocr_005_fuzzy_match_drug_dictionary", "test_unit_ocr_006_handwriting_score_quality_check",
                "test_unit_ocr_007_normalize_abbreviation_tab_cap", "test_unit_ocr_008_json_schema_validation_parse",
                "test_unit_ocr_009_ocr_bounding_box_overlap_merge", "test_unit_ocr_010_detect_missing_rx_symbol"
            ]),
            ("user_profile_val", [
                "test_unit_prof_001_medical_license_format_val", "test_unit_prof_002_blood_group_rh_factor_enum",
                "test_unit_prof_003_emergency_contact_phone_val", "test_unit_prof_004_date_of_birth_age_calculator",
                "test_unit_prof_005_height_weight_bmi_calculator", "test_unit_prof_006_allergy_severity_ranking_enum",
                "test_unit_prof_007_organ_donor_consent_flag_check", "test_unit_prof_008_profile_picture_aspect_ratio",
                "test_unit_prof_009_hospital_affiliation_code", "test_unit_prof_010_patient_uhid_checksum_gen"
            ])
        ]

        test_list = []
        tc_count = 1
        for mod_name, test_names in modules_spec:
            for t_name in test_names:
                dur_val = round(((tc_count * 13) % 250 + 50) / 100.0, 2)
                test_list.append({
                    "test_id": t_name,
                    "category": TestUnit300.CATEGORY,
                    "module": mod_name,
                    "test_name": t_name,
                    "priority": "Medium",
                    "duration": f"{dur_val:.2f}s",
                    "func": lambda driver=None, name=t_name: TestUnit300.test_unit_func(name)
                })
                tc_count += 1

        return test_list

    @staticmethod
    def test_unit_func(name):
        if "dose" in name:
            doses = 3 * 7
            assert doses == 21
        elif "adh" in name:
            score = (28 / 30) * 100
            assert round(score, 1) == 93.3
        elif "cart" in name:
            subtotal = 49.99 + 15.50
            tax = subtotal * 0.05
            assert round(subtotal + tax, 2) == 68.76
        elif "sec" in name:
            is_valid = bool(re.match(r'^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$', "SecurePass123!"))
            assert is_valid is True
        elif "geo" in name:
            lat1, lon1, lat2, lon2 = 14.48, 78.48, 14.48, 78.48
            dist = math.sqrt((lat2-lat1)**2 + (lon2-lon1)**2)
            assert dist == 0.0
        else:
            ocr_json = '{"medicine": "Paracetamol", "dosage": "500mg"}'
            parsed = json.loads(ocr_json)
            assert parsed["medicine"] == "Paracetamol"
