import { collection, addDoc, getDocs, where, query } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp, validateRequiredFields } from "@/lib/utils";

// GET: Get all stops
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const province = searchParams.get("province");
    const type = searchParams.get("type");

    let stopsQuery = query(
      collection(db, "stops"),
      where("isActive", "==", true)
    );

    if (province) {
      stopsQuery = query(stopsQuery, where("province", "==", province));
    }

    if (type) {
      stopsQuery = query(stopsQuery, where("type", "==", type));
    }

    const stopsSnapshot = await getDocs(stopsQuery);

    const stops = stopsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(stops, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching stops", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create new stop
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
      name,
      latitude,
      longitude,
      address,
      province,
      type,
      facilities,
      isActive,
    } = data;

    const requiredFields = ["name", "latitude", "longitude"];
    const validation = validateRequiredFields(data, requiredFields);
    if (validation.error) {
      return NextResponse.json({ message: validation.error }, { status: 422 });
    }

    const { date, time } = getISTTimestamp();

    const stopData = {
      stopId: data.stopId || data.name.toLowerCase().replace(/\s+/g, "_"),
      name,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address || "",
      },
      province,
      type,
      facilities: data.facilities || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdDate: date,
      createdTime: time,
    };

    const docRef = await addDoc(collection(db, "stops"), stopData);

    return NextResponse.json(
      {
        message: "Stop created successfully!",
        stopId: docRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating stop", error: error.message },
      { status: 500 }
    );
  }
}
