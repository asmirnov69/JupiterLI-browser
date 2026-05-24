from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_database: str = "default"
    clickhouse_user: str = "default"
    clickhouse_password: str = ""

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_telemetry_key: str = "telemetry"


settings = Settings()
