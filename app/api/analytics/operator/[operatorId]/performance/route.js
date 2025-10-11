import { collection, getDocs, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";

// GET: Operator performance analytics
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['admin']);
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const { operatorId } = await params;
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days')) || 30;

    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - days);
    const startDate = startDateObj.toISOString(); // Convert to "2024-01-21T08:00:00.000Z" format

    // Get operator's buses
    const busesSnapshot = await getDocs(
      query(
        collection(db, "buses"),
        where("operatorId", "==", operatorId),
        where("isActive", "==", true)
      )
    );

    const busIds = busesSnapshot.docs.map(doc => doc.id);

    // Get trips for these buses
    const tripsSnapshot = await getDocs(
      query(
        collection(db, "trips"),
        where("busId", "in", busIds),
        where("scheduledStart", ">=", startDate)
      )
    );

    const trips = tripsSnapshot.docs.map(doc => doc.data());
    
    // Calculate metrics
    const completedTrips = trips.filter(trip => trip.status === 'COMPLETED').length;
    const delayedTrips = trips.filter(trip => trip.delay > 0).length;
    const cancelledTrips = trips.filter(trip => trip.status === 'CANCELLED').length;
    const totalTrips = trips.length;

    const onTimePercentage = totalTrips > 0 ? ((completedTrips - delayedTrips) / totalTrips) * 100 : 0;
    const averageDelay = delayedTrips > 0 ? 
      trips.reduce((sum, trip) => sum + (trip.delay || 0), 0) / delayedTrips : 0;
    const completionRate = totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0;

    const performanceData = {
      operatorId,
      period: `${days} days`,
      totalBuses: busIds.length,
      totalTrips,
      completedTrips,
      delayedTrips,
      cancelledTrips,
      onTimePercentage: Math.round(onTimePercentage * 100) / 100,
      averageDelay: Math.round(averageDelay * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      analysisDate: new Date()
    };

    return NextResponse.json(performanceData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching operator performance", error: error.message },
      { status: 500 }
    );
  }
}