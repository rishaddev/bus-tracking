import { collection, getDocs, query, where, orderBy, limit, getDoc, doc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";

// GET: Get delayed buses/trips report
export async function GET(req) {
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

    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get('hours')) || 24;
    const minDelay = parseInt(searchParams.get('minDelay')) || 10;

    const startTimeObj = new Date();
    startTimeObj.setHours(startTimeObj.getHours() - hours);
    const startTime = startTimeObj.toISOString(); // Convert to "2024-01-21T08:00:00.000Z" format

    // Get delayed trips
    const delayedTripsSnapshot = await getDocs(
      query(
        collection(db, "trips"),
        where("status", "in", ['STARTED', 'IN_PROGRESS', 'DELAYED']),
        where("delay", ">=", minDelay),
        where("scheduledStart", ">=", startTime),
        orderBy("delay", "desc"),
        limit(50)
      )
    );

    const delayedTrips = await Promise.all(
      delayedTripsSnapshot.docs.map(async doc => {
        const tripData = doc.data();
        
        // Get bus details
        const busDoc = await getDoc(doc(db, "buses", tripData.busId));
        const busData = busDoc.exists() ? busDoc.data() : {};
        
        // Get route details
        const routeDoc = await getDoc(doc(db, "routes", tripData.routeId));
        const routeData = routeDoc.exists() ? routeDoc.data() : {};

        return {
          tripId: doc.id,
          ...tripData,
          bus: {
            id: tripData.busId,
            licensePlate: busData.licensePlate,
            busNumber: busData.busNumber,
            operatorName: busData.operatorName
          },
          route: {
            id: tripData.routeId,
            routeNumber: routeData.routeNumber,
            routeName: routeData.routeName
          }
        };
      })
    );

    const report = {
      generatedAt: new Date(),
      period: `${hours} hours`,
      minDelay: `${minDelay} minutes`,
      totalDelayed: delayedTrips.length,
      delayedTrips
    };

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error generating delays report", error: error.message },
      { status: 500 }
    );
  }
}