import {
  collection,
  addDoc,
  getDocs,
  where,
  query,
  orderBy,
} from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp, validateRequiredFields } from "@/lib/utils";

// GET: Get all trips with optional filtering
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    let tripsQuery = query(
      collection(db, "trips"),
      where("isActive", "==", true),
      orderBy("scheduledStart", "asc")
    );

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      tripsQuery = query(
        collection(db, "trips"),
        where("isActive", "==", true),
        where("scheduledStart", ">=", startDate),
        where("scheduledStart", "<", endDate),
        orderBy("scheduledStart", "asc")
      );
    }

    if (status) {
      tripsQuery = query(tripsQuery, where("status", "==", status));
    }

    const tripsSnapshot = await getDocs(tripsQuery);

    const trips = tripsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(trips, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching trips", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create new trip
export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["admin", "operator"]);
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const data = await req.json();
    const {
      busId,
      routeId,
      driverId,
      driverName,
      scheduledStart,
      scheduledEnd,
      actualStart,
      actualEnd,
      status,
      delay,
      currentPassengers,
      maxPassengers,
      fare,
      notes,
      isActive,
    } = data;

    const requiredFields = [
      "busId",
      "routeId",
      "scheduledStart",
      "scheduledEnd",
    ];
    const validation = validateRequiredFields(data, requiredFields);
    if (validation.error) {
      return NextResponse.json({ message: validation.error }, { status: 422 });
    }

    const { date, time, timestamp } = getISTTimestamp();

    const tripData = {
      busId,
      routeId,
      driverId,
      driverName,
      scheduledStart,
      scheduledEnd,
      actualStart,
      actualEnd,
      status: data.status || "SCHEDULED",
      delay: data.delay || 0,
      currentPassengers: data.currentPassengers || 0,
      maxPassengers,
      fare,
      notes,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdDate: date,
      createdTime: time,
    };

    const docRef = await addDoc(collection(db, "trips"), tripData);

    return NextResponse.json(
      {
        message: "Trip created successfully!",
        tripId: docRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating trip", error: error.message },
      { status: 500 }
    );
  }
}
