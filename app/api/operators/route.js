import { collection, addDoc, getDocs, where, query } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp, validateRequiredFields } from "@/lib/utils";

// GET: Get all operators
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const operatorsSnapshot = await getDocs(query(collection(db, "operators")));

    const operators = operatorsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(operators, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching operators", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create new operator
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
      companyName,
      registrationNumber,
      contact,
      fleetSize,
      activeBuses,
      operatingProvinces,
      licenseExpiry,
      isActive,
      rating,
      totalTrips,
    } = data;

    const requiredFields = ["companyName", "registrationNumber", "contact"];
    const validation = validateRequiredFields(data, requiredFields);
    if (validation.error) {
      return NextResponse.json({ message: validation.error }, { status: 422 });
    }

    const { date, time, timestamp } = getISTTimestamp();

    const operatorData = {
      companyName,
      registrationNumber,
      contact,
      fleetSize: data.fleetSize || 0,
      activeBuses: data.activeBuses || 0,
      operatingProvinces: data.operatingProvinces || [],
      licenseExpiry,
      isActive,
      rating: data.rating || 0,
      totalTrips: data.totalTrips || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdDate: date,
      createdTime: time,
      joinedDate: data.joinedDate || date,
    };

    const docRef = await addDoc(collection(db, "operators"), operatorData);

    return NextResponse.json(
      {
        message: "Operator created successfully!",
        operatorId: docRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating operator", error: error.message },
      { status: 500 }
    );
  }
}
