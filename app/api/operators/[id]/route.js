import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp } from "@/lib/utils";

// GET: Get operator by ID
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { id } = await params;
    const operatorDoc = await getDoc(doc(db, "operators", id));
    
    if (!operatorDoc.exists()) {
      return NextResponse.json({ message: "Operator not found" }, { status: 404 });
    }

    return NextResponse.json({ id: operatorDoc.id, ...operatorDoc.data() }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching operator", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update operator
export async function PUT(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['admin', 'operator']);
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();
    const { date, time } = getISTTimestamp();

    await updateDoc(doc(db, "operators", id), {
      ...data,
      updatedDate: date,
      updatedTime: time,
    });

    return NextResponse.json({ message: "Operator updated successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating operator", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete operator
export async function DELETE(req, { params }) {
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

    const { id } = await params;

    const operatorDoc = await getDoc(doc(db, "operators", id));
    if (!operatorDoc.exists()) {
      return NextResponse.json({ message: "Operator not found" }, { status: 404 });
    }

    await deleteDoc(doc(db, "operators", id));

    return NextResponse.json({ message: "Operator deleted successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting operator", error: error.message },
      { status: 500 }
    );
  }
}