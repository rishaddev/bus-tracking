import { collection, addDoc, getDocs, where, query } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp, validateRequiredFields } from "@/lib/utils";

// GET - Get all buses
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));

    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const busesSnapshot = await getDocs(
      query(collection(db, "buses"), where("isActive", "==", true))
    );
    
    const buses = busesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(buses, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching buses", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create new bus
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, 'operator');
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const data = await req.json();
    const requiredFields = ['licensePlate', 'busNumber', 'operatorId', 'capacity', 'model', 'year', 'color'];
    const validation = validateRequiredFields(data, requiredFields);
    if (validation.error) {
      return NextResponse.json({ message: validation.error }, { status: 422 });
    }

    const { timestamp } = getISTTimestamp();

    const busData = {
      ...data,
      isActive: data.isActive !== undefined ? data.isActive : true,
      currentStatus: data.currentStatus || 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const docRef = await addDoc(collection(db, "buses"), busData);

    return NextResponse.json({ 
      message: "Bus created successfully!", 
      busId: docRef.id 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating bus", error: error.message },
      { status: 500 }
    );
  }
}