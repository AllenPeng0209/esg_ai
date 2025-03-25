from setuptools import setup, find_packages

setup(
    name="esg-ai-backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.68.0",
        "uvicorn>=0.15.0",
        "sqlalchemy>=1.4.23",
        "pydantic>=1.8.2",
        "pydantic-settings>=2.0.0",
        "python-jose[cryptography]>=3.3.0",
        "passlib[bcrypt]>=1.7.4",
        "python-multipart>=0.0.5",
        "httpx>=0.23.0",
        "pandas>=1.3.3",
        "python-dotenv>=0.19.0",
        "alembic>=1.7.1",
        "psycopg2-binary>=2.9.1",
        "email-validator>=1.1.3",
        "supabase>=2.0.0",
    ],
    python_requires=">=3.10",
) 