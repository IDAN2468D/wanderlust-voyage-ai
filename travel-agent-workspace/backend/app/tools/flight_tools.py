import json
import random
from typing import Optional, List, Dict, Any


def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None,
    max_stops: int = 1,
) -> str:
    """
    Search for commercial flights between origin and destination on given dates.

    Args:
        origin (str): Origin IATA code or city name (e.g., 'TLV', 'JFK', 'LHR').
        destination (str): Destination IATA code or city name (e.g., 'FCO', 'CDG', 'HND').
        departure_date (str): Outbound departure date in YYYY-MM-DD format.
        return_date (Optional[str]): Return flight date in YYYY-MM-DD format (if roundtrip).
        max_stops (int): Maximum number of flight layovers/stops allowed (0 for non-stop, 1, or 2).

    Returns:
        str: JSON formatted string containing a list of available flight options with
             airline name, flight number, departure and arrival times, flight duration,
             stop count, cabin class, and estimated price in USD.
    """
    origin_clean = origin.strip().upper()
    dest_clean = destination.strip().title()

    # Airline database mapping
    airlines = [
        {"name": "EL AL Israel Airlines", "code": "LY"},
        {"name": "Air France", "code": "AF"},
        {"name": "Lufthansa", "code": "LH"},
        {"name": "Emirates", "code": "EK"},
        {"name": "Delta Air Lines", "code": "DL"},
        {"name": "British Airways", "code": "BA"},
        {"name": "Wizz Air", "code": "W6"},
        {"name": "Ryanair", "code": "FR"},
        {"name": "Turkish Airlines", "code": "TK"},
    ]

    # Deterministic seed based on origin/dest for reproducible realistic mock data
    seed = sum(ord(c) for c in f"{origin_clean}-{dest_clean}-{departure_date}")
    rng = random.Random(seed)

    base_prices = {
        "paris": 420.0,
        "cdg": 420.0,
        "rome": 360.0,
        "fco": 360.0,
        "london": 480.0,
        "lhr": 480.0,
        "tokyo": 850.0,
        "hnd": 850.0,
        "nrt": 830.0,
        "new york": 690.0,
        "jfk": 690.0,
        "barcelona": 340.0,
        "bcn": 340.0,
        "berlin": 320.0,
        "ber": 320.0,
        "athens": 240.0,
        "ath": 240.0,
        "bangkok": 710.0,
        "bkk": 710.0,
    }

    dest_key = dest_clean.lower()
    base_fare = base_prices.get(dest_key, 450.0)

    options: List[Dict[str, Any]] = []

    # Generate 3 distinct flight options (Budget / Recommended / Premium Direct)
    # Option 1: Direct / Fast
    airline1 = rng.choice(airlines)
    fn1 = f"{airline1['code']}-{rng.randint(200, 999)}"
    price1 = round(base_fare * rng.uniform(1.15, 1.35), 2)
    options.append({
        "tier": "Recommended Direct",
        "airline": airline1["name"],
        "flight_number": fn1,
        "origin": origin_clean,
        "destination": dest_clean,
        "departure_date": departure_date,
        "departure_time": f"{rng.randint(6, 11):02d}:{rng.choice(['00', '15', '30', '45'])}",
        "arrival_time": f"{rng.randint(13, 19):02d}:{rng.choice(['10', '25', '40'])}",
        "duration": "4h 25m",
        "stops": 0,
        "cabin": "Economy Standard (Includes 1 Checked Bag)",
        "price_usd": price1,
    })

    # Option 2: Value / 1 Stop
    if max_stops >= 1:
        airline2 = rng.choice(airlines)
        fn2 = f"{airline2['code']}-{rng.randint(100, 799)}"
        price2 = round(base_fare * rng.uniform(0.75, 0.95), 2)
        options.append({
            "tier": "Best Value (1 Layover)",
            "airline": airline2["name"],
            "flight_number": fn2,
            "origin": origin_clean,
            "destination": dest_clean,
            "departure_date": departure_date,
            "departure_time": f"{rng.randint(14, 21):02d}:{rng.choice(['05', '20', '50'])}",
            "arrival_time": f"{rng.randint(22, 23):02d}:{rng.choice(['15', '45'])}",
            "duration": "6h 40m",
            "stops": 1,
            "layover_city": rng.choice(["Vienna (VIE)", "Athens (ATH)", "Istanbul (IST)", "Munich (MUC)"]),
            "cabin": "Economy Light",
            "price_usd": price2,
        })

    # Option 3: Premium / Flexible
    airline3 = rng.choice(airlines)
    fn3 = f"{airline3['code']}-{rng.randint(10, 199)}"
    price3 = round(base_fare * rng.uniform(1.6, 2.2), 2)
    options.append({
        "tier": "Premium Comfort",
        "airline": airline3["name"],
        "flight_number": fn3,
        "origin": origin_clean,
        "destination": dest_clean,
        "departure_date": departure_date,
        "departure_time": f"{rng.randint(7, 10):02d}:{rng.choice(['10', '40'])}",
        "arrival_time": f"{rng.randint(12, 16):02d}:{rng.choice(['20', '55'])}",
        "duration": "4h 10m",
        "stops": 0,
        "cabin": "Premium Economy / Priority Boarding",
        "price_usd": price3,
    })

    return json.dumps({
        "origin": origin_clean,
        "destination": dest_clean,
        "outbound_date": departure_date,
        "return_date": return_date,
        "currency": "USD",
        "total_results": len(options),
        "flights": options,
    }, indent=2)


def search_accommodations(
    destination: str,
    check_in: str,
    check_out: str,
    accommodation_type: str = "hotel",
    budget_tier: str = "moderate",
) -> str:
    """
    Search for hotels, boutique apartments, or luxury resorts in the target destination.

    Args:
        destination (str): Destination city or region (e.g., 'Rome', 'Paris', 'Tokyo').
        check_in (str): Check-in date in YYYY-MM-DD format.
        check_out (str): Check-out date in YYYY-MM-DD format.
        accommodation_type (str): Type of stay ('hotel', 'boutique', 'apartment', 'hostel').
        budget_tier (str): Target budget tier ('budget', 'moderate', 'luxury').

    Returns:
        str: JSON formatted string containing recommended lodging options, ratings,
             nightly price in USD, amenities, neighborhood location, and total stay estimate.
    """
    dest_clean = destination.strip().title()
    seed = sum(ord(c) for c in f"{dest_clean}-{accommodation_type}-{check_in}")
    rng = random.Random(seed)

    # Estimate number of nights (default 4 if parsing dates fails)
    try:
        from datetime import datetime
        d1 = datetime.strptime(check_in, "%Y-%m-%d")
        d2 = datetime.strptime(check_out, "%Y-%m-%d")
        nights = max(1, (d2 - d1).days)
    except Exception:
        nights = 4

    # Sample curated accommodations per tier
    accommodations_pool = [
        {
            "name": f"Hotel {dest_clean} Grand Central",
            "tier": "moderate",
            "stars": 4,
            "rating": 4.6,
            "neighborhood": "City Center / Historic Quarter",
            "nightly_rate_usd": round(rng.uniform(140, 190), 2),
            "amenities": ["Free High-Speed Wi-Fi", "Daily Breakfast Included", "Air Conditioning", "24/7 Concierge"],
        },
        {
            "name": f"{dest_clean} Heritage Boutique Suites",
            "tier": "moderate",
            "stars": 4,
            "rating": 4.8,
            "neighborhood": "Artisan District & Canal Walk",
            "nightly_rate_usd": round(rng.uniform(170, 230), 2),
            "amenities": ["Balcony View", "Espresso Bar", "Boutique Toiletries", "Soundproof Rooms"],
        },
        {
            "name": f"The Royal {dest_clean} Palace Hotel",
            "tier": "luxury",
            "stars": 5,
            "rating": 4.9,
            "neighborhood": "Embassy Quarter & Luxury Avenue",
            "nightly_rate_usd": round(rng.uniform(360, 520), 2),
            "amenities": ["Rooftop Infinity Pool", "Michelin-Starred Dining", "Spa & Wellness Club", "Chauffeur Service"],
        },
        {
            "name": f"Urban Traveler Loft {dest_clean}",
            "tier": "budget",
            "stars": 3,
            "rating": 4.3,
            "neighborhood": "Metro Hub & Vibrant Market",
            "nightly_rate_usd": round(rng.uniform(75, 110), 2),
            "amenities": ["Self Check-in", "Kitchenette", "Subway Proximity (150m)", "Laundry Facilities"],
        },
    ]

    # Calculate total stay price
    for item in accommodations_pool:
        item["nights"] = nights
        item["total_estimated_usd"] = round(item["nightly_rate_usd"] * nights, 2)

    return json.dumps({
        "destination": dest_clean,
        "check_in": check_in,
        "check_out": check_out,
        "total_nights": nights,
        "requested_tier": budget_tier,
        "options": accommodations_pool,
    }, indent=2)
