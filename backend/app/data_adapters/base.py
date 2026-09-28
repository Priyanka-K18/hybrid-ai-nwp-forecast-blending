"""
Data Adapter Interface and implementations for NWP, Ensemble, AI/ML, and In-Situ Observations.
Provides mock/demo streams and extensible hooks for live GRIB2/NetCDF/API ingests.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import datetime


class BaseWeatherAdapter(ABC):
    def __init__(self, source_id: str, name: str, format_type: str):
        self.source_id = source_id
        self.name = name
        self.format_type = format_type
        self.status = "CONNECTED"
        self.last_sync = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.record_count = 14850
        self.latency_ms = 45

    @abstractmethod
    def fetch_forecast(self, region_id: str, lead_time_hours: int, variable: str) -> Dict[str, Any]:
        pass

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source_id": self.source_id,
            "name": self.name,
            "format": self.format_type,
            "status": self.status,
            "last_sync": self.last_sync,
            "record_count": self.record_count,
            "latency_ms": self.latency_ms,
            "is_demo": True
        }


class NWPAdapter(BaseWeatherAdapter):
    def __init__(self):
        super().__init__("nwp-core", "Global NWP Physics Ingest (NCMRWF/ECMWF IFS)", "GRIB2 / NetCDF4")

    def fetch_forecast(self, region_id: str, lead_time_hours: int, variable: str) -> Dict[str, Any]:
        return {
            "model": "NWP",
            "resolution": "0.1° (~10km)",
            "physics_core": "Hydrostatic Primitive Equations",
            "lead_time": lead_time_hours
        }


class EnsembleAdapter(BaseWeatherAdapter):
    def __init__(self):
        super().__init__("ensemble-gefs", "Global Ensemble Prediction (EPS/GEFS 51-Member)", "NetCDF4 / Zarr")

    def fetch_forecast(self, region_id: str, lead_time_hours: int, variable: str) -> Dict[str, Any]:
        return {
            "model": "Ensemble",
            "members": 51,
            "resolution": "0.25° (~28km)",
            "perturbation_scheme": "Bred Vector / EnKF",
            "lead_time": lead_time_hours
        }


class AIForecastAdapter(BaseWeatherAdapter):
    def __init__(self):
        super().__init__("ai-neural", "High-Res Neural Weather Model (Spherical GraphNet)", "Safetensors / ONNX")

    def fetch_forecast(self, region_id: str, lead_time_hours: int, variable: str) -> Dict[str, Any]:
        return {
            "model": "AI_ML",
            "architecture": "Spherical Multi-Mesh GNN + Attention",
            "lead_time": lead_time_hours
        }


class ObservationAdapter(BaseWeatherAdapter):
    def __init__(self):
        super().__init__("obs-surface", "IMD AWS & DWR Doppler Surface Observations", "BUFR / JSON REST")

    def fetch_forecast(self, region_id: str, lead_time_hours: int, variable: str) -> Dict[str, Any]:
        return {
            "network": "Indian Meteorological Department Surface AWS Network",
            "quality_control": "Level-2 Automated Spatio-Temporal QC Passed"
        }
