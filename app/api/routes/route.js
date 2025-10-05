import { collection, addDoc, getDocs, where, query } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp, validateRequiredFields } from "@/lib/utils";

// GET: Get all routes
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const routesSnapshot = await getDocs(query(collection(db, "routes")));

    const routes = routesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(routes, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching routes", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create new route
export async function POST(req) {
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

    const data = await req.json();
    const {
      routeNumber,
      routeName,
      startProvince,
      endProvince,
      startLocation,
      endLocation,
      waypoints,
      distance,
      estimatedDuration,
      operatingHours,
      frequency,
      isActive,
    } = data;

    const requiredFields = [
      "routeNumber",
      "routeName",
      "startProvince",
      "endProvince",
      "startLocation",
      "endLocation",
      "distance",
    ];

    const validation = validateRequiredFields(data, requiredFields);
    if (validation.error) {
      return NextResponse.json({ message: validation.error }, { status: 422 });
    }

    const { date, time } = getISTTimestamp();

    const routeData = {
      routeNumber,
      routeName,
      startProvince,
      endProvince,
      startLocation,
      endLocation,
      waypoints,
      distance,
      estimatedDuration,
      operatingHours,
      frequency,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdDate: date,
      createdTime: time,
    };

    const docRef = await addDoc(collection(db, "routes"), routeData);

    return NextResponse.json(
      {
        message: "Route created successfully!",
        routeId: docRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating route", error: error.message },
      { status: 500 }
    );
  }
}
