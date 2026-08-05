import { NextRequest, NextResponse } from "next/server";
import { isReviewAdmin, moderateReviewArticle } from "@/lib/review-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const slug = String(form.get("slug") ?? "");
  const decision = String(form.get("decision") ?? "");

  if (!(await isReviewAdmin(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!slug || (decision !== "publish" && decision !== "discard")) {
    return NextResponse.json({ error: "Invalid moderation request" }, { status: 400 });
  }

  try {
    await moderateReviewArticle(slug, decision);
    const url = new URL("/review", request.url);
    url.searchParams.set("key", token);
    url.searchParams.set("result", decision === "publish" ? "published" : "discarded");
    return NextResponse.redirect(url, 303);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
