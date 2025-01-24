import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="mt-20 flex items-center justify-center">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard" // Use this to enforce redirect
        // OR
        fallbackRedirectUrl="/dashboard" // Use this as a fallback
      />
    </div>
  );
}
