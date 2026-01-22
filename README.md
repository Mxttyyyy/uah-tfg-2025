# 🧩 Herramienta de Análisis de Código
**Trabajo de Fin de Grado (TFG)**

Este proyecto consiste en el desarrollo de una herramienta web capaz de analizar código fuente de distintos lenguajes de programación mediante técnicas de análisis estático y mostrar los resultados al usuario a través de una interfaz web sencilla y moderna.  

El sistema se divide en **backend** (Python + FastAPI) y **frontend** (React), comunicados entre sí mediante una API propia.

---

## 🚀 Tecnologías principales

### Backend
- **Python**  
- **FastAPI**
- **Uvicorn**
- Herramientas de análisis estático: **Ruff, Bandit, Vulture, Radon, Mypy**

### Frontend
- **React**  
- **Vite**  

---

## ⚙️ Ejecución del backend

El backend se expone como una **API REST** mediante **Uvicorn**.

### Requisitos
- Python 3.10 o superior
- Entorno virtual recomendado

### Instalación de dependencias

```bash
pip install -r requirements.txt
```
### Lanzar la API (desde el directorio /backend)
```bash
uvicorn main:app --reload
```
Una vez iniciado el servidor, la API estará disponible en:
- API: http://localhost:8000
- Documentación Swagger: http://localhost:8000/docs
Desde Swagger es posible enviar código de ejemplo y probar los distintos análisis disponibles.

## 🧪 Ejemplo de uso en Swagger
Cabe destacar que la identación se realiza con 4 espacios.
```json
{
  "language": "python",
  "code": "def suma(a: int, b: int) -> int:\n    return a + b\n",
  "options": {
    "enabled": ["style", "metrics", "types"]
  }
}
```
Al enviar la petición, Swagger muestra la respuesta del backend en formato JSON con los resultados de los análisis ejecutados.

## 📄 Autor
**Alex Bretones Kaznowska**
Grado en Ingeniería de Computadores - Universidad de Alcalá
