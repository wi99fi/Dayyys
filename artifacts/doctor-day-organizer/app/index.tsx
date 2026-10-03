import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { LoadingState, ScrollScreen } from "@/components/ui";

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <ScrollScreen><LoadingState /></ScrollScreen>;
  return <Redirect href={isSignedIn ? "/(tabs)" : "/sign-in"} />;
}