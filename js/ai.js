// Advanced AI Services for StorySpot
class AIStoryAssistant {
    constructor() {
        this.API_KEY = 'AIzaSyCxZHOkye6QRNQKtjsx5sx3nebCmCCjWK0';
        this.BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
        this.storageKey = 'storySpotAIFeatures';
    }

    // Comprehensive Story Generation with Location Context
    async generateStoryPrompt(location) {
        try {
            const prompt = `Create a unique, engaging story prompt based on these location details: 
            Latitude: ${location.latitude}, 
            Longitude: ${location.longitude}, 
            City: ${location.city || 'Unknown'}, 
            Country: ${location.country || 'Unknown'}

            The story should:
            - Be inspired by the location's unique characteristics
            - Include a compelling narrative hook
            - Suggest an emotional journey
            - Provide creative writing guidance`;

            const response = await this.callGeminiAPI(prompt);
            return response.trim();
        } catch (error) {
            console.error('Story Prompt Generation Error:', error);
            return this.getFallbackStoryPrompt(location);
        }
    }

    // Advanced Sentiment and Tone Analysis
    async analyzeSentiment(storyText) {
        try {
            const prompt = `Perform a detailed sentiment and emotional tone analysis of the following text. 
            Provide a comprehensive breakdown including:
            - Overall sentiment (Positive/Negative/Neutral)
            - Emotional intensity (Low/Medium/High)
            - Primary emotions detected
            - Potential underlying themes

            Text to analyze:
            ${storyText}`;

            const response = await this.callGeminiAPI(prompt);
            return this.parseEmotionalInsights(response);
        } catch (error) {
            console.error('Sentiment Analysis Error:', error);
            return this.getFallbackSentimentAnalysis();
        }
    }

    // AI-Powered Story Tagging and Categorization
    async generateStoryTags(storyText, location) {
        try {
            const prompt = `Generate a comprehensive set of tags for a story based on its content and location context.
            Provide tags that capture:
            - Story genre
            - Emotional themes
            - Location-based keywords
            - Narrative style

            Location: ${location.city}, ${location.country}
            Story Excerpt: ${storyText.substring(0, 500)}`;

            const response = await this.callGeminiAPI(prompt);
            return this.parseStoryTags(response);
        } catch (error) {
            console.error('Story Tagging Error:', error);
            return this.getFallbackStoryTags();
        }
    }

    // AI-Enhanced Story Recommendations
    async recommendSimilarStories(story, location) {
        try {
            const prompt = `Based on this story and its location, recommend similar stories or themes that a user might enjoy:
            
            Story Excerpt: ${story.substring(0, 500)}
            Location: ${location.city}, ${location.country}

            Provide:
            - 3-4 thematic recommendations
            - Brief explanation for each recommendation
            - Potential emotional connections`;

            const response = await this.callGeminiAPI(prompt);
            return this.parseStoryRecommendations(response);
        } catch (error) {
            console.error('Story Recommendation Error:', error);
            return this.getFallbackRecommendations();
        }
    }

    // Core Gemini API Call Method
    async callGeminiAPI(prompt) {
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        const response = await fetch(`${this.BASE_URL}?key=${this.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Gemini API request failed');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    // Parsing and Utility Methods
    parseEmotionalInsights(aiResponse) {
        // Parse AI response into structured emotional insights
        return {
            overallSentiment: this.extractSentiment(aiResponse),
            emotionalIntensity: this.extractEmotionalIntensity(aiResponse),
            primaryEmotions: this.extractPrimaryEmotions(aiResponse),
            themes: this.extractThemes(aiResponse)
        };
    }

    parseStoryTags(aiResponse) {
        // Extract and clean tags from AI response
        const tagRegex = /\b[A-Za-z\s]+(?=:|\n|$)/g;
        return (aiResponse.match(tagRegex) || [])
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
            .slice(0, 10);
    }

    parseStoryRecommendations(aiResponse) {
        // Parse AI recommendations into structured format
        const recommendationRegex = /\d+\.\s*(.+?)(?=\n\d+|\n*$)/gs;
        return Array.from(aiResponse.matchAll(recommendationRegex))
            .map(match => match[1].trim())
            .slice(0, 4);
    }

    // Fallback Methods for Error Handling
    getFallbackStoryPrompt(location) {
        const fallbackPrompts = [
            `Write a story inspired by the hidden stories of ${location.city || 'this place'}`,
            `Explore an unexpected adventure in ${location.country || 'this location'}`,
            `Uncover a secret that connects you to this geographical point`
        ];
        return fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
    }

    getFallbackSentimentAnalysis() {
        return {
            overallSentiment: 'neutral',
            emotionalIntensity: 'low',
            primaryEmotions: ['curiosity'],
            themes: ['exploration']
        };
    }

    getFallbackStoryTags() {
        return ['adventure', 'travel', 'personal', 'location'];
    }

    getFallbackRecommendations() {
        return [
            'Stories of unexpected journeys',
            'Personal transformations in unknown places',
            'Hidden local histories'
        ];
    }

    // Extraction Utility Methods
    extractSentiment(text) {
        const sentimentMap = {
            'positive': text.toLowerCase().includes('positive'),
            'negative': text.toLowerCase().includes('negative'),
            'neutral': true
        };
        return Object.keys(sentimentMap).find(key => sentimentMap[key]) || 'neutral';
    }

    extractEmotionalIntensity(text) {
        if (text.toLowerCase().includes('intense') || text.toLowerCase().includes('strong')) return 'high';
        if (text.toLowerCase().includes('moderate')) return 'medium';
        return 'low';
    }

    extractPrimaryEmotions(text) {
        const emotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'love'];
        return emotions.filter(emotion => text.toLowerCase().includes(emotion)).slice(0, 3);
    }

    extractThemes(text) {
        const themes = ['adventure', 'discovery', 'personal growth', 'connection', 'transformation'];
        return themes.filter(theme => text.toLowerCase().includes(theme)).slice(0, 3);
    }

    // Local Storage Management
    saveAIFeatures(features) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(features));
        } catch (error) {
            console.error('Failed to save AI features:', error);
        }
    }

    loadAIFeatures() {
        try {
            const savedFeatures = localStorage.getItem(this.storageKey);
            return savedFeatures ? JSON.parse(savedFeatures) : null;
        } catch (error) {
            console.error('Failed to load AI features:', error);
            return null;
        }
    }
}

// Initialize AI Assistant
const storyAI = new AIStoryAssistant();

// Expose key methods to global scope for HTML interaction
window.generateStoryPrompt = async (location) => {
    return await storyAI.generateStoryPrompt(location);
};

window.analyzeSentiment = async (storyText) => {
    return await storyAI.analyzeSentiment(storyText);
};

window.generateStoryTags = async (storyText, location) => {
    return await storyAI.generateStoryTags(storyText, location);
};

window.recommendSimilarStories = async (story, location) => {
    return await storyAI.recommendSimilarStories(story, location);
};
