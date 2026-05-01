// Mock travel data for TravelGenie demo
// This data simulates a real travel booking backend

export interface Flight {
  id: string
  airline: string
  flightNumber: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  duration: string
  price: number
  seats: number
  class: string
}

export interface Hotel {
  id: string
  name: string
  city: string
  stars: number
  pricePerNight: number
  amenities: string[]
  rating: number
  reviewCount: number
  address: string
  description: string
}

export interface HotelAvailability {
  hotelId: string
  date: string
  available: boolean
  roomsLeft: number
}

// ─── Flights ────────────────────────────────────────────────────────────────

export const flights: Flight[] = [
  {
    id: 'FL001',
    airline: 'Air France',
    flightNumber: 'AF-110',
    origin: 'New York',
    destination: 'Paris',
    departureTime: '2025-06-15T18:30:00',
    arrivalTime: '2025-06-16T08:15:00',
    duration: '7h 45m',
    price: 689,
    seats: 42,
    class: 'Economy',
  },
  {
    id: 'FL002',
    airline: 'Delta Airlines',
    flightNumber: 'DL-404',
    origin: 'New York',
    destination: 'Paris',
    departureTime: '2025-06-15T22:00:00',
    arrivalTime: '2025-06-16T11:45:00',
    duration: '7h 45m',
    price: 572,
    seats: 15,
    class: 'Economy',
  },
  {
    id: 'FL003',
    airline: 'British Airways',
    flightNumber: 'BA-178',
    origin: 'New York',
    destination: 'London',
    departureTime: '2025-06-16T21:00:00',
    arrivalTime: '2025-06-17T09:20:00',
    duration: '6h 20m',
    price: 498,
    seats: 88,
    class: 'Economy',
  },
  {
    id: 'FL004',
    airline: 'Japan Airlines',
    flightNumber: 'JL-006',
    origin: 'New York',
    destination: 'Tokyo',
    departureTime: '2025-06-17T11:00:00',
    arrivalTime: '2025-06-18T14:30:00',
    duration: '14h 30m',
    price: 1243,
    seats: 27,
    class: 'Economy',
  },
  {
    id: 'FL005',
    airline: 'United Airlines',
    flightNumber: 'UA-901',
    origin: 'Los Angeles',
    destination: 'Tokyo',
    departureTime: '2025-06-18T01:30:00',
    arrivalTime: '2025-06-19T06:15:00',
    duration: '11h 45m',
    price: 987,
    seats: 54,
    class: 'Economy',
  },
  {
    id: 'FL006',
    airline: 'Lufthansa',
    flightNumber: 'LH-441',
    origin: 'Los Angeles',
    destination: 'Paris',
    departureTime: '2025-06-20T16:45:00',
    arrivalTime: '2025-06-21T13:00:00',
    duration: '11h 15m',
    price: 834,
    seats: 9,
    class: 'Economy',
  },
  {
    id: 'FL007',
    airline: 'American Airlines',
    flightNumber: 'AA-100',
    origin: 'New York',
    destination: 'Los Angeles',
    departureTime: '2025-06-15T07:00:00',
    arrivalTime: '2025-06-15T10:15:00',
    duration: '5h 15m',
    price: 289,
    seats: 120,
    class: 'Economy',
  },
  {
    id: 'FL008',
    airline: 'Air France',
    flightNumber: 'AF-066',
    origin: 'Paris',
    destination: 'Tokyo',
    departureTime: '2025-06-22T13:20:00',
    arrivalTime: '2025-06-23T08:45:00',
    duration: '12h 25m',
    price: 1089,
    seats: 38,
    class: 'Economy',
  },
  {
    id: 'FL009',
    airline: 'Virgin Atlantic',
    flightNumber: 'VS-003',
    origin: 'London',
    destination: 'New York',
    departureTime: '2025-06-25T10:00:00',
    arrivalTime: '2025-06-25T12:45:00',
    duration: '8h 45m',
    price: 542,
    seats: 61,
    class: 'Economy',
  },
  {
    id: 'FL010',
    airline: 'ANA',
    flightNumber: 'NH-110',
    origin: 'Tokyo',
    destination: 'Paris',
    departureTime: '2025-06-28T10:55:00',
    arrivalTime: '2025-06-28T16:20:00',
    duration: '14h 25m',
    price: 1312,
    seats: 22,
    class: 'Business',
  },
]

// ─── Hotels ─────────────────────────────────────────────────────────────────

export const hotels: Hotel[] = [
  // Paris hotels
  {
    id: 'HT001',
    name: 'Grand Palais Hotel',
    city: 'Paris',
    stars: 5,
    pricePerNight: 495,
    amenities: ['Free WiFi', 'Spa', 'Rooftop Pool', 'Michelin Restaurant', 'Concierge', 'Room Service'],
    rating: 4.8,
    reviewCount: 2341,
    address: '8 Rue du Faubourg Saint-Honoré, 75008 Paris',
    description: 'A legendary palace hotel steps from the Champs-Élysées with breathtaking Eiffel Tower views.',
  },
  {
    id: 'HT002',
    name: 'Hotel Lumière Montmartre',
    city: 'Paris',
    stars: 4,
    pricePerNight: 215,
    amenities: ['Free WiFi', 'Breakfast Included', 'Bar', 'Terrace', 'Concierge'],
    rating: 4.5,
    reviewCount: 1087,
    address: '42 Rue Lepic, 75018 Paris',
    description: 'Charming boutique hotel in the artistic heart of Montmartre with Sacré-Cœur views.',
  },
  {
    id: 'HT003',
    name: 'Seine River Suites',
    city: 'Paris',
    stars: 4,
    pricePerNight: 278,
    amenities: ['Free WiFi', 'River View', 'Fitness Center', 'Bar', 'Room Service', 'Pet Friendly'],
    rating: 4.6,
    reviewCount: 892,
    address: '15 Quai de la Tournelle, 75005 Paris',
    description: 'Modern suites overlooking the Seine with stunning views of Notre-Dame Cathedral.',
  },
  {
    id: 'HT004',
    name: 'Budget Parisien',
    city: 'Paris',
    stars: 2,
    pricePerNight: 89,
    amenities: ['Free WiFi', 'Breakfast Available', '24h Reception'],
    rating: 3.8,
    reviewCount: 4521,
    address: '23 Rue de la Roquette, 75011 Paris',
    description: 'Clean, affordable rooms in the vibrant Bastille neighborhood. Perfect for budget travelers.',
  },
  // New York hotels
  {
    id: 'HT005',
    name: 'Manhattan Sky Tower',
    city: 'New York',
    stars: 5,
    pricePerNight: 689,
    amenities: ['Free WiFi', 'Sky Bar', 'Indoor Pool', 'Spa', 'Fitness Center', 'Valet Parking', 'Room Service'],
    rating: 4.9,
    reviewCount: 3201,
    address: '432 Park Avenue, New York, NY 10022',
    description: 'Iconic 5-star skyscraper hotel with unrivaled panoramic views of Central Park and the Manhattan skyline.',
  },
  {
    id: 'HT006',
    name: 'Brooklyn Bridge Inn',
    city: 'New York',
    stars: 3,
    pricePerNight: 189,
    amenities: ['Free WiFi', 'Rooftop Terrace', 'Restaurant', 'Bar', 'Bicycle Rental'],
    rating: 4.3,
    reviewCount: 2108,
    address: '55 Water Street, Brooklyn, NY 11201',
    description: 'Hip boutique hotel in DUMBO with spectacular Brooklyn Bridge views and easy Manhattan access.',
  },
  {
    id: 'HT007',
    name: 'The Midtown Classic',
    city: 'New York',
    stars: 4,
    pricePerNight: 349,
    amenities: ['Free WiFi', 'Fitness Center', 'Business Center', 'Restaurant', 'Concierge'],
    rating: 4.4,
    reviewCount: 5672,
    address: '150 West 51st Street, New York, NY 10019',
    description: 'A refined full-service hotel in the heart of Midtown, steps from Times Square and Broadway.',
  },
  {
    id: 'HT008',
    name: 'Chelsea Art Hotel',
    city: 'New York',
    stars: 4,
    pricePerNight: 275,
    amenities: ['Free WiFi', 'Art Gallery', 'Rooftop Bar', 'Fitness Center', 'Pet Friendly'],
    rating: 4.5,
    reviewCount: 1438,
    address: '222 West 23rd Street, New York, NY 10011',
    description: 'A design-forward boutique hotel in Chelsea, adorned with curated contemporary art throughout.',
  },
  // Tokyo hotels
  {
    id: 'HT009',
    name: 'Shinjuku Skyline Hotel',
    city: 'Tokyo',
    stars: 5,
    pricePerNight: 412,
    amenities: ['Free WiFi', 'Onsen', 'Rooftop Restaurant', 'Spa', 'Concierge', 'Airport Shuttle'],
    rating: 4.7,
    reviewCount: 1876,
    address: '2-2-1 Nishi-Shinjuku, Tokyo 160-0023',
    description: 'Luxurious skyscraper hotel in Shinjuku offering stunning city views and a traditional onsen.',
  },
  {
    id: 'HT010',
    name: 'Asakusa Ryokan',
    city: 'Tokyo',
    stars: 3,
    pricePerNight: 178,
    amenities: ['Free WiFi', 'Traditional Breakfast', 'Onsen', 'Kimono Rental', 'Garden'],
    rating: 4.6,
    reviewCount: 943,
    address: '1-5-11 Asakusa, Taito City, Tokyo 111-0032',
    description: 'An authentic Japanese ryokan near Senso-ji Temple offering a genuine cultural experience.',
  },
  {
    id: 'HT011',
    name: 'Ginza Modern Suites',
    city: 'Tokyo',
    stars: 4,
    pricePerNight: 310,
    amenities: ['Free WiFi', 'Fitness Center', 'Restaurant', 'Bar', 'Room Service', 'Business Center'],
    rating: 4.4,
    reviewCount: 2234,
    address: '6-10-1 Ginza, Chuo City, Tokyo 104-0061',
    description: 'Sleek contemporary suites in the prestigious Ginza shopping district. Perfect for business travelers.',
  },
  {
    id: 'HT012',
    name: 'Shibuya Capsule & Lounge',
    city: 'Tokyo',
    stars: 2,
    pricePerNight: 65,
    amenities: ['Free WiFi', 'Lounge', 'Luggage Storage', 'Shower Facilities', '24h Reception'],
    rating: 4.1,
    reviewCount: 6789,
    address: '2-29-8 Dogenzaka, Shibuya City, Tokyo 150-0043',
    description: 'A premium capsule hotel in the heart of Shibuya — compact, clean, and great value.',
  },
]

// ─── Hotel Availability Data ──────────────────────────────────────────────────
// This is the data that the MISSING check_hotel_availability tool would return.
// Since the tool doesn't exist, the agent cannot access this information
// and may hallucinate availability — that's the intentional bug.

type AvailabilityMap = Record<string, Record<string, { available: boolean; roomsLeft: number }>>

export const hotelAvailabilityData: AvailabilityMap = {
  HT001: {
    '2025-06-14': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-15': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-16': { available: true, roomsLeft: 2 },
    '2025-06-20': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-21': { available: true, roomsLeft: 1 },
    '2025-06-28': { available: false, roomsLeft: 0 },  // FULLY BOOKED
  },
  HT002: {
    '2025-06-14': { available: true, roomsLeft: 8 },
    '2025-06-15': { available: true, roomsLeft: 5 },
    '2025-06-16': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-20': { available: true, roomsLeft: 3 },
    '2025-06-28': { available: true, roomsLeft: 6 },
  },
  HT003: {
    '2025-06-14': { available: true, roomsLeft: 12 },
    '2025-06-15': { available: true, roomsLeft: 10 },
    '2025-06-16': { available: true, roomsLeft: 7 },
    '2025-06-20': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-28': { available: true, roomsLeft: 4 },
  },
  HT004: {
    '2025-06-14': { available: true, roomsLeft: 20 },
    '2025-06-15': { available: true, roomsLeft: 18 },
    '2025-06-16': { available: true, roomsLeft: 15 },
    '2025-06-20': { available: true, roomsLeft: 12 },
    '2025-06-28': { available: true, roomsLeft: 9 },
  },
  HT005: {
    '2025-06-14': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-15': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-16': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-20': { available: true, roomsLeft: 1 },
    '2025-06-28': { available: false, roomsLeft: 0 },  // FULLY BOOKED
  },
  HT006: {
    '2025-06-14': { available: true, roomsLeft: 6 },
    '2025-06-15': { available: true, roomsLeft: 4 },
    '2025-06-16': { available: true, roomsLeft: 2 },
    '2025-06-20': { available: true, roomsLeft: 5 },
    '2025-06-28': { available: false, roomsLeft: 0 },
  },
  HT007: {
    '2025-06-14': { available: true, roomsLeft: 14 },
    '2025-06-15': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-16': { available: true, roomsLeft: 8 },
    '2025-06-20': { available: true, roomsLeft: 11 },
    '2025-06-28': { available: true, roomsLeft: 7 },
  },
  HT008: {
    '2025-06-14': { available: true, roomsLeft: 9 },
    '2025-06-15': { available: true, roomsLeft: 7 },
    '2025-06-16': { available: false, roomsLeft: 0 },
    '2025-06-20': { available: true, roomsLeft: 5 },
    '2025-06-28': { available: true, roomsLeft: 3 },
  },
  HT009: {
    '2025-06-14': { available: true, roomsLeft: 5 },
    '2025-06-15': { available: true, roomsLeft: 3 },
    '2025-06-16': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-20': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-28': { available: true, roomsLeft: 2 },
  },
  HT010: {
    '2025-06-14': { available: true, roomsLeft: 4 },
    '2025-06-15': { available: true, roomsLeft: 4 },
    '2025-06-16': { available: true, roomsLeft: 3 },
    '2025-06-20': { available: true, roomsLeft: 2 },
    '2025-06-28': { available: false, roomsLeft: 0 },
  },
  HT011: {
    '2025-06-14': { available: true, roomsLeft: 10 },
    '2025-06-15': { available: false, roomsLeft: 0 },  // FULLY BOOKED
    '2025-06-16': { available: true, roomsLeft: 6 },
    '2025-06-20': { available: true, roomsLeft: 8 },
    '2025-06-28': { available: true, roomsLeft: 5 },
  },
  HT012: {
    '2025-06-14': { available: true, roomsLeft: 30 },
    '2025-06-15': { available: true, roomsLeft: 25 },
    '2025-06-16': { available: true, roomsLeft: 22 },
    '2025-06-20': { available: true, roomsLeft: 18 },
    '2025-06-28': { available: true, roomsLeft: 15 },
  },
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

const normalizeCity = (city: string): string => {
  const c = city.toLowerCase().trim()
  if (c.includes('new york') || c === 'nyc' || c === 'jfk') return 'New York'
  if (c.includes('paris') || c === 'cdg') return 'Paris'
  if (c.includes('tokyo') || c === 'nrt' || c === 'hnd') return 'Tokyo'
  if (c.includes('london') || c === 'lhr' || c === 'lgw') return 'London'
  if (c.includes('los angeles') || c === 'la' || c === 'lax') return 'Los Angeles'
  return city
}

export function getFlights(origin: string, destination: string): Flight[] {
  const normalizedOrigin = normalizeCity(origin)
  const normalizedDestination = normalizeCity(destination)
  return flights.filter(
    (f) =>
      f.origin.toLowerCase().includes(normalizedOrigin.toLowerCase()) &&
      f.destination.toLowerCase().includes(normalizedDestination.toLowerCase())
  )
}

export function getFlight(id: string): Flight | undefined {
  return flights.find((f) => f.id === id)
}

export function getHotels(city: string, maxPricePerNight?: number): Hotel[] {
  const normalizedCity = normalizeCity(city)
  let results = hotels.filter((h) =>
    h.city.toLowerCase().includes(normalizedCity.toLowerCase())
  )
  if (maxPricePerNight !== undefined) {
    results = results.filter((h) => h.pricePerNight <= maxPricePerNight)
  }
  return results
}

export function getHotel(id: string): Hotel | undefined {
  return hotels.find((h) => h.id === id)
}

// This function would be called by the MISSING check_hotel_availability tool.
// Since the tool doesn't exist in the agent's toolset, this data is never surfaced.
export function getHotelAvailability(
  hotelId: string,
  checkIn: string
): { available: boolean; roomsLeft: number } | null {
  const hotelData = hotelAvailabilityData[hotelId]
  if (!hotelData) return null
  const dateData = hotelData[checkIn]
  if (!dateData) {
    // Default: assume available if no specific data
    return { available: true, roomsLeft: 5 }
  }
  return dateData
}
