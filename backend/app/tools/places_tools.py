import json
import random
from typing import Optional, List, Dict, Any


def search_attractions(
    destination: str,
    interests: Optional[List[str]] = None,
    max_results: int = 5,
) -> str:
    """
    Search for top tourist attractions, museums, landmarks, and cultural spots in a city.

    Args:
        destination (str): Destination city name (e.g., 'Rome', 'Tokyo', 'Paris').
        interests (Optional[List[str]]): List of user interest categories such as
                                         ['History', 'Art', 'Food', 'Nature', 'Architecture', 'Adventure'].
        max_results (int): Maximum number of attraction recommendations to return (default 5).

    Returns:
        str: JSON formatted string containing attraction details: name, category,
             highlight description, recommended duration in hours, ticket cost in USD,
             and ideal time of day to visit.
    """
    dest_clean = destination.strip().title()
    dest_lower = dest_clean.lower()
    interests_clean = [i.strip().lower() for i in (interests or ["history", "culture", "sightseeing"])]

    # City-specific attraction catalogs
    city_catalogs: Dict[str, List[Dict[str, Any]]] = {
        "paris": [
            {
                "name": "Musée du Louvre & Tuileries Garden",
                "category": "Art & History",
                "description": "World's largest museum housing the Mona Lisa and Venus de Milo.",
                "recommended_hours": 3.5,
                "entry_fee_usd": 24.0,
                "best_time": "Morning (9:00 AM) or Friday late evening",
                "highlight": "Masterpieces of world art in an iconic historic palace",
            },
            {
                "name": "Eiffel Tower & Champ de Mars",
                "category": "Landmark & Architecture",
                "description": "Iconic iron lattice tower with panoramic views of the city.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 32.0,
                "best_time": "Sunset / Twilight for light show",
                "highlight": "Breathtaking 360-degree panorama of Paris",
            },
            {
                "name": "Montmartre & Sacré-Cœur Basilica",
                "category": "Culture & Neighborhoods",
                "description": "Bohemian hilltop quarter with artists' square and stunning basilica.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 0.0,
                "best_time": "Late afternoon",
                "highlight": "Charming cobblestone alleyways and Parisian cafe atmosphere",
            },
            {
                "name": "Sainte-Chapelle & Conciergerie",
                "category": "History & Architecture",
                "description": "Gothic royal chapel with 13th-century stained glass windows.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 13.0,
                "best_time": "Sunny morning for light reflections",
                "highlight": "Mesmerizing 15-meter jewel-toned stained glass",
            },
            {
                "name": "Musée d'Orsay",
                "category": "Art & Culture",
                "description": "Former Beaux-Arts railway station holding Impressionist masterpieces.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 17.5,
                "best_time": "Early afternoon",
                "highlight": "Unparalleled collection of Monet, Van Gogh, and Degas",
            },
            {
                "name": "Seine River Sunset Cruise",
                "category": "Relaxation & Sightseeing",
                "description": "Scenic boat cruise passing illuminated bridges and Notre-Dame cathedral.",
                "recommended_hours": 1.2,
                "entry_fee_usd": 18.0,
                "best_time": "Evening (8:00 PM)",
                "highlight": "Spectacular night views from the water",
            },
        ],
        "rome": [
            {
                "name": "Colosseum & Roman Forum",
                "category": "History & Archaeology",
                "description": "Iconic ancient amphitheater and the heart of the Roman Republic.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 22.0,
                "best_time": "Early Morning (8:30 AM)",
                "highlight": "Walk the ancient arena floor and gladiatorial tunnels",
            },
            {
                "name": "Vatican Museums & Sistine Chapel",
                "category": "Art & Religion",
                "description": "Enormous papal collection culminating in Michelangelo's fresco ceiling.",
                "recommended_hours": 4.0,
                "entry_fee_usd": 28.0,
                "best_time": "Midday with skip-the-line pass",
                "highlight": "Michelangelo's The Creation of Adam and The Last Judgment",
            },
            {
                "name": "Pantheon & Piazza Navona",
                "category": "Architecture & Food",
                "description": "Ancient Roman temple with monumental concrete dome and baroque piazza.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 5.5,
                "best_time": "Midday sunbeam through the oculus",
                "highlight": "Best preserved monument from ancient imperial Rome",
            },
            {
                "name": "Trevi Fountain & Spanish Steps",
                "category": "Culture & Photography",
                "description": "Dramatic Baroque fountain and monumental 135-step stairway.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 0.0,
                "best_time": "Late night or sunrise to avoid crowds",
                "highlight": "Toss a coin into the fountain to ensure your return to Rome",
            },
            {
                "name": "Trastevere District Food & Wine Walk",
                "category": "Food & Nightlife",
                "description": "Picturesque medieval alleys renowned for authentic trattorias.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 35.0,
                "best_time": "Evening (7:30 PM)",
                "highlight": "Authentic Cacio e Pepe, Roman artichokes, and crisp Frascati wine",
            },
        ],
        "tokyo": [
            {
                "name": "Senso-ji Temple & Asakusa District",
                "category": "History & Culture",
                "description": "Tokyo's oldest Buddhist temple founded in 645 AD.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 0.0,
                "best_time": "Morning (8:00 AM)",
                "highlight": "Thunder Gate (Kaminarimon) and Nakamise shopping street",
            },
            {
                "name": "Shibuya Crossing & Hachiko Statue",
                "category": "Urban & Modern",
                "description": "The world's busiest pedestrian intersection pulsating with neon energy.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 0.0,
                "best_time": "Sunset to Evening",
                "highlight": "Overlook the scramble crossing from Shibuya Sky observatory",
            },
            {
                "name": "teamLab Planets TOKYO (Digital Art)",
                "category": "Art & Technology",
                "description": "Immersive, body-surrounding sensory digital art museum in water.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 30.0,
                "best_time": "Afternoon reservation",
                "highlight": "Infinite crystal universe and floating orchid gardens",
            },
            {
                "name": "Shinjuku Gyoen National Garden",
                "category": "Nature & Relaxation",
                "description": "Expansive tranquil garden blending traditional Japanese and French styles.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 4.0,
                "best_time": "Morning",
                "highlight": "Peaceful reflection ponds and cherry blossom / bonsai pavilions",
            },
            {
                "name": "Akihabara Electric Town & Anime Hub",
                "category": "Tech & Pop Culture",
                "description": "Epicenter for electronic components, anime, manga, and retro arcades.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 0.0,
                "best_time": "Afternoon",
                "highlight": "Multi-floor retro gaming stores and themed cafes",
            },
        ],
    }

    # If city is not in predefined catalogs, generate high-quality realistic spots
    if dest_lower in city_catalogs:
        catalog = city_catalogs[dest_lower]
    else:
        catalog = [
            {
                "name": f"{dest_clean} Historic Old Town & Central Square",
                "category": "History & Architecture",
                "description": f"The historical epicenter of {dest_clean} with cobblestone plazas and landmark towers.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 0.0,
                "best_time": "Morning",
                "highlight": "Centuries-old heritage architecture and bustling market life",
            },
            {
                "name": f"National Museum & Art Gallery of {dest_clean}",
                "category": "Art & History",
                "description": f"Curated national treasures, archaeological exhibits, and fine arts.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 18.0,
                "best_time": "Early Afternoon",
                "highlight": "Rich regional artefacts and world-class exhibitions",
            },
            {
                "name": f"{dest_clean} Panoramic Skyline Viewpoint",
                "category": "Sightseeing & Nature",
                "description": f"The highest vantage point offering sweeping views of the entire {dest_clean} skyline.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 12.0,
                "best_time": "Golden Hour / Sunset",
                "highlight": "Unmatched panoramic photos of the city",
            },
            {
                "name": f"{dest_clean} Botanical Gardens & Waterfront Promenade",
                "category": "Nature & Relaxation",
                "description": "Lush parkland ideal for leisurely walks and experiencing local flora.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 5.0,
                "best_time": "Morning",
                "highlight": "Serene green pathways and scenic coastal / river vistas",
            },
            {
                "name": f"Grand Bazaar & Artisan Quarter of {dest_clean}",
                "category": "Culture & Shopping",
                "description": "Vibrant craft stalls, authentic spices, street gastronomy, and souvenirs.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 0.0,
                "best_time": "Afternoon",
                "highlight": "Local craftsmanship and bustling culinary tastings",
            },
        ]

    # Filter or rank based on interests if provided
    selected = catalog[:max_results]

    return json.dumps({
        "destination": dest_clean,
        "matched_interests": interests_clean,
        "total_attractions": len(selected),
        "attractions": selected,
    }, indent=2)


def search_restaurants(
    destination: str,
    cuisine_type: str = "local",
    price_range: str = "$$",
) -> str:
    """
    Discover top-rated culinary dining spots and authentic local eateries.

    Args:
        destination (str): City name (e.g., 'Rome', 'Paris', 'Tokyo').
        cuisine_type (str): Type of cuisine ('local', 'street_food', 'fine_dining', 'vegetarian').
        price_range (str): Price range indicator ('$', '$$', '$$$').

    Returns:
        str: JSON formatted string containing restaurant recommendations, signature dishes,
             average cost per person, and neighborhood.
    """
    dest_clean = destination.strip().title()

    sample_restaurants = [
        {
            "name": f"Trattoria Della {dest_clean}",
            "cuisine": "Authentic Local Cuisine",
            "price_level": "$$",
            "avg_cost_person_usd": 28.0,
            "neighborhood": "Old Town Quarter",
            "signature_dish": "Handmade pasta / Chef's seasonal specialty",
            "rating": 4.7,
            "booking_needed": True,
        },
        {
            "name": f"{dest_clean} Gourmet Bistro",
            "cuisine": "Modern Fusion & Wine Bar",
            "price_level": "$$$",
            "avg_cost_person_usd": 55.0,
            "neighborhood": "Arts & Museum District",
            "signature_dish": "Dry-aged beef & paired vintage regional wines",
            "rating": 4.9,
            "booking_needed": True,
        },
        {
            "name": f"Street Eats & Market Stalls {dest_clean}",
            "cuisine": "Street Food & Quick Bites",
            "price_level": "$",
            "avg_cost_person_usd": 12.0,
            "neighborhood": "Central Food Market",
            "signature_dish": "Crispy pastries, savory skewers, and local craft soda",
            "rating": 4.6,
            "booking_needed": False,
        },
    ]

    return json.dumps({
        "destination": dest_clean,
        "cuisine_preference": cuisine_type,
        "price_tier": price_range,
        "recommendations": sample_restaurants,
    }, indent=2)


def get_neighborhood_guide(destination: str) -> str:
    """
    Get an essential neighborhood breakdown, transit options, safety tips, and cultural etiquette.

    Args:
        destination (str): Destination city name.

    Returns:
        str: JSON formatted string containing transit tips, top neighborhoods to stay in,
             walkability score, and safety advice.
    """
    dest_clean = destination.strip().title()

    guide = {
        "city": dest_clean,
        "walkability_rating": "9/10 - Highly Walkable City Center",
        "recommended_transit": "Metro/Subway & Contactless Smart Card (Day pass recommended)",
        "neighborhood_breakdown": [
            {
                "area": "Historic Center",
                "best_for": "First-time visitors, walking to iconic sights",
                "vibe": "Energetic, historic, lively cafes",
            },
            {
                "area": "Artisan & Bohemian Quarter",
                "best_for": "Nightlife, boutique shopping, intimate dining",
                "vibe": "Hip, artsy, picturesque streets",
            },
            {
                "area": "Modern Waterfront / Business Hub",
                "best_for": "Luxury hotels, upscale shopping, scenic jogging",
                "vibe": "Polished, contemporary, spacious",
            },
        ],
        "local_tips": [
            "Tipping: 5-10% is customary for great table service; check if service charge is already included on the bill.",
            "Water: Tap water is generally safe and free public water fountains are common in the city center.",
            "Metro: Avoid rush hours (8:00-9:15 AM and 5:30-7:00 PM) when traveling with large luggage.",
        ],
    }

    return json.dumps(guide, indent=2)
