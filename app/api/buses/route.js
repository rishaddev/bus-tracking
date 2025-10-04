import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function POST(req) {
  try {
    const data = await req.json();
    const {
      licensePlate,
      busNumber,
      operatorId,
      operatorName,
      routeId,
      capacity,
      model,
      year,
      color,
      facilities,
      isActive,
      currentStatus,
      lastMaintenance,
      nextMaintenance,
    } = data;

    if (
      !licensePlate ||
      !busNumber ||
      !capacity ||
      !model ||
      !year ||
      !color ||
      !facilities
    ) {
      return NextResponse.json({ message: "Invalid input." }, { status: 422 });
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);

    const createdDate = istDate.toISOString().split("T")[0];

    const createdTime = istDate.toISOString().split("T")[1].split(".")[0];

    const busData = {
      licensePlate,
      busNumber,
      operatorId,
      operatorName,
      routeId,
      capacity,
      model,
      year,
      color,
      facilities,
      isActive,
      currentStatus,
      lastMaintenance,
      nextMaintenance,
      createdDate,
      createdTime,
    };

    await addDoc(collection(db, "buses"), busData);

    return NextResponse.json({ message: "Bus created!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Something went wrong Backend.", error: error.message },
      { status: 500 }
    );
  }
}
