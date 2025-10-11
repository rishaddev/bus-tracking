import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Calculate ETA for a specific stop
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { tripId, stopId } = await params;

    // Get trip details
    const tripDoc = await getDoc(doc(db, "trips", tripId));
    if (!tripDoc.exists()) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    const tripData = tripDoc.data();

    // Get route details and stops
    const routeDoc = await getDoc(doc(db, "routes", tripData.routeId));
    if (!routeDoc.exists()) {
      return NextResponse.json({ message: "Route not found" }, { status: 404 });
    }

    const routeData = routeDoc.data();
    const stops = routeData.waypoints || [];

    // Find the target stop
    const targetStop = stops.find(stop => stop.stopId === stopId || stop.sequence === parseInt(stopId));
    if (!targetStop) {
      return NextResponse.json({ message: "Stop not found on this route" }, { status: 404 });
    }

    // Get latest bus location
    const trackingSnapshot = await getDocs(
      query(
        collection(db, "tracking"),
        where("busId", "==", tripData.busId),
        orderBy("createdDate", "desc")
      )
    );

    if (trackingSnapshot.empty) {
      return NextResponse.json({ message: "No tracking data available" }, { status: 404 });
    }

    // Get all tracking data and sort by date and time to find the latest
    const allTrackingData = trackingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by createdDate (desc) and then by createdTime (desc) for most recent entry
    const sortedTracking = allTrackingData.sort((a, b) => {
      // First sort by date (descending)
      if (a.createdDate !== b.createdDate) {
        return b.createdDate.localeCompare(a.createdDate);
      }
      // If dates are same, sort by time (descending)
      return b.createdTime.localeCompare(a.createdTime);
    });

    const latestTracking = sortedTracking[0];

    // Simple ETA calculation based on distance and average speed
    const currentLocation = latestTracking.location;
    const distanceToStop = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      targetStop.latitude,
      targetStop.longitude
    );

    const averageSpeed = latestTracking.speed > 0 ? latestTracking.speed : 40; // km/h
    const estimatedTimeMinutes = (distanceToStop / averageSpeed) * 60;

    const estimatedArrival = new Date();
    estimatedArrival.setMinutes(estimatedArrival.getMinutes() + estimatedTimeMinutes);

    const etaData = {
      tripId,
      stopId: targetStop.stopId || targetStop.sequence,
      stopName: targetStop.name,
      currentLocation: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        createdDate: latestTracking.createdDate,
        createdTime: latestTracking.createdTime
      },
      distanceToStop: Math.round(distanceToStop * 100) / 100, // km
      averageSpeed: Math.round(averageSpeed * 100) / 100, // km/h
      estimatedTimeMinutes: Math.round(estimatedTimeMinutes),
      estimatedArrival,
      confidence: "MEDIUM" // LOW, MEDIUM, HIGH based on data quality
    };

    return NextResponse.json(etaData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error calculating ETA", error: error.message },
      { status: 500 }
    );
  }
}

// Haversine distance calculation (reuse from nearest buses)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}