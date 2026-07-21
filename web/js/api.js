const API_URL = "https://trustlens-ai-zncs.onrender.com/predict";

async function analyzeReview(review, rating) {

    const response = await fetch(`${API_URL}/predict`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            review: review,

            rating: rating

        })

    });

    if (!response.ok) {

        throw new Error("Backend Error");

    }

    return await response.json();

}