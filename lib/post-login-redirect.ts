export async function getPostLoginPath(): Promise<"/onboarding" | "/dashboard"> {
  const response = await fetch("/api/profile");
  if (!response.ok) {
    return "/onboarding";
  }

  const data = (await response.json()) as { isProfileComplete?: boolean };
  return data.isProfileComplete ? "/dashboard" : "/onboarding";
}
