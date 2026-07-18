# TrustLens AI

**An Explainable Machine Learning Framework for Fake Review Detection Using NLP**

TrustLens AI analyzes product reviews and predicts whether they're genuine or fake (computer-generated), while explaining *why* — not just handing back a label. It ships as a FastAPI backend, a standalone web dashboard, and a Chrome browser extension.

---

## Project Structure

```
TrustLens-AI/
├── api/                  # FastAPI backend
│   ├── app.py             # API entrypoint (/predict, /predict-batch)
│   ├── predictor.py        # Loads model, computes risk score, prediction
│   ├── explain.py          # Generates natural-language explanations
│   └── schemas.py          # Request/response schemas
├── src/                  # ML training & data pipeline
│   ├── preprocessing.py    # Text cleaning
│   ├── feature_engineering.py  # 21 handcrafted linguistic features
│   ├── train_model.py      # Trains & compares 4 classifiers
│   ├── evaluate.py         # Standalone model evaluation script
│   └── config.py
├── web/                  # Standalone dashboard (vanilla JS)
│   ├── index.html
│   ├── js/app.js, api.js
│   └── css/style.css
├── extension/            # Chrome MV3 extension
│   ├── manifest.json
│   ├── content.js          # Scrapes reviews from Amazon/Flipkart product pages
│   ├── background.js       # Service worker, badge updates
│   └── popup.html/css/js
├── models/                # Trained model artifacts (.pkl) + confusion matrix
├── datasets/               # Raw + processed training data
├── requirements.txt
└── test_api.py
```

## Stack

- **ML**: scikit-learn (Logistic Regression, Random Forest, Linear SVM) + XGBoost, TF-IDF + 21 handcrafted features
- **Backend**: FastAPI
- **Frontend**: Vanilla JavaScript/CSS (no framework)
- **Extension**: Chrome Manifest V3

## Model Performance

Held-out test set (8,087 reviews, stratified 80/20 split), calibrated Linear SVM:

| Metric | Score |
|---|---|
| Accuracy | 91.25% |
| Precision | 91.25% |
| Recall | 91.25% |
| F1-Score | 91.25% |

See `models/confusion_matrix.png` for the full confusion matrix, and `src/evaluate.py` for the reproducible evaluation script.

## Setup

```bash
# Clone
git clone https://github.com/prishaa22/TrustLens-AI.git
cd TrustLens-AI

# Virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the backend
uvicorn api.app:app --reload --port 8000
```

API docs available at `http://127.0.0.1:8000/docs` (Swagger UI).

### Running the web dashboard

```bash
python web/app.py
```

Serves the dashboard at `http://127.0.0.1:5500` (avoids `file://` CORS issues with `fetch()`).

### Loading the Chrome extension

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder
4. Visit a supported Amazon or Flipkart product page — reviews will be scanned automatically

### Re-training the model

```bash
python -m src.train_model
python -m src.evaluate
```

Requires `datasets/processed/feature_dataset.csv` (already included in this repo).

## API Example

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"review": "Amazing product, works great!", "rating": 5}'
```

```json
{
  "prediction": "Genuine Review",
  "confidence": 91.25,
  "risk_level": "Low",
  "overall_trust": "Excellent",
  "authenticity_score": 91.25,
  "fake_probability": 8.75,
  "feature_summary": [],
  "reasons": ["..."]
}
```

## Known Limitations

- Chrome extension coverage is currently limited to Amazon and Flipkart (Flipkart scraping not fully validated)
- Extension scans only the currently visible/loaded review page, not full multi-page pagination across a product
- Model performance degrades on very short, low-signal reviews at both extremes (plain short text and hype-saturated short text) — see the project's IEEE paper for a detailed error analysis
- Single-language (English), single-domain (e-commerce) training data

## Future Scope

- Dataset rebalancing to address short-text misclassification
- Model-intrinsic explainability (SHAP/LIME)
- Transformer-based model comparison (BERT/RoBERTa/DistilBERT)
- Multi-platform extension support beyond Amazon/Flipkart
- Cloud deployment with persistent user history

## Dataset

[Fake Reviews Dataset](https://www.kaggle.com/datasets/mexwell/fake-reviews-dataset) (Kaggle) — ~40,000 labeled reviews (20,000 genuine, 20,000 computer-generated).
