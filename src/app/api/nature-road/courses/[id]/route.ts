import { NextResponse } from "next/server";
import { getNatureRoadCourse } from "@/services/natureRoadCatalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const courseId = Number(id);
  const course = getNatureRoadCourse(courseId);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json(course);
}
