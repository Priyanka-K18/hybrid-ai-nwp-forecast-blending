"""
Comprehensive unit and integration test suite for Open-Meteo weather integration.
Uses Python's standard unittest library.
"""
import unittest
import time
from unittest.mock import patch, MagicMock

from app.weather.cache import get_cached, set_cache, set_cached, invalidate_all, cache_stats
from app.weather.normalization.weather_normalizer import normalize_openmeteo_response
from app.weather.openmeteo_weighting import calculate_openmeteo_weights, blend_openmeteo_forecasts
from app.weather.extreme_detector import detect_extreme_events, DISCLAIMER
from app.weather.geocoding import geocode_city, _GEOCODE_CACHE


class TestOpenMeteoIntegration(unittest.TestCase):

    def setUp(self):
        invalidate_all()
        _GEOCODE_CACHE.clear()

    def test_cache_operations(self):
        """Verify cache store, retrieve, TTL stats, hits/misses, and invalidation."""
        stats = cache_stats()
        self.assertEqual(stats["active_entries"], 0)

        payload = {"status": "ok", "val": 42}
        set_cache(12.97, 77.59, "ECMWF", payload)

        cached = get_cached(12.97, 77.59, "ECMWF")
        self.assertIsNotNone(cached)
        self.assertEqual(cached["val"], 42)

        # Miss for different model or coordinates
        self.assertIsNone(get_cached(12.97, 77.59, "GFS"))
        self.assertIsNone(get_cached(13.00, 77.59, "ECMWF"))

        stats = cache_stats()
        self.assertEqual(stats["active_entries"], 1)
        self.assertGreaterEqual(stats["hits"], 1)
        self.assertGreaterEqual(stats["misses"], 2)

        # Invalidate
        cleared = invalidate_all()
        self.assertEqual(cleared, 1)
        self.assertIsNone(get_cached(12.97, 77.59, "ECMWF"))

    def test_normalization_valid_data(self):
        """Verify raw Open-Meteo hourly response normalization into canonical schema."""
        raw = {
            "latitude": 12.97,
            "longitude": 77.59,
            "hourly": {
                "time": ["2026-09-28T00:00", "2026-09-28T01:00", "2026-09-28T02:00"],
                "temperature_2m": [25.0, 26.5, 28.0],
                "precipitation": [0.0, 15.0, 5.0],
                "wind_speed_10m": [12.0, 18.0, 14.0],
                "wind_direction_10m": [180.0, 190.0, 185.0],
                "relative_humidity_2m": [80.0, 85.0, 75.0],
                "surface_pressure": [1012.0, 1011.0, 1010.5],
                "cloud_cover": [40.0, 90.0, 60.0],
                "cape": [100.0, 1500.0, 800.0],
                "visibility": [10000.0, 8000.0, 9500.0],
                "precipitation_probability": [10.0, 85.0, 45.0],
            }
        }

        canonical = normalize_openmeteo_response(raw, "ECMWF", "Bengaluru", 12.97, 77.59)
        self.assertTrue(canonical["data_available"])
        self.assertEqual(canonical["model"], "ECMWF")
        self.assertEqual(canonical["location"]["name"], "Bengaluru")

        summary = canonical["summary_24h"]
        self.assertEqual(summary["temperature_mean"], round((25.0 + 26.5 + 28.0) / 3, 2))
        self.assertEqual(summary["precipitation_total"], 20.0)
        self.assertEqual(summary["wind_speed_mean"], round((12.0 + 18.0 + 14.0) / 3, 2))
        self.assertEqual(summary["wind_speed_max"], 18.0)
        self.assertEqual(summary["cape_max"], 1500.0)
        self.assertEqual(len(canonical["hourly_data"]), 3)

    def test_normalization_empty_or_missing(self):
        """Verify normalization handles empty or missing raw responses gracefully without crashing."""
        empty_raw = {"latitude": 0.0, "longitude": 0.0, "hourly": {}}
        canonical = normalize_openmeteo_response(empty_raw, "ICON", "Unknown", 0.0, 0.0)
        self.assertFalse(canonical["data_available"])
        self.assertIn("error", canonical)
        self.assertEqual(canonical["summary_24h"], {})

    def test_calculate_openmeteo_weights(self):
        """Verify adaptive weight computation sums exactly to 1.0."""
        weights = calculate_openmeteo_weights(
            variable="precipitation",
            lead_time_hours=24,
            season="Monsoon",
            weather_regime="Convective",
            available_models=["ECMWF", "GFS", "ICON"]
        )
        self.assertEqual(set(weights.keys()), {"ECMWF", "GFS", "ICON"})
        total_w = sum(weights.values())
        self.assertAlmostEqual(total_w, 1.0, places=4)
        # ECMWF typically has highest weight for precipitation in Monsoon Convective
        self.assertGreater(weights["ECMWF"], weights["GFS"])

    def test_weights_subset_models_renormalization(self):
        """Verify weights renormalize properly when a model (e.g. ICON) is unavailable."""
        weights = calculate_openmeteo_weights(
            variable="precipitation",
            lead_time_hours=24,
            season="Monsoon",
            weather_regime="Normal",
            available_models=["ECMWF", "GFS"]  # ICON omitted
        )
        self.assertNotIn("ICON", weights)
        self.assertAlmostEqual(sum(weights.values()), 1.0, places=4)
        self.assertGreater(weights["ECMWF"], 0)
        self.assertGreater(weights["GFS"], 0)

    def test_extreme_weather_detection(self):
        """Verify extreme weather rules, multi-model consensus, and mandatory disclaimer."""
        normalized_forecasts = {
            "ECMWF": {
                "data_available": True,
                "summary_24h": {
                    "precipitation_total": 85.0,  # > 50mm -> Heavy Rain
                    "wind_speed_max": 35.0,
                    "temperature_max": 32.0,
                    "temperature_min": 24.0,
                    "cape_max": 2200.0,          # > 1500 -> Severe Convection
                    "visibility_mean": 6000.0,
                    "precip_prob_max": 90.0,
                },
            },
            "GFS": {
                "data_available": True,
                "summary_24h": {
                    "precipitation_total": 70.0,  # also triggers heavy rain
                    "wind_speed_max": 40.0,
                    "temperature_max": 33.0,
                    "temperature_min": 25.0,
                    "cape_max": 1800.0,
                    "visibility_mean": 5000.0,
                    "precip_prob_max": 85.0,
                },
            },
            "ICON": {
                "data_available": True,
                "summary_24h": {
                    "precipitation_total": 15.0,  # below threshold
                    "wind_speed_max": 30.0,
                    "temperature_max": 31.0,
                    "temperature_min": 23.0,
                    "cape_max": 800.0,
                    "visibility_mean": 9000.0,
                    "precip_prob_max": 40.0,
                },
            }
        }

        signals = detect_extreme_events(normalized_forecasts, location_name="Bengaluru")
        self.assertGreater(len(signals), 0)

        for sig in signals:
            self.assertIn("disclaimer", sig)
            self.assertIn("NOT an official government", sig["disclaimer"])
            self.assertEqual(sig["location"], "Bengaluru")

        # Heavy rain signal check
        rain_sig = next((s for s in signals if "Rain" in s["event"]), None)
        self.assertIsNotNone(rain_sig)
        self.assertEqual(rain_sig["model_agreement"], 2)  # ECMWF & GFS
        self.assertEqual(rain_sig["total_models"], 3)
        self.assertEqual(rain_sig["confidence"], round(2 / 3, 2))

    def test_blend_openmeteo_forecasts(self):
        """Verify blending weighted mean and missing model handling."""
        normalized_forecasts = {
            "ECMWF": {
                "data_available": True,
                "summary_24h": {
                    "temperature_mean": 24.0,
                    "temperature_max": 28.0,
                    "temperature_min": 20.0,
                    "precipitation_total": 10.0,
                    "wind_speed_mean": 15.0,
                    "wind_speed_max": 20.0,
                    "wind_direction_mean": 180.0,
                    "humidity_mean": 80.0,
                    "pressure_mean": 1012.0,
                    "cloud_cover_mean": 50.0,
                    "cape_max": 500.0,
                    "precip_prob_max": 60.0,
                },
            },
            "GFS": {
                "data_available": True,
                "summary_24h": {
                    "temperature_mean": 26.0,
                    "temperature_max": 30.0,
                    "temperature_min": 22.0,
                    "precipitation_total": 14.0,
                    "wind_speed_mean": 18.0,
                    "wind_speed_max": 24.0,
                    "wind_direction_mean": 190.0,
                    "humidity_mean": 75.0,
                    "pressure_mean": 1010.0,
                    "cloud_cover_mean": 60.0,
                    "cape_max": 700.0,
                    "precip_prob_max": 70.0,
                },
            },
            "ICON": {
                "data_available": False,  # Simulating ICON failure
                "error": "HTTP 503",
            }
        }

        weights = {"ECMWF": 0.6, "GFS": 0.4}
        blended = blend_openmeteo_forecasts(normalized_forecasts, weights)

        self.assertTrue(blended["data_available"])
        self.assertEqual(blended["models_used"], ["ECMWF", "GFS"])
        self.assertEqual(blended["models_unavailable"], ["ICON"])

        summary = blended["blended_summary"]
        # Expected temp: 0.6 * 24.0 + 0.4 * 26.0 = 14.4 + 10.4 = 24.8
        self.assertAlmostEqual(summary["temperature_mean"], 24.8, places=1)
        # Expected precip: 0.6 * 10.0 + 0.4 * 14.0 = 6.0 + 5.6 = 11.6
        self.assertAlmostEqual(summary["precipitation_total"], 11.6, places=1)

    @patch("urllib.request.urlopen")
    def test_geocoding_success(self, mock_urlopen):
        """Verify geocoding correctly parses Open-Meteo response."""
        mock_response = MagicMock()
        mock_response.read.return_value = b'''{
            "results": [
                {
                    "name": "Bengaluru",
                    "latitude": 12.9719,
                    "longitude": 77.5937,
                    "country": "India",
                    "country_code": "IN",
                    "admin1": "Karnataka",
                    "timezone": "Asia/Kolkata"
                }
            ]
        }'''
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = geocode_city("Bengaluru")
        self.assertIsNotNone(res)
        self.assertEqual(res["name"], "Bengaluru")
        self.assertEqual(res["country"], "India")
        self.assertAlmostEqual(res["latitude"], 12.9719, places=3)
        self.assertAlmostEqual(res["longitude"], 77.5937, places=3)


if __name__ == "__main__":
    unittest.main()
