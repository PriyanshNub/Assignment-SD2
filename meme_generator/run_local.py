import uvicorn
from fastapi.staticfiles import StaticFiles
from api.index import app

app.mount("/", StaticFiles(directory="public", html=True), name="public")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
