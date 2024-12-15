// Initialize AOS
AOS.init();

// API Services Configuration
const API_SERVICES = {
    OPENAI: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        apiKey: null,
        isConfigured: function() {
            return this.apiKey && this.apiKey.startsWith('sk-');
        }
    }
};

// Secure API Key Management
const APIKeyManager = {
    setAPIKey(service, apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            console.error(`Invalid API key for ${service}`);
            return false;
        }

        // Validate OpenAI API key format
        if (service === 'OPENAI' && !/^sk-[a-zA-Z0-9]{48}$/.test(apiKey)) {
            console.error('Invalid OpenAI API key format');
            return false;
        }

        // Set API key securely
        API_SERVICES[service].apiKey = apiKey;
        
        // Persist in secure storage
        try {
            localStorage.setItem(`${service}_API_KEY`, apiKey);
            console.log(`${service} API key configured successfully`);
            return true;
        } catch (error) {
            console.error(`Error storing ${service} API key:`, error);
            return false;
        }
    },

    getAPIKey(service) {
        // First check runtime configuration
        if (API_SERVICES[service].apiKey) {
            return API_SERVICES[service].apiKey;
        }

        // Then check localStorage
        try {
            const storedKey = localStorage.getItem(`${service}_API_KEY`);
            if (storedKey) {
                API_SERVICES[service].apiKey = storedKey;
                return storedKey;
            }
        } catch (error) {
            console.error(`Error retrieving ${service} API key:`, error);
        }

        return null;
    },

    clearAPIKey(service) {
        API_SERVICES[service].apiKey = null;
        localStorage.removeItem(`${service}_API_KEY`);
        console.log(`${service} API key cleared`);
    }
};

// Global configuration method
window.configureStorySpot = {
    setOpenAIApiKey: (apiKey) => APIKeyManager.setAPIKey('OPENAI', apiKey),
    getOpenAIApiKey: () => APIKeyManager.getAPIKey('OPENAI'),
    clearOpenAIApiKey: () => APIKeyManager.clearAPIKey('OPENAI')
};

// Fallback Location Insights
const FALLBACK_INSIGHTS = {
    generateHistoricalContext(location) {
        const genericHistories = [
            `${location.city} has a rich and diverse history spanning centuries of cultural development.`,
            `The region around ${location.city} has been home to various civilizations and communities throughout history.`,
            `${location.city}'s past is marked by significant transformations and resilient communities.`
        ];
        return genericHistories[Math.floor(Math.random() * genericHistories.length)];
    },

    generateCulturalInsights(location) {
        const culturalDescriptions = [
            `${location.city} is known for its unique blend of traditional and modern cultural practices.`,
            `The local culture in ${location.city} is characterized by hospitality, artistic expression, and community spirit.`,
            `Diverse cultural traditions thrive in ${location.city}, creating a vibrant and dynamic social landscape.`
        ];
        return culturalDescriptions[Math.floor(Math.random() * culturalDescriptions.length)];
    },

    generateNaturalFeatureDescription(location) {
        const geographicalDescriptions = [
            `The area around ${location.city} features a diverse and fascinating natural landscape.`,
            `${location.city}'s surrounding environment offers a mix of geographical features that support rich biodiversity.`,
            `The natural terrain near ${location.city} presents a unique ecological setting with varied landscapes.`
        ];
        return geographicalDescriptions[Math.floor(Math.random() * geographicalDescriptions.length)];
    }
};

// Story Management Class
class StoryManager {
    constructor() {
        this.stories = [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const storyForm = document.getElementById('storyForm');
        if (storyForm) {
            storyForm.addEventListener('submit', this.handleStorySubmission.bind(this));
        }
    }

    async handleStorySubmission(event) {
        event.preventDefault();
        
        try {
            // Collect story data
            const storyData = this.collectStoryData();

            // Generate location insights
            const locationInsights = await this.generateLocationInsights(storyData.location);
            storyData.locationInsights = locationInsights;

            // Handle image upload
            const imageInput = document.getElementById('image');
            if (imageInput.files.length > 0) {
                const imageFile = imageInput.files[0];
                storyData.imageUrl = await this.uploadImage(imageFile);
            }

            // Create story object with AI enhancements
            const newStory = {
                id: Date.now(),
                title: storyData.title,
                description: storyData.description,
                image: storyData.imageUrl || 'default-story-image.jpg',
                location: storyData.location,
                timestamp: new Date().toISOString(),
                locationInsights: storyData.locationInsights,
                ai: {
                    sentiment: await window.analyzeSentiment(storyData.description),
                    tags: await window.generateStoryTags(storyData.description, storyData.location),
                    recommendations: await window.recommendSimilarStories(storyData.description, storyData.location)
                }
            };

            // Add story to collection
            this.addStory(newStory);

            // Update visualizations
            this.updateMapMarkers();
            this.updateStoryVisualization(newStory);

            // Reset form
            event.target.reset();

            // Show success message
            this.displayStorySubmissionFeedback(newStory);
        } catch (error) {
            console.error('Story Submission Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: 'Unable to process your story. Please try again.'
            });
        }
    }

    collectStoryData() {
        const titleInput = document.getElementById('title');
        const descriptionInput = document.getElementById('description');

        // Validate inputs
        if (!titleInput.value.trim() || !descriptionInput.value.trim()) {
            Swal.fire({
                icon: 'error',
                title: 'Incomplete Story',
                text: 'Please provide both a title and description for your story.'
            });
            throw new Error('Incomplete story data');
        }

        // Get current location from map
        const currentLocation = window.getCurrentLocation();

        return {
            title: titleInput.value,
            description: descriptionInput.value,
            location: currentLocation
        };
    }

    async generateLocationInsights(location) {
        try {
            const [historicalContext, culturalSignificance, naturalFeatures] = await Promise.all([
                this.generateHistoricalContext(location),
                this.generateCulturalInsights(location),
                this.generateNaturalFeatureDescription(location)
            ]);

            return {
                historicalContext,
                culturalSignificance,
                naturalFeatures
            };
        } catch (error) {
            console.error('Error generating location insights:', error);
            return {
                historicalContext: 'Historical information not available.',
                culturalSignificance: 'Cultural details pending research.',
                naturalFeatures: 'Geographical description unavailable.'
            };
        }
    }

    async generateHistoricalContext(location) {
        return this.generateAILocationInsight({
            name: 'generateHistoricalContext',
            prompt: (loc) => `Provide a brief 2-3 sentence historical overview of ${loc.city}, ${loc.country}. Focus on key historical events or periods.`
        }, location);
    }

    async generateCulturalInsights(location) {
        return this.generateAILocationInsight({
            name: 'generateCulturalInsights',
            prompt: (loc) => `Describe the unique cultural aspects of ${loc.city}, ${loc.country} in 2-3 sentences.`
        }, location);
    }

    async generateNaturalFeatureDescription(location) {
        return this.generateAILocationInsight({
            name: 'generateNaturalFeatureDescription',
            prompt: (loc) => `Describe the natural landscape and geographical features around ${loc.city}, ${loc.country} in 2-3 sentences.`
        }, location);
    }

    async generateAILocationInsight(method, location) {
        const service = API_SERVICES.OPENAI;

        // Check API key configuration
        if (!service.isConfigured()) {
            console.warn(`No OpenAI API key. Using fallback for ${method.name}`);
            return FALLBACK_INSIGHTS[method.name](location);
        }

        try {
            const response = await fetch(service.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${service.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: service.model,
                    messages: [{
                        role: 'user',
                        content: method.prompt(location)
                    }]
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('OpenAI API Error:', errorBody);
                return FALLBACK_INSIGHTS[method.name](location);
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error(`Error in ${method.name}:`, error);
            return FALLBACK_INSIGHTS[method.name](location);
        }
    }

    async uploadImage(imageFile) {
        try {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });
        } catch (error) {
            console.error('Image upload error:', error);
            return 'default-story-image.jpg';
        }
    }

    addStory(story) {
        this.stories.push(story);
        this.updateStoryVisualization(story);
    }

    updateStoryVisualization(story) {
        const storiesContainer = document.getElementById('storiesContainer');
        if (!storiesContainer) return;

        // Create story card
        const storyCard = document.createElement('div');
        storyCard.className = 'bg-white rounded-lg shadow-md p-4 mb-4';
        storyCard.innerHTML = `
            <div class="flex items-start space-x-4">
                ${story.image ? `
                    <div class="w-1/3">
                        <img src="${story.image}" alt="${story.title}" 
                            class="w-full h-48 object-cover rounded-lg">
                    </div>
                ` : ''}
                <div class="${story.image ? 'w-2/3' : 'w-full'}">
                    <h3 class="text-xl font-bold mb-2">${story.title}</h3>
                    <p class="text-gray-600 mb-2">${story.description.substring(0, 200)}...</p>
                    
                    <div class="bg-blue-50 p-3 rounded-lg mt-2">
                        <h4 class="font-semibold text-blue-800 mb-1">Location Insights</h4>
                        <div class="space-y-2">
                            <p><strong>Location:</strong> ${story.location.fullAddress}</p>
                            <p><strong>Historical Context:</strong> ${story.locationInsights.historicalContext}</p>
                            <p><strong>Cultural Significance:</strong> ${story.locationInsights.culturalSignificance}</p>
                            <p><strong>Natural Features:</strong> ${story.locationInsights.naturalFeatures}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Prepend story card to container
        storiesContainer.insertBefore(storyCard, storiesContainer.firstChild);

        // Update sentiment chart
        this.updateSentimentChart(story.ai.sentiment);
    }

    updateMapMarkers() {
        // Placeholder for map marker update logic
        console.log('Updating map markers');
    }

    updateSentimentChart(sentimentData) {
        try {
            // Placeholder for sentiment chart update
            console.log('Updating sentiment chart', sentimentData);
        } catch (error) {
            console.error('Sentiment chart update error:', error);
        }
    }

    displayStorySubmissionFeedback(story) {
        Swal.fire({
            title: 'Story Submitted Successfully!',
            html: `
                <p>Your story "${story.title}" has been added.</p>
                <p>Location: ${story.location.fullAddress}</p>
            `,
            icon: 'success',
            confirmButtonText: 'Great!'
        });
    }

    getSentimentLabel(sentiment) {
        if (sentiment.overallSentiment > 0.7) return 'Very Positive';
        if (sentiment.overallSentiment > 0.3) return 'Positive';
        if (sentiment.overallSentiment > -0.3) return 'Neutral';
        if (sentiment.overallSentiment > -0.7) return 'Negative';
        return 'Very Negative';
    }
}

// Attempt to load stored API key on initialization
document.addEventListener('DOMContentLoaded', () => {
    const storedApiKey = APIKeyManager.getAPIKey('OPENAI');
    if (storedApiKey) {
        console.log('Loaded stored OpenAI API key');
        window.configureStorySpot.setOpenAIApiKey(storedApiKey);
    } else {
        console.warn('No stored OpenAI API key found');
    }

    // Initialize Story Manager
    const storyManager = new StoryManager();
    window.storyManager = storyManager;
});
