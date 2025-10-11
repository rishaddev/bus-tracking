import { collection, getDocs, query, where, or, and } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Search routes
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const province = searchParams.get('province');

    let routesQuery = query(
      collection(db, "routes"), 
      where("isActive", "==", true)
    );

    // Build query conditions
    let queryConditions = [where("isActive", "==", true)];

    // Search by origin and destination
    if (origin && destination) {
      queryConditions.push(
        or(
          where("startProvince", "==", origin),
          where("endProvince", "==", destination),
          where("startLocation.name", ">=", origin),
          where("startLocation.name", "<=", origin + '\uf8ff'),
          where("endLocation.name", ">=", destination),
          where("endLocation.name", "<=", destination + '\uf8ff')
        )
      );
    } else if (origin) {
      queryConditions.push(
        or(
          where("startProvince", "==", origin),
          where("startLocation.name", ">=", origin),
          where("startLocation.name", "<=", origin + '\uf8ff')
        )
      );
    } else if (destination) {
      queryConditions.push(
        or(
          where("endProvince", "==", destination),
          where("endLocation.name", ">=", destination),
          where("endLocation.name", "<=", destination + '\uf8ff')
        )
      );
    }

    if (province) {
      queryConditions.push(
        or(
          where("startProvince", "==", province),
          where("endProvince", "==", province)
        )
      );
    }

    // Build the final query with and() wrapper if there are multiple conditions
    if (queryConditions.length > 1) {
      routesQuery = query(collection(db, "routes"), and(...queryConditions));
    } else {
      routesQuery = query(collection(db, "routes"), ...queryConditions);
    }

    const routesSnapshot = await getDocs(routesQuery);
    
    const routes = routesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      searchParams: { origin, destination, province },
      results: routes,
      count: routes.length
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error searching routes", error: error.message },
      { status: 500 }
    );
  }
}