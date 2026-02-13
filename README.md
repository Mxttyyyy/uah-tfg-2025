# 🧩 Herramienta Web de Análisis Estático de Código
**Trabajo de Fin de Grado (TFG)**

Este proyecto consiste en el desarrollo de una herramienta web capaz de analizar código fuente de distintos lenguajes de programación mediante técnicas de **análisis estático**, evaluando aspectos como:

- Calidad y estilo
- Seguridad básica
- Complejidad
- Código muerto
- Tipado estático

El sistema se divide en:
- **Backend** --> Python + FastAPI 
- **Frontend** --> React (JavaScript) + Vite + Tailwind CSS

Ambos se comunican mediante una API REST propia.

---

## 🚀 Tecnologías principales

### Backend
- Python 3.10+
- FastAPI
- Uvicorn
- Ruff
- Bandit
- Vulture
- Radon
- Mypy

### Frontend
- React
- Vite
- Tailwind CSS  

---

## 📦 Requisitos

Para ejecutar el proyecto es necesario tener instalado:

- **Python 3.10 o superior**
- **Node.js 18 o superior**
- npm (incluido con Node.js)

### Recomendado
- Usar un entorno virtual (venv) para aislar dependencias del backend
---

## ⚙️ Instalación y ejecución

> Recomendado (Windows): ejecutar los comandos desde el Símbolo del sistema (CMD). PowerShell puede bloquear la activación del entorno virtual (venv).

### 1️⃣ Backend

Desde la carpeta `backend`:

Crear entorno virtual:

```bash
python -m venv venv
```
Activar entorno virtual:

#### Windows
```bash
venv\Scripts\activate
```

#### Linux / macOS
```bash
source venv/bin/activate
```

Instalar dependencias del backend:

```bash
pip install -r requirements.txt
```

Lanzar el servidor:

```bash
uvicorn main:app --reload
```

La API estará disponible en:

- API --> http://localhost:8000
- Documentación Swagger --> http://localhost:8000/docs
Desde Swagger es posible enviar código de ejemplo y probar los distintos análisis disponibles.

### 2️⃣ Frontend

⚠️ El backend debe seguir en ejecución.
> Abre **otra terminal nueva** para ejecutar el frontend.

Desde la carpeta `frontend`:

Instalar dependencias:

```bash
npm install
```

Iniciar la aplicación web:

```bash
npm run dev
```

La aplicación estará disponible en:

```
http://localhost:5173
```

---

## 🧪 Ejemplo de uso en Swagger

La identación del código debe realizarse con 4 espacios.

Ejemplo de petición:
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

---

## 📄 Autor
**Alex Bretones Kaznowska**
Grado en Ingeniería de Computadores - Universidad de Alcalá
