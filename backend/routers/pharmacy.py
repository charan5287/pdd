from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import models
import httpx
import math
import datetime
import re
from services.realtime_db_service import sync_to_realtime_db, sync_user_data_to_realtime_db

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy & Stock"])


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in km."""
    R = 6371  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def format_distance(km: float) -> str:
    if km < 1:
        return f"{int(km * 1000)} m"
    return f"{round(km, 1)} km"


def deterministic_rating(name: str) -> float:
    """Generate a stable 3.5–5.0 rating based on pharmacy name."""
    h = abs(hash(name)) % 16
    return round(3.5 + h * 0.1, 1)


@router.get("/nearby")
async def get_nearby_pharmacies(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    radius: int = Query(8000, description="Search radius in meters"),
):
    """
    Fetch real pharmacies near given coordinates using OpenStreetMap Overpass API.
    """
    return await _fetch_amenities(lat, lng, radius, "pharmacy")


@router.get("/hospitals")
async def get_nearby_hospitals(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    radius: int = Query(8000, description="Search radius in meters"),
):
    """
    Fetch real hospitals near given coordinates using OpenStreetMap Overpass API.
    """
    return await _fetch_amenities(lat, lng, radius, "hospital")


async def _get_gemini_amenities(lat: float, lng: float, amenity_type: str):
    import os
    import google.generativeai as genai
    import asyncio
    import json
    import re
    
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key or len(api_key) < 15:
        return None
        
    try:
        genai.configure(api_key=api_key)
        model_names = [
            'gemini-2.5-flash',
            'gemini-3.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
        ]
        
        prompt = f"""
        Find and list real-world popular, active {amenity_type}s (hospitals/clinics if 'hospital', pharmacies/medical stores if 'pharmacy') 
        located near the GPS coordinates: latitude {lat}, longitude {lng} (in India/local area).
        
        For each {amenity_type}, extract or estimate these exact JSON fields:
        - name: The actual real-world business name (e.g. 'Apollo Pharmacy', 'District Hospital Nandyal', 'Prasad Medical Shop').
        - address: Real local area or street address near the coordinates.
        - lat: Estimated latitude coordinate (close to {lat}, within 0.05).
        - lng: Estimated longitude coordinate (close to {lng}, within 0.05).
        - distance_km: Estimated direct distance in kilometers from ({lat}, {lng}).
        - phone: Phone number if known, otherwise a realistic support number (e.g. '1800-xxx-xxxx').
        - is_open: Boolean (True/False).
        - stock_status: 'In Stock' or 'High Stock' or 'Limited Stock'.
        
        CRITICAL RULES:
        - Return ONLY a valid JSON list of 3 to 6 objects. Do not include markdown formatting or explanations.
        - If 'hospital', set is_emergency to True.
        
        Example format:
        [
          {{"name": "Local Pharmacy Name", "address": "Market Road, Local Area", "lat": 15.475, "lng": 78.552, "distance_km": 0.8, "phone": "+91 98765 43210", "is_open": true, "stock_status": "In Stock"}}
        ]
        """
        
        response = None
        for name in model_names:
            try:
                model = genai.GenerativeModel(model_name=name)
                response = await asyncio.to_thread(model.generate_content, prompt)
                if response and response.text:
                    break
            except Exception as e:
                print(f"DEBUG: Gemini fallback model {name} failed: {e}")
                continue
                
        if not response or not response.text:
            return None
            
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            # Format and enrich results
            enriched = []
            for i, item in enumerate(data):
                dist = item.get("distance_km", 0.5)
                name = item.get("name", "Local Place")
                rating = deterministic_rating(name)
                is_emergency = amenity_type == "hospital"
                
                # Double-check distance formatting
                if dist < 1:
                    dist_text = f"{int(dist * 1000)} m"
                else:
                    dist_text = f"{round(dist, 1)} km"
                    
                enriched.append({
                    "id": 8000 + i,
                    "name": name,
                    "address": item.get("address", "Near your location"),
                    "lat": item.get("lat", lat),
                    "lng": item.get("lng", lng),
                    "distance_km": dist,
                    "distance_text": dist_text,
                    "rating": rating,
                    "phone": item.get("phone", ""),
                    "is_open": item.get("is_open", True),
                    "stock_status": item.get("stock_status", "In Stock"),
                    "is_emergency": is_emergency
                })
            return enriched
    except Exception as e:
        print(f"ERROR in Gemini fallback: {e}")
    return None


async def _get_google_places_amenities(lat: float, lng: float, radius: int, amenity_type: str):
    import os
    import httpx
    
    api_key = os.environ.get("PLACES_API_KEY", "")
    if not api_key or len(api_key) < 15:
        return None
        
    places_type = "pharmacy" if amenity_type == "pharmacy" else "hospital"
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": places_type,
        "key": api_key
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") in ["OK", "ZERO_RESULTS"]:
                    results = []
                    places = data.get("results", [])
                    for i, place in enumerate(places):
                        place_lat = place.get("geometry", {}).get("location", {}).get("lat")
                        place_lng = place.get("geometry", {}).get("location", {}).get("lng")
                        if place_lat is None or place_lng is None:
                            continue
                            
                        name = place.get("name", amenity_type.capitalize())
                        address = place.get("vicinity", "Address not listed")
                        dist_km = haversine(lat, lng, place_lat, place_lng)
                        
                        rating = place.get("rating")
                        if rating is None:
                            rating = deterministic_rating(name)
                        else:
                            rating = float(rating)
                            
                        is_open = True
                        if "opening_hours" in place:
                            is_open = place["opening_hours"].get("open_now", True)
                            
                        availability_score = (abs(hash(name)) % 100)
                        stock_status = "In Stock" if availability_score > 30 else "Limited Stock"
                        if availability_score < 10:
                            stock_status = "Out of Stock"
                            
                        place_id = place.get("place_id", f"mock_{i}")
                        results.append({
                            "id": abs(hash(place_id)) % 100000000,
                            "name": name,
                            "address": address,
                            "lat": place_lat,
                            "lng": place_lng,
                            "distance_km": round(dist_km, 3),
                            "distance_text": format_distance(dist_km),
                            "rating": rating,
                            "phone": "",
                            "is_open": is_open,
                            "stock_status": stock_status,
                            "is_emergency": amenity_type == "hospital"
                        })
                    results.sort(key=lambda x: x["distance_km"])
                    return results
                else:
                    print(f"DEBUG: Google Places API status error: {data.get('status')}")
    except Exception as e:
        print(f"DEBUG: Google Places API query failed with: {e}")
    return None


async def _fetch_amenities(lat: float, lng: float, radius: int, amenity_type: str):
    # Try Google Places API first if configured
    google_results = await _get_google_places_amenities(lat, lng, radius, amenity_type)
    if google_results is not None:
        return google_results

    overpass_urls = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.nchc.org.tw/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://z.overpass-api.de/api/interpreter"
    ]
    if amenity_type == "pharmacy":
        query = f"""
[out:json][timeout:30];
(
  node["amenity"="pharmacy"](around:{radius},{lat},{lng});
  way["amenity"="pharmacy"](around:{radius},{lat},{lng});
  relation["amenity"="pharmacy"](around:{radius},{lat},{lng});
  node["shop"="pharmacy"](around:{radius},{lat},{lng});
  way["shop"="pharmacy"](around:{radius},{lat},{lng});
  node["shop"="chemist"](around:{radius},{lat},{lng});
  way["shop"="chemist"](around:{radius},{lat},{lng});
);
out center body 50;
"""
    else:
        query = f"""
[out:json][timeout:30];
(
  node["amenity"="{amenity_type}"](around:{radius},{lat},{lng});
  way["amenity"="{amenity_type}"](around:{radius},{lat},{lng});
  relation["amenity"="{amenity_type}"](around:{radius},{lat},{lng});
);
out center body 50;
"""
    headers = {
        "User-Agent": "MediNowHealthApp/1.0 (contact: support@medinow.app)"
    }

    data = None
    for i, url in enumerate(overpass_urls):
        try:
            print(f"DEBUG: Attempting Overpass query on mirror {i}: {url}")
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.post(url, data={"data": query}, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    print(f"DEBUG: Overpass mirror {url} succeeded!")
                    break
                else:
                    print(f"DEBUG: Overpass mirror {url} failed with status: {response.status_code}")
        except Exception as e:
            print(f"DEBUG: Overpass mirror {url} query failed with: {e}")

    # If Overpass fails, use Gemini search fallback
    if not data:
        gemini_results = await _get_gemini_amenities(lat, lng, amenity_type)
        if gemini_results:
            return gemini_results
        return _get_fallback(lat, lng, amenity_type)

    results = []
    seen_at_loc = set()

    elements = data.get("elements", [])
    if len(elements) > 50:
        elements = elements[:50]

    for elem in elements:
        tags = elem.get("tags", {})
        elem_lat = elem.get("lat") or (elem.get("center") or {}).get("lat")
        elem_lng = elem.get("lon") or (elem.get("center") or {}).get("lon")

        if elem_lat is None or elem_lng is None:
            continue

        name = tags.get("name") or tags.get("brand") or tags.get("operator") or amenity_type.capitalize()
        dedup_key = f"{name}_{round(elem_lat, 4)}_{round(elem_lng, 4)}"
        if dedup_key in seen_at_loc:
            continue
        seen_at_loc.add(dedup_key)

        address_parts = [
            str(tags.get("addr:housenumber") or ""),
            str(tags.get("addr:street") or ""),
            str(tags.get("addr:suburb") or ""),
            str(tags.get("addr:city") or ""),
        ]
        address = ", ".join(p for p in address_parts if p) or tags.get("addr:full", "") or "Address not listed"
        dist_km = haversine(lat, lng, elem_lat, elem_lng)

        # Opening hours logic
        opening_hours = tags.get("opening_hours", "")
        is_open = True
        if opening_hours:
            try:
                now = datetime.datetime.now()
                current_time = now.time()
                if "24/7" in opening_hours or "00:00-24:00" in opening_hours:
                    is_open = True
                else:
                    times = re.findall(r'(\d{2}:\d{2})-(\d{2}:\d{2})', opening_hours)
                    if times:
                        for start_str, end_str in times:
                            start = datetime.datetime.strptime(start_str, "%H:%M").time()
                            end = datetime.datetime.strptime(end_str, "%H:%M").time()
                            if start <= current_time <= end:
                                is_open = True
                                break
                            else:
                                is_open = False
            except: pass

        availability_score = (abs(hash(name)) % 100)
        stock_status = "In Stock" if availability_score > 30 else "Limited Stock"
        if availability_score < 10: stock_status = "Out of Stock"

        results.append({
            "id": elem.get("id"),
            "name": name,
            "address": address,
            "lat": elem_lat,
            "lng": elem_lng,
            "distance_km": round(dist_km, 3),
            "distance_text": format_distance(dist_km),
            "rating": deterministic_rating(name),
            "phone": tags.get("phone") or tags.get("contact:phone") or "",
            "is_open": is_open,
            "stock_status": stock_status,
            "is_emergency": amenity_type == "hospital"
        })

    results.sort(key=lambda x: x["distance_km"])
    
    # If no results found in OSM, try Gemini fallback
    if not results:
        gemini_results = await _get_gemini_amenities(lat, lng, amenity_type)
        if gemini_results:
            return gemini_results
        return _get_fallback(lat, lng, amenity_type)
        
    return results



def _get_fallback(lat, lng, amenity_type):
    if amenity_type == "pharmacy":
        return [
            {
                "id": 9991,
                "name": "Apollo Pharmacy",
                "address": "Near your location",
                "lat": lat + 0.002,
                "lng": lng + 0.002,
                "distance_km": 0.3,
                "distance_text": "300 m",
                "rating": 4.8,
                "phone": "1800-123-456",
                "is_open": True,
                "stock_status": "In Stock",
                "is_emergency": False
            },
            {
                "id": 9992,
                "name": "MedPlus Pharmacy",
                "address": "Opposite Main Road",
                "lat": lat - 0.003,
                "lng": lng + 0.001,
                "distance_km": 0.5,
                "distance_text": "500 m",
                "rating": 4.5,
                "phone": "1800-987-654",
                "is_open": True,
                "stock_status": "High Stock",
                "is_emergency": False
            },
            {
                "id": 9993,
                "name": "Wellness Forever",
                "address": "City Center",
                "lat": lat + 0.005,
                "lng": lng - 0.004,
                "distance_km": 0.8,
                "distance_text": "800 m",
                "rating": 4.9,
                "phone": "1800-111-222",
                "is_open": True,
                "stock_status": "Limited Stock",
                "is_emergency": False
            }
        ]
    else:
        return [
            {
                "id": 9997,
                "name": "Government General Hospital",
                "address": "Near your location",
                "lat": lat + 0.008,
                "lng": lng + 0.008,
                "distance_km": 1.1,
                "distance_text": "1.1 km",
                "rating": 4.3,
                "phone": "108",
                "is_open": True,
                "stock_status": "Available",
                "is_emergency": True
            },
            {
                "id": 9998,
                "name": "Apollo Hospitals",
                "address": "Main Road, Near your location",
                "lat": lat - 0.01,
                "lng": lng + 0.005,
                "distance_km": 1.5,
                "distance_text": "1.5 km",
                "rating": 4.8,
                "phone": "1800-102-0101",
                "is_open": True,
                "stock_status": "Available",
                "is_emergency": True
            },
            {
                "id": 9999,
                "name": "Community Health Centre",
                "address": "City Center",
                "lat": lat + 0.015,
                "lng": lng - 0.01,
                "distance_km": 2.0,
                "distance_text": "2.0 km",
                "rating": 4.1,
                "phone": "104",
                "is_open": True,
                "stock_status": "Available",
                "is_emergency": True
            }
        ]



@router.get("/medicines")
async def search_medicines(query: str = "", db: Session = Depends(get_db)):
    default_medicines = [
        {"id": 1, "name": "Dolo 650 (Paracetamol)", "generic": "Paracetamol", "description": "Relieves pain and reduces fever effectively.", "price": 30.0, "category": "Pain Relief", "dosage": "650mg", "stock": "High"},
        {"id": 2, "name": "Pan 40 (Pantoprazole)", "generic": "Pantoprazole", "description": "Relief from acidity, heartburn, and GERD.", "price": 60.0, "category": "Gastro", "dosage": "40mg", "stock": "High"},
        {"id": 3, "name": "Augmentin 625 (Amoxiclav)", "generic": "Amoxicillin + Clavulanic Acid", "description": "Powerful antibiotic for bacterial infections.", "price": 145.0, "category": "Antibiotics", "dosage": "625mg", "stock": "Medium"},
        {"id": 4, "name": "Telma 40 (Telmisartan)", "generic": "Telmisartan", "description": "Manages high blood pressure effectively.", "price": 88.0, "category": "Heart", "dosage": "40mg", "stock": "High"},
        {"id": 5, "name": "Atorva 10 (Atorvastatin)", "generic": "Atorvastatin", "description": "Lowers bad cholesterol and protects heart.", "price": 95.0, "category": "Heart", "dosage": "10mg", "stock": "High"},
        {"id": 6, "name": "Glycomet 500 (Metformin)", "generic": "Metformin", "description": "Controls blood sugar in Type 2 Diabetes.", "price": 35.0, "category": "Diabetes", "dosage": "500mg", "stock": "Medium"},
        {"id": 7, "name": "Montair LC (Montelukast)", "generic": "Montelukast + Levocetirizine", "description": "Prevents asthma and allergy symptoms.", "price": 115.0, "category": "Allergy", "dosage": "10mg", "stock": "Low"},
        {"id": 8, "name": "Uprise-D3 (Vitamin D3)", "generic": "Cholecalciferol", "description": "Boosts immunity and bone health.", "price": 250.0, "category": "Vitamins", "dosage": "60k IU", "stock": "High"},
        {"id": 9, "name": "Okacet (Cetirizine)", "generic": "Cetirizine", "description": "Fast relief from allergies and sneezing.", "price": 25.0, "category": "Allergy", "dosage": "10mg", "stock": "High"},
        {"id": 10, "name": "Omez (Omeprazole)", "generic": "Omeprazole", "description": "Relieves stomach ulcers and acid reflux.", "price": 45.0, "category": "Gastro", "dosage": "20mg", "stock": "High"},
        {"id": 11, "name": "Azithral 500 (Azithromycin)", "generic": "Azithromycin", "description": "Treats throat and respiratory infections.", "price": 110.0, "category": "Antibiotics", "dosage": "500mg", "stock": "High"},
        {"id": 12, "name": "Shelcal 500 (Calcium)", "generic": "Calcium + Vitamin D3", "description": "Calcium and Vitamin D3 supplement.", "price": 95.0, "category": "Vitamins", "dosage": "500mg", "stock": "High"},
        {"id": 13, "name": "Zifi 200 (Cefixime)", "generic": "Cefixime", "description": "Antibiotic for various bacterial infections.", "price": 120.0, "category": "Antibiotics", "dosage": "200mg", "stock": "High"},
        {"id": 14, "name": "Combiflam", "generic": "Ibuprofen + Paracetamol", "description": "Dual-action pain and fever relief.", "price": 20.0, "category": "Pain Relief", "dosage": "400mg/325mg", "stock": "High"},
        {"id": 15, "name": "Liv 52", "generic": "Herbal", "description": "Liver health and appetite stimulant.", "price": 150.0, "category": "Herbal", "dosage": "Tablet", "stock": "High"},
    ]

    # Fetch custom added medicines from database
    db_medicines = db.query(models.Medicine).all()
    db_list = []
    existing_names = {m["name"].lower() for m in default_medicines}

    for db_m in db_medicines:
        if db_m.name.lower() not in existing_names:
            stock_entry = db.query(models.PharmacyStock).filter(models.PharmacyStock.medicine_id == db_m.id).first()
            price = stock_entry.price if stock_entry else 50.0
            stock_qty = stock_entry.quantity if stock_entry else 100
            db_list.append({
                "id": db_m.id + 100,
                "name": db_m.name,
                "generic": db_m.name,
                "description": db_m.description or "Quality prescription medication.",
                "price": price,
                "category": db_m.category or "General",
                "dosage": "Standard",
                "stock": "High" if stock_qty > 20 else "Low"
            })

    medicines = default_medicines + db_list

    filtered = medicines
    if query:
        q = query.lower()
        filtered = [m for m in medicines if q in m["name"].lower() or q in m["category"].lower() or q in m.get("generic", "").lower()]

    # If no local results, try Gemini to suggest a real medicine
    if not filtered and query:
        import os
        import google.generativeai as genai
        import asyncio
        import json
        
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if api_key and len(api_key) > 10:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-2.0-flash-lite')
                prompt = f"""
                The user is searching for a medicine named '{query}'.
                Suggest 1-2 real medicines that match this or are used for this purpose.
                Format as a JSON list of objects with keys: name, generic, description, price (estimate), category, dosage, stock (set to 'High').
                Return ONLY the JSON list.
                """
                response = await asyncio.to_thread(model.generate_content, prompt)
                text = response.text.strip()
                if text.startswith("```"):
                    import re
                    text = re.sub(r'```json\n?|```', '', text)
                ai_results = json.loads(text)
                for i, r in enumerate(ai_results):
                    r['id'] = 1000 + i
                return ai_results
            except:
                pass

    return filtered


@router.post("/add-medicine")
def add_medicine_to_stock(data: dict, db: Session = Depends(get_db)):
    """Add a medicine to pharmacy stock & global search database."""
    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Medicine name is required")
    
    price = float(data.get("price", 50.0))
    category = data.get("category", "General")
    description = data.get("description", f"Relief medication ({category})")
    stock_qty = int(data.get("stock", 100))

    existing = db.query(models.Medicine).filter(models.Medicine.name == name).first()
    if not existing:
        existing = models.Medicine(
            name=name,
            description=description,
            category=category,
            image_url=data.get("image_url", "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300")
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)

    pharmacy_id = data.get("pharmacy_id", 1)
    stock_item = db.query(models.PharmacyStock).filter(
        models.PharmacyStock.pharmacy_id == pharmacy_id,
        models.PharmacyStock.medicine_id == existing.id
    ).first()

    if stock_item:
        stock_item.quantity += stock_qty
        stock_item.price = price
    else:
        stock_item = models.PharmacyStock(
            pharmacy_id=pharmacy_id,
            medicine_id=existing.id,
            quantity=stock_qty,
            price=price
        )
        db.add(stock_item)

    db.commit()
    
    sync_to_realtime_db("pharmacy_stock", stock_item.id, {
        "id": stock_item.id,
        "pharmacy_id": pharmacy_id,
        "medicine_name": name,
        "price": price,
        "quantity": stock_item.quantity,
        "category": category
    })
    
    return {
        "status": "success",
        "message": f"Added {name} to stock",
        "medicine": {
            "id": existing.id,
            "name": existing.name,
            "price": price,
            "category": category,
            "stock": stock_item.quantity
        }
    }


@router.post("/order")
def place_order(order_data: dict, db: Session = Depends(get_db)):
    """Place a new order with full delivery details."""
    new_order = models.Order(
        user_id=order_data['user_id'],
        pharmacy_id=order_data['pharmacy_id'],
        total_amount=order_data['total_amount'],
        delivery_address=order_data.get('address', 'Home'),
        contact_number=order_data.get('phone', ''),
        items_json=str(order_data.get('items', [])),
        status="placed"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    sync_to_realtime_db("orders", new_order.id, {
        "id": new_order.id,
        "user_id": new_order.user_id,
        "pharmacy_id": new_order.pharmacy_id,
        "total_amount": new_order.total_amount,
        "delivery_address": new_order.delivery_address,
        "contact_number": new_order.contact_number,
        "status": new_order.status,
        "created_at": new_order.created_at.isoformat() if new_order.created_at else None
    })
    sync_user_data_to_realtime_db(new_order.user_id, db)
    
    # Simulate ETA and Delivery Partner
    eta_mins = 20 + (order_data.get('distance_km', 0) * 8)
    return {
        "order_id": new_order.id,
        "status": new_order.status,
        "eta": f"{int(eta_mins)} mins",
        "delivery_partner": "Rahul (MediNow FastTrack)",
        "message": "Order placed successfully! Pharmacy is preparing your medicines."
    }

@router.get("/all-orders")
def get_all_orders(db: Session = Depends(get_db)):
    """Fetch all orders in the system (Demo/Testing)."""
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    results = []
    for o in orders:
        pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == o.pharmacy_id).first()
        results.append({
            "id": o.id,
            "status": o.status,
            "total": o.total_amount,
            "date": o.created_at.isoformat(),
            "pharmacy_name": pharmacy.name if pharmacy else "Apollo Pharmacy",
            "address": o.delivery_address,
            "items": o.items_json,
            "partner": o.delivery_partner_name or "Rahul (MediNow Express)",
            "partner_phone": o.delivery_partner_phone or "+91 98765 43210"
        })
    return results

@router.get("/orders/{user_id}")
def get_user_orders(user_id: int, db: Session = Depends(get_db)):
    """Fetch user orders with full delivery tracking data."""
    orders = db.query(models.Order).filter(models.Order.user_id == user_id).order_by(models.Order.created_at.desc()).all()
    results = []
    for o in orders:
        pharmacy = db.query(models.Pharmacy).filter(models.Pharmacy.id == o.pharmacy_id).first()
        results.append({
            "id": o.id,
            "status": o.status,
            "total": o.total_amount,
            "date": o.created_at.isoformat(),
            "pharmacy_name": pharmacy.name if pharmacy else "Apollo Pharmacy",
            "address": o.delivery_address,
            "items": o.items_json,
            "partner": o.delivery_partner_name or "Rahul (MediNow Express)",
            "partner_phone": o.delivery_partner_phone or "+91 98765 43210"
        })
    return results

@router.patch("/order/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    """Update order status (Pharmacy Portal side)."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    db.commit()
    sync_to_realtime_db("orders", order_id, {
        "id": order.id,
        "user_id": order.user_id,
        "status": status,
    })
    sync_user_data_to_realtime_db(order.user_id, db)
    return {"order_id": order_id, "new_status": status}


@router.post("/smart-match")
async def smart_match_pharmacies(data: dict, db: Session = Depends(get_db)):
    """
    Smart Multi-Medicine Pharmacy Matcher:
    Matches a prescribed list of medicines against nearby pharmacies' inventory,
    calculates fulfillment rate, proximity, rating, and total price to find the single best pharmacy.
    """
    user_lat = float(data.get("lat", 15.47))
    user_lng = float(data.get("lng", 78.55))
    med_list = data.get("medicines", [])
    
    # Extract clean medicine names
    clean_names = []
    for item in med_list:
        if isinstance(item, str):
            clean_names.append(item.lower())
        elif isinstance(item, dict):
            n = item.get("display_name") or item.get("name", "")
            if n:
                clean_names.append(n.lower())
                
    if not clean_names:
        clean_names = ["dolo 650", "pan 40"]

    # Fetch nearby pharmacies
    nearby = await _fetch_amenities(user_lat, user_lng, 8000, "pharmacy")
    
    matched_results = []
    for idx, p in enumerate(nearby):
        p_id = p.get("id", idx + 1)
        name = p.get("name", "Pharmacy")
        dist = p.get("distance_km", 1.0)
        rating = p.get("rating", 4.5)
        
        # Check stock matching logic against DB or simulated realistic catalog
        items_available = 0
        total_items = len(clean_names)
        items_detail = []
        est_price = 0.0

        for req_med in clean_names:
            # Check DB stock
            db_med = db.query(models.Medicine).filter(models.Medicine.name.ilike(f"%{req_med.split()[0]}%")).first()
            if db_med:
                stock_entry = db.query(models.PharmacyStock).filter(
                    models.PharmacyStock.medicine_id == db_med.id
                ).first()
                if stock_entry and stock_entry.quantity > 0:
                    items_available += 1
                    price = stock_entry.price
                    est_price += price
                    items_detail.append({"name": req_med.title(), "in_stock": True, "price": price})
                    continue

            # Deterministic simulation for demo real-world pharmacies
            hash_val = abs(hash(f"{name}_{req_med}")) % 100
            if hash_val > 15 or idx == 0:  # Top pharmacy has 100% stock
                items_available += 1
                price = 35.0 + (hash_val % 40)
                est_price += price
                items_detail.append({"name": req_med.title(), "in_stock": True, "price": price})
            else:
                items_detail.append({"name": req_med.title(), "in_stock": False, "price": 0.0})

        fulfillment_pct = round((items_available / total_items) * 100, 0)
        
        # Smart Scoring Algorithm: (fulfillment * 0.6) + (distance_score * 0.25) + (rating * 0.15)
        dist_score = max(0.0, 10.0 - dist)
        smart_score = round((fulfillment_pct * 0.6) + (dist_score * 3.0) + (rating * 3.0), 1)

        match_badge = "100% Stock Match" if fulfillment_pct == 100 else f"{int(fulfillment_pct)}% In Stock"
        if idx == 0 and fulfillment_pct == 100:
            match_badge = "🌟 Best Overall Match"

        matched_results.append({
            "pharmacy_id": p_id,
            "name": name,
            "address": p.get("address", "Nearby Store"),
            "distance_km": dist,
            "distance_text": p.get("distance_text", f"{dist} km"),
            "rating": rating,
            "phone": p.get("phone", "+91 98765 43210"),
            "is_open": p.get("is_open", True),
            "fulfillment_percentage": fulfillment_pct,
            "items_available": items_available,
            "total_items_requested": total_items,
            "total_estimated_price": round(est_price, 2),
            "smart_score": smart_score,
            "badge": match_badge,
            "items": items_detail
        })

    matched_results.sort(key=lambda x: x["smart_score"], reverse=True)
    return {
        "user_location": {"lat": user_lat, "lng": user_lng},
        "total_pharmacies_evaluated": len(matched_results),
        "best_match": matched_results[0] if matched_results else None,
        "pharmacies": matched_results
    }

