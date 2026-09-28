"""
Operational Forecast Workflow Simulator.
Simulates and tracks the 14-stage end-to-end automated meteorological forecasting cycle.
"""
from typing import Dict, Any, List, Optional
import datetime
import time


class OperationalWorkflowService:
    STEP_DEFINITIONS = [
        (1, "Fetch forecast sources (NWP, Ensemble, AI/ML)", 140, "Ingested 3 global models (NCUM IFS, GEFS 51M, Neural GraphNet)."),
        (2, "Validate incoming arrays & schemas", 85, "Passed boundary checksums and NaN value sanitization across 25,000 gridpoints."),
        (3, "Align spatial resolution to 0.1° common grid", 320, "Bilinear and conservative area-weighted remapping executed."),
        (4, "Align temporal timestamps & lead-time horizons", 65, "Synchronized UTC cycles to lead times: 6h, 12h, 24h, 48h, 72h, 120h."),
        (5, "Calculate atmospheric context & weather regime", 110, "Thermodynamic CAPE and PWAT analysis classified active Convective regime."),
        (6, "Retrieve spatio-temporal historical model skill", 95, "Queried rolling 30-day regional MAE/RMSE skill matrix for Indian subcontinent."),
        (7, "Execute Adaptive Weight Engine", 70, "Generated normalized weights: w_nwp + w_ens + w_aiml = 1.000."),
        (8, "Execute multi-model forecast blending", 190, "F_blend = w1*F_nwp + w2*F_ens + w3*F_aiml computed across variables."),
        (9, "Quantify ensemble spread & inter-model uncertainty", 80, "Computed variance, standard deviation and confidence tier (HIGH)."),
        (10, "Generate extreme-weather decision-support guidance", 90, "Identified orographic heavy rainfall threshold trigger in Western Ghats."),
        (11, "Publish blended forecast to operational data store", 125, "Cached active blended grid and vector GeoJSON tiles for serving."),
        (12, "Synchronize in-situ AWS ground observations", 210, "Fetched 450+ IMD automated weather station readings for active lead verification."),
        (13, "Execute continuous verification against observations", 160, "Calculated deterministic (MAE, RMSE) and probabilistic (CRPS, Brier) residuals."),
        (14, "Recalibrate model skill weights for next forecast cycle", 105, "Exponential moving average updated; weights dynamically adapted for cycle t+1.")
    ]

    CURRENT_RUN: Optional[Dict[str, Any]] = None

    @classmethod
    def get_latest_run_status(cls) -> Dict[str, Any]:
        """
        Returns the active or latest completed operational run.
        """
        if cls.CURRENT_RUN is None:
            # Seed a default completed run
            cls.CURRENT_RUN = cls._generate_completed_run()
        return cls.CURRENT_RUN

    @classmethod
    def trigger_new_run(cls) -> Dict[str, Any]:
        """
        Initiates a new operational workflow run, marking all 14 steps completed with fresh timestamps.
        """
        cls.CURRENT_RUN = cls._generate_completed_run()
        return cls.CURRENT_RUN

    @classmethod
    def _generate_completed_run(cls) -> Dict[str, Any]:
        now = datetime.datetime.now()
        steps: List[Dict[str, Any]] = []
        accumulated_ms = 0

        for step_num, name, duration, details in cls.STEP_DEFINITIONS:
            step_time = now - datetime.timedelta(seconds=(14 - step_num) * 2)
            accumulated_ms += duration
            steps.append({
                "step_number": step_num,
                "name": name,
                "status": "COMPLETED",
                "duration_ms": duration,
                "timestamp": step_time.strftime("%H:%M:%S"),
                "details": details
            })

        run_id = f"OP-RUN-{now.strftime('%Y%m%d-%H%M')}"
        return {
            "run_id": run_id,
            "started_at": (now - datetime.timedelta(seconds=28)).strftime("%Y-%m-%d %H:%M:%S"),
            "completed_at": now.strftime("%Y-%m-%d %H:%M:%S"),
            "overall_status": "COMPLETED",
            "current_step": 14,
            "total_steps": 14,
            "steps": steps,
            "active_sources": 4,
            "records_processed": 14850,
            "is_demo_mode": True
        }
