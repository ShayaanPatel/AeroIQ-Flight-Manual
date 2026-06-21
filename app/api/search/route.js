import { NextResponse } from 'next/server';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { origin, destination, date, returnDate, flightClass, isRoundTrip, passengers } = await req.json();

    if (!origin || !destination || !date) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Map class to SerpAPI value (1: Economy, 2: Premium Economy, 3: Business, 4: First)
    let travelClass = 1;
    if (flightClass === 'Premium Economy') travelClass = 2;
    if (flightClass === 'Business') travelClass = 3;
    if (flightClass === 'First Class') travelClass = 4;

    // Build SerpAPI URL
    const serpApiKey = process.env.SERPAPI_KEY || '5aced9bd9a90432ce651e2d4a69cfafa19fdf62b013e6860c8c0a99f7f746eef';
    let serpUrl = `https://serpapi.com/search.json?engine=google_flights&departure_id=${origin}&arrival_id=${destination}&outbound_date=${date}&travel_class=${travelClass}&currency=INR&hl=en&api_key=${serpApiKey}`;
    
    // Add passenger counts if provided
    if (passengers) {
      if (passengers.adults > 0) serpUrl += `&adults=${passengers.adults}`;
      if (passengers.children > 0) serpUrl += `&children=${passengers.children}`;
      if (passengers.infantsInSeat > 0) serpUrl += `&infants_in_seat=${passengers.infantsInSeat}`;
      if (passengers.infantsOnLap > 0) serpUrl += `&infants_on_lap=${passengers.infantsOnLap}`;
    }
    
    if (isRoundTrip && returnDate) {
      serpUrl += `&return_date=${returnDate}&type=1`;
    } else {
      serpUrl += `&type=2`;
    }

    let serpData = {};
    try {
      const response = await axios.get(serpUrl);
      serpData = response.data;
    } catch (error) {
      console.error("SerpAPI fetch failed:", error.message);
      return NextResponse.json({ error: "Failed to fetch data from SerpAPI." }, { status: 500 });
    }

    // Combine best_flights and other_flights to show all options
    let flightsToProcess = [];
    if (serpData.best_flights) flightsToProcess = flightsToProcess.concat(serpData.best_flights);
    if (serpData.other_flights) flightsToProcess = flightsToProcess.concat(serpData.other_flights);
    
    if (flightsToProcess.length === 0) {
      return NextResponse.json({ flights: [], message: "No flights found for this route and date." });
    }

    // Map all flights directly to ensure no options are truncated by the LLM
    const parsedData = flightsToProcess.map((f, index) => {
      // Determine duration
      const durationMins = f.flights ? f.flights.reduce((acc, curr) => acc + (curr.duration || 0), 0) : f.total_duration;
      const hours = Math.floor(durationMins / 60);
      const mins = durationMins % 60;
      const durationStr = `${hours} hr ${mins} min`;

      // Determine stops
      let stopsStr = 'Direct';
      if (f.flights && f.flights.length > 1) {
        stopsStr = `${f.flights.length - 1} stop${f.flights.length > 2 ? 's' : ''}`;
      }

      // Format price
      const priceStr = f.price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(f.price) : 'Price unavailable';

      // Get flight details from first leg
      const firstLeg = f.flights && f.flights.length > 0 ? f.flights[0] : {};
      const lastLeg = f.flights && f.flights.length > 0 ? f.flights[f.flights.length - 1] : {};

      // If SerpAPI provided a specific flight booking token we could construct a URL,
      // but the most reliable way to book is linking to the general search or the exact search query.
      // We will provide the exact search results page on Google Flights.
      const bookingLink = serpData.search_metadata?.google_flights_url || '#';
      
      // Determine if it was in the best_flights array (SerpAPI's value for money)
      // Since we concatenated best_flights first, we can check if index < best_flights.length
      const numBestFlights = serpData.best_flights ? serpData.best_flights.length : 0;
      const isBest = index < numBestFlights;

      const legs = f.flights ? f.flights.map(leg => ({
        departure: leg.departure_airport,
        arrival: leg.arrival_airport,
        durationMins: leg.duration,
        airline: leg.airline,
        travelClass: leg.travel_class,
        airplane: leg.airplane,
        flightNumber: leg.flight_number
      })) : [];
      
      const layovers = f.layovers ? f.layovers.map(lo => ({
        durationMins: lo.duration,
        name: lo.name,
        id: lo.id
      })) : [];

      return {
        flightNumber: firstLeg.flight_number || 'Multiple',
        provider: f.airline || firstLeg.airline || 'Various',
        airlineLogo: f.airline_logo || firstLeg.airline_logo || '',
        departureTime: firstLeg.departure_airport?.time || 'N/A',
        arrivalTime: lastLeg.arrival_airport?.time || 'N/A',
        price: priceStr,
        duration: durationStr,
        stops: stopsStr,
        bookingLink: bookingLink,
        rawPrice: f.price || 999999999,
        rawDuration: durationMins || 999999999,
        isBest: isBest,
        legs: legs,
        layovers: layovers
      };
    });

    return NextResponse.json({ flights: parsedData });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
