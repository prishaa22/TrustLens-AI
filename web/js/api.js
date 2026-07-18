const API_URL = "http://127.0.0.1:8000";

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