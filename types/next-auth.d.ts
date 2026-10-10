import "next-auth";

declare module "next-auth" {
  interface User {
    isProfileComplete?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isProfileComplete?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    isProfileComplete?: boolean;
  }
}
