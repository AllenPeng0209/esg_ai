#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE esg_ai;
    GRANT ALL PRIVILEGES ON DATABASE esg_ai TO postgres;
EOSQL 