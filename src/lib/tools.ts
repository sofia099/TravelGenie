import Anthropic from '@anthropic-ai/sdk'
import { getFlights, getFlight, getHotels } from './mock-data'

// ─── Tool Definitions ─────────────────────────────────────────────────────────
// Only 4 tools are implemented. The hotel availability and booking tools are missing.

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: 'search_flights',
    description:
      'Search for available flights between two cities on a given date. Returns a list of flights with pricing, times, and seat availability.',
    input_schema: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description: 'The departure city or airport (e.g. "New York", "Paris", "JFK")',
        },
        destination: {
          type: 'string',
          description: 'The arrival city or airport (e.g. "London", "Tokyo", "LAX")',
        },
        date: {
          type: 'string',
          description: 'The travel date in YYYY-MM-DD format (e.g. "2025-06-15")',
        },
      },
      required: ['origin', 'destination', 'date'],
    },
  },
  {
    name: 'get_seat_availability',
    description:
      'Check how many seats are currently available on a specific flight. Use this to confirm availability before booking.',
    input_schema: {
      type: 'object',
      properties: {
        flight_id: {
          type: 'string',
          description: 'The unique flight identifier (e.g. "FL001") returned by search_flights',
        },
      },
      required: ['flight_id'],
    },
  },
  {
    name: 'book_flight',
    description:
      'Book a flight for a passenger. Returns a confirmation number and booking details. Always confirm seat availability with get_seat_availability first.',
    input_schema: {
      type: 'object',
      properties: {
        flight_id: { type: 'string', description: 'The unique flight identifier to book' },
        passenger_name: { type: 'string', description: 'Full name of the passenger' },
        passenger_email: { type: 'string', description: 'Email address for booking confirmation' },
      },
      required: ['flight_id', 'passenger_name', 'passenger_email'],
    },
  },
  {
    name: 'get_hotel_recommendations',
    description:
      'Get a list of recommended hotels in a city for given travel dates. Returns hotel names, star ratings, prices, and amenities. NOTE: This tool does NOT check real-time room availability.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'The destination city (e.g. "Paris", "Tokyo", "New York")' },
        check_in: { type: 'string', description: 'Check-in date in YYYY-MM-DD format' },
        check_out: { type: 'string', description: 'Check-out date in YYYY-MM-DD format' },
        max_price_per_night: {
          type: 'number',
          description: 'Optional maximum price per night in USD to filter results',
        },
      },
      required: ['city', 'check_in', 'check_out'],
    },
  },
]

// ─── Missing Tools (intentionally not implemented) ────────────────────────────
//
// TODO: check_hotel_availability tool is not implemented yet.
// Without this tool, the agent cannot verify hotel room availability
// and may hallucinate availability when users ask about specific hotels.
// This causes incorrect booking confirmations and poor user experience.
// See: https://github.com/sofia099/TravelGenie/issues/42
//
// TODO: book_hotel tool is also not implemented — can't safely book without
// first checking availability via check_hotel_availability.

// ─── Tool Executor ────────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>

function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'TG-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function computeNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)))
}

async function executeSearchFlights(input: ToolInput): Promise<string> {
  const origin = input.origin as string
  const destination = input.destination as string
  const date = input.date as string
  const results = getFlights(origin, destination)

  if (results.length === 0) {
    return JSON.stringify({
      success: false,
      message: `No flights found from ${origin} to ${destination} on ${date}. Try different cities or dates.`,
      flights: [],
    })
  }

  return JSON.stringify({
    success: true,
    searchParams: { origin, destination, date },
    flightCount: results.length,
    flights: results.map((f) => ({
      flight_id: f.id,
      airline: f.airline,
      flightNumber: f.flightNumber,
      departure: f.departureTime,
      arrival: f.arrivalTime,
      duration: f.duration,
      price_usd: f.price,
      seats_available: f.seats,
      class: f.class,
    })),
  })
}

async function executeGetSeatAvailability(input: ToolInput): Promise<string> {
  const flight = getFlight(input.flight_id as string)
  if (!flight) {
    return JSON.stringify({ success: false, message: `Flight ${input.flight_id} not found.` })
  }
  return JSON.stringify({
    success: true,
    flight_id: input.flight_id,
    airline: flight.airline,
    flightNumber: flight.flightNumber,
    route: `${flight.origin} → ${flight.destination}`,
    departure: flight.departureTime,
    seats_available: flight.seats,
    status: flight.seats === 0 ? 'SOLD_OUT' : flight.seats < 10 ? 'FILLING_FAST' : 'AVAILABLE',
  })
}

async function executeBookFlight(input: ToolInput): Promise<string> {
  const flight = getFlight(input.flight_id as string)
  if (!flight) {
    return JSON.stringify({ success: false, message: `Flight ${input.flight_id} not found.` })
  }
  if (flight.seats === 0) {
    return JSON.stringify({ success: false, message: `Flight ${input.flight_id} is sold out.` })
  }
  return JSON.stringify({
    success: true,
    booking: {
      confirmationNumber: generateConfirmationNumber(),
      status: 'CONFIRMED',
      passenger: { name: input.passenger_name, email: input.passenger_email },
      flight: {
        flight_id: input.flight_id,
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        route: `${flight.origin} → ${flight.destination}`,
        departure: flight.departureTime,
        arrival: flight.arrivalTime,
      },
      pricing: {
        basePrice: flight.price,
        taxes: Math.round(flight.price * 0.12),
        totalAmount: Math.round(flight.price * 1.12),
        currency: 'USD',
      },
    },
  })
}

async function executeGetHotelRecommendations(input: ToolInput): Promise<string> {
  const city = input.city as string
  const checkIn = input.check_in as string
  const checkOut = input.check_out as string
  const maxPrice = input.max_price_per_night as number | undefined
  const results = getHotels(city, maxPrice)
  const nights = computeNights(checkIn, checkOut)

  if (results.length === 0) {
    return JSON.stringify({
      success: false,
      message: `No hotels found in ${city}. Try a different city or remove the price filter.`,
      hotels: [],
    })
  }

  return JSON.stringify({
    success: true,
    searchParams: { city, checkIn, checkOut, nights },
    importantNote:
      'IMPORTANT: These are recommendations only. Room availability has NOT been verified. The check_hotel_availability tool is required to confirm availability (not currently available).',
    hotels: results.map((h) => ({
      hotel_id: h.id,
      name: h.name,
      stars: h.stars,
      rating: h.rating,
      address: h.address,
      pricePerNight: h.pricePerNight,
      estimatedTotalPrice: h.pricePerNight * nights,
      nights,
      amenities: h.amenities,
    })),
  })
}

export async function executeTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case 'search_flights':
      return executeSearchFlights(input)
    case 'get_seat_availability':
      return executeGetSeatAvailability(input)
    case 'book_flight':
      return executeBookFlight(input)
    case 'get_hotel_recommendations':
      return executeGetHotelRecommendations(input)
    default:
      return JSON.stringify({ success: false, error: `Unknown tool: ${name}` })
  }
}
