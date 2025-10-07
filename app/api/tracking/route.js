import { collection, addDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp, validateRequiredFields } from "@/lib/utils";

// POST: Update bus location
export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["operator"]);
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const data = await req.json();
    const {
      busId,
      routeId,
      latitude,
      longitude,
      accuracy,
      speed,
      direction,
      nextStop,
      status,
      delay,
      occupancy,
      batteryLevel,
      signalStrength,
    } = data;

    const requiredFields = ["busId", "routeId", "latitude", "longitude"];
    const validation = validateRequiredFields(data, requiredFields);
    if (validation.error) {
      return NextResponse.json({ message: validation.error }, { status: 422 });
    }

    const { date, time } = getISTTimestamp();

    const trackingData = {
      busId,
      routeId,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy || 15.0,
      },
      speed: speed || 0,
      direction: direction || 0,
      nextStop: nextStop || null,
      status: status || "IN_TRANSIT",
      delay: delay || 0,
      occupancy: occupancy || "UNKNOWN",
      batteryLevel: batteryLevel || null,
      signalStrength: signalStrength || null,
      createdDate: date,
      createdTime: time,
    };

    const docRef = await addDoc(collection(db, "tracking"), trackingData);

    return NextResponse.json(
      {
        message: "Location updated successfully!",
        trackingId: docRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating location", error: error.message },
      { status: 500 }
    );
  }
}
