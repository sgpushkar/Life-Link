import { DEFAULT_ROAD_SPEED_KMPH } from './constants.js';

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Distance in kilometers rounded to two decimal places
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Calculates estimated travel time in minutes based on distance and average road speed.
 *
 * @param distanceKm Distance in kilometers
 * @param speedKmph Average speed in km/h (defaults to 40 km/h for rural road conditions)
 * @returns Estimated time in minutes
 */
export function calculateETA(
  distanceKm: number,
  speedKmph = DEFAULT_ROAD_SPEED_KMPH
): number {
  if (distanceKm <= 0) return 0;
  const hours = distanceKm / speedKmph;
  return Math.max(1, Math.round(hours * 60));
}

/**
 * Checks if a target location is within a given radius from an origin.
 */
export function isWithinRadius(
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number,
  radiusKm: number
): boolean {
  return haversineDistance(originLat, originLon, targetLat, targetLon) <= radiusKm;
}
