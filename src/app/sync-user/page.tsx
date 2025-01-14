import prisma from "@/lib/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

const SyncUser = async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  console.log("User retrieved from Clerk:", user);

  if (!user.emailAddresses[0]?.emailAddress) {
    console.log("No email address found.");
    return notFound();
  }

  const emailAddress = user.emailAddresses[0].emailAddress;
  console.log("Checking if user exists with email:", emailAddress);

  const existingUser = await prisma.user.findUnique({
    where: { emailAddress },
  });

  console.log("Existing user found:", existingUser);

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

  return redirect("/dashboard");
};

export default SyncUser;
