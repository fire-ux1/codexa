"""
CodePilot AI — OpenTelemetry Bootstrap
Initialises TracerProvider + MeterProvider with OTLP gRPC export.
Call setup_otel() once from main.py during application startup.
"""

import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import (
    PeriodicExportingMetricReader,
    ConsoleMetricExporter,
)
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor


def setup_otel(app=None):
    """
    Bootstrap OpenTelemetry SDK.
    - TracerProvider with OTLP gRPC export (falls back to console if no endpoint configured)
    - MeterProvider for custom metrics
    - FastAPI auto-instrumentation
    """
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")

    resource = Resource.create(
        {
            SERVICE_NAME: "codepilot-ai",
            SERVICE_VERSION: os.getenv("APP_VERSION", "1.0.0"),
            "deployment.environment": os.getenv("ENVIRONMENT", "development"),
        }
    )

    # ── Tracing ───────────────────────────────────────────────────────────────
    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                OTLPSpanExporter,
            )

            span_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
            print(f"[OTEL] Tracing → OTLP gRPC at {otlp_endpoint}")
        except Exception as e:
            print(f"[OTEL] OTLP exporter unavailable ({e}), falling back to console.")
            span_exporter = ConsoleSpanExporter()
    else:
        print("[OTEL] No OTEL_EXPORTER_OTLP_ENDPOINT set — tracing to console.")
        span_exporter = ConsoleSpanExporter()

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    trace.set_tracer_provider(tracer_provider)

    # ── Metrics ───────────────────────────────────────────────────────────────
    metric_reader = PeriodicExportingMetricReader(
        ConsoleMetricExporter(), export_interval_millis=60_000
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # ── FastAPI Auto-Instrumentation ──────────────────────────────────────────
    if app is not None:
        FastAPIInstrumentor.instrument_app(app)
        print("[OTEL] FastAPI auto-instrumentation enabled.")

    print("[OTEL] OpenTelemetry setup complete.")
