from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    sqlite3_db_fn: str = "/sqlite3-data/data.db"

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_telemetry_key: str = "telemetry"


settings = Settings()
