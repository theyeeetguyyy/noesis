---
title: Noesis
emoji: 🔮
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
---

<div align="center">
  <h1>Noesis</h1>
  <p><strong>Your intelligent document assistant.</strong></p>
  <p>Upload your PDFs or Word documents and instantly chat with them to find the answers you need.</p>
</div>

<br />

**Demo Account:**
- **Username:** `demo`
- **Password:** `demo`

*(Note: The demo account has a built-in limit of 10 questions and 3 uploads).*

---

## 💻 Run it Locally

You can run this entirely on your own computer in just two steps.

### 1. Start the Backend
Open your terminal in the main project folder and run:
```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 7860
```

### 2. Start the Frontend
Open a **second** terminal window and run:
```bash
cd frontend-react
npm install
npm run dev
```

That's it! Open `http://localhost:5173` in your web browser and sign in using the demo account above.

---

<div align="center">
  <p>Built by Astitva Bandil</p>
</div>
