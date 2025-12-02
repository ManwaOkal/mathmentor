# MathMentor Streamlit Frontend

A beautiful, interactive frontend for the MathMentor AI tutoring platform.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install streamlit requests
   ```

2. **Start the API server** (in a separate terminal):
   ```bash
   python -m uvicorn api.main:app --reload
   ```

3. **Run the Streamlit app:**
   ```bash
   streamlit run frontend/streamlit_app.py
   ```

4. **Open your browser:**
   - The app will automatically open at `http://localhost:8501`

## Features

- **Ask Question**: Interactive Q&A with the AI tutor
- **Explore Concepts**: Browse all available math concepts
- **Practice Problems**: Generate practice problems at different difficulty levels
- **Progress**: Track your learning progress (requires auth)
- **Settings**: Configure API connection

## Configuration

Set environment variables:
```bash
export API_BASE_URL=http://localhost:8000
export USER_ID=your-user-id  # Optional, for progress tracking
```

Or create a `.streamlit/config.toml`:
```toml
[server]
port = 8501

[theme]
primaryColor = "#1f77b4"
```

## Deployment

### Streamlit Cloud (Free)

1. Push your code to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Connect your repository
4. Set environment variables in the dashboard
5. Deploy!

### Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["streamlit", "run", "frontend/streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

## Customization

- Edit `streamlit_app.py` to customize the UI
- Modify the CSS in the `st.markdown()` section
- Add new pages in the sidebar navigation
- Customize colors and styling

