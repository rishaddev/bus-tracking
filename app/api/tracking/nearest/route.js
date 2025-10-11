import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Find nearest buses
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const latitude = parseFloat(searchParams.get('lat'));
    const longitude = parseFloat(searchParams.get('lon'));
    const radius = parseFloat(searchParams.get('radius')) || 10; // km
    const limitCount = parseInt(searchParams.get('limit')) || 20;

    if (!latitude || !longitude) {
      return NextResponse.json({ message: "Latitude and longitude are required" }, { status: 422 });
    }

    // Get latest tracking for all active buses
    const trackingSnapshot = await getDocs(
      query(
        collection(db, "tracking"),
        orderBy("createdDate", "desc")
      )
    );

    // Get all tracking data and sort by date and time
    const allTrackingData = trackingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by createdDate (desc) and then by createdTime (desc) for most recent entries first
    const sortedTrackingData = allTrackingData.sort((a, b) => {
      // First sort by date (descending)
      if (a.createdDate !== b.createdDate) {
        return b.createdDate.localeCompare(a.createdDate);
      }
      // If dates are same, sort by time (descending)
      return b.createdTime.localeCompare(a.createdTime);
    });

    // Group by busId to get latest tracking per bus
    const latestTracking = {};
    sortedTrackingData.forEach(data => {
      if (!latestTracking[data.busId]) {
        latestTracking[data.busId] = data;
      }
    });

    // Calculate distance and filter by radius
    const busesWithDistance = Object.values(latestTracking)
      .map(tracking => {
        const distance = calculateDistance(
          latitude,
          longitude,
          tracking.location.latitude,
          tracking.location.longitude
        );
        return { ...tracking, distance };
      })
      .filter(bus => bus.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limitCount);

    return NextResponse.json(busesWithDistance, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error finding nearest buses", error: error.message },
      { status: 500 }
    );
  }
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}