import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get active buses on route
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { routeid } = await params;

    // Get all active buses
    const busesSnapshot = await getDocs(
      query(
        collection(db, "buses"),
        where("isActive", "==", true),
        where("routeId", "==", routeid)
      )
    );

    const activeBuses = [];

    for (const busDoc of busesSnapshot.docs) {
      const busId = busDoc.id;
      const busData = busDoc.data();

      // Get latest tracking for each bus
      const trackingSnapshot = await getDocs(
        query(
          collection(db, "tracking"),
          where("busId", "==", busId),
          orderBy("createdDate", "desc")
        )
      );

      if (!trackingSnapshot.empty) {
        const allTrackingData = trackingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const sortedTracking = allTrackingData.sort((a, b) => {
          if (a.createdDate !== b.createdDate) {
            return b.createdDate.localeCompare(a.createdDate);
          }
          return b.createdTime.localeCompare(a.createdTime);
        });

        const latestTracking = sortedTracking[0];

        if (latestTracking.status !== "COMPLETED") {
          activeBuses.push({
            bus: { id: busId, ...busData },
            tracking: latestTracking,
          });
        }
      }
    }

    return NextResponse.json(activeBuses, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching active buses", error: error.message },
      { status: 500 }
    );
  }
}
