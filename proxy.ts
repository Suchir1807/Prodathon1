import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const REQUIRES_ONBOARDING = [
  "/dashboard",
  "/exchanges",
  "/sessions",
  "/session-room",
  "/asks",
  "/find-partners",
  "/messages",
];

export default withAuth(
  function proxy(req) {
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
    "/profile",
    "/profile/:path*",
    "/dashboard",
    "/exchanges",
    "/exchanges/:path*",
    "/sessions",
    "/sessions/:path*",
    "/session-room/:path*",
    "/asks",
    "/asks/:path*",
    "/find-partners",
    "/messages",
  ],
};
