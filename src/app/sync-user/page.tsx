import prisma from "@/lib/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

const SyncUser = async () => {
  // Get the authenticated user's ID
  const { userId } = await auth();

  // If no user is authenticated, throw an error
  if (!userId) {
    throw new Error("User not found");
  }

  // Fetch the user details from Clerk
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  console.log("User retrieved from Clerk:", user);

  // Check if the user has an email address
  if (!user.emailAddresses[0]?.emailAddress) {
    console.log("No email address found.");
    return notFound();
  }

  const emailAddress = user.emailAddresses[0].emailAddress;
  console.log("Checking if user exists with email:", emailAddress);

  // Check if the user already exists in the database
  const existingUser = await prisma.user.findUnique({
    where: { emailAddress },
  });

  console.log("Existing user found:", existingUser);

  // If the user doesn't exist, create a new user in the database
  if (!existingUser) {
    console.log("Creating new user...");

    await prisma.user.create({
      data: {
        id: userId,
        emailAddress,
        imageUrl: user.imageUrl,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

    console.log("New user created.");
  }

  // Redirect the user to the dashboard
  return redirect("/dashboard");
};

export default SyncUser;
