import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const REQUIRES_ONBOARDING = ["/workspace", "/dashboard", "/messages"];

export default withAuth(
  function middleware(req) {
    const complete = req.nextauth.token?.isProfileComplete === true;
    const { pathname } = req.nextUrl;

    if (pathname === "/onboarding" && complete) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      !complete &&
      REQUIRES_ONBOARDING.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      )
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    "/onboarding",
    "/workspace",
    "/profile",
    "/dashboard",
    "/messages",
  ],
};
