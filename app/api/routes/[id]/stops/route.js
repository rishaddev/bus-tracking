import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp, validateRequiredFields } from "@/lib/utils";

// GET: Get stops for a route
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { id } = await params;
    const routeDoc = await getDoc(doc(db, "routes", id));

    if (!routeDoc.exists()) {
      return NextResponse.json({ message: "Route not found" }, { status: 404 });
    }

    const routeData = routeDoc.data();
    const stops = routeData.waypoints || [];

    return NextResponse.json(stops, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching route stops", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Add stop to route
export async function POST(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["admin"]);
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();

    const {
      sequence,
      name,
      type,
      latitude,
      longitude,
      estimatedTimeFromStart,
      province,
    } = data;

    const requiredFields = ["sequence", "name", "latitude", "longitude"];
    const validation = validateRequiredFields(data, requiredFields);
    if (validation.error) {
      return NextResponse.json({ message: validation.error }, { status: 422 });
    }

    const { date, time } = getISTTimestamp();

    const stopData = {
      sequence,
      name,
      type: data.type || "MINOR",
      latitude,
      longitude,
      estimatedTimeFromStart: data.estimatedTimeFromStart || 0,
      province: data.province || "",
      createdDate: date,
      createdTime: time,
    };

    // Add to route's waypoints array
    await updateDoc(doc(db, "routes", id), {
      waypoints: arrayUnion(stopData),
      updatedDate: date,
      updatedTime: time,
    });

    return NextResponse.json(
      {
        message: "Stop added to route successfully!",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error adding stop to route", error: error.message },
      { status: 500 }
    );
  }
}
