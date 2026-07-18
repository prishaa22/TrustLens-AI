from pydantic import BaseModel

class ReviewRequest(BaseModel):
    review: str
    rating: float = 5.0

class BatchPredictionRequest(BaseModel):
    reviews: list[ReviewRequest]