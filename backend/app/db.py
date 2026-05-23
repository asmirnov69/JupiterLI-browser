from functools import lru_cache

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from .config import settings


@lru_cache(maxsize=1)
def get_client() -> Client:
    return clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        database=settings.clickhouse_database,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
    )
