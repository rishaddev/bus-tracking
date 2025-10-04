import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp } from "@/lib/utils";

// GET: Get bus by ID
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { id } = await params;
    const busDoc = await getDoc(doc(db, "buses", id));
    
    if (!busDoc.exists()) {
      return NextResponse.json({ message: "Bus not found" }, { status: 404 });
    }

    return NextResponse.json({ id: busDoc.id, ...busDoc.data() }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching bus", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update bus
export async function PUT(req, { params }) {
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

    const { id } = await params;
    const data = await req.json();
    const { date, time } = getISTTimestamp();

    await updateDoc(doc(db, "buses", id), {
      ...data,
      updateDate: date,
      updateTime: time,
    });

    return NextResponse.json({ message: "Bus updated successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating bus", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete bus (hard delete)
export async function DELETE(req, { params }) {
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

    const { id } = await params;

    // Check if bus exists before deleting
    const busDoc = await getDoc(doc(db, "buses", id));
    if (!busDoc.exists()) {
      return NextResponse.json({ message: "Bus not found" }, { status: 404 });
    }

    await deleteDoc(doc(db, "buses", id));

    return NextResponse.json({ message: "Bus deleted successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting bus", error: error.message },
      { status: 500 }
    );
  }
}