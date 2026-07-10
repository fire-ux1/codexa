"""
CodePilot AI — OpenTelemetry Instrumentations
Provides helper functions to instrument psycopg2, redis, and celery.
"""


def instrument_psycopg2():
    try:
        from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor

        Psycopg2Instrumentor().instrument()
        print("[OTEL] psycopg2 instrumentation enabled.")
    except Exception as e:
        print(f"[OTEL] Failed to instrument psycopg2: {e}")


def instrument_redis():
    try:
        from opentelemetry.instrumentation.redis import RedisInstrumentor

        RedisInstrumentor().instrument()
        print("[OTEL] redis instrumentation enabled.")
    except Exception as e:
        print(f"[OTEL] Failed to instrument redis: {e}")


def instrument_celery():
    try:
        from opentelemetry.instrumentation.celery import CeleryInstrumentor

        CeleryInstrumentor().instrument()
        print("[OTEL] celery instrumentation enabled.")
    except Exception as e:
        print(f"[OTEL] Failed to instrument celery: {e}")
