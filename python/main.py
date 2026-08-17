import uvicorn

from app.main import app


if __name__ == "__main__":
    print("Swagger UI: http://127.0.0.1:8000/docs")
    print("Health check: http://127.0.0.1:8000/health")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
