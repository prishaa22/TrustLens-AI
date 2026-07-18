from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from api.schemas import ReviewRequest, BatchPredictionRequest
from api.predictor import predict_review

app = FastAPI(
    title="TrustLens AI",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "TrustLens AI Backend Running"
    }


@app.post("/predict")
def predict(request: ReviewRequest):

    result = predict_review(
        request.review,
        request.rating
    )

    return result

@app.post("/predict-batch")
def predict_batch(data: BatchPredictionRequest):

    results = []

    for review in data.reviews:
        result = predict_review(
            review.review,
            review.rating
        )

        results.append(result)

    return {"results": results}